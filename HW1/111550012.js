    const margin = { top: 20, right: 30, bottom: 50, left: 70 },
      width = 800 - margin.left - margin.right,
      height = 600 - margin.top - margin.bottom;

    // Load the dataset
    d3.csv('./iris.csv').then(data => {
      // Convert data to numbers where appropriate
      data.forEach(d => {
        d['sepal length'] = +d['sepal length'];
        d['sepal width'] = +d['sepal width'];
        d['petal length'] = +d['petal length'];
        d['petal width'] = +d['petal width'];
      });

      const svg = d3.select("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

      const tooltip = d3.select(".tooltip");

      // Define the attributes for the dropdown menus
      const attributes = ['sepal length', 'sepal width', 'petal length', 'petal width'];

      // Populate dropdowns
      const xDropdown = d3.select('#x-axis');
      const yDropdown = d3.select('#y-axis');

      attributes.forEach(attr => {
        xDropdown.append('option').attr('value', attr).text(attr);
        yDropdown.append('option').attr('value', attr).text(attr);
      });

      // Set default selections
      xDropdown.property('value', 'sepal length');
      yDropdown.property('value', 'sepal width');

      // Define scales
      let xScale = d3.scaleLinear().range([0, width]);
      let yScale = d3.scaleLinear().range([height, 0]);

      // Define the color scale for classes
      const colorScale = d3.scaleOrdinal()
        .domain(["Iris-setosa", "Iris-versicolor", "Iris-virginica"])
        .range(["#1f77b4", "#ff7f0e", "#2ca02c"]); // Colors for the three flower classes

      // Add axis groups
      const xAxisGroup = svg.append("g")
        .attr("transform", `translate(0, ${height})`);
      const yAxisGroup = svg.append("g");

      // Function to update the scatter plot
      function updatePlot(xAttr, yAttr) {
        // Update scales based on the selected attributes
        xScale.domain([d3.min(data, d => d[xAttr]) * 0.9, d3.max(data, d => d[xAttr]) * 1.1]);
        yScale.domain([d3.min(data, d => d[yAttr]) * 0.9, d3.max(data, d => d[yAttr]) * 1.1]);

        // Create axis transitions
        const t = svg.transition().duration(1000);
        xAxisGroup.transition(t).call(d3.axisBottom(xScale));
        yAxisGroup.transition(t).call(d3.axisLeft(yScale));

        // Add axis labels
        svg.selectAll(".x-label").remove();
        svg.selectAll(".y-label").remove();
        svg.append("text")
          .attr("class", "x-label")
          .attr("x", width / 2)
          .attr("y", height + 40)
          .style("text-anchor", "middle")
          .text(xAttr);
        svg.append("text")
          .attr("class", "y-label")
          .attr("transform", "rotate(-90)")
          .attr("x", -height / 2)
          .attr("y", -50)
          .style("text-anchor", "middle")
          .text(yAttr);

        // Join data to circles
        const circles = svg.selectAll("circle").data(data);

        // Remove old circles
        circles.exit().remove();

        // Add new circles
        circles.enter().append("circle")
          .attr("r", 5)
          .attr("fill", d => colorScale(d['class']))
          .merge(circles)
          .transition(t)
          .attr("cx", d => xScale(d[xAttr]))
          .attr("cy", d => yScale(d[yAttr]));

        // Add hover interactions (tooltip and highlighting)
        svg.selectAll("circle")
          .on("mouseover", function (event, d) {
            d3.select(this).attr("r", 8).style("stroke", "#333").style("stroke-width", 2);
            tooltip.style("display", "block")
              .html(`Class: ${d['class']}<br>${xAttr}: ${d[xAttr]}<br>${yAttr}: ${d[yAttr]}`)
              .style("left", (event.pageX + 5) + "px")
              .style("top", (event.pageY - 28) + "px");
          })
          .on("mouseout", function () {
            d3.select(this).attr("r", 5).style("stroke", "none");
            tooltip.style("display", "none");
          });

      d3.select("#legend-container").selectAll(".legend-item").remove(); // Clear old legend
             const legendContainer = d3.select("#legend-container");
      
             const legend = legendContainer.selectAll(".legend-item")
                  .data(colorScale.domain())
                  .enter().append("div")
                  .attr("class", "legend-item")
                  .style("margin-bottom", "10px"); // Space between legend items
      
              legend.append("div")
                  .style("display", "inline-block")
                  .style("width", "18px")
                  .style("height", "18px")
                  .style("background-color", d => colorScale(d));
      
              legend.append("span")
                  .style("padding-left", "5px")
                  .text(d => d);
      } // Add closing parenthesis here

      // Initial plot
      updatePlot('sepal length', 'sepal width');

      // Update plot on dropdown change
      xDropdown.on('change', () => {
        const xAttr = xDropdown
          .property('value');
        const yAttr = yDropdown.property('value');
        updatePlot(xAttr, yAttr);
      });
              yDropdown.on('change', () => {
        const xAttr = xDropdown.property('value');
        const yAttr = yDropdown.property('value');
        updatePlot(xAttr, yAttr);
      });

      // Enable zoom functionality
      const zoom = d3.zoom()
        .scaleExtent([0.5, 10])
        .on("zoom", function (event) {
          svg.attr("transform", event.transform);
        });

      d3.select("svg").call(zoom);
    });
