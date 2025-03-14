// Load benchmark data (leave as-is for future use) plus the three stock CSVs
const promises = [
  d3.csv("data/benchmark_data/models.csv"),
  d3.csv("data/benchmark_data/benchmarks_runs.csv"),
  d3.csv("data/stocks/NVDA_stock_2025-01-24_to_2025-01-27.csv"),
  d3.csv("data/stocks/GOOGL_stock_2025-01-24_to_2025-01-27.csv"),
  d3.csv("data/stocks/MSFT_stock_2025-01-24_to_2025-01-27.csv"),
  d3.csv("data/priceQualityData.csv"),
];

Promise.all(promises)
  .then(
    ([modelsCsv, benchmarksCsv, nvdaCsv, googlCsv, msftCsv, priceQualCsv]) => {
      // Process models CSV data as before

      let modelsData = modelsCsv.map((item) => ({
        name: item.Model,
        trainingCompute: item["Training compute (FLOP)"],
        hardware: item["Training hardware"],
      }));

      let priceQualData = priceQualCsv.map((item) => ({
        ...item,
        "Price (USD per 1M Tokens)": +item["Price (USD per 1M Tokens)"],
        "Quality Score": +item["Quality Score"],
      }));

      // Filter out models with missing training compute data and convert the value to a number
      modelsData = modelsData

        .filter((item) => item.trainingCompute !== "" && item.hardware !== "")
        .map((item) => {
          return {
            ...item,
            trainingCompute: +item.trainingCompute,
          };
        });

      let benchmarksData = benchmarksCsv;

      // console.log("First model:", modelsData[0]);
      // console.log("First benchmark run:", benchmarksData[0]);

      // Now pass along the CSVs for stocks
      main(
        modelsData,
        benchmarksData,
        nvdaCsv,
        googlCsv,
        msftCsv,
        priceQualData
      );
    }
  )
  .catch((error) => {
    console.error("Error loading CSV data:", error);
  });

// Main function once all data is loaded
function main(
  modelsData,
  benchmarksData,
  nvdaData,
  googlData,
  msftData,
  priceQualData
) {
  // We hold modelsData and benchmarksData for future use, if needed.
  console.log("Stock data (NVDA, GOOG, MSFT) loaded successfully.");

  // Instantiate StockViz (make sure stockViz.js is already included in your HTML)
  const myStockViz = new StockViz("stockVis", nvdaData, googlData, msftData);

  // Listen for stock selector changes
  d3.select("#stock-select").on("change", function () {
    const symbol = d3.select(this).property("value");
    myStockViz.setSymbol(symbol);
  });

  const pieVis = new PieVis("hardware-vis", modelsData, {
    title: "Models by Hardware",
    slices: ["nvidia", "google", "amd", "intel"],
    colors: ["#76B900", "#f4b400", "#ED1C24", "#0071C5"],
    colorHover: ["#5E8C00", "#e5a500", "#9A1C20", "#005CA9"],
  });

  const scatterPlot = new ScatterPlot("price-qual-vis", priceQualData, {
    color: { main: "#0078b7", other: "#777" },
    interest: ["DeepSeek R1", "o1", "o1-mini", ""],
  });
}

// code for the choropleth map visualization (MapVis)
Promise.all([
  d3.csv("data/benchmark_data/models.csv"),
  d3.csv("data/benchmark_data/organizations.csv"),
  d3.json("data/world.geojson")
])
  .then(([rawModelsCsv, organizationsCsv, worldGeo]) => {
    // Instantiate MapVis using raw models CSV, organizations CSV, and the world GeoJSON.
    const mapVis = new MapVis("mapVis", rawModelsCsv, organizationsCsv, null, worldGeo);
  })
  .catch(error => {
    console.error("Error loading MapVis data:", error);
  });
