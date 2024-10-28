// set the dimensions and margins of the graph
const margin = { top: 20, right: 20, bottom: 0, left: 10 },
    width = 1000 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

// append the svg object to the body of the page
const svg = d3.select("#my_dataviz")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
        `translate(${margin.left}, ${margin.top})`);

const data_path = "./ma_lga_12345.csv"
// const data_path = "http://vis.lab.djosix.com:2024/data/ma_lga_12345.csv"

// Parse the Data
d3.csv(data_path).then(function (data) {

    var data_1 = {}
    for (let i = 0; i < data.length; i++) {
        if (!(data[i]["saledate"] in data_1)) {
            data_1[data[i]["saledate"]] = {
                "house with 2 bedrooms": 0,
                "house with 3 bedrooms": 0,
                "house with 4 bedrooms": 0,
                "house with 5 bedrooms": 0,
                "unit with 1 bedrooms": 0,
                "unit with 2 bedrooms": 0,
                "unit with 3 bedrooms": 0,
            }
        }
        class_str = data[i]["type"] + " with " + data[i]["bedrooms"] + " bedrooms"
        data_1[data[i]["saledate"]][class_str] = +data[i]["MA"]
    }

    var data_2 = []
    for (const [key, value] of Object.entries(data_1)) {
        value["date"] = moment(key, "DD/MM/YYYY").toDate();
        data_2.push(value)
    }
    
    data_2.sort(function (a, b) {
        return a["date"] - b["date"];
    });
    data = data_2

    // List of groups = header of the csv files
    var keys = Object.keys(data[0]).slice(0, -1)

    // color palette
    const color = d3.scaleOrdinal().domain(keys).range(d3.schemePastel1);

    var blocks = document.getElementById('blocks');
    let html = ""
    for (let i = 0; i < keys.length; i++) {
        html += '<div class="list-group-item legend-item" style="background-color:' + color(keys[i]) + '">' + keys[i] + '</div>'
    }
    blocks.innerHTML = html

    var sortable = new Sortable(blocks, {
        animation: 150,
        onChange: function () {
            let blocks_divs = blocks.getElementsByTagName("div");
            let reorderedKeys = [];
            for (let i = 0; i < blocks_divs.length; i++) {
                reorderedKeys.push(blocks_divs[i].textContent);
            }
            keys = reorderedKeys; // Update the keys order
            render(reorderedKeys.filter(key => activeStreams.has(key)));
        }
    });
    var activeStreams = new Set(keys);
    d3.selectAll(".legend-item").on("click", function (event) {
        const item = d3.select(this);
        const key = item.text();
        if (activeStreams.has(key)) {
            activeStreams.delete(key);
            item.style("opacity", 0.3);
        } else {
            activeStreams.add(key);
            item.style("opacity", 1);
        }
        render(keys.filter(key => activeStreams.has(key)));
    });

    // Add date range filter
    const dateExtent = d3.extent(data, d => d.date);
    const filterContainer = d3.select("#my_dataviz")
        .append("div")
        .attr("class", "filter-container")
        .style("display", "flex")
        .style("justify-content", "space-between")
        .style("align-items", "center")
        .style("margin-bottom", "20px");

    const dateContainer = filterContainer.append("div")
        .style("display", "flex")
        .style("align-items", "center");

    dateContainer.append("label")
        .attr("for", "start-date")
        .text("Start Date: ")
        .style("margin-left", "20px")
        .style("margin-right", "5px");

    const startDatePicker = dateContainer.append("input")
        .attr("type", "date")
        .attr("id", "start-date")
        .attr("value", d3.timeFormat("%Y-%m-%d")(dateExtent[0]))
        .style("padding", "5px")
        .style("border", "1px solid #ccc")
        .style("border-radius", "4px");

    dateContainer.append("label")
        .attr("for", "end-date")
        .text("End Date: ")
        .style("margin", "0 5px 0 15px");

    const endDatePicker = dateContainer.append("input")
        .attr("type", "date")
        .attr("id", "end-date")
        .attr("value", d3.timeFormat("%Y-%m-%d")(dateExtent[1]))
        .style("padding", "5px")
        .style("border", "1px solid #ccc")
        .style("border-radius", "4px");

    // Add aggregation selector
    const aggregationContainer = filterContainer.append("div")
        .style("display", "flex")
        .style("align-items", "center");

    aggregationContainer.append("label")
        .attr("for", "aggregation-selector")
        .text("Aggregation: ")
        .style("margin-right", "5px");

    const aggregationSelector = aggregationContainer.append("select")
        .attr("id", "aggregation-selector")
        .style("padding", "5px")
        .style("border", "1px solid #ccc")
        .style("border-radius", "4px")
        .style("background-color", "#fff");

    aggregationSelector
        .selectAll("option")
        .data(["Daily", "Monthly", "Quarterly"])
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d.toLowerCase());

    // Add update button
    const updateButton = filterContainer.append("button")
        .text("Update")
        .style("padding", "8px 15px")
        .style("background-color", "#4CAF50")
        .style("color", "white")
        .style("border", "none")
        .style("border-radius", "4px")
        .style("cursor", "pointer")
        .style("transition", "background-color 0.3s")
        .on("mouseover", function() {
            d3.select(this).style("background-color", "#45a049");
        })
        .on("mouseout", function() {
            d3.select(this).style("background-color", "#4CAF50");
        })
        .on("click", updateVisualization);

    // Event listeners for date range and aggregation
    startDatePicker.on("change", updateVisualization);
    endDatePicker.on("change", updateVisualization);
    aggregationSelector.on("change", updateVisualization);

    function updateVisualization() {
        const startDate = new Date(startDatePicker.property("value"));
        const endDate = new Date(endDatePicker.property("value"));
        const aggregation = aggregationSelector.property("value");

        const filteredData = data.filter(d => d.date >= startDate && d.date <= endDate);
        const aggregatedData = aggregateData(filteredData, aggregation);

        render(keys.filter(key => activeStreams.has(key)), aggregatedData);
    }

    function aggregateData(data, aggregation) {
        if (aggregation === "daily") return data;

        const aggregatedData = d3.rollup(data,
            v => {
                const result = {};
                keys.forEach(key => {
                    result[key] = d3.mean(v, d => d[key]);
                });
                return result;
            },
            d => {
                if (aggregation === "monthly") {
                    return d3.timeMonth(d.date);
                } else if (aggregation === "quarterly") {
                    return d3.timeMonth.every(3)(d.date);
                }
            }
        );

        return Array.from(aggregatedData, ([date, values]) => ({date, ...values}));
    }

    render(keys)

    function render(keys, renderData = data) {
        let new_keys = Array.from(keys)
        new_keys.reverse()
        // Add X axis
        const x = d3.scaleTime()
            .domain(d3.extent(renderData, function (d) { return d["date"]; }))
            .range([0, width]);
        
        let xAxis = svg.selectAll(".x-axis").data([0]);
        xAxis.enter()
            .append("g")
            .attr("class", "x-axis")
            .merge(xAxis)
            .attr("transform", `translate(0, ${height * 0.8})`)
            .transition()
            .duration(1000)
            .call(d3.axisBottom(x).ticks(6).tickFormat(d3.utcFormat("%B %d, %Y")).tickSize(-height * 0.7))
            .select(".domain").remove()
        
        // Customization
        svg.selectAll(".tick line").attr("stroke", "#b8b8b8")

        // Add X axis label:
        let xLabel = svg.selectAll(".x-label").data([0]);
        xLabel.enter()
            .append("text")
            .attr("class", "x-label")
            .merge(xLabel)
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + 40)
            .text("Date");

        // Add Y axis
        const y = d3.scaleLinear()
            .domain([-4000000, 4000000])
            .range([height, 0]);

        //stack the data
        const stackedData = d3.stack()
            .offset(d3.stackOffsetSilhouette)
            .keys(new_keys)
            (renderData)
        
        // Area generator
        const area = d3.area()
        .x(function (d) { return x(d.data["date"]); })
        .y0(function (d) { return y(d[0]); })
        .y1(function (d) { return y(d[1]); })

        // create a tooltip
        const Tooltip = d3.select("#my_dataviz")
                .append("div")
                .attr("class", "tooltip")
                .style("opacity", 0)
                .style("background-color", "rgba(255, 255, 255, 0.9)")
                .style("border", "1px solid #ddd")
                .style("border-radius", "8px")
                .style("padding", "10px")
                .style("box-shadow", "0 4px 6px rgba(0, 0, 0, 0.1)")
                .style("font-family", "Arial, sans-serif");


        // Three function that change the tooltip when user hover / move / leave a cell
        const mouseover = function (event, d) {
            Tooltip.style("opacity", 1)
            d3.selectAll(".myArea").style("opacity", .2)
            d3.select(this)
                .style("stroke", "#ffffff")
                .style("opacity", 1)
        }
        const mousemove = function (event, d) {
            const [xCoord] = d3.pointer(event);
            const xDate = x.invert(xCoord);
            const index = d3.bisectLeft(renderData.map(d => d.date), xDate);
            const currentData = renderData[index];
            
            let tooltipContent = `<strong>${d.key}</strong><br>`;
            tooltipContent += `Date: ${d3.utcFormat("%B %d, %Y")(xDate)}<br>`;
            tooltipContent += `Price: $ ${currentData[d.key].toLocaleString()}<br>`;
          
            Tooltip
              .html(tooltipContent)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY + 10) + "px");
          };
        const mouseleave = function (event, d) {
            Tooltip.style("opacity", 0)
            d3.selectAll(".myArea").style("opacity", 1).style("stroke", "none")
        }

        // Show the areas
        let areas = svg.selectAll(".myArea")
            .data(stackedData, d => d.key);

        areas.exit()
            .transition()
            .duration(1000)
            .attr("d", d3.area()
                .x(function(d) { return x(d.data["date"]); })
                .y0(height)
                .y1(height))
            .remove();

        areas.enter()
            .append("path")
            .attr("class", "myArea")
            .style("fill", d => color(d.key))
            .attr("d", d3.area()
                .x(function(d) { return x(d.data["date"]); })
                .y0(height)
                .y1(height))
            .merge(areas)
            .transition()
            .duration(1000)
            .attr("d", area)
            .style("fill", d => color(d.key));

        svg.selectAll(".myArea")
            .on("mouseover", mouseover)
            .on("mousemove", mousemove)
            .on("mouseleave", mouseleave);

        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([1, 6])
            .translateExtent([[0, 0], [width, height]])
            .on("zoom", zoomed);

        svg.call(zoom);

        function zoomed(event) {
            const newX = event.transform.rescaleX(x);
            
            // Update x-axis
            svg.select(".x-axis").call(d3.axisBottom(newX));
            
            // Update area paths
            svg.selectAll(".myArea")
                .attr("d", area.x(d => newX(d.data.date)));
            
            // Update tooltip behavior
            mousemove = function (event, d) {
                const [xCoord, yCoord] = d3.pointer(event);
                const xDate = newX.invert(xCoord);
                const index = d3.bisectLeft(renderData.map(d => d.date), xDate);
                const currentData = renderData[index];
                
                let tooltipContent = `<strong>${d.key}</strong><br>`;
                tooltipContent += `Date: ${d3.utcFormat("%B %d, %Y")(xDate)}<br>`;
                tooltipContent += `Price: ${currentData[d.key].toLocaleString()}<br>`;
              
                Tooltip
                  .html(tooltipContent)
                  .style("left", (event.pageX + 10) + "px")
                  .style("top", (event.pageY + 10) + "px");
            };
        }
    }
})
