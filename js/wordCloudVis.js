class WordCloudVis {
    constructor(parentElement, loadedText) {
      this.parentElement = parentElement;
      // Here loadedText is already the headline string.
      this.text = loadedText;
      this.initVis();
    }
    
    async initVis() {
      const container = d3.select(`#${this.parentElement}`);
      container.html("");
      
      // Get container dimensions.
      const containerNode = container.node();
      const { width: containerWidth, height: containerHeight } = containerNode.getBoundingClientRect();
      // Fallback dimensions if container returns 0.
      const svgWidth = containerWidth || 800;
      const svgHeight = containerHeight || 600;
      
      // Append svg using computed dimensions.
      container.append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);
      
      // Use the provided text directly.
      let text = this.text;
      
      let words = text.toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && word !== 'deepseek');
          
      let wordCounts = {};
      words.forEach(word => wordCounts[word] = (wordCounts[word] || 0) + 1);
        
      let wordArray = Object.entries(wordCounts)
        .map(([word, count]) => ({ text: word, size: count * 10 }));
        
      // Create the word cloud layout.
      let layout = d3.layout.cloud()
        .size([svgWidth, svgHeight])
        .words(wordArray)
        .padding(5)
        .rotate(() => ~~(Math.random() * 2) * 90)
        .fontSize(d => d.size)
        .on('end', words => this.draw(words, svgWidth, svgHeight));
        
      layout.start();
    }
    
    draw(words, svgWidth, svgHeight) {
      d3.select(`#${this.parentElement} svg`)
        .selectAll("g")
        .data([words])
        .join("g")
        .attr("transform", `translate(${svgWidth/2},${svgHeight/2})`)
        .selectAll("text")
        .data(words)
        .join("text")
        .style("font-size", d => d.size + "px")
        .style("fill", (d, i) => d3.schemeCategory10[i % 10])
        .attr("text-anchor", "middle")
        .attr("transform", d => `translate(${d.x}, ${d.y}) rotate(${d.rotate})`)
        .text(d => d.text);
    }
  }