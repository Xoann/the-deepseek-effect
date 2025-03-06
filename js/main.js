// Create an array of data-loading promises
const promises = [
  d3.csv("data/benchmark_data/models.csv"),
  d3.csv("data/benchmark_data/benchmarks_runs.csv"),
];

Promise.all(promises)
  .then(([modelsCsv, benchmarksCsv]) => {
    // Process models CSV data
    let modelsData = modelsCsv.map((item) => ({
      name: item.Model,
      trainingCompute: item["Training compute (FLOP)"],
    }));

    // Filter out models with missing training compute data and convert the value to a number
    modelsData = modelsData
      .filter((item) => item.trainingCompute !== "")
      .map((item) => {
        return {
          ...item,
          trainingCompute: +item.trainingCompute,
        };
      });

    let benchmarksData = benchmarksCsv;

    console.log("First model:", modelsData[0]);
    console.log("First benchmark run:", benchmarksData[0]);

    // Call the main function with loaded data
    main(modelsData, benchmarksData);
  })
  .catch((error) => {
    console.error("Error loading CSV data:", error);
  });

// Main function once all data is loaded
function main(modelsData, benchmarksData) {}
