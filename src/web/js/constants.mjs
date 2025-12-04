// Global constants shared across the application

// Pie chart configuration
export const PIE_CHART_RADIUS = 80;
export const PIE_CHART_CENTER = 100;

// Graph/visualization configuration
export const GRAPH_DEFAULT_HEIGHT = 600;
export const GRAPH_MIN_ZOOM = 0.1;
export const GRAPH_MAX_ZOOM = 4;

// File preview configuration
export const PREVIEW_CONTEXT_LINES = 5;
export const PREVIEW_MAX_LINES = 20;

// File size formatting
export const BYTES_PER_KB = 1024;
export const SIZE_UNITS = ['B', 'KB', 'MB', 'GB'];

// Color palette for charts (category colors, pie slices, etc.)
export const CHART_COLORS = [
    'var(--primary-color)',
    'var(--success-color)', 
    'var(--warning-color)',
    'var(--error-color)',
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // emerald
    '#3b82f6', // blue
    '#6366f1'  // indigo
];

// Specific category colors for mod categories
export const CATEGORY_COLORS = {
    player: '#3b82f6',   // blue
    mob: '#a855f7',      // purple
    card: '#fbbf24',     // amber
    library: '#22c55e',  // green
    block: '#0ea5e9',    // sky blue
    err: '#dc2626',      // red - error category
    unknown: '#9ca3af'   // gray
};

// Error type specific colors
export const ERROR_COLORS = {
    validation: 'var(--warning-color)',
    analyzer: 'var(--error-color)',
    stderr: '#dc143c', // crimson
    other: '#888' // gray
};

// Status colors
export const STATUS_COLORS = {
    success: 'var(--success-color)',
    warning: 'var(--warning-color)',
    error: 'var(--error-color)'
};
