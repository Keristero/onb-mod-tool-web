// Dependencies Tab - Visualizes mod dependency graph

import * as parser from '../parser.mjs';

export default class DependenciesTab {
    constructor() {
        this.container = null;
        this.allMods = [];
        this.graph = null;
    }
    
    async init(container) {
        this.container = container;
        this.container.innerHTML = `
            <div class="dependencies-view">
                <div class="dependencies-header">
                    <h2>Dependency Graph</h2>
                    <div class="dependencies-actions">
                        <button id="export-graph-png" class="btn btn-secondary">Export PNG</button>
                        <button id="export-graph-json" class="btn btn-secondary">Export JSON</button>
                        <button id="reset-graph" class="btn btn-secondary">Reset View</button>
                    </div>
                </div>
                <div id="dependency-info" class="dependency-info"></div>
                <div id="dependency-graph"></div>
            </div>
        `;
        
        // Event listeners
        this.container.querySelector('#export-graph-png').addEventListener('click', () => this.exportPNG());
        this.container.querySelector('#export-graph-json').addEventListener('click', () => this.exportJSON());
        this.container.querySelector('#reset-graph').addEventListener('click', () => this.resetGraph());
    }
    
    onFileProcessed(mod) {
        // Add to collection if not already there
        const existing = this.allMods.find(m => m.id === mod.id);
        if (!existing && mod.parsed) {
            this.allMods.push(mod);
        }
    }
    
    render() {
        if (this.allMods.length === 0) {
            this.container.querySelector('#dependency-graph').innerHTML = 
                '<div class="empty-state">No mods to display. Process some mods to see their dependencies.</div>';
            return;
        }
        
        this.buildGraph();
        this.displayInfo();
    }
    
    buildGraph() {
        // Extract dependency data
        const nodes = [];
        const links = [];
        const nodeMap = new Map();
        
        this.allMods.forEach(mod => {
            if (!mod.parsed) return;
            
            const deps = parser.extractDependencies(mod.parsed);
            
            // Add node
            if (!nodeMap.has(deps.packageId)) {
                const node = {
                    id: deps.packageId,
                    name: mod.parsed.name,
                    category: mod.parsed.category,
                    hasData: true
                };
                nodes.push(node);
                nodeMap.set(deps.packageId, node);
            }
            
            // Add dependency nodes and links
            deps.dependencies.forEach(depId => {
                if (!nodeMap.has(depId)) {
                    const node = {
                        id: depId,
                        name: depId,
                        category: 'external',
                        hasData: false
                    };
                    nodes.push(node);
                    nodeMap.set(depId, node);
                }
                
                links.push({
                    source: deps.packageId,
                    target: depId
                });
            });
        });
        
        // Detect circular dependencies
        const cycles = this.detectCycles(nodes, links);
        
        // Render with D3
        this.renderD3Graph(nodes, links, cycles);
    }
    
    detectCycles(nodes, links) {
        const cycles = [];
        const graph = new Map();
        
        // Build adjacency list
        links.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            
            if (!graph.has(sourceId)) {
                graph.set(sourceId, []);
            }
            graph.get(sourceId).push(targetId);
        });
        
        // DFS to detect cycles
        const visited = new Set();
        const recStack = new Set();
        
        function dfs(node, path = []) {
            if (recStack.has(node)) {
                // Found cycle
                const cycleStart = path.indexOf(node);
                if (cycleStart !== -1) {
                    cycles.push(path.slice(cycleStart).concat(node));
                }
                return;
            }
            
            if (visited.has(node)) return;
            
            visited.add(node);
            recStack.add(node);
            path.push(node);
            
            const neighbors = graph.get(node) || [];
            neighbors.forEach(neighbor => dfs(neighbor, [...path]));
            
            recStack.delete(node);
        }
        
        nodes.forEach(node => {
            if (!visited.has(node.id)) {
                dfs(node.id);
            }
        });
        
        return cycles;
    }
    
    renderD3Graph(nodes, links, cycles) {
        const container = this.container.querySelector('#dependency-graph');
        container.innerHTML = '';
        
        const width = container.clientWidth || 800;
        const height = 600;
        
        // Create SVG
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('background', 'var(--bg-color)');
        
        // Add zoom behavior
        const g = svg.append('g');
        
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });
        
        svg.call(zoom);
        
        // Nodes in cycles
        const cycleNodes = new Set(cycles.flat());
        
        // Create force simulation
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(30));
        
        // Create links
        const link = g.append('g')
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('stroke', d => {
                const sourceId = d.source.id || d.source;
                const targetId = d.target.id || d.target;
                return cycleNodes.has(sourceId) && cycleNodes.has(targetId) 
                    ? 'var(--error-color)' 
                    : 'var(--border-color)';
            })
            .attr('stroke-width', 2)
            .attr('marker-end', 'url(#arrowhead)');
        
        // Add arrowhead marker
        svg.append('defs').append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 20)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', 'var(--border-color)');
        
        // Create nodes
        const node = g.append('g')
            .selectAll('g')
            .data(nodes)
            .join('g')
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));
        
        // Add circles
        node.append('circle')
            .attr('r', 20)
            .attr('fill', d => {
                if (cycleNodes.has(d.id)) return 'var(--error-color)';
                if (!d.hasData) return 'var(--text-secondary)';
                return 'var(--primary-color)';
            })
            .attr('stroke', 'var(--bg-color)')
            .attr('stroke-width', 2);
        
        // Add labels
        node.append('text')
            .text(d => d.name.length > 15 ? d.name.slice(0, 12) + '...' : d.name)
            .attr('x', 0)
            .attr('y', 35)
            .attr('text-anchor', 'middle')
            .attr('fill', 'var(--text-color)')
            .attr('font-size', '12px');
        
        // Add tooltips
        node.append('title')
            .text(d => `${d.name}\nID: ${d.id}\nCategory: ${d.category}`);
        
        // Update positions on tick
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            
            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });
        
        // Drag functions
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
        
        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
        
        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
        
        this.graph = { svg, simulation, nodes, links, cycles };
    }
    
    displayInfo() {
        const info = this.container.querySelector('#dependency-info');
        
        if (!this.graph) {
            info.innerHTML = '';
            return;
        }
        
        const { nodes, links, cycles } = this.graph;
        const externalNodes = nodes.filter(n => !n.hasData).length;
        
        info.innerHTML = `
            <div class="info-grid">
                <div class="info-item">
                    <strong>Total Nodes:</strong> ${nodes.length}
                </div>
                <div class="info-item">
                    <strong>Analyzed Mods:</strong> ${nodes.length - externalNodes}
                </div>
                <div class="info-item">
                    <strong>External Dependencies:</strong> ${externalNodes}
                </div>
                <div class="info-item">
                    <strong>Dependencies:</strong> ${links.length}
                </div>
                <div class="info-item ${cycles.length > 0 ? 'error' : 'success'}">
                    <strong>Circular Dependencies:</strong> ${cycles.length > 0 ? '⚠ ' + cycles.length + ' detected' : '✓ None'}
                </div>
            </div>
            ${cycles.length > 0 ? `
                <div class="cycle-warning">
                    <h4>Circular Dependency Chains:</h4>
                    <ul>
                        ${cycles.map(cycle => `<li>${cycle.join(' → ')}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        `;
    }
    
    resetGraph() {
        if (this.graph && this.graph.svg) {
            const svg = d3.select(this.container.querySelector('svg'));
            svg.transition()
                .duration(750)
                .call(d3.zoom().transform, d3.zoomIdentity);
            
            this.graph.simulation.alpha(1).restart();
        }
    }
    
    exportPNG() {
        const svg = this.container.querySelector('svg');
        if (!svg) return;
        
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        canvas.width = svg.clientWidth;
        canvas.height = svg.clientHeight;
        
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'dependency-graph.png';
                a.click();
                URL.revokeObjectURL(url);
            });
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
    
    exportJSON() {
        if (!this.graph) return;
        
        const data = {
            nodes: this.graph.nodes.map(n => ({
                id: n.id,
                name: n.name,
                category: n.category,
                hasData: n.hasData
            })),
            links: this.graph.links.map(l => ({
                source: l.source.id || l.source,
                target: l.target.id || l.target
            })),
            cycles: this.graph.cycles
        };
        
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dependency-graph.json';
        a.click();
        URL.revokeObjectURL(url);
    }
    
    clear() {
        // Keep allMods for aggregated view
    }
}
