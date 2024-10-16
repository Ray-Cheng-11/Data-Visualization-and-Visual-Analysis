        const data_path = './abalone/abalone.data';

        const margin = { top: 50, right: 50, bottom: 50, left: 50 };
        const width = 700 - margin.left - margin.right;
        const height = 600 - margin.top - margin.bottom;

        let data_M = [], data_F = [], data_I = [];
        let activeGender = 'male';

        d3.text(data_path).then(function (data) {
            const rows = data.split("\n");
            rows.forEach(row => {
                const cols = row.split(",");
                if (cols.length === 9 && !isNaN(Number(cols[1]))) {
                    const record = cols.slice(1).map(Number);
                    switch (cols[0]) {
                        case "M": data_M.push(record); break;
                        case "F": data_F.push(record); break;
                        case "I": data_I.push(record); break;
                    }
                }
            });

            const cm_M = computeCorrelationMatrix(data_M);
            const cm_F = computeCorrelationMatrix(data_F);
            const cm_I = computeCorrelationMatrix(data_I);

            renderMatrix(cm_M, "Male");
            renderLegend("Male");
            renderColorbar("Male");

            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', function (e) {
                    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
                    e.target.classList.add('active');

                    activeGender = e.target.getAttribute('data-sex');
                    if (activeGender === 'male') {
                        renderMatrix(cm_M, "Male");
                        renderLegend("Male");
                        renderColorbar("Male");
                    } else if (activeGender === 'female') {
                        renderMatrix(cm_F, "Female");
                        renderLegend("Female");
                        renderColorbar("Female");
                    } else if (activeGender === 'infant') {
                        renderMatrix(cm_I, "Infant");
                        renderLegend("Infant");
                        renderColorbar("Infant");
                    }
                });
            });
        });

        const computeCorrelationMatrix = (data) => {
            const matrix = transpose(data);
            const features = ["Length", "Diameter", "Height", "Whole weight", "Shucked weight", "Viscera weight", "Shell weight", "Rings"];
            return matrix.map((_, i) =>
                matrix.map((_, j) => ({
                    x: features[i],
                    y: features[j],
                    value: calculateCorrelation(matrix[i], matrix[j])
                }))
            ).flat();
        };

        const transpose = (matrix) => matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));

        const calculateCorrelation = (x, y) => {
            const meanX = x.reduce((sum, xi) => sum + xi, 0) / x.length;
            const meanY = y.reduce((sum, yi) => sum + yi, 0) / y.length;

            const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
            const denominator = Math.sqrt(
                x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0) *
                y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0)
            );

            return denominator === 0 ? 0 : numerator / denominator;
        };

        const renderLegend = (category) => {
            const legendHeight = 15;
            d3.select(".legend").selectAll("svg").remove();

            const svg = d3.select(".legend").append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", legendHeight + 40)
                .append("g")
                .attr("transform", `translate(${margin.left}, 20)`);

            const colorScales = {
                Male: ["#B22222", "#ffffff", "#000080"],
                Female: ["#FF4500", "#ffffff", "#006400"],
                Infant: ["#DC143C", "#ffffff", "#4686B7"]
            };

            const colorScale = colorScales[category];

            const gradient = svg.append("defs").append("linearGradient")
                .attr("id", "linear-gradient");

            gradient.selectAll("stop")
                .data([
                    { offset: 0, color: colorScale[0] },
                    { offset: 0.5, color: colorScale[1] },
                    { offset: 1, color: colorScale[2] }
                ])
                .enter().append("stop")
                .attr("offset", d => `${d.offset * 100}%`)
                .attr("stop-color", d => d.color);

            svg.append("rect")
                .attr("width", width)
                .attr("height", legendHeight)
                .style("fill", "url(#linear-gradient)");

            svg.selectAll("text")
                .data([-1, 0, 1])
                .enter().append("text")
                .attr("x", (d, i) => (i * width) / 2)
                .attr("dy", -5)
                .style("text-anchor", "middle")
                .text(d => d);
        };

        const renderMatrix = (cm, category) => {
            d3.select("#cm").selectAll("svg").remove();
            
            const features = ["Length", "Diameter", "Height", "Whole weight", "Shucked weight", "Viscera weight", "Shell weight", "Rings"];
            
            const matrixWidth = width * 0.9; // slightly smaller width to account for colorbar
            const cellSize = matrixWidth / features.length;
            
            const svg = d3.select("#cm").append("svg")
                .attr("width", matrixWidth + margin.left + margin.right + 60)  // extra space for colorbar
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);
        
            const xScale = d3.scalePoint().domain(features).range([0, matrixWidth]);
            const yScale = d3.scalePoint().domain(features).range([0, height]);
        
            const colorScales = {
                Male: d3.scaleLinear().domain([-1, 0, 1]).range(["#B22222", "#ffffff", "#000080"]),
                Female: d3.scaleLinear().domain([-1, 0, 1]).range(["#FF4500", "#ffffff", "#006400"]),
                Infant: d3.scaleLinear().domain([-1, 0, 1]).range(["#DC143C", "#ffffff", "#4686B7"])
            };
        
            const colorScale = colorScales[category];
        
            const cells = svg.selectAll(".cell")
                .data(cm)
                .enter().append("g")
                .attr("class", "cell")
                .attr("transform", d => `translate(${xScale(d.x)}, ${yScale(d.y)})`);
        
            cells.filter(d => features.indexOf(d.x) <= features.indexOf(d.y))
                .append("rect")
                .attr("width", cellSize)
                .attr("height", cellSize)
                .style("fill", d => colorScale(d.value));
        
            cells.filter(d => features.indexOf(d.x) <= features.indexOf(d.y))
                .append("text")
                .attr("x", cellSize / 2)
                .attr("y", cellSize / 2)
                .attr("dy", ".35em")
                .style("text-anchor", "middle")
                .text(d => d.x === d.y ? d.x : d.value.toFixed(2))
                .style("fill", d => Math.abs(d.value) > 0.5 ? "white" : "black")
                .style("font-size", "10px");
        
            // Tooltip functionality
            const tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);
        
            cells.on("mouseover", function (event, d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9);
                tooltip.html(`<strong>${d.x}</strong><br><strong>${d.y}</strong><br>Correlation: ${d.value.toFixed(2)}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY + 10) + "px");
            }).on("mouseout", function () {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
        
            renderColorbar(category, matrixWidth + margin.left + 30); // Adjust colorbar position
        };
        
        const renderColorbar = (category, xPosition) => {
            const colorbarHeight = 200;
            const colorbarWidth = 20;
        
            d3.select(".colorbar").selectAll("svg").remove();
        
            const svg = d3.select(".colorbar").append("svg")
                .attr("width", colorbarWidth + 30)
                .attr("height", colorbarHeight)
                .append("g")
                .attr("transform", `translate(${xPosition}, 20)`);  // Place it on the right of the matrix
        
            const colorScales = {
                Male: d3.scaleLinear().domain([-1, 0, 1]).range(["#B22222", "#ffffff", "#000080"]),
                Female: d3.scaleLinear().domain([-1, 0, 1]).range(["#FF4500", "#ffffff", "#006400"]),
                Infant: d3.scaleLinear().domain([-1, 0, 1]).range(["#DC143C", "#ffffff", "#4686B7"])
            };
        
            const colorScale = colorScales[category];
        
            const gradient = svg.append("defs").append("linearGradient")
                .attr("id", "linear-gradient-colorbar");
        
            gradient.selectAll("stop")
                .data([
                    { offset: 0, color: colorScale(1) },
                    { offset: 0.5, color: colorScale(0) },
                    { offset: 1, color: colorScale(-1) }
                ])
                .enter().append("stop")
                .attr("offset", d => `${d.offset * 100}%`)
                .attr("stop-color", d => d.color);
        
            svg.append("rect")
                .attr("width", colorbarWidth)
                .attr("height", colorbarHeight)
                .style("fill", "url(#linear-gradient-colorbar)");
        
            const colorbarLabels = [-1, 0, 1];
            const colorbarYScale = d3.scaleLinear()
                .domain([-1, 1])
                .range([colorbarHeight, 0]);
        
            svg.selectAll("text")
                .data(colorbarLabels)
                .enter().append("text")
                .attr("x", colorbarWidth + 5)
                .attr("y", d => colorbarYScale(d))
                .style("text-anchor", "start")
                .text(d => d.toFixed(1));
        };