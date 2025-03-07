class PieVis {
  constructor(parentElement, data, config) {
    this.parentElement = parentElement;
    this.data = data;
    this.displayData = data;
    this.colors = config.colors;

    this.config = config;

    this.initVis();
  }

  initVis() {
    let vis = this;

    // margin conventions
    vis.margin = { top: 10, right: 50, bottom: 10, left: 50 };
    vis.width =
      document.getElementById(vis.parentElement).getBoundingClientRect().width -
      vis.margin.left -
      vis.margin.right;
    vis.height =
      document.getElementById(vis.parentElement).getBoundingClientRect()
        .height -
      vis.margin.top -
      vis.margin.bottom;

    // init drawing area
    vis.svg = d3
      .select("#" + vis.parentElement)
      .append("svg")
      .attr("width", vis.width + vis.margin.left + vis.margin.right)
      .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
      .append("g")
      .attr(
        "transform",
        "translate(" + vis.margin.left + "," + vis.margin.top + ")"
      );

    // create pie layout and arc generator
    vis.pie = d3
      .pie()
      .value((d) => d.value)
      .sort(null);

    vis.arc = d3
      .arc()
      .innerRadius(0)
      .outerRadius(Math.min(vis.width, vis.height) / 2 - 40);

    // append a group element to hold the pie chart and center it
    vis.pieGroup = vis.svg
      .append("g")
      .attr("class", "pie-chart")
      .attr("transform", `translate(${vis.width / 2}, ${vis.height / 2})`);

    // append a title
    vis.svg
      .append("g")
      .attr("class", "title pie-title")
      .append("text")
      .text(vis.config.title)
      .attr("transform", `translate(${vis.width / 2}, 20)`)
      .attr("text-anchor", "middle");

    // append tooltip
    vis.tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .attr("id", "pieTooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background", "lightgrey")
      .style("border", "1px solid grey")
      .style("border-radius", "5px")
      .style("padding", "10px");

    // call next method in pipeline
    this.wrangleData();
  }

  wrangleData() {
    let vis = this;

    vis.displayData = [];

    for (let i = 0; i < vis.config.slices.length; i++) {
      vis.displayData.push({
        value: vis.data.filter((d) =>
          d.hardware.toLowerCase().includes(vis.config.slices[i].toLowerCase())
        ).length,
        color: vis.colors[i],
        name: vis.config.slices[i],
      });
    }

    console.log("Pie chart data:", vis.displayData);

    vis.updateVis();
  }

  updateVis() {
    let vis = this;

    let arcs = vis.pieGroup.selectAll("path").data(vis.pie(vis.displayData));

    arcs.exit().remove();

    arcs
      .enter()
      .append("path")
      .merge(arcs)
      .attr("fill", (d) => d.data.color)
      .attr("stroke", "none")
      .transition()
      .duration(750)
      .attrTween("d", function (d) {
        let interpolate = d3.interpolate(this._current || d, d);
        this._current = interpolate(1);
        return function (t) {
          return vis.arc(interpolate(t));
        };
      });

    vis.pieGroup
      .selectAll("path")
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(500)
          .attr("fill", vis.config.colorHover[d.index]);

        vis.tooltip.style("opacity", 1).html(`
            <div>
              <h3 style="text-transform: capitalize">${d.data.name}</h3>
              <h4>Number of models: ${d.value}</h4>                              
            </div>
          `);
      })
      .on("mousemove", function (event) {
        vis.tooltip
          .style("left", event.pageX + 20 + "px")
          .style("top", event.pageY + "px");
      })
      .on("mouseout", function (event, d) {
        d3.select(this).transition().duration(500).attr("fill", d.data.color);

        vis.tooltip.style("opacity", 0);
      });

    // Calculate total value to compute percentage
    let totalValue = d3.sum(vis.displayData, (d) => d.value);

    // Add labels to pie chart wedges if wedge percentage > 10%
    let labels = vis.pieGroup
      .selectAll(".label")
      .data(
        vis.pie(vis.displayData).filter((d) => d.data.value / totalValue > 0.1)
      );

    labels.exit().remove();

    labels
      .enter()
      .append("text")
      .attr("class", "label")
      .merge(labels)
      .transition()
      .duration(750)
      .attr("transform", function (d) {
        return "translate(" + vis.arc.centroid(d) + ")";
      })
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("style", "text-transform: capitalize")
      .text((d) => d.data.name);
  }
}
