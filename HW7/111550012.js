const data_path = "http://vis.lab.djosix.com:2024/data/air-pollution.csv"
// const data_path = "./air-pollution.csv"

// Set up SVG dimensions and margins
const svg = d3.select('svg');
const width = +svg.attr('width');
const height = +svg.attr('height');
const margin = {top: 100, right: 50, bottom: 50, left: 100};
const padding = 40;
const chartWidth = (width - margin.left - margin.right) - padding;
const chartHeight = 50;

// Create a tooltip
const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip');

// Parse the Data
d3.csv(data_path).then(function (data) {
    // Extract unique station names
    const stations = Array.from(new Set(data.map(d => d.Address.split(',').map((part) => part.trim())[2])));

    // Define pollutants and their color scales
    const pollutants = ['SO2', 'NO2', 'O3', 'CO', 'PM10', 'PM2.5'];
    const colorScales = {
        SO2: ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'],
        NO2: ['#fef0d9', '#fdcc8a', '#fc8d59', '#e34a33', '#b30000'],
        O3: ['#ffffcc', '#c2e699', '#78c679', '#31a354', '#006837'],
        CO: ['#edf8fb', '#b2e2e2', '#66c2a4', '#2ca25f', '#006d2c'],
        PM10: ['#f7fcf5', '#e5f5e0', '#a1d99b', '#31a354', '#006d2c'],
        'PM2.5': ['#f7fbff', '#deebf7', '#9ecae1', '#3182bd', '#08519c'],
    };

    // Pre-process data
    const processedData = d3.nest()
        .key(d => d.Address.split(',').map((part) => part.trim())[2])
        .key(d => d3.timeParse('%Y-%m-%d %H:%M')(d['Measurement date']).getFullYear())
        .key(d => d3.timeFormat('%Y-%m-%d')(d3.timeParse('%Y-%m-%d %H:%M')(d['Measurement date'])))
        .rollup(v => ({
            SO2: d3.mean(v, d => Math.max(+d.SO2, 0)),
            NO2: d3.mean(v, d => Math.max(+d.NO2, 0)),
            O3: d3.mean(v, d => Math.max(+d.O3, 0)),
            CO: d3.mean(v, d => Math.max(+d.CO, 0)),
            PM10: d3.mean(v, d => Math.max(+d.PM10, 0)),
            'PM2.5': d3.mean(v, d => Math.max(+d['PM2.5'], 0))
        }))
        .entries(data);

    // Populate year options
    const years = Array.from(new Set(data.map(d => d3.timeParse('%Y-%m-%d %H:%M')(d['Measurement date']).getFullYear())));
    const yearSelect = d3.select('#year-select');
    years.forEach(year => {
        yearSelect.append('option').attr('value', year).text(year);
    });

    // Function to update charts based on selected pollutant and year
    function updateCharts(selectedPollutant, selectedYear) {
        svg.selectAll('*').remove(); // Clear existing charts

        stations.forEach((station, rowIndex) => {
            const pollutant = selectedPollutant;
            const colorScale = colorScales[pollutant];
            const stationData = processedData.find(d => d.key === station);
            if (!stationData) return;

            const yearData = stationData.values.find(d => +d.key === selectedYear);
            if (!yearData) return;

            const dailyAverages = yearData.values.map(d => ({
                date: d.key,
                average: d.value[pollutant]
            }));

            // Calculate the position (x and y) for each chart within the grid, including padding
            let x = 0;
            let y = rowIndex * (chartHeight + padding);

            createHorizonChart(dailyAverages, station, pollutant, colorScale, x, y);
        });
    }

    // Function to create a horizon chart
    function createHorizonChart(data, station, pollutant, colorScale, x, y) {
        // Filter out some outliers
        const max = d3.quantile(data.map((d) => d.average).sort(d3.ascending), 0.98);
        const numBands = +d3.select('#numBands-select').property('value') || 3;
        const bandWidth = max / numBands;

        const xScale = d3.scaleTime()
            .domain(d3.extent(data, (d) => d3.timeParse('%Y-%m-%d')(d.date)))
            .range([0, chartWidth]);

        const yScale = d3.scaleLinear()
            .domain([0, bandWidth])
            .nice()
            .range([chartHeight, 0]);

        const chart = svg.append('g')
            .attr('width', chartWidth)
            .attr('height', chartHeight)
            .attr('transform', `translate(${margin.left + x},${margin.top + y})`);

        chart.append('g')
            .attr('class', 'x axis')
            .attr('transform', `translate(0, ${y})`)
            .call(d3.axisBottom(xScale).ticks(5).tickSizeOuter(0));

        chart.append('g')
            .attr('class', 'y axis')
            .attr('transform', `translate(0, ${y - chartHeight})`)
            .call(d3.axisLeft(yScale).ticks(3).tickSizeOuter(0));

        // Create crosshair group
        const crosshairGroup = chart.append('g')
            .attr('class', 'crosshair')
            .style('display', 'none');

        // Create vertical crosshair line
        const crosshairLine = crosshairGroup.append('line')
            .attr('class', 'crosshair-line')
            .attr('y1', 0)
            .attr('y2', chartHeight)
            .attr('stroke', 'gray')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '5,5');

        for (let k = 0; k < numBands; k++) {
            chart.append('path')
                .attr('class', 'path')
                .datum(data)
                .attr('d', d3.area()
                    .x(function (d) { return xScale(d3.timeParse('%Y-%m-%d')(d.date)); })
                    .y0(yScale(0))
                    .y1(function (d) { return yScale(Math.min(Math.max(d.average - bandWidth * k, 0), bandWidth)); }))
                .attr('fill', colorScale[k])
                .attr('transform', `translate(0, ${y - chartHeight})`)
                .transition()
                .duration(1000);
        }

        // Add mouse event listeners to the chart area
        chart.append('rect')
            .attr('width', chartWidth)
            .attr('height', chartHeight)
            .attr('fill', 'none')
            .attr('pointer-events', 'all')
            .on('mouseover', function() {
                crosshairGroup.style('display', null);
            })
            .on('mouseout', function() {
                crosshairGroup.style('display', 'none');
                tooltip.transition().duration(500).style('opacity', 0);
            })
            .on('mousemove', function() {
                const [mouseX, mouseY] = d3.mouse(this);
                const date = xScale.invert(mouseX);
                const bisect = d3.bisector(d => d3.timeParse('%Y-%m-%d')(d.date)).left;
                const index = bisect(data, date);
                const selectedData = data[index];

                crosshairLine.attr('x1', mouseX).attr('x2', mouseX);

                tooltip.transition()
                    .duration(200)
                    .style('opacity', .9);
                tooltip.html(`Date: ${selectedData.date}<br>Value: ${selectedData.average.toFixed(3)}`)
                    .style('left', (d3.event.pageX + 5) + 'px')
                    .style('top', (d3.event.pageY - 28) + 'px');
            });

        chart.append('text')
            .attr('class', 'text')
            .attr('x', 0)
            .attr('y', `${y - chartHeight - 10}`)
            .attr('text-anchor', 'left')
            .attr('dy', '0.35em')
            .attr('font-size', '14px')
            .text(`${station} - ${pollutant} `);
    }

    // Initial chart display
    const initialYear = years[0];
    updateCharts('SO2', initialYear);

    // Update charts when a new pollutant, year, or number of bands is selected
    d3.select('#pollutant-select').on('change', function() {
        const selectedPollutant = d3.select(this).property('value');
        const selectedYear = +d3.select('#year-select').property('value');
        updateCharts(selectedPollutant, selectedYear);
    });

    d3.select('#year-select').on('change', function() {
        const selectedPollutant = d3.select('#pollutant-select').property('value');
        const selectedYear = +d3.select(this).property('value');
        updateCharts(selectedPollutant, selectedYear);
    });

    d3.select('#numBands-select').on('change', function() {
        const selectedPollutant = d3.select('#pollutant-select').property('value');
        const selectedYear = +d3.select('#year-select').property('value');
        updateCharts(selectedPollutant, selectedYear);
    });
});
