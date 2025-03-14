class MapVis {
    /**
     * @param {string} parentElement - The id of the container element
     * @param {Array} modelsData - Data loaded from models.csv
     * @param {Array} organizationsData - Data loaded from organizations.csv
     * @param {Array} countriesData - Data loaded from countries.csv
     * @param {Object} geoData - GeoJSON data for the world map
     */
    constructor(parentElement, modelsData, organizationsData, countriesData, geoData) {
      this.parentElement = parentElement;
      this.modelsData = modelsData;
      this.organizationsData = organizationsData;
      this.countriesData = countriesData;
      this.geoData = geoData;
      this.initVis();
    }
  
    initVis() {
      let vis = this;
      // Define margins and dimensions
      vis.margin = { top: 20, right: 20, bottom: 20, left: 20 };
      vis.width =
        document.getElementById(vis.parentElement).getBoundingClientRect().width -
        vis.margin.left -
        vis.margin.right;
      vis.height =
        document.getElementById(vis.parentElement).getBoundingClientRect().height -
        vis.margin.top -
        vis.margin.bottom;
  
      // Create the SVG drawing area
      vis.svg = d3
        .select("#" + vis.parentElement)
        .append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");
  
      // Use fitSize to ensure the map fits within the container
      vis.projection = d3.geoNaturalEarth1().fitSize([vis.width, vis.height], vis.geoData);
      vis.path = d3.geoPath().projection(vis.projection);
  
      // Color scale: using d3.interpolatePlasma for a more vibrant look
      vis.colorScale = d3.scaleSequential(d3.interpolatePlasma);
  
      // Process the CSV data to compute models per country
      vis.wrangleData();
    }
  
    wrangleData() {
        let vis = this;
      
        // Dictionary to unify CSV country names to what the map expects:
        const nameFixes = {
          "united states": "united states of america",
          "usa": "united states of america",
          // add other mappings if needed
        };
      
        // Build a mapping from organization names to country/countries
        let orgToCountries = {};
        vis.organizationsData.forEach((d) => {
          if (d.Organization && d.Country) {
            let orgName = d.Organization.trim().toLowerCase();
            // Some entries may list multiple countries separated by commas
            let countryList = d.Country.split(",").map((s) => s.trim().toLowerCase());
      
            // Normalize each country name so it matches the map’s internal name
            countryList = countryList.map(country => {
              return nameFixes[country] ? nameFixes[country] : country; 
            });
      
            orgToCountries[orgName] = countryList;
          }
        });
      
        // Count models per country
        let countByCountry = {};
        vis.modelsData.forEach((d) => {
          if (d.Organization && d.Model) {
            let orgs = d.Organization.split(",").map((s) => s.trim().toLowerCase());
            orgs.forEach((org) => {
              if (orgToCountries[org]) {
                orgToCountries[org].forEach((country) => {
                  if (countByCountry[country]) {
                    countByCountry[country].add(d.Model);
                  } else {
                    countByCountry[country] = new Set([d.Model]);
                  }
                });
              }
            });
          }
        });
      
        // Convert the sets to counts
        vis.modelsPerCountry = Object.entries(countByCountry).map(([country, models]) => {
          return { country, count: models.size };
        });
      
        // Determine maximum count for the color scale
        let maxCount = d3.max(vis.modelsPerCountry, (d) => d.count) || 1;
        vis.colorScale.domain([0, maxCount]);
      
        // Create a lookup object for quick access
        vis.countLookup = {};
        vis.modelsPerCountry.forEach((d) => {
          vis.countLookup[d.country] = d.count;
        });
      
        vis.updateVis();
      }
      
  
    updateVis() {
      let vis = this;
  
      // A dictionary to unify mismatched names from the GeoJSON to CSV
  
      const nameFixes = {
       
      };
  
      // Draw the world map by binding geoData features
      vis.svg
        .selectAll("path")
        .data(vis.geoData.features)
        .join("path")
        .attr("d", vis.path)
        .attr("fill", function (d) {
          // Get the country name from the GeoJSON and convert to lower case
          let countryName = d.properties.name.toLowerCase();
  
          // If there's a mismatch fix, unify it
          if (nameFixes[countryName]) {
            countryName = nameFixes[countryName];
          }
  
          // If count == 0, fill grey; otherwise use color scale
          let count = vis.countLookup[countryName] || 0;
          return count === 0 ? "#cccccc" : vis.colorScale(count);
        })
        .attr("stroke", "white")
        .attr("stroke-width", 0.5)
        .on("mouseover", function (event, d) {
          let rawName = d.properties.name; // The original GeoJSON name
          let lookupName = rawName.toLowerCase();
  
          // Apply the same fix for tooltip lookup
          if (nameFixes[lookupName]) {
            lookupName = nameFixes[lookupName];
          }
          let count = vis.countLookup[lookupName] || 0;
  
          // Increase stroke width for highlight
          d3.select(this).attr("stroke-width", 1.5);
  
          // Remove any existing tooltip with the same ID (to avoid duplicates)
          d3.select("body").selectAll("#mapTooltip").remove();
  
          // Append a new tooltip
          d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .attr("id", "mapTooltip")
            .style("position", "absolute")
            .style("background", "rgba(255,255,255,0.9)")
            .style("padding", "8px")
            .style("border", "1px solid #ccc")
            .style("border-radius", "5px")
            .style("pointer-events", "none")
            .style("opacity", 0)
            .html(`
              <strong>${rawName}</strong><br/>
              Models: ${count}
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px")
            .transition()
            .duration(200)
            .style("opacity", 1);
        })
        .on("mouseout", function (event, d) {
          // Restore stroke width
          d3.select(this).attr("stroke-width", 0.5);
  
          // Fade out and remove the tooltip
          d3.select("#mapTooltip")
            .transition()
            .duration(200)
            .style("opacity", 0)
            .on("end", function () {
              d3.select(this).remove();
            });
        });
  
      // Add a title to the visualization
      vis.svg
        .append("text")
        .attr("x", vis.width / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text("");
    }
  }
  