document.addEventListener("DOMContentLoaded", function () {
  const promises = [
    d3.csv("data/benchmark_data/models.csv"),
    d3.csv("data/benchmark_data/model_versions.csv"),
    d3.csv("data/benchmark_data/benchmarks_runs.csv"),
    d3.csv("data/stocks/NVDA_stock_2025-01-24_to_2025-01-27.csv"),
    d3.csv("data/stocks/GOOGL_stock_2025-01-24_to_2025-01-27.csv"),
    d3.csv("data/stocks/MSFT_stock_2025-01-24_to_2025-01-27.csv"),
    d3.csv("data/priceQualityData.csv"),
    d3.text("data/deepseek_headlines.txt")
  ];

  Promise.all(promises)
    .then(
      ([
        modelsCsv,
        modelVersionsCsv,
        benchmarksCsv,
        nvdaCsv,
        googlCsv,
        msftCsv,
        priceQualCsv,
        wordCloudText
      ]) => {
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

        // Build a lookup map from model_versions.csv keyed by the exact "id" field.
        // Also include the human-readable "Model" field.
        const versionsMap = new Map();
        modelVersionsCsv.forEach((item) => {
          versionsMap.set(item.id, {
            id: item.id,
            releaseDate: item["Version release date"] || "2025-01-01",
            Model: item.Model || item.id,
          });
        });

        // Filter benchmarks_runs for task "GPQA diamond"
        const filteredBench = benchmarksCsv.filter(
          (d) => d.task === "GPQA diamond"
        );

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
              : 2025,
          });
        });

        // For each benchmark run, directly match its "model" field to an "id".
        filteredBench.forEach(bench => {
          const raw = +bench["Best score (across scorers)"];
          const rounded = Math.round((Math.round(raw * 100) / 100) * 100);
          const key = bench.model; // direct match
          if (compositeMap.has(key)) {
            let curr = compositeMap.get(key);
            curr.benchmark_score = Math.max(curr.benchmark_score, rounded);
            compositeMap.set(key, curr);
          }
        });

        // Build composite array filtering only entries with benchmark_score > 0.
        const composite = Array.from(compositeMap.values()).filter(
          (d) => d.benchmark_score > 0
        );

        // Process priceQualityData for ScatterPlot as before.
        const priceQualData = priceQualCsv.map((item) => ({
          ...item,
          "Price (USD per 1M Tokens)": +item["Price (USD per 1M Tokens)"],
          "Quality Score": +item["Quality Score"],
        }));

        // Now call main with our datasets.
        main(
          modelsData,
          composite, // composite dataset for ComboVis
          nvdaCsv,
          googlCsv,
          msftCsv,
          priceQualData,
          wordCloudText  // Pass loaded word cloud text to main()
        );
      }
    )
    .catch((error) => {
      console.error("Error loading CSV data:", error);
    });

  // Main function once all data is loaded.
  function main(
    modelsData,
    compositeData,
    nvdaData,
    googlData,
    msftData,
    priceQualData,
    wordCloudText
  ) {
    console.log("Stock data loaded successfully.");

    // Instantiate three independent StockViz panels:
    const stockNVDA = new StockViz("stockVisNVDA", nvdaData, "NVDA");
    const stockGOOGL = new StockViz("stockVisGOOGL", googlData, "GOOGL");
    const stockMSFT = new StockViz("stockVisMSFT", msftData, "MSFT");
    
    // Instantiate hardware visualization (PieVis)
    const pieVis = new PieVis("hardware-vis", modelsData, {
      title: "Models by Hardware",
      slices: ["nvidia", "google", "amd", "intel"],
      colors: ["#76B900", "#4285F4", "#ED1C24", "#0071C5"],
      colorHover: ["#5E8C00", "#3366CC", "#9A1C20", "#005CA9"],
    });

    d3.select("#stock-select").on("change", function () {
      const symbol = d3.select(this).property("value");
      // myStockViz may be your global stock viz instance controlled by a select
      // Adjust as needed.
      myStockViz.setSymbol(symbol);
    });

    const scatterPlot = new ScatterPlot("price-qual-vis", priceQualData, {
      color: { main: "#0078b7", other: "#777" },
      interest: ["DeepSeek R1", "o1", "o1-mini", ""],
    });
    
    // ComboVis remains unchanged.
    const comboVis = new ComboVis("comboVis", compositeData);
    
    // Instantiate MapVis.
    Promise.all([
      d3.csv("data/benchmark_data/models.csv"),
      d3.csv("data/benchmark_data/organizations.csv"),
      d3.json("data/world.geojson"),
    ])
      .then(([rawModelsCsv, organizationsCsv, worldGeo]) => {
        const mapVis = new MapVis(
          "mapVis",
          rawModelsCsv,
          organizationsCsv,
          null,
          worldGeo
        );
      })
      .catch((error) => {
        console.error("Error loading MapVis data:", error);
      });

    // Instantiate the Word Cloud visualization using the loaded headlines text.
    const wordCloudVis = new WordCloudVis("wordCloudVis", wordCloudText);
  }

  // (Optional) If you have a separate MapVis instantiation outside main(), remove duplicate code.
});