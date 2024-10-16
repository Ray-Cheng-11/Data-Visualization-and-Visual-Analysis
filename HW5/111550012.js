const keys = ['Teaching', 'Research', 'Citations', 'Industry_income', 'International_outlook'];
const margin = { top: 50, right: 25, bottom: 70, left: 300 };  // Increase left margin
const barPadding = 2, width = 900 - margin.left - margin.right;
const baseHeight = 19200 - margin.top - margin.bottom;

const legendData = [
    { key: 'Teaching', color: 'DodgerBlue' },
    { key: 'Research', color: 'purple' },
    { key: 'Citations', color: 'green' },
    { key: 'Industry_income', color: 'orange' },
    { key: 'International_outlook', color: 'red' },
];

const rectSize = 30, rectSpacing = 120, textX = rectSize + 20;

let Methodology = "Overall";
let Way = "descending";
let dataLimit = 2674;

// Update event listeners to trigger redraw on any change
const xElement = document.getElementById('X');
const yElement = document.getElementById('Y');
const dataLimitElement = document.getElementById('dataLimit');

if (xElement) {
    xElement.addEventListener('change', updateVisualization);
}

if (yElement) {
    yElement.addEventListener('change', updateVisualization);
}

if (dataLimitElement) {
    dataLimitElement.addEventListener('change', updateVisualization);
}

function updateVisualization() {
    Methodology = document.getElementById('X').value;
    Way = document.getElementById('Y').value;
    dataLimit = parseInt(document.getElementById('dataLimit').value);
    dataProcessAndDraw();
}

function dataProcessAndDraw() {
    d3.csv('./TIMES_WorldUniversityRankings_2024.csv').then(data => {
        data = data.filter(d => d['scores_overall'] !== 'n/a');
        data.forEach(d => {
            d['Teaching'] = +d['scores_teaching'] * 0.295 ;
            d['Research'] = +d['scores_research'] * 0.29 ;
            d['Citations'] = +d['scores_citations'] * 0.3 ;
            d['Industry_income'] = +d['scores_industry_income'] * 0.04 ;
            d['International_outlook'] = +d['scores_international_outlook'] * 0.075;
            d['Overall'] = d['International_outlook'] + d['Industry_income'] + d['Citations'] + d['Research'] + d['Teaching']
        });

        sortData(data);
        console.log(dataLimit);
        data = data.slice(0, dataLimit);
        const height = Math.min(baseHeight, data.length * 40);

        d3.select('svg').remove(); // Clear previous canvas
    

    const svg = d3.select('body')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left + 50}, ${margin.top})`);

    swapKeys();

    const stackData = d3.stack().keys(keys)(data);
    const yMax = d3.max(data, d => keys.reduce((acc, k) => acc + d[k], 0));
    // X-Axis (adjusted for horizontal bars, using quantitative data)
    const x = d3.scaleLinear()
        .domain([0, yMax])  // Quantitative scale for the scores
        .range([0, width]) // Full width for the bars

    // Y-Axis (adjusted for horizontal layout, using categorical data)
    const y = d3.scaleBand()
        .domain(data.map(d => d.name))  // Categories (e.g., university names)
        .range([0, height])             // Full height for the bars
        .padding(0.5);                  // Adjust padding

    // Create bar groups
    const barGroups = svg.selectAll('g')
            .data(stackData)
            .enter().append('g')
            .attr('class', d => `bar-group group-${d.key}`);

    // Append rectangles (bars) for the horizontal layout
    barGroups.selectAll('rect')
        .data(d => d)
        .enter().append('rect')
        .attr('y', (d, i) => y(data[i].name))    // Y-position for each category
        .attr('height', y.bandwidth())           // Height of the bars
        .attr('x', d => x(d[0]))                 // X-position (from left to right)
        .attr('width', d => x(d[1]) - x(d[0]))   // Bar width (difference between left and right of stack)
        .attr('opacity', 0.7)
        .on('mouseover', function(event, d) {
            d3.select(this).raise().attr('opacity', .3);
            tooltip.transition()
                .duration(200)
                .style('opacity', .9);

            // Get the key of the current category (e.g., Teaching, Research, etc.)
            let category = d3.select(this.parentNode).datum().key;

            // Display original values based on the category
            let originalValue;
            switch (category) {
                case 'Teaching':
                    originalValue = d.data['scores_teaching'];
                    break;
                case 'Research':
                    originalValue = d.data['scores_research'];
                    break;
                case 'Citations':
                    originalValue = d.data['scores_citations'];
                    break;
                case 'Industry_income':
                    originalValue = d.data['scores_industry_income'];
                    break;
                case 'International_outlook':
                    originalValue = d.data['scores_international_outlook'];
                    break;
                default:
                    originalValue = d.data[category];
            }

            tooltip.html(`${category} Score: ${originalValue}`)
                .style('left', (event.pageX + 5) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function(d) {
            d3.select(this).attr('opacity', .7);
            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
        });
     // Function to update bar positions and widths
     function updateBars() {
            barGroups.selectAll('rect')
                .attr('x', d => x(d[0]))
                .attr('width', d => x(d[1]) - x(d[0]));
        }

        // Trigger animation
        setTimeout(() => {
            updateBars();
            barGroups.each((d, i, nodes) => {
                setTimeout(() => {
                    d3.select(nodes[i]).classed('visible', true);
                }, i * 150);
            });
        }, 100);

    // Define the tooltip div
    const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('text-align', 'center')
        .style('width', '180px')
        .style('height', '16px')
        .style('padding', '2px')
        .style('font', '12px helvetica, arial, sans-serif')
        .style('background', '#ccc')
        .style('border', '0px')
        .style('border-radius', '8px')
        .style('pointer-events', 'none')
        .style('opacity', 0);

    // Adjust the X-axis (for the horizontal bars)
    svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${height})`)  // Move to the bottom of the chart
        .call(d3.axisBottom(x));                      // X-axis for scores

    // Add X-axis title
    svg.append('text')
        .attr('class', 'x-axis-title')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom -20)
        .attr('text-anchor', 'middle')
        .style('font-size', '1.2em')
        .text('Scores');
    // Add gridlines for the x-axis
    svg.append('g')
        .attr('class', 'grid')
        .call(d3.axisBottom().scale(x)
        .tickSize(height, 0, 0)
        .tickFormat(''))
        .selectAll('line')
        .attr('stroke', '#ddd')
        .attr('stroke-dasharray', '2,2');
    // Adjust the Y-axis (now on the left side for horizontal bars)
    svg.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(y))
        .selectAll('text')                            // Adjust text labels on Y-axis
        .style('font-size', '0.8em')
        .style('text-anchor', 'end') // 设置文字锚点为起始位置
        .attr('dy', '1em');                         // Adjust label positioning

    // Add Y-axis title
    svg.append('text')
        .attr('class', 'y-axis-title')
        .attr('transform', 'rotate(270)')
        .attr('x', -height / 2)
        .attr('y', -margin.left + 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '1.2em')
        .text('Universities');
    

    // Create Legend
    const legend = d3.select('body')
                    .append('div')
                    .attr('class', 'legend');


    legend.selectAll('div')
        .data(legendData)
        .enter().append('div')
        .attr('class', d => `group-${d.key}`)
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('margin-bottom', '10px')
        .on('mouseover', function(event, d) {
            // Highlight the bars corresponding to the hovered legend item
            svg.selectAll(`.group-${d.key} rect`).attr('opacity', 1);
            keys.filter(key => key !== d.key).forEach(category => {
                svg.selectAll(`.group-${category} rect`).attr('opacity', 0.2);
            });
        })
        .on('mouseout', () => {
            // Reset all bars to default opacity
            svg.selectAll('rect').attr('opacity', 0.7);
        })
        .each(function(d) {
            // Append a circle
            d3.select(this).append('div')
                .style('width', '20px')
                .style('height', '20px')
                .style('border-radius', '50%')
                .style('background-color', d.color)
                .style('margin-right', '10px');

            // Append the text
            d3.select(this).append('div')
                .style('font-size', '1.2em')
                .text(d.key);
        });
});
}
function sortData(data) {
    data.sort((a, b) => b[Methodology] - a[Methodology]);
    if (Way === "ascending") {
        data.reverse();
    }
}
function swapKeys() {
    if (Methodology !== "Overall") {
        const v1 = keys.indexOf(Methodology);
        [keys[v1], keys[0]] = [keys[0], keys[v1]];
    }
}            
// Initially load and render the data
dataProcessAndDraw();
window.addEventListener('scroll', function() {
    var footer = document.getElementById('footer');
    if (window.scrollY > 0) {
        footer.style.display = 'block';
    } else {
        footer.style.display = 'none';
    }
});