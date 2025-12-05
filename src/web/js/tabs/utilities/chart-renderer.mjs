// Chart Rendering Utilities - Reusable SVG and HTML chart generators

import { escapeHtml, createElement } from '../../utils/html-utils.mjs';
import { addClass, removeClass } from '../../utils/dom-helpers.mjs';

/**
 * Creates an SVG arc path for use in pie charts
 * @param {number} startAngle - Starting angle in degrees (0 = top)
 * @param {number} endAngle - Ending angle in degrees
 * @param {number} radius - Radius of the arc
 * @param {number} center - Center point of the circle (x and y are same)
 * @param {string} color - Fill color for the arc
 * @param {string} tooltip - Tooltip text to display on hover
 * @returns {string} SVG path element as string
 */
export function createArcPath(startAngle, endAngle, radius, center, color, tooltip) {
    // Handle edge cases
    if (startAngle === endAngle) return '';
    
    // Escape tooltip for safe HTML embedding
    const escapedTooltip = tooltip
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    
    // For a complete circle (360 degrees), use a circle element
    const angleDiff = endAngle - startAngle;
    if (angleDiff >= 360 || angleDiff === 0) {
        return `<circle cx="${center}" cy="${center}" r="${radius}" fill="${color}" class="chart-segment" data-tooltip="${escapedTooltip}"></circle>`;
    }
    
    // Convert to radians and adjust so 0° is at top
    const start = (startAngle - 90) * Math.PI / 180;
    const end = (endAngle - 90) * Math.PI / 180;
    
    // Calculate arc endpoints
    const x1 = center + radius * Math.cos(start);
    const y1 = center + radius * Math.sin(start);
    const x2 = center + radius * Math.cos(end);
    const y2 = center + radius * Math.sin(end);
    
    // Large arc flag: 1 if arc is > 180°, 0 otherwise
    const largeArc = angleDiff > 180 ? 1 : 0;
    
    // Build SVG path: Move to center, Line to start, Arc to end, Close path
    const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    
    return `<path d="${d}" fill="${color}" class="chart-segment" data-tooltip="${escapedTooltip}"></path>`;
}

/**
 * Creates a complete pie chart with legend
 * @param {Array<{label: string, value: number, color: string, tooltip?: string}>} segments - Array of pie segments
 * @param {Object} options - Chart configuration options
 * @param {number} options.radius - Pie chart radius (default: 80)
 * @param {number} options.center - Center point coordinate (default: 100)
 * @param {boolean} options.showLegend - Whether to show legend (default: true)
 * @param {number} options.viewBox - SVG viewBox size (default: 200)
 * @returns {{svg: string, legend: string}} Object with svg and legend HTML strings
 */
export function createPieChart(segments, options = {}) {
    const {
        radius = 80,
        center = 100,
        showLegend = true,
        viewBox = 200
    } = options;
    
    // Calculate total value for percentage calculations
    const total = segments.reduce((sum, seg) => sum + seg.value, 0);
    
    if (total === 0) {
        return {
            svg: `<svg viewBox="0 0 ${viewBox} ${viewBox}"></svg>`,
            legend: '<div class="empty-state">No data to display</div>'
        };
    }
    
    // Generate arc paths
    let currentAngle = 0;
    let chartPaths = '';
    
    segments.forEach(segment => {
        if (segment.value > 0) {
            const angle = (segment.value / total) * 360;
            const percent = ((segment.value / total) * 100).toFixed(1);
            const tooltip = segment.tooltip || `${segment.label}: ${segment.value} (${percent}%)`;
            
            chartPaths += createArcPath(
                currentAngle,
                currentAngle + angle,
                radius,
                center,
                segment.color,
                tooltip
            );
            
            currentAngle += angle;
        }
    });
    
    const svg = `<svg viewBox="0 0 ${viewBox} ${viewBox}" class="pie-chart-svg">${chartPaths}</svg>`;
    
    // Generate legend in original format with colored bullets
    let legend = '';
    if (showLegend) {
        const legendItems = segments
            .filter(seg => seg.value > 0)
            .map(seg => {
                const percent = ((seg.value / total) * 100).toFixed(1);
                return `
                    <div>
                        <span><span style="color: ${seg.color}">●</span> ${seg.label}</span>
                        <span>${seg.value} (${percent}%)</span>
                    </div>
                `;
            })
            .join('');
        
        legend = legendItems;
    }
    
    return { svg, legend };
}

/**
 * Creates a horizontal bar chart
 * @param {Array<{label: string, value: number, tooltip?: string}>} items - Array of bar items
 * @param {Object} options - Chart configuration options
 * @param {number} options.maxValue - Maximum value for percentage calculation (defaults to max in items)
 * @param {string} options.barColor - Bar fill color (default: 'var(--error-color)')
 * @param {boolean} options.showCount - Whether to show count numbers (default: true)
 * @param {number} options.maxLabelLength - Max label length before truncation (default: 80)
 * @param {number} options.limit - Maximum number of items to display (default: no limit)
 * @returns {string} HTML string for bar chart
 */
export function createBarChart(items, options = {}) {
    const {
        maxValue = Math.max(...items.map(item => item.value)),
        barColor = 'var(--error-color)',
        showCount = true,
        maxLabelLength = 80,
        limit
    } = options;
    
    if (items.length === 0) {
        return '<div class="empty-state">No data to display</div>';
    }
    
    // Apply limit if specified
    const displayItems = limit ? items.slice(0, limit) : items;
    
    const bars = displayItems.map(item => {
        const percent = maxValue > 0 ? (item.value / maxValue * 100) : 0;
        
        // Truncate long labels
        const fullLabel = item.label;
        const shortLabel = fullLabel.length > maxLabelLength
            ? fullLabel.slice(0, maxLabelLength - 3) + '...'
            : fullLabel;
        
        // Escape HTML for safe rendering
        const escapedFullLabel = fullLabel
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        
        const escapedShortLabel = shortLabel
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        
        const titleAttr = fullLabel.length > maxLabelLength ? ` title="${escapedFullLabel}"` : '';
        const tooltip = item.tooltip ? ` title="${item.tooltip}"` : titleAttr;
        
        return `
            <div class="bar-item">
                <div class="bar-label"${tooltip}>${escapedShortLabel}</div>
                <div class="bar-visual">
                    <div class="bar-fill" style="width: ${percent}%; background: ${barColor}"></div>
                    ${showCount ? `<span class="bar-count">${item.value}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    return `<div class="bar-chart">${bars}</div>`;
}

/**
 * Initializes interactive tooltips for chart segments
 * Should be called after charts are rendered to the DOM
 */
export function initializeChartTooltips() {
    // Create tooltip element if it doesn't exist
    let tooltip = document.getElementById('chart-tooltip');
    if (!tooltip) {
        tooltip = createElement('div', {
            attributes: { id: 'chart-tooltip' },
            className: 'chart-tooltip'
        });
        document.body.appendChild(tooltip);
    }
    
    // Add event listeners to all chart segments
    const segments = document.querySelectorAll('.chart-segment');
    segments.forEach(segment => {
        segment.addEventListener('mouseenter', (e) => {
            const tooltipText = segment.getAttribute('data-tooltip');
            if (tooltipText) {
                // Parse tooltip text (format: "Label: value (percent%)")
                const match = tooltipText.match(/^(.+?):\s*(\d+)\s*\((.+?)\)$/);
                if (match) {
                    const [, label, value, percent] = match;
                    tooltip.innerHTML = `
                        <div class="chart-tooltip-label">${escapeHtml(label)}</div>
                        <div class="chart-tooltip-value">
                            Value: ${value}
                            <span class="chart-tooltip-percent">${percent}</span>
                        </div>
                    `;
                } else {
                    tooltip.innerHTML = `<div class="chart-tooltip-label">${escapeHtml(tooltipText)}</div>`;
                }
                addClass(tooltip, 'visible');
            }
        });
        
        segment.addEventListener('mousemove', (e) => {
            tooltip.style.left = (e.clientX + 15) + 'px';
            tooltip.style.top = (e.clientY + 15) + 'px';
        });
        
        segment.addEventListener('mouseleave', () => {
            removeClass(tooltip, 'visible');
        });
    });
}
