    const size = 230;
    const padding = 30;

    const x = d3.scaleLinear().range([padding / 2, size - padding / 2]);

    const y = d3.scaleLinear().range([size - padding / 2, padding / 2]);

    const xAxis = d3.axisBottom(x).ticks(6).tickFormat("");

    const yAxis = d3.axisLeft(y).ticks(6).tickFormat("");

    const color = d3.scaleOrdinal()
        .domain(["setosa", "versicolor", "virginica"])
        .range(["#1f77b4", "#ff7f0e", "#2ca02c"])

    const features = ["sepal length", "sepal width", "petal length", "petal width"]

    const animationDuration = 1000; // Duration of the animation in milliseconds

    d3.csv("./iris.csv").then(data => {
        data.splice(150, 1);

        const domainByTrait = {},
            traits = Object.keys(data[0]).filter(d => { return d !== "class"; }),
            n = traits.length;

        traits.forEach(function (trait) {
            domainByTrait[trait] = d3.extent(data, d =>{ return +d[trait]; });
        });

        xAxis.tickSize(size * n);
        yAxis.tickSize(-size * n);

        const brush = d3.brush()
            .on("start", brushstart)
            .on("brush", brushmove)
            .on("end", brushend)
            .extent([[0, 0], [size, size]]);

        const svg = d3.select("#my_dataviz").append("svg")
            .attr("width", size * n + padding)
            .attr("height", size * n + padding)
            .append("g")
            .attr("transform", `translate(${padding},${padding / 2})`);

        const cell = svg.selectAll(".cell")
            .data(cross(traits, traits))
            .enter().append("g")
            .attr("class", "cell")
            .attr("transform", d => `translate(${(n - d.i - 1) * size},${d.j * size})`)
            .each(plot);

        cell.call(brush);

        function plot(p) {
            const cell = d3.select(this);

            x.domain(domainByTrait[p.x]);
            y.domain(domainByTrait[p.y]);

            const position = d3.scalePoint()
                .domain(features)
                .range([0, 1])

            if (p.x != p.y) {
                const tmp = cell
                    .append('g')
                    .attr("transform", `translate(${position(p.x) + padding / 2},${position(p.y) + padding / 2})`);

                tmp.append("rect")
                    .attr("class", "frame")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", size - padding)
                    .attr("height", size - padding);

                const xextent = d3.extent(data, d => +d[p.x])
                const x1 = d3.scaleLinear()
                    .domain(xextent)
                    .range([padding / 2, size - padding / 2]);

                const yextent = d3.extent(data, d => +d[p.y])
                const y1 = d3.scaleLinear()
                    .domain(yextent)
                    .range([size - padding / 2, padding / 2]);
                
                // Animate x-axis
                const xAxis = tmp.append("g")
                    .attr("transform", `translate(${-padding / 2}, ${size - padding})`)
                    .call(d3.axisBottom(x1).ticks(6).tickSize(-size + padding));

                xAxis.selectAll("line")
                    .style("stroke", "lightgray")
                    .attr("transform", "scale(0, 1)")
                    .transition()
                    .duration(animationDuration)
                    .attr("transform", "scale(1, 1)");

                // Animate y-axis
                const yAxis = tmp.append("g")
                    .attr("transform", `translate(0, ${-padding / 2})`)
                    .call(d3.axisLeft(y1).ticks(6).tickSize(-size + padding))
                    .attr("class", "y-axis");

                yAxis.selectAll("line")
                    .style("stroke", "lightgray")
                    .attr("transform", "scale(1, 0)")
                    .transition()
                    .duration(animationDuration)
                    .attr("transform", "scale(1, 1)");

                tmp.append("g")
                    .attr("transform", `translate(${-padding / 2}, ${size - padding})`)
                    .call(d3.axisBottom(x1).ticks(6).tickSize(-size + padding))// Add gridlines for x-axis
                    .selectAll("line")
                    .style("stroke", "lightgray"); // Apply light gray stroke;  

                tmp.append("g")
                    .attr("transform", `translate(0, ${-padding / 2})`)
                    .call(d3.axisLeft(y1).ticks(6).tickSize(-size + padding))   // Add gridlines for y-axis
                    .selectAll("line")
                    .style("stroke", "lightgray"); // Apply light gray stroke;  
                // Animate points
                cell.selectAll("circle")
                    .data(data)
                    .join("circle")
                    .attr("cx", d => x(+d[p.x]))
                    .attr("cy", d => y(+d[p.y]))
                    .attr("r", 0)
                    .style("fill", d => color(d.class))
                    .transition()
                    .duration(animationDuration)
                    .attr("r", 4);
            }
            else {
                const tmp = cell
                    .append('g')
                    .attr("transform", `translate(${position(p.x) + padding / 2},${position(p.y) + padding / 2})`);

                const xextent = d3.extent(data, d => +d[p.x])
                const x2 = d3.scaleLinear()
                    .domain(xextent).nice()
                    .range([0, size - padding]);

                const histogram = d3.histogram()
                    .value(d => +d[p.x])
                    .domain(x2.domain())// then the domain of the graphic
                    .thresholds(x2.ticks(20));// then the numbers of bins

                const bins = histogram(data);

                const y2 = d3.scaleLinear()
                    .range([size - padding, 0])
                    .domain([0, d3.max(bins, d => d.length)]);
                
                // Animate x-axis
                const xAxis = tmp.append("g")
                    .attr("transform", `translate(0, ${size - padding})`)
                    .call(d3.axisBottom(x2).ticks(6).tickSize(-size + padding));

                xAxis.selectAll("line")
                    .style("stroke", "lightgray")
                    .attr("transform", "scale(0, 1)")
                    .transition()
                    .duration(animationDuration)
                    .attr("transform", "scale(1, 1)");

                // Animate y-axis
                const yAxis = tmp.append("g")
                    .attr("transform", `translate(0, 0)`)
                    .call(d3.axisLeft(y2).ticks(6).tickSize(-size + padding))
                    .attr("class", "y-axis");

                tmp.append("g")
                    .attr("transform", `translate(0, ${size - padding})`)
                    .call(d3.axisBottom(x2).ticks(6).tickSize(-size + padding))
                    .selectAll("line")
                    .style("stroke", "lightgray"); // Apply light gray stroke;  
                    

                tmp.append("g")
                    .attr("transform", `translate(0, 0)`)
                    .call(d3.axisLeft(y2).ticks(6).tickSize(-size + padding))
                    .selectAll("line")
                    .style("stroke", "lightgray"); // Apply light gray stroke; 
                    
                tmp.append('g').attr("transform", `translate(0, 0)`)
                    .selectAll("rect")
                    .data(bins)
                    .join("rect")
                    .attr("x", 1)
                    .attr("class", "histogram-bar")
                    .attr("transform", d => `translate(${x2(d.x0)},${y2(0)})`)
                    .attr("width", d => x2(d.x1) - x2(d.x0))
                    .attr("height", 0)
                    .style("fill", "#7f7f7f")
                    .attr("stroke", "white")
                    .transition()
                    .duration(animationDuration)
                    .attr("height", d => (size - padding) - y2(d.length))
                    .attr("transform", d => `translate(${x2(d.x0)},${y2(d.length)})`);
                    
                tmp.append("text")
                    .text(p.x)
                    .attr("text-anchor", "middle")
                    .attr("x", size/2 - padding/2)
                    .attr("y", padding/2)
                    .style("fill", "#000000")
                    .style("font-size", 12)
                    .style("opacity", 0)
                    .transition()
                    .duration(animationDuration)
                    .style("opacity", 1);

                tmp.append("rect")
                    .attr("class", "frame")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", size - padding)
                    .attr("height", size - padding);
            }
        }

        // Add legend
        // Setosa
        svg.append("circle")
            .attr("cx", (size * n) / 2 - 145)
            .attr("cy", -3)
            .attr("r", 4)
            .style("fill", "#1f77b4");
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", (size * n)/2 - 100)
            .attr("y", 0)
            .text("setosa")
            .style("fill", "#1f77b4")
            .style("font-size", "20px")
        // Versicolor
        svg.append("circle")
            .attr("cx", (size * n) / 2 - 50)
            .attr("cy", -3)
            .attr("r", 4)
            .style("fill", "#ff7f0e");
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", (size * n) / 2 + 5)
            .attr("y", 0)
            .text("versicolor")
            .style("fill", "#ff7f0e")
            .style("font-size", "20px")
        // Virginica
        svg.append("circle")
            .attr("cx", (size * n) / 2 + 65)
            .attr("cy", -3)
            .attr("r", 4)
            .style("fill", "#2ca02c");
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", (size * n) / 2 + 115)
            .attr("y", 0)
            .text("virginica")
            .style("fill", "#2ca02c")
            .style("font-size", "20px")

        let brushCell;

        // Clear the previously-active brush, if any.
        function brushstart(event, p) {
            if (brushCell !== this) {
                d3.select(brushCell).call(brush.move, null);
                brushCell = this;
                x.domain(domainByTrait[p.x]);
                y.domain(domainByTrait[p.y]);
            }
        }

        function brushmove(event, p) {
            const e = event.selection;
            svg.selectAll("circle").classed("hidden", d => {
                if (!e) {
                    return false;
                } else {
                    const isHidden =
                        e[0][0] > x(+d[p.x]) || x(+d[p.x]) > e[1][0] ||
                        e[0][1] > y(+d[p.y]) || y(+d[p.y]) > e[1][1];
                    
                    if (!isHidden) {
                        // Show the tooltip when the point is not hidden
                        d3.select("#tooltip")
                            .style("opacity", 1)
                            .html(`Class: ${d.class}<br>${p.x}: ${d[p.x]}<br>${p.y}: ${d[p.y]}`)
                            .style("left", (x(+d[p.x]) + 10) + "px")
                            .style("top", (y(+d[p.y]) - 28) + "px");
                    }
                    return isHidden;
                }
            });
        }

        function brushend(event) {
            const e = event.selection;
            if (e === null) {
                svg.selectAll(".hidden").classed("hidden", false);
                // Hide the tooltip when the brush ends
                d3.select("#tooltip").style("opacity", 0);
            }
        }
    });

    function cross(a, b) {
        const c = [], n = a.length, m = b.length;
        for (let i = 0; i < n; ++i) {
            for (let j = 0; j < m; ++j) {
                c.push({ x: a[i], i: i, y: b[j], j: j });
            }
        }
        return c;
    }
    document.addEventListener("DOMContentLoaded", function() {
        const glassSymbol = document.querySelector(".container");
        glassSymbol.addEventListener("mouseover", function() {
            const info = document.getElementById("info");
            info.style.display = "inline";
        });
        glassSymbol.addEventListener("mouseout", function() {
            const info = document.getElementById("info");
            info.style.display = "none";
        });
    });