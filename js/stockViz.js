class StockViz {
  constructor(parentElement, rawData, symbol) {
    this.parentElement = parentElement;
    this.symbol = symbol;
    this.data = this.parseData(rawData);
    this.initVis();
  }
  
  parseData(rawData) {
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
    vis.margin = { top: 40, right: 30, bottom: 50, left: 50 };
    vis.width =
      document.getElementById(vis.parentElement).getBoundingClientRect().width -
      vis.margin.left -
      vis.margin.right;
    vis.height =
      document.getElementById(vis.parentElement).getBoundingClientRect().height -
      vis.margin.top -
      vis.margin.bottom;
  
    vis.svg = d3
      .select("#" + vis.parentElement)
      .append("svg")
      .attr("width", vis.width + vis.margin.left + vis.margin.right)
      .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
      .append("g")
      .attr("transform", `translate(${vis.margin.left}, ${vis.margin.top})`);
  
    vis.x = d3.scaleLinear().range([0, vis.width]);
    vis.y = d3.scaleLinear().range([vis.height, 0]);
  
    vis.xAxisGroup = vis.svg
      .append("g")
      .attr("transform", `translate(0, ${vis.height})`)
      .attr("class", "x-axis");
    vis.yAxisGroup = vis.svg.append("g").attr("class", "y-axis");
  
    vis.title = vis.svg
      .append("text")
      .attr("x", vis.width / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .style("font-size", "14px");
  
    // Create tooltip element (appended to body)
    vis.tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "lightsteelblue")
      .style("padding", "5px")
      .style("border-radius", "5px")
      .style("pointer-events", "none")
      .style("opacity", 0);
  
    // Append a vertical hover line (initially hidden)
    vis.hoverLine = vis.svg.append("line")
      .attr("class", "hover-line")
      .attr("y1", 0)
      .attr("y2", vis.height)
      .attr("stroke", "gray")
      .attr("stroke-width", 1)
      .style("opacity", 0);
  
    // Append transparent overlay rectangle for smooth mouse events
    vis.overlay = vis.svg.append("rect")
      .attr("width", vis.width)
      .attr("height", vis.height)
      .attr("fill", "none")
      .style("pointer-events", "all")
      .on("mouseover", () => {
        vis.hoverLine.style("opacity", 1);
        vis.tooltip.style("opacity", 0.9);
      })
      .on("mousemove", function(event) {
        const [mouseX] = d3.pointer(event);
        // Update hover line position
        vis.hoverLine.attr("x1", mouseX).attr("x2", mouseX);
  
        // Determine the corresponding compositeX value (from the x-scale)
        const compositeXValue = vis.x.invert(mouseX);
        // Use d3.bisector to find the closest data point in vis.flatData (sorted by compositeX)
        const bisect = d3.bisector(d => d.compositeX).left;
        const index = bisect(vis.flatData, compositeXValue);
        const d0 = vis.flatData[index - 1];
        const d1 = vis.flatData[index];
        let dNearest;
        if (!d0) {
          dNearest = d1;
        } else if (!d1) {
          dNearest = d0;
        } else {
          dNearest = compositeXValue - d0.compositeX < d1.compositeX - compositeXValue ? d0 : d1;
        }
  
        const formatTime = d3.timeFormat("%Y-%m-%d %H:%M");
        vis.tooltip.html(
          `<strong>Time:</strong> ${formatTime(dNearest.datetime)}<br/>
           <strong>Close:</strong> ${dNearest.close}`
        )
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        vis.hoverLine.style("opacity", 0);
        vis.tooltip.style("opacity", 0);
      });
  
    vis.wrangleData();
  }
  
  wrangleData() {
    const vis = this;
    const rawData = vis.data;
    const formatDay = d3.timeFormat("%Y-%m-%d");
    const dataByDay = d3.group(rawData, d => formatDay(d.datetime));
    const days = Array.from(dataByDay.keys()).sort();
  
    // Trading hours constants
    const TRADING_START = 570; // 9:30 AM = 570 minutes
    const TRADING_MINUTES = 390; // Trading minutes per day
  
    const flatData = [];
    days.forEach((day, i) => {
      const dayData = dataByDay.get(day);
      dayData.forEach(d => {
        const t = d.datetime;
        const minutes = t.getHours() * 60 + t.getMinutes();
        d.relativeMinutes = Math.max(0, minutes - TRADING_START);
        d.compositeX = i * TRADING_MINUTES + d.relativeMinutes;
        d.day = day;
        flatData.push(d);
      });
    });
  
    vis.days = days;
    vis.TRADING_MINUTES = TRADING_MINUTES;
    // Ensure flatData is sorted by compositeX for accurate bisect
    vis.flatData = flatData.sort((a, b) => a.compositeX - b.compositeX);
    vis.updateVis();
  }
  
  updateVis() {
    const vis = this;
    if (!vis.flatData || !vis.flatData.length) return;
  
    const totalTradingMinutes = vis.days.length * vis.TRADING_MINUTES;
    vis.x.domain([0, totalTradingMinutes]);
    vis.y.domain(d3.extent(vis.flatData, d => d.close)).nice();
  
    const tickInterval = 30;
    let tickValues = [];
    for (let day = 0; day < vis.days.length; day++) {
      for (let t = 0; t <= vis.TRADING_MINUTES; t += tickInterval) {
        tickValues.push(day * vis.TRADING_MINUTES + t);
      }
    }
  
    function formatCompositeTime(d) {
      const dayIndex = Math.floor(d / vis.TRADING_MINUTES);
      const relative = d % vis.TRADING_MINUTES;
      if (relative === 0 && vis.days[dayIndex]) {
        return `9:30||${vis.days[dayIndex]}`;
      }
      const totalMinutes = 570 + relative;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return minutes === 0
        ? hours.toString()
        : `${hours}:${minutes < 10 ? "0" + minutes : minutes}`;
    }
  
    vis.xAxisGroup.call(
      d3.axisBottom(vis.x)
        .tickValues(tickValues)
        .tickFormat(formatCompositeTime)
    );
    vis.yAxisGroup.call(d3.axisLeft(vis.y));
  
    vis.xAxisGroup.selectAll("text").attr("dy", "1.5em");
  
    const lineGenerator = d3
      .line()
      .x(d => vis.x(d.compositeX))
      .y(d => vis.y(d.close));
  
    // Remove previous line and circles
    vis.svg.selectAll(".line-path").remove();
    vis.svg.selectAll(".data-point").remove();
  
    // Draw the line
    vis.svg
      .append("path")
      .datum(vis.flatData)
      .attr("class", "line-path")
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", lineGenerator);
  
    // Draw circles at each data point (optional if you want markers)
    vis.svg.selectAll(".data-point")
      .data(vis.flatData)
      .enter()
      .append("circle")
      .attr("class", "data-point")
      .attr("r", 3)
      .attr("cx", d => vis.x(d.compositeX))
      .attr("cy", d => vis.y(d.close))
      .attr("fill", "steelblue");
  
    vis.title.text(`${vis.symbol} Closing Price (Compressed Trading Hours)`);
  
    // Customize x-axis tick labels multi-line if needed
    vis.svg.selectAll(".x-axis text").each(function() {
      const textEl = d3.select(this);
      const text = textEl.text();
      if (text.indexOf("||") > -1) {
        const parts = text.split("||");
        textEl.text("");
        textEl.append("tspan")
          .attr("x", 0)
          .attr("dy", "1.5em")
          .text(parts[0]);
        textEl.append("tspan")
          .attr("x", 0)
          .attr("dy", "1em")
          .text(parts[1]);
      } else {
        textEl.attr("dy", "1.5em");
      }
    }).style("text-anchor", "middle");
  }
}