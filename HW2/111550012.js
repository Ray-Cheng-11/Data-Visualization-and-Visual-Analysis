// Set dimensions and margins for the plot
const margin = { top: 30, right: 150, bottom: 10, left: 50 },
      width = 1000 - margin.left - margin.right,
      height = 600 - margin.top - margin.bottom;

// Append the SVG object to the body
const svg = d3.select("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Tooltip div selection
const tooltip = d3.select(".tooltip");

// Load the Iris dataset
d3.csv('./iris.csv').then(data => {
    console.log("Data loaded successfully", data);
    // Convert numeric attributes to numbers
    data.forEach(d => {
        d['sepal length'] = +d['sepal length'];
        d['sepal width'] = +d['sepal width'];
        d['petal length'] = +d['petal length'];
        d['petal width'] = +d['petal width'];
    });

    // List of attributes (dimensions)
    const dimensions = ['sepal length', 'sepal width', 'petal length', 'petal width'];

    // Color scale for flower classes
    const color = d3.scaleOrdinal()
        .domain(["Iris-setosa", "Iris-versicolor", "Iris-virginica"])
        .range(["#1f77b4", "#ff7f0e", "#2ca02c"]);

    // Create a scale for each attribute
    const y = {};
    dimensions.forEach(attr => {
        y[attr] = d3.scaleLinear()
            .domain([d3.min(data, d => d[attr]), d3.max(data, d => d[attr])])
            .range([height, 0]);
    });

    // X-scale for the parallel axes
    const x = d3.scalePoint()
        .range([0, width])
        .domain(dimensions);

    // Function to draw the polylines for each flower sample
    function path(d) {
        return d3.line()(dimensions.map(p => [x(p), y[p](d[p])]));
    }

    // Draw each polyline
    const lines = svg.selectAll("myPath")
        .data(data)
        .enter().append("path")
        .attr("class", "polyline")
        .attr("d", path)
        .style("stroke", d => color(d['class']))
        .style("opacity", 0.5);

    // Hover functionality for lines
    lines.on("mouseover", function (event, d) {
        const className = d['class'];

        // Dim all lines and highlight the hovered class lines
        lines.style("opacity", 0.1);
        lines.filter(line => line['class'] === className)
            .style("opacity", 1)
            .style("stroke-width", 2);

        // Show tooltip with only the class name
        tooltip.style("display", "block")
            .html(`${className}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
    });

    lines.on("mouseout", function () {
        // Reset lines opacity and stroke width
        lines.style("opacity", 0.5).style("stroke-width", 1.5);

        // Hide tooltip
        tooltip.style("display", "none");
    });

    // Draw the axes for each dimension
    const axes = svg.selectAll(".dimension")
        .data(dimensions)
        .enter().append("g")
        .attr("class", "dimension")
        .attr("transform", d => `translate(${x(d)})`)
        .each(function (d) {
            d3.select(this).call(d3.axisLeft().scale(y[d]));
        });

    // Add axis labels
    axes.append("text")
        .attr("class", "axis-label")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text(d => d)
        .style("fill", "black");

    // Enable dragging to reorder axes
    d3.selectAll(".dimension")
        .call(d3.drag()
            .subject(function (d) {
                return { x: x(d) };
            })
            .on("start", function (d) {
                this.__dragged__ = false;
            })
            .on("drag", function (event, d) {
                this.__dragged__ = true;
                const dx = event.x;
                x.domain(dimensions.sort((a, b) => (a === d) ? d3.min([x(a), dx]) - d3.min([x(b), dx]) : x(a) - x(b)));
                d3.selectAll(".dimension").attr("transform", p => `translate(${x(p)})`);
                svg.selectAll("path").attr("d", path);
            })
            .on("end", function (d) {
                if (this.__dragged__) {
                    d3.select(this).transition().attr("transform", `translate(${x(d)})`);
                }
            })
        );

    // Remove any old legend items
    d3.select("#legend-container").selectAll(".legend-item").remove(); 

    // Create a new legend
    const legendContainer = d3.select("#legend-container");
      
    const legend = legendContainer.selectAll(".legend-item")
         .data(color.domain())
         .enter().append("div")
         .attr("class", "legend-item")
         .style("margin-bottom", "10px");

    legend.append("div")
        .style("display", "inline-block")
        .style("width", "18px")
        .style("height", "18px")
        .style("background-color", d => color(d));

    legend.append("span")
        .style("padding-left", "5px")
        .text(d => d);

    // Add hover functionality to legend items
    legend.on("mouseover", function(event, className) {
        lines.style("opacity", 0.1); // Dim all lines
        lines.filter(line => line['class'] === className)
            .style("opacity", 1) // Highlight lines of the same class
            .style("stroke-width", 2);
    });

    legend.on("mouseout", function() {
        lines.style("opacity", 0.5).style("stroke-width", 1.5); // Reset line opacity and width
    });
})
.catch(error => {
    console.error("Error loading CSV file:", error);
});
