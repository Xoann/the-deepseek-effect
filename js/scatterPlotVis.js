class ScatterPlot {
  constructor(parentElement, data, config) {
    this.parentElement = parentElement;
    this.data = data;
    this.config = config;

    console.log(this.data);

    let deepSeekModel = this.data.find((d) => d["Model"] === "DeepSeek R1");

    this.clicked(deepSeekModel);

    this.initVis();
  }

  initVis() {
    let vis = this;

    vis.margin = { top: 20, right: 60, bottom: 50, left: 50 };
    vis.width =
      document.getElementById(vis.parentElement).getBoundingClientRect().width -
      vis.margin.left -
      vis.margin.right;
    vis.height =
      document.getElementById(vis.parentElement).getBoundingClientRect()
        .height -
      vis.margin.top -
      vis.margin.bottom;

    vis.svg = d3
      .select("#" + vis.parentElement)
      .append("svg")
      .attr("width", vis.width + vis.margin.left + vis.margin.right)
      .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
      .append("g")
      .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

    vis.xScale = d3.scaleLinear().range([0, vis.width]);
    vis.yScale = d3.scaleLinear().range([vis.height, 0]);

    vis.xAxis = vis.svg
      .append("g")
      .attr("transform", `translate(0,${vis.height})`);

    vis.yAxis = vis.svg.append("g");

    // Add x-axis title
    vis.svg
      .append("text")
      .attr("class", "x-axis-label")
      .attr("text-anchor", "middle")
      .attr("x", vis.width / 2)
      .attr("y", vis.height + vis.margin.bottom - 10)
      .text("Quality Score");

    // Add y-axis title
    vis.svg
      .append("text")
      .attr("class", "y-axis-label")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -vis.height / 2)
      .attr("y", -vis.margin.left + 15)
      .text("Price (USD per 1M Tokens)");

    vis.wrangleData();
  }

  wrangleData() {
    this.updateVis();
  }

  updateVis() {
    let vis = this;

    const xMin = d3.min(vis.data, (d) => d["Quality Score"]);
    const xMax = d3.max(vis.data, (d) => d["Quality Score"]);
    const xMargin = (xMax - xMin) * 0.05;
    vis.xScale.domain([xMin - xMargin, xMax]);
    vis.yScale.domain([
      0,
      d3.max(vis.data, (d) => d["Price (USD per 1M Tokens)"]),
    ]);

    console.log([0, d3.max(vis.data, (d) => d["Price (USD per 1M Tokens)"])]);

    vis.xAxis.call(d3.axisBottom(vis.xScale));
    vis.yAxis.call(d3.axisLeft(vis.yScale));

    let interestData = vis.data.filter((d) =>
      vis.config.interest.includes(d["Model"])
    );

    vis.svg
      .selectAll(".dot-label")
      .data(interestData)
      .join("text")
      .attr("class", "dot-label")
      .attr("x", (d) => vis.xScale(d["Quality Score"]) + 7) // adjust offset as needed
      .attr("y", (d) => vis.yScale(d["Price (USD per 1M Tokens)"]) - 7)
      .text((d) => d["Model"])
      .attr("font-size", "10px")
      .attr("fill", "black");

    vis.svg
      .selectAll(".dot")
      .data(vis.data)
      .join("circle")
      .attr("class", "dot")
      .attr("cx", (d) => vis.xScale(d["Quality Score"]))
      .attr("cy", (d) => vis.yScale(d["Price (USD per 1M Tokens)"]))
      .attr("r", 5)
      .attr("fill", (d) =>
        vis.config.interest.includes(d["Model"])
          ? vis.config.color.main
          : vis.config.color.other
      )
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        vis.clicked(d);
      });
  }

  clicked(dataPoint) {
    d3.select("#scatter-model").text(dataPoint["Model"]);
    d3.select("#scatter-qual").text(dataPoint["Quality Score"]);
    d3.select("#scatter-price").text(dataPoint["Price (USD per 1M Tokens)"]);
  }
}
