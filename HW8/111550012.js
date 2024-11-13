d3.sankey = function () {
    var sankey = {},
        nodeWidth = 24,
        nodePadding = 8,
        size = [1, 1],
        nodes = [],
        links = [],
        attributeOrder = [];

    // Set or get the node width
    sankey.nodeWidth = function (_) {
        if (!arguments.length) return nodeWidth;
        nodeWidth = +_;
        return sankey;
    };

    // Set or get the node padding
    sankey.nodePadding = function (_) {
        if (!arguments.length) return nodePadding;
        nodePadding = +_;
        return sankey;
    };

    // Set or get the nodes
    sankey.nodes = function (_) {
        if (!arguments.length) return nodes;
        nodes = _;
        return sankey;
    };

    // Set or get the links
    sankey.links = function (_) {
        if (!arguments.length) return links;
        links = _;
        return sankey;
    };

    // Set or get the size
    sankey.size = function (_) {
        if (!arguments.length) return size;
        size = _;
        return sankey;
    };

    // Layout the sankey diagram
    sankey.layout = function (iterations) {
        computeNodeLinks();
        computeNodeValues();
        computeNodeBreadths();
        computeNodeDepths(iterations);
        computeLinkDepths();
        computeColorID();
        return sankey;
    };

    // Relayout the sankey diagram
    sankey.relayout = function () {
        computeLinkDepths();
        return sankey;
    };

    // Create a link path
    sankey.link = function () {
        var curvature = 0.5;

        function link(d) {
            var x0 = d.source.x + d.source.dx,
                x1 = d.target.x,
                xi = d3.interpolateNumber(x0, x1),
                x2 = xi(curvature),
                x3 = xi(1 - curvature),
                y0 = d.source.y + d.sy + d.dy / 2,
                y1 = d.target.y + d.ty + d.dy / 2;
            return (
                'M' + x0 + ',' + y0 + 'C' + x2 + ',' + y0 + ' ' + x3 + ',' + y1 + ' ' + x1 + ',' + y1
            );
        }

        link.curvature = function (_) {
            if (!arguments.length) return curvature;
            curvature = +_;
            return link;
        };

        return link;
    };

    // Populate the sourceLinks and targetLinks for each node
    function computeNodeLinks() {
        nodes.forEach(function (node) {
            node.sourceLinks = [];
            node.targetLinks = [];
        });
        links.forEach(function (link) {
            var source = link.source,
                target = link.target;
            if (typeof source === 'number') source = link.source = nodes[link.source];
            if (typeof target === 'number') target = link.target = nodes[link.target];
            source.sourceLinks.push(link);
            target.targetLinks.push(link);
        });
    }

    // Compute the value (size) of each node by summing the associated links
    function computeNodeValues() {
        nodes.forEach(function (node) {
            node.value = Math.max(
                d3.sum(node.sourceLinks, value),
                d3.sum(node.targetLinks, value)
            );
        });
    }

    // Assign the breadth (x-position) for each node
    function computeNodeBreadths() {
        attributeOrder = [
            'buying',
            'maintenance',
            'doors',
            'persons',
            'luggage boot',
            'safety',
        ];

        attributeOrder.forEach(function (attribute, i) {
            var nodesForAttribute = nodes.filter(function (node) {
                return node.name.startsWith(attribute);
            });

            nodesForAttribute.forEach(function (node) {
                node.x = i;
                node.dx = nodeWidth;
            });
        });

        moveSinksRight(attributeOrder.length);
        scaleNodeBreadths((size[0] - nodeWidth) / (attributeOrder.length - 1));
    }

    // Move sinks to the rightmost position
    function moveSinksRight(x) {
        nodes.forEach(function (node) {
            if (!node.sourceLinks.length) {
                node.x = x - 1;
            }
        });
    }

    // Scale node breadths
    function scaleNodeBreadths(kx) {
        nodes.forEach(function (node) {
            node.x *= kx;
        });
    }

    // Compute the depth (y-position) for each node
    function computeNodeDepths(iterations) {
        var nodesByBreadth = d3
            .nest()
            .key(function (d) {
                return d.x;
            })
            .sortKeys(d3.ascending)
            .entries(nodes)
            .map(function (d) {
                return d.values;
            });

        initializeNodeDepth();
        resolveCollisions();
        for (var alpha = 1; iterations > 0; --iterations) {
            relaxRightToLeft((alpha *= 0.99));
            resolveCollisions();
            relaxLeftToRight(alpha);
            resolveCollisions();
        }

        function initializeNodeDepth() {
            var ky = d3.min(nodesByBreadth, function (nodes) {
                return (size[1] - (nodes.length - 1) * nodePadding) / d3.sum(nodes, value);
            });

            nodesByBreadth.forEach(function (nodes) {
                nodes.forEach(function (node, i) {
                    node.y = i;
                    node.dy = node.value * ky;
                });
            });

            links.forEach(function (link) {
                link.dy = link.value * ky;
            });
        }

        function relaxLeftToRight(alpha) {
            nodesByBreadth.forEach(function (nodes) {
                nodes.forEach(function (node) {
                    if (node.targetLinks.length) {
                        var y = d3.sum(node.targetLinks, weightedSource) / d3.sum(node.targetLinks, value);
                        node.y += (y - center(node)) * alpha;
                    }
                });
            });

            function weightedSource(link) {
                return center(link.source) * link.value;
            }
        }

        function relaxRightToLeft(alpha) {
            nodesByBreadth
                .slice()
                .reverse()
                .forEach(function (nodes) {
                    nodes.forEach(function (node) {
                        if (node.sourceLinks.length) {
                            var y = d3.sum(node.sourceLinks, weightedTarget) / d3.sum(node.sourceLinks, value);
                            node.y += (y - center(node)) * alpha;
                        }
                    });
                });

            function weightedTarget(link) {
                return center(link.target) * link.value;
            }
        }

        function resolveCollisions() {
            nodesByBreadth.forEach(function (nodes) {
                var node,
                    dy,
                    y0 = 0,
                    n = nodes.length,
                    i;

                nodes.sort(ascendingDepth);
                for (i = 0; i < n; ++i) {
                    node = nodes[i];
                    dy = y0 - node.y;
                    if (dy > 0) node.y += dy;
                    y0 = node.y + node.dy + nodePadding;
                }

                dy = y0 - nodePadding - size[1];
                if (dy > 0) {
                    y0 = node.y -= dy;
                    for (i = n - 2; i >= 0; --i) {
                        node = nodes[i];
                        dy = node.y + node.dy + nodePadding - y0;
                        if (dy > 0) node.y -= dy;
                        y0 = node.y;
                    }
                }
            });
        }

        function ascendingDepth(a, b) {
            return a.y - b.y;
        }
    }

    // Compute the depth for each link
    function computeLinkDepths() {
        nodes.forEach(function (node) {
            node.sourceLinks.sort(ascendingTargetDepth);
            node.targetLinks.sort(ascendingSourceDepth);
        });
        nodes.forEach(function (node) {
            var sy = 0,
                ty = 0;
            node.sourceLinks.forEach(function (link) {
                link.sy = sy;
                sy += link.dy;
            });
            node.targetLinks.forEach(function (link) {
                link.ty = ty;
                ty += link.dy;
            });
        });

        function ascendingSourceDepth(a, b) {
            return a.source.y - b.source.y;
        }

        function ascendingTargetDepth(a, b) {
            return a.target.y - b.target.y;
        }
    }

    // Compute the color ID for each node
    function computeColorID() {
        attributeOrder.forEach(function (attribute) {
            var nodesForAttribute = nodes.filter(function (node) {
                return node.name.startsWith(attribute);
            });

            nodesForAttribute.sort((a, b) => a.y - b.y);
            nodesForAttribute.forEach((node, index) => {
                node.cid = index;
            });
        });
    }

    function center(node) {
        return node.y + node.dy / 2;
    }

    function value(link) {
        return link.value;
    }

    return sankey;
};

(function (d3$1) {
    'use strict';

    const svg = d3$1.select('#sankey-diagram');

    const width = +svg.attr('width');
    const height = +svg.attr('height');

    const margin = { top: 50, right: 50, bottom: 150, left: 50 };

    const diagramWidth = width - margin.left - margin.right;
    const diagramHeight = height - margin.top - margin.bottom;

    // Set the sankey diagram properties
    var sankey = d3
        .sankey()
        .nodeWidth(10)
        .nodePadding(2)
        .size([diagramWidth, diagramHeight]);

    var path = sankey.link();

    const render = (graph) => {
        var nodeMap = {};
        graph.nodes.forEach(function (x) {
            nodeMap[x.name] = x;
        });
        graph.links = graph.links.map(function (x) {
            return {
                source: nodeMap[x.source],
                target: nodeMap[x.target],
                value: x.value,
            };
        });
        sankey.nodes(graph.nodes).links(graph.links).layout(32);

        const linkGroups = {};
        graph.links.forEach((link) => {
            const key = link.source.name + '-' + link.target.name;
            if (!linkGroups[key]) {
                linkGroups[key] = [];
            }
            linkGroups[key].push(link);
        });

        // Add the link groups
        const band = svg
            .append('g')
            .selectAll('.band')
            .data(Object.values(linkGroups))
            .enter()
            .append('g')
            .attr('class', 'band');

        // Create gradient definitions
        const defs = svg.append("defs");
        const colorScales = {
            buying: ['#cc00cc', '#ff00ff', '#ff66ff', '#ff99ff'],
            maintenance: ['#3333ff', '#3366ff', '#6699ff', '#99ccff'],
            doors: ['#66ffff', '#33cccc', '#006699', '#003366'],
            persons: ['#99ff66', '#66ff33', '#009900'],
            'luggage boot': ['#ffcc66', '#ffcc00', '#ff9900'],
            safety: ['#ff6600', '#ff3300', '#993300'],
        };
        // Add the links within each group
        const link = band
            .selectAll('.link')
            .data((d) => d)
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('transform', `translate(${margin.left},${margin.top})`)
            .attr('d', path)
            .style('stroke-width', (d) => Math.max(1, d.dy))
            .style('opacity', 0.7)
            .style('transition', 'opacity 0.3s, stroke-width 0.3s')
            .sort(function (a, b) {
            return b.dy - a.dy;
            })
            .each(function(d) {
            let gradientId;
            if (d.source.name.split('-')[0] === 'luggage boot') {
                gradientId = `gradient-${d.source.name.split('-')[1]}-${d.target.name.split('-')[0]}`;
            } else if (d.target.name.split('-')[0] === 'luggage boot') {
                gradientId = `gradient-${d.source.name.split('-')[0]}-${d.target.name.split('-')[1]}`;
            } else {
                gradientId = `gradient-${d.source.name.split('-')[0]}-${d.target.name.split('-')[0]}`;
            }
            const gradient = defs.append("linearGradient")
                .attr("id", gradientId)
                .attr("gradientUnits", "userSpaceOnUse")
                .attr("x1", d.source.x)
                .attr("x2", d.target.x);

            const sourceAttributeType = d.source.name.split('-')[0].toLowerCase();
            const targetAttributeType = d.target.name.split('-')[0].toLowerCase();
            const sourceColorScale = colorScales[sourceAttributeType] || ['#808080'];
            const targetColorScale = colorScales[targetAttributeType] || ['#808080'];

            gradient.append("stop")
                .attr("offset", "0%")
                .attr("stop-color", sourceColorScale[d.source.cid] || sourceColorScale[0]);

            gradient.append("stop")
                .attr("offset", "100%")
                .attr("stop-color", targetColorScale[d.target.cid] || targetColorScale[0]);

            d3.select(this).style("stroke", `url(#${gradientId})`);
            });

        // Add the link titles with transition
        link.append('title').html(function (d) {
            const percentage = ((d.value / d3.sum(graph.links, l => l.value)) * 100).toFixed(1);
            return `<strong>${d.source.name}</strong> → <strong>${d.target.name}</strong><br>Count: ${d.value}<br>Percentage: ${percentage}%`;
        });

        svg.selectAll('.attribute-title')
            .data(graph.nodes.filter((d) => d.cid === 0))
            .enter()
            .append('text')
            .attr('class', 'attribute-title')
            .attr('x', (d) => margin.left + d.x)
            .attr('y', 30)
            .attr('text-anchor', 'middle')
            .text((d) => d.name.split('-')[0]);

        // Add the nodes
        var node = svg.append('g')
            .selectAll('.node')
            .data(graph.nodes)
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', (d) => `translate(${margin.left + d.x},${margin.top + d.y})`)
            .call(
            d3.drag()
                .subject((d) => d)
                .on('start', function () {
                this.parentNode.appendChild(this);
                d3.select(this).select('rect')
                    .style('stroke-width', '3px');
                })
                .on('drag', dragmove)
                .on('end', function() {
                d3.select(this).select('rect')
                    .style('stroke-width', '1px');
                })
            );

        // Add the rectangles for the nodes
        node.append('rect')
            .attr('height', function (d) {
            return d.dy;
            })
            .attr('width', sankey.nodeWidth())
            .style('fill', function (d) {
            const colorScale = colorScales[d.name.split('-')[0]];
            return (d.color = colorScale[d.cid]);
            })
            .style('stroke', function (d) {
            return d3.rgb(d.color).darker(2);
            })
            .append('title')
            .text(function (d) {
            return d.name;
            })
            .attr('height', function (d) {
            return d.dy;
            });

        // Add the titles for the nodes
        node.append('text')
            .attr('x', -6)
            .attr('y', function (d) {
            return d.dy / 2;
            })
            .attr('dy', '.35em')
            .attr('text-anchor', 'end')
            
            .text(function (d) {
            return d.label.split('-')[1];
            })
            .filter(function (d) {
            return d.x < width / 2;
            })
            .attr('x', 6 + sankey.nodeWidth())
            .attr('text-anchor', 'start');

        // Function for moving the nodes
        function dragmove(d) {
            d3.select(this).attr(
            'transform',
            `translate(${margin.left + d.x},${margin.top + (d.y = Math.max(0, Math.min(diagramHeight, d3.event.y)))})`
            );
            sankey.relayout();
            link.attr('d', path);
        }

        // Add search functionality
        const searchBox = d3.select('#sankey-container')
            .append('div')
            .attr('class', 'search-container')
            .style('margin-top', '20px')
            .append('input')
            .attr('type', 'text')
            .attr('placeholder', 'Search nodes...')
            .style('padding', '5px')
            .style('width', '200px');


        searchBox.on('input', function() {
            const searchTerm = this.value.toLowerCase();
            node.transition()
            .duration(300)
            .style('opacity', d => 
                d.name.toLowerCase().includes(searchTerm) ? 1 : 0.2
            );
            link.transition()
            .duration(300)
            .style('opacity', d =>
                d.source.name.toLowerCase().includes(searchTerm) ||
                d.target.name.toLowerCase().includes(searchTerm) ? 1 : 0.1
            );
        });

    // Add path analysis and clustering functionality
    const PathAnalyzer = {
        paths: [],
        
        findAllPaths() {
            const paths = [];
            const visited = new Set();
            
            const dfs = (node, currentPath) => {
                if (!node.sourceLinks.length) {
                    paths.push([...currentPath, node]);
                    return;
                }
                
                node.sourceLinks.forEach(link => {
                    if (!visited.has(link.target)) {
                        visited.add(link.target);
                        dfs(link.target, [...currentPath, node]);
                        visited.delete(link.target);
                    }
                });
            };
            
            graph.nodes.forEach(node => {
                if (!node.targetLinks.length) { // Start from source nodes
                    visited.add(node);
                    dfs(node, []);
                    visited.delete(node);
                }
            });
            
            return paths;
        },
        
        calculatePathValue(path) {
            let minValue = Infinity;
            for (let i = 0; i < path.length - 1; i++) {
                const link = path[i].sourceLinks.find(l => l.target === path[i + 1]);
                minValue = Math.min(minValue, link.value);
            }
            return minValue;
        }
    };

    // Node Clustering functionality
    const NodeClusterer = {
        clusters: {},
        
        createClusters() {
            const clusters = {};
            graph.nodes.forEach(node => {
                const category = node.name.split('-')[0];
                if (!clusters[category]) {
                    clusters[category] = [];
                }
                clusters[category].push(node);
            });
            return clusters;
        },
        
        calculateClusterMetrics() {
            const metrics = {};
            Object.entries(this.clusters).forEach(([category, nodes]) => {
                metrics[category] = {
                    totalFlow: d3.sum(nodes, n => n.value),
                    nodeCount: nodes.length,
                    averageFlow: d3.mean(nodes, n => n.value)
                };
            });
            return metrics;
        }
    };

    // Initialize clustering
    NodeClusterer.clusters = NodeClusterer.createClusters();

    // Add cluster controls
    const clusterControls = d3.select('#sankey-container')
        .append('div')
        .attr('class', 'cluster-controls')
        .style('margin-top', '20px');

    Object.keys(NodeClusterer.clusters).forEach(category => {
        clusterControls.append('button')
            .attr('class', 'cluster-button')
            .text(`Highlight ${category}`)
            .on('click', () => highlightCluster(category));
    });

    // Path highlighting functionality
    const addPathHighlighting = () => {
        const paths = PathAnalyzer.findAllPaths();
        
        // Add path controls
        const pathControls = d3.select('#sankey-container')
            .append('div')
            .attr('class', 'path-controls')
            .style('margin-top', '20px');

        // Add significant paths selector
        const pathSelect = pathControls.append('select')
            .attr('class', 'path-select')
            .on('change', function() {
                highlightPath(paths[this.value]);
            });

        // Add top paths to selector
        const topPaths = paths
            .map(path => ({
                path: path,
                value: PathAnalyzer.calculatePathValue(path)
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 1728);

        pathSelect.selectAll('option')
            .data(topPaths)
            .enter()
            .append('option')
            .attr('value', (_d, i) => i)
            .text(d => `Path ${d.path.map(n => n.name.split('-')[1]).join(' → ')} (Value: ${d.value})`)
    };

    // Function to highlight a specific cluster
    const highlightCluster = (category) => {
        // Reset all nodes and links to dim state
        node.style('opacity', 0.2);
        link.style('opacity', 0.1);

        // Highlight nodes in the selected cluster
        const clusterNodes = NodeClusterer.clusters[category];
        node.filter(d => clusterNodes.includes(d))
            .style('opacity', 1)
            .select('rect')
            .style('stroke-width', '3px');

        // Highlight links connected to cluster nodes
        link.filter(d => 
            clusterNodes.includes(d.source) || 
            clusterNodes.includes(d.target)
        )
        .style('opacity', 0.8)
        .style('stroke-width', d => Math.max(2, d.dy));

    };

    // Function to highlight a specific path
    const highlightPath = (path) => {
        // Reset all nodes and links
        node.style('opacity', 0.2);
        link.style('opacity', 0.1);

        // Highlight nodes in path
        node.filter(d => path.includes(d))
            .style('opacity', 1)
            .select('rect')
            .style('stroke-width', '3px');

        // Highlight links in path
        for (let i = 0; i < path.length - 1; i++) {
            link.filter(d => 
                d.source === path[i] && 
                d.target === path[i + 1]
            )
            .style('opacity', 1)
            .style('stroke-width', d => Math.max(2, d.dy * 1.2));
        }
    };

    // Initialize advanced features
    addPathHighlighting();

    // Add reset button
    d3.select('#sankey-container')
        .append('button')
        .attr('class', 'reset-button')
        .text('Reset View')
        .on('click', () => {
            node.style('opacity', 1)
                .select('rect')
                .style('stroke-width', '1px');
            link.style('opacity', 0.7)
                .style('stroke-width', d => Math.max(1, d.dy));
        });
    };

    const data_path = 'car.data';
    // const data_path = 'http://vis.lab.djosix.com:2024/data/car.data';

    d3$1.text(data_path).then(function (r) {
        var loadedData = 'buying,maintenance,doors,persons,luggage boot,safety\n' + r;
        var data = d3.csvParse(loadedData);

        const transformData = (d) => {
            const nodesById = {};
            const linksMap = {};
            const columns = d.columns;
            const columnLength = columns.length;

            d.forEach((row) => {
                for (var i = 0; i < columnLength - 1; i++) {
                    const source = columns[i] + '-' + row[columns[i]];
                    const target = columns[i + 1] + '-' + row[columns[i + 1]];
                    if (target === '' || target === '-') {
                        break;
                    }

                    const linkKey = source + '->' + target;

                    if (!linksMap[linkKey]) {
                        linksMap[linkKey] = {
                            source: source,
                            target: target,
                            value: 0,
                        };
                    }

                    linksMap[linkKey].value += 1;
                    nodesById[source] = true;
                    nodesById[target] = true;
                }
            });

            const nodes = Object.keys(nodesById).map((id) => ({
                name: id,
                label: id.substr(0, 20),
            }));
            const links = Object.values(linksMap);

            return { nodes: nodes, links: links };
        };

        const transformedData = transformData(data);
        render(transformedData);
    });
})(d3);