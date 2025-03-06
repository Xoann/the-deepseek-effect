class StockViz {
    constructor(parentElement, nvdaData, googlData, msftData) {
      this.parentElement = parentElement;
      this.dataBySymbol = {
        NVDA: this.parseData(nvdaData),
        GOOGL: this.parseData(googlData),
        MSFT: this.parseData(msftData),
      };
      this.selectedSymbol = "NVDA"; // default
      this.initVis();
    }
  
    parseData(rawData) {
      // Convert strings to number/date
      const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
      return rawData.map(d => ({
        datetime: parseTime(d.datetime),
        open: +d.open,
        high: +d.high,
        low: +d.low,
        close: +d.close,
        volume: +d.volume
      }));
    }
  
    initVis() {
      const vis = this;
      // Set up margins
      vis.margin = { top: 40, right: 30, bottom: 50, left: 50 };
      vis.width =
        document.getElementById(vis.parentElement).getBoundingClientRect().width -
        vis.margin.left -
        vis.margin.right;
      vis.height =
        document.getElementById(vis.parentElement).getBoundingClientRect().height -
        vis.margin.top -
        vis.margin.bottom;
  
      // SVG drawing area
      vis.svg = d3
        .select("#" + vis.parentElement)
        .append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
        .append("g")
        .attr("transform", `translate(${vis.margin.left}, ${vis.margin.top})`);
  
      // Scales (will be configured in updateVis)
      vis.x = d3.scaleLinear().range([0, vis.width]);
      vis.y = d3.scaleLinear().range([vis.height, 0]);
  
      // Axes groups
      vis.xAxisGroup = vis.svg
        .append("g")
        .attr("transform", `translate(0, ${vis.height})`)
        .attr("class", "x-axis");
      vis.yAxisGroup = vis.svg.append("g").attr("class", "y-axis");
  
      // Title
      vis.title = vis.svg
        .append("text")
        .attr("x", vis.width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "14px");
  
      vis.wrangleData();
    }
  
    wrangleData() {
      const vis = this;
      // Grab data for current symbol
      const rawData = this.dataBySymbol[this.selectedSymbol];
      
      // Group data by day (YYYY-MM-DD)
      const formatDay = d3.timeFormat("%Y-%m-%d");
      const dataByDay = d3.group(rawData, d => formatDay(d.datetime));
      const days = Array.from(dataByDay.keys()).sort();
  
      // Trading hours constants:
      const TRADING_START = 570; // 9:30 AM = 9*60+30
      const TRADING_MINUTES = 390; // 16:00 = 960 minutes - 570 = 390 minutes
  
      // For each day, compute a relative minute value and composite x value
      const flatData = [];
      days.forEach((day, i) => {
        const dayData = dataByDay.get(day);
        dayData.forEach(d => {
          const t = d.datetime;
          const minutes = t.getHours() * 60 + t.getMinutes();
          // Compute minutes since trading start (if before 9:30, it'll clamp to 0)
          d.relativeMinutes = Math.max(0, minutes - TRADING_START);
          // Composite x: offset per day plus relative minutes
          d.compositeX = i * TRADING_MINUTES + d.relativeMinutes;
          d.day = day;
          flatData.push(d);
        });
      });
  
      vis.days = days;
      vis.TRADING_MINUTES = TRADING_MINUTES;
      vis.flatData = flatData;
      vis.updateVis();
    }
  
    updateVis() {
      const vis = this;
      if (!vis.flatData || !vis.flatData.length) return;
  
      // Total composite width = number of days * TRADING_MINUTES
      const totalTradingMinutes = vis.days.length * vis.TRADING_MINUTES;
      vis.x.domain([0, totalTradingMinutes]);
      vis.y.domain(d3.extent(vis.flatData, d => d.close)).nice();
  
      // Generate tick values every 30 minutes per day
      const tickInterval = 30;
      let tickValues = [];
      for (let day = 0; day < vis.days.length; day++) {
        for (let t = 0; t <= vis.TRADING_MINUTES; t += tickInterval) {
          tickValues.push(day * vis.TRADING_MINUTES + t);
        }
      }
  
      // Custom tick formatter: if tick is at start of a day, include date info
      function formatCompositeTime(d) {
        const dayIndex = Math.floor(d / vis.TRADING_MINUTES);
        const relative = d % vis.TRADING_MINUTES;
        if (relative === 0 && vis.days[dayIndex]) {
          return `9:30||${vis.days[dayIndex]}`;
        }
        const totalMinutes = 570 + relative; // trading starts at 570 minutes
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return minutes === 0 ? hours.toString() : `${hours}:${minutes < 10 ? "0" + minutes : minutes}`;
      }
    
      // Draw axes using the composite scale & custom tick formatter
      vis.xAxisGroup.call(
        d3.axisBottom(vis.x)
          .tickValues(tickValues)
          .tickFormat(formatCompositeTime)
      );
      vis.yAxisGroup.call(d3.axisLeft(vis.y));
  
      // Lower all x-axis tick labels with additional dy padding so they don't overlap
      vis.xAxisGroup.selectAll("text")
        .attr("dy", "1.5em");
  
      // Draw line using compositeX as the x-coordinate
      const lineGenerator = d3
        .line()
        .x(d => vis.x(d.compositeX))
        .y(d => vis.y(d.close));
  
      // Remove any old path and draw the new one
      vis.svg.selectAll(".line-path").remove();
      vis.svg
        .append("path")
        .datum(vis.flatData.sort((a, b) => a.compositeX - b.compositeX))
        .attr("class", "line-path")
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("d", lineGenerator);
  
      // Update title
      vis.title.text(`${vis.selectedSymbol} Closing Price (Compressed Trading Hours)`);
  
 // Reformat x-axis tick labels: if label contains "||", split into two lines
vis.svg.selectAll(".x-axis text").each(function() {
    const textEl = d3.select(this);
    const text = textEl.text();
    if (text.indexOf("||") > -1) {
      const parts = text.split("||");
      textEl.text(""); // Clear existing text.
      textEl.append("tspan")
        .attr("x", 0)
        .attr("dy", "1.5em")
        .text(parts[0]);
      textEl.append("tspan")
        .attr("x", 0)
        .attr("dy", "1em") // Reduced vertical offset for the date
        .text(parts[1]);
    } else {
      textEl.attr("dy", "1.5em");
    }
  }).style("text-anchor", "middle");
    }
  
    setSymbol(symbol) {
      this.selectedSymbol = symbol;
      this.wrangleData();
    }
  }