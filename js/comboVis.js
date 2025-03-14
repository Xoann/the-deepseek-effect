class ComboVis {
    constructor(parentElement, compositeData) {
      this.parentElement = parentElement;
      // compositeData has: id, Model, releaseDate, benchmark_score.
      this.modelsData = compositeData.map(d => ({
        ...d,
        releaseDateParsed: !isNaN(Date.parse(d.releaseDate))
                              ? new Date(d.releaseDate)
                              : new Date("2025-01-01"),
        benchmark_score: d.benchmark_score ? +d.benchmark_score : Math.round(Math.random() * 100)
      }));
      this.filteredData = this.modelsData; // initially, not filtered
      this.initVis();
    }
  
    initVis() {
      const container = d3.select("#" + this.parentElement);
      container.html("");
      // Top row: full-width bar chart.
      container.append("div")
        .attr("id", "barChart")
        .style("width", "100%")
        .style("vertical-align", "top");
      // Bottom row: line chart with brush.
      container.append("div")
        .attr("class", "combo-bottom-row")
        .style("margin-top", "20px")
        .html(`<div id="lineChart"></div>`);
  
      this.initBarChart();
      this.initLineChart();
    }
  
    initBarChart() {
      let container = d3.select("#barChart");
      container.html("");
      // Increase left margin for human-readable names.
      let margin = { top: 20, right: 20, bottom: 30, left: 150 };
      let width = container.node().getBoundingClientRect().width || 600;
      let height = 200;
      let svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);
      let innerWidth = width - margin.left - margin.right;
      let innerHeight = height - margin.top - margin.bottom;
      let g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
  
      this.barChart = { container, svg, g, margin, innerWidth, innerHeight };
      this.updateBarChart();
    }
  
    updateBarChart() {
      // Restrict to top 5 models by benchmark_score.
      let barData = this.filteredData.slice();
      barData.sort((a, b) => b.benchmark_score - a.benchmark_score);
      barData = barData.slice(0, 5);
  
      let g = this.barChart.g;
      let innerWidth = this.barChart.innerWidth;
      // Use the id for labels now.
      let yScale = d3.scaleBand()
        .domain(barData.map(d => d.id))
        .range([0, this.barChart.innerHeight])
        .padding(0.1);
      let xScale = d3.scaleLinear()
        .domain([0, d3.max(barData, d => d.benchmark_score)])
        .range([0, innerWidth]);
  
      const colors = d3.schemeCategory10;
      
      let bars = g.selectAll(".bar").data(barData, d => d.id);
      bars.exit().remove();
      bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("y", d => yScale(d.id))
        .attr("height", yScale.bandwidth())
        .attr("x", 0)
        .attr("width", 0)
        .merge(bars)
        .transition().duration(750)
        .attr("y", d => yScale(d.id))
        .attr("height", yScale.bandwidth())
        .attr("x", 0)
        .attr("fill", (d, i) => colors[i % colors.length])
        .attr("width", d => xScale(d.benchmark_score));
  
      let labels = g.selectAll(".bar-label").data(barData, d => d.id);
      labels.exit().remove();
      labels.enter()
        .append("text")
        .attr("class", "bar-label")
        .attr("x", d => xScale(d.benchmark_score) + 5)
        .attr("y", d => yScale(d.id) + yScale.bandwidth() / 2)
        .attr("dy", ".35em")
        .merge(labels)
        .transition().duration(750)
        .attr("x", d => xScale(d.benchmark_score) + 5)
        .attr("y", d => yScale(d.id) + yScale.bandwidth() / 2)
        .text(d => d.benchmark_score);
  
      g.selectAll(".y-axis").remove();
      g.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yScale));
    }
  
    initLineChart() {
      let dataByDate = d3.groups(this.modelsData, d => {
          return d.releaseDateParsed.toISOString().slice(0, 10);
        })
        .map(([dateStr, values]) => ({
          date: new Date(dateStr),
          count: values.length
        }))
        .sort((a, b) => a.date - b.date);
  
      let margin = { top: 20, right: 20, bottom: 50, left: 50 };
      let container = d3.select("#lineChart");
      let width = container.node().getBoundingClientRect().width || 600;
      let height = 200;
      let svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);
      let innerWidth = width - margin.left - margin.right;
      let innerHeight = height - margin.top - margin.bottom;
      let g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
  
      let xScale = d3.scaleTime()
        .domain(d3.extent(dataByDate, d => d.date))
        .range([0, innerWidth]);
      
      let yScale = d3.scaleLinear()
        .domain([0, d3.max(dataByDate, d => d.count)])
        .nice()
        .range([innerHeight, 0]);
      
      let line = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.count));
      
      g.append("path")
        .datum(dataByDate)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("d", line);
      
      // Draw x-axis with full date labels.
      g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale)
                .tickFormat(d3.timeFormat("%b %d, %Y")))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");
      
      g.append("g")
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format("d")));
      
      let brush = d3.brushX()
        .extent([[0, 0], [innerWidth, innerHeight]])
        .on("end", brushed.bind(this));
      g.append("g")
        .attr("class", "brush")
        .call(brush);
      
      function brushed({ selection }) {
        if (!selection) {
          this.filteredData = this.modelsData;
        } else {
          let [x0, x1] = selection;
          let date0 = xScale.invert(x0);
          let date1 = xScale.invert(x1);
          this.filteredData = this.modelsData.filter(d => d.releaseDateParsed >= date0 && d.releaseDateParsed <= date1);
        }
        this.updateBarChart();
      }
      
      this.lineChart = { svg, xScale, yScale, margin, innerWidth, innerHeight };
    }
  }