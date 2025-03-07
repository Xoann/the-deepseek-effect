// Create an array of data-loading promises
const promises = [
  d3.csv("data/benchmark_data/models.csv"),
  d3.csv("data/benchmark_data/benchmarks_runs.csv"),
];

Promise.all(promises)
  .then(([modelsCsv, benchmarksCsv]) => {
    // Process models CSV data
    console.log("Models data:", modelsCsv[0]);
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

    // Call the main function with loaded data
    main(modelsData, benchmarksData);
  })
  .catch((error) => {
    console.error("Error loading CSV data:", error);
  });

// Main function once all data is loaded
function main(modelsData, benchmarksData) {
  const pieVis = new PieVis("hardware-vis", modelsData, {
    title: "Models by Hardware",
    slices: ["nvidia", "google", "amd", "intel"],
    colors: ["#76B900", "#4285F4", "#ED1C24", "#0071C5"],
    colorHover: ["#5E8C00", "#3366CC", "#9A1C20", "#005CA9"],
  });
}
