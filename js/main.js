const promises = [
  d3.csv("data/benchmark_data/model_versions.csv"),
  d3.csv("data/benchmark_data/benchmarks_runs.csv"),
  d3.csv("data/stocks/NVDA_stock_2025-01-24_to_2025-01-27.csv"),
  d3.csv("data/stocks/GOOGL_stock_2025-01-24_to_2025-01-27.csv"),
  d3.csv("data/stocks/MSFT_stock_2025-01-24_to_2025-01-27.csv"),
  d3.csv("data/priceQualityData.csv"),
];

Promise.all(promises)
  .then(
    ([
      modelVersionsCsv,
      benchmarksCsv,
      nvdaCsv,
      googlCsv,
      msftCsv,
      priceQualCsv,
    ]) => {
      // Build a lookup map from model_versions.csv keyed by the exact "id" field.
      // Also include the human-readable "Model" field.
      const versionsMap = new Map();
      modelVersionsCsv.forEach(item => {
        versionsMap.set(item.id, {
          id: item.id,
          releaseDate: item["Version release date"] || "2025-01-01",
          Model: item.Model || item.id
        });
      });
      
      // Filter benchmarks_runs for task "GPQA diamond"
      const filteredBench = benchmarksCsv.filter(d => d.task === "GPQA diamond");

      // Create a composite map keyed by id from model_versions.
      const compositeMap = new Map();
      versionsMap.forEach((d, key) => {
        compositeMap.set(key, { 
          id: d.id,
          Model: d.Model,
          releaseDate: d.releaseDate,
          benchmark_score: 0,
          year: !isNaN(Date.parse(d.releaseDate))
                  ? new Date(d.releaseDate).getFullYear()
                  : 2025
        });
      });
      
      // For each benchmark run, directly match its "model" field to an "id".
      filteredBench.forEach(bench => {
        // Round benchmark score to 2 decimals then multiply by 100.
        const raw = +bench["Best score (across scorers)"];
        const rounded = Math.round((Math.round(raw * 100) / 100) * 100);
        const key = bench.model;  // direct match
        if (compositeMap.has(key)) {
          let curr = compositeMap.get(key);
          curr.benchmark_score = Math.max(curr.benchmark_score, rounded);
          compositeMap.set(key, curr);
        }
      });
      
      // Build composite array filtering only entries with benchmark_score > 0.
      const composite = Array.from(compositeMap.values()).filter(d => d.benchmark_score > 0);
      
      // Process priceQualityData for ScatterPlot as before.
      const priceQualData = priceQualCsv.map(item => ({
        ...item,
        "Price (USD per 1M Tokens)": +item["Price (USD per 1M Tokens)"],
        "Quality Score": +item["Quality Score"]
      }));
  
      // Now call main with our datasets.
      main(
        composite,  // composite dataset for ComboVis
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
  
// Main function once all data is loaded.
function main(
  compositeData,
  nvdaData,
  googlData,
  msftData,
  priceQualData
) {
  console.log("Stock data loaded successfully.");

  // Instantiate StockViz (ensure stockViz.js is included)
  const myStockViz = new StockViz("stockVis", nvdaData, googlData, msftData);


  d3.select("#stock-select").on("change", function () {
    const symbol = d3.select(this).property("value");
    myStockViz.setSymbol(symbol);
  });

  const scatterPlot = new ScatterPlot("price-qual-vis", priceQualData, {
    color: { main: "#0078b7", other: "#777" },
    interest: ["DeepSeek R1", "o1", "o1-mini", ""]
  });

  // Pass the composite dataset to ComboVis.
  const comboVis = new ComboVis("comboVis", compositeData);
}