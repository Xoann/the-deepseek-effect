// Load benchmark data (leave as-is for future use) plus the three stock CSVs
const promises = [
  d3.csv("data/benchmark_data/models.csv"),
  d3.csv("data/benchmark_data/benchmarks_runs.csv"),
  d3.csv("data/stocks/NVDA_stock_2025-01-24_to_2025-01-27.csv"),
  d3.csv("data/stocks/GOOGL_stock_2025-01-24_to_2025-01-27.csv"),
  d3.csv("data/stocks/MSFT_stock_2025-01-24_to_2025-01-27.csv"),
];

Promise.all(promises)
  .then(([modelsCsv, benchmarksCsv, nvdaCsv, googlCsv, msftCsv]) => {
    // Process models CSV data as before

    let modelsData = modelsCsv.map((item) => ({
      name: item.Model,
      trainingCompute: item["Training compute (FLOP)"],
      hardware: item["Training hardware"],
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
    main(modelsData, benchmarksData, nvdaCsv, googlCsv, msftCsv);
  })
  .catch((error) => {
    console.error("Error loading CSV data:", error);
  });

// Main function once all data is loaded
function main(modelsData, benchmarksData, nvdaData, googlData, msftData) {
  // We hold modelsData and benchmarksData for future use, if needed.
  console.log("Stock data (NVDA, GOOG, MSFT) loaded successfully.");
  
  // Instantiate StockViz (make sure stockViz.js is already included in your HTML)
  const myStockViz = new StockViz("chartDiv", nvdaData, googlData, msftData);

  // Listen for stock selector changes
  d3.select("#stock-select").on("change", function() {
    const symbol = d3.select(this).property("value");
    myStockViz.setSymbol(symbol);
  });
  
  const pieVis = new PieVis("hardware-vis", modelsData, {
    title: "Models by Hardware",
    slices: ["nvidia", "google", "amd", "intel"],
    colors: ["#76B900", "#4285F4", "#ED1C24", "#0071C5"],
    colorHover: ["#5E8C00", "#3366CC", "#9A1C20", "#005CA9"],
  });
}

