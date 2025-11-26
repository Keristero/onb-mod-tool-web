// Dependencies Tab - Visualizes mod dependency graph

import * as parser from '../parser.mjs';
import BaseTab from './base-tab.mjs';

export default class DependenciesTab extends BaseTab {
    constructor() {
        super();
        this.allMods = [];
        this.graph = null;
        this.showOnlyCurrent = false;
    }
    
    async init(container) {
        await super.init(container);
        this.container.innerHTML = `
            <div class="dependencies-view">
                <div class="dependencies-header">
                    <h2>Dependency Graph</h2>
                    <div class="dependencies-actions">
                        <label style="margin-right: 1rem;">
                            <input type="checkbox" id="show-only-current" />
                            Show only current mod
                        </label>
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
        this.addEventListener(this.querySelector('#show-only-current'), 'change', (e) => {
            this.showOnlyCurrent = e.target.checked;
            this.render();
        });
        this.addEventListener(this.querySelector('#export-graph-png'), 'click', () => this.exportPNG());
        this.addEventListener(this.querySelector('#export-graph-json'), 'click', () => this.exportJSON());
        this.addEventListener(this.querySelector('#reset-graph'), 'click', () => this.resetGraph());
    }
    
    async onFileProcessed(mod) {
        // Don't call super - we manage mods differently in dependencies tab
        // Set as current mod but don't load zip (we track our own)
        this.currentMod = mod;
        
        // Add to collection if not already there
        const existing = this.allMods.find(m => m.id === mod.id);
        if (!existing && mod.parsed) {
            this.allMods.push(mod);
        } else if (existing && mod.parsed) {
            // Update existing
            Object.assign(existing, mod);
        }
    }
    
    render() {
        if (this.showOnlyCurrent && !this.currentMod) {
            this.setHTML('#dependency-graph', 
                '<div class="empty-state">No mod selected. Process a mod to see its dependencies and file includes.</div>');
            return;
        }
        
        if (!this.showOnlyCurrent && this.allMods.length === 0) {
            this.setHTML('#dependency-graph', 
                '<div class="empty-state">No mods to display. Process some mods to see their dependencies.</div>');
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
        
        // Determine which mods to process
        const modsToProcess = this.showOnlyCurrent && this.currentMod 
            ? [this.currentMod] 
            : this.allMods;
        
        modsToProcess.forEach(mod => {
            if (!mod.parsed) return;
            
            const deps = parser.extractDependencies(mod.parsed);
            
            // Add main mod node
            if (!nodeMap.has(deps.packageId)) {
                const node = {
                    id: deps.packageId,
                    name: mod.parsed.name,
                    category: mod.parsed.category,
                    type: 'mod',
                    hasData: true
                };
                nodes.push(node);
                nodeMap.set(deps.packageId, node);
            }
            
            // Add package dependency nodes and links
            deps.dependencies.forEach(depId => {
                if (!nodeMap.has(depId)) {
                    const node = {
                        id: depId,
                        name: depId,
                        category: 'external',
                        type: 'package',
                        hasData: false
                    };
                    nodes.push(node);
                    nodeMap.set(depId, node);
                }
                
                links.push({
                    source: deps.packageId,
                    target: depId,
                    type: 'package-dependency'
                });
            });
            
            // Add file nodes and includes (if data available)
            if (mod.result && mod.result.data && mod.result.data.resources) {
                const resources = mod.result.data.resources;
                
                // Get all .lua files
                const luaFiles = [];
                if (resources.incs) {
                    luaFiles.push(...resources.incs);
                }
                
                // Create file nodes
                luaFiles.forEach(filePath => {
                    const fileId = `${deps.packageId}/${filePath}`;
                    if (!nodeMap.has(fileId)) {
                        const fileName = filePath.split('/').pop();
                        const node = {
                            id: fileId,
                            name: fileName,
                            fullPath: filePath,
                            category: 'file',
                            type: 'file',
                            hasData: true,
                            parentMod: deps.packageId
                        };
                        nodes.push(node);
                        nodeMap.set(fileId, node);
                        
                        // Link file to its mod
                        links.push({
                            source: deps.packageId,
                            target: fileId,
                            type: 'contains'
                        });
                    }
                });
                
                // TODO: Parse file includes from actual file content
                // For now, just show files belong to mod
            }
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
                if (cycleNodes.has(sourceId) && cycleNodes.has(targetId)) {
                    return 'var(--error-color)';
                }
                // Different colors for different link types
                if (d.type === 'contains') return 'var(--text-secondary)';
                if (d.type === 'file-include') return 'var(--success-color)';
                return 'var(--primary-color)';
            })
            .attr('stroke-width', d => d.type === 'contains' ? 1 : 2)
            .attr('stroke-dasharray', d => d.type === 'contains' ? '5,5' : null)
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
        
        // Add circles with different sizes for different node types
        node.append('circle')
            .attr('r', d => d.type === 'file' ? 12 : 20)
            .attr('fill', d => {
                if (cycleNodes.has(d.id)) return 'var(--error-color)';
                if (d.type === 'file') return 'var(--success-color)';
                if (!d.hasData) return 'var(--text-secondary)';
                return 'var(--primary-color)';
            })
            .attr('stroke', 'var(--bg-color)')
            .attr('stroke-width', 2);
        
        // Add labels
        node.append('text')
            .text(d => d.name.length > 15 ? d.name.slice(0, 12) + '...' : d.name)
            .attr('x', 0)
            .attr('y', d => d.type === 'file' ? 25 : 35)
            .attr('text-anchor', 'middle')
            .attr('fill', 'var(--text-color)')
            .attr('font-size', d => d.type === 'file' ? '10px' : '12px');
        
        // Add tooltips
        node.append('title')
            .text(d => {
                if (d.type === 'file') {
                    return `File: ${d.name}\nPath: ${d.fullPath}\nMod: ${d.parentMod}`;
                }
                return `${d.name}\nID: ${d.id}\nCategory: ${d.category}\nType: ${d.type}`;
            });
        
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
        const info = this.querySelector('#dependency-info');
        
        if (!this.graph) {
            info.innerHTML = '';
            return;
        }
        
        const { nodes, links, cycles } = this.graph;
        const modNodes = nodes.filter(n => n.type === 'mod' || n.type === 'package');
        const fileNodes = nodes.filter(n => n.type === 'file');
        const externalNodes = nodes.filter(n => !n.hasData && n.type !== 'file').length;
        
        const modeName = this.showOnlyCurrent && this.currentMod 
            ? `Current: ${this.currentMod.parsed.name}` 
            : 'All Mods';
        
        info.innerHTML = `
            <div class="info-grid">
                <div class="info-item">
                    <strong>View Mode:</strong> ${modeName}
                </div>
                <div class="info-item">
                    <strong>Total Nodes:</strong> ${nodes.length}
                </div>
                <div class="info-item">
                    <strong>Mods:</strong> ${modNodes.length - externalNodes}
                </div>
                <div class="info-item">
                    <strong>Files:</strong> ${fileNodes.length}
                </div>
                <div class="info-item">
                    <strong>External Dependencies:</strong> ${externalNodes}
                </div>
                <div class="info-item">
                    <strong>Links:</strong> ${links.length}
                </div>
                <div class="info-item ${cycles.length > 0 ? 'error' : 'success'}">
                    <strong>Circular Dependencies:</strong> ${cycles.length > 0 ? '⚠ ' + cycles.length + ' detected' : '✓ None'}
                </div>
            </div>
            <div style="margin-top: 1rem; padding: 0.75rem; background: var(--bg-color); border-radius: 4px; font-size: 0.875rem;">
                <strong>Legend:</strong>
                <span style="margin-left: 1rem; color: var(--primary-color);">● Mod</span>
                <span style="margin-left: 1rem; color: var(--success-color);">● File</span>
                <span style="margin-left: 1rem; color: var(--text-secondary);">● External</span>
                <span style="margin-left: 1rem; color: var(--error-color);">● Circular</span>
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
            const svg = d3.select(this.querySelector('svg'));
            svg.transition()
                .duration(750)
                .call(d3.zoom().transform, d3.zoomIdentity);
            
            this.graph.simulation.alpha(1).restart();
        }
    }
    
    exportPNG() {
        const svg = this.querySelector('svg');
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
        this.downloadFile('dependency-graph.json', json, 'application/json');
    }
    
    clear() {
        // Keep allMods for aggregated view
    }
}
