# Capability: Statistics Duplication Report

## Overview

This capability adds a new "Duplication Report" section to the Session Statistics tab that displays file duplication metrics, top duplicated files, drill-down views showing which mods contain duplicates, and file content previews.

## ADDED Requirements

### Requirement: Display duplication overview metrics

The system shall display aggregate duplication metrics in card format at the top of the duplication report section.

**Priority**: P0 (blocking)  
**Dependencies**: duplication-tracker capability

#### Scenario: Show metrics with duplicates present

**Given** a session with 5 mods containing duplicated files  
**And** total duplicated bytes = 12.4 MB  
**And** potential savings = 10.1 MB  
**When** the Session Statistics tab is rendered  
**Then** a "Duplication Report" section is displayed  
**And** it shows a card with "Total Duplicated: 12.4 MB"  
**And** it shows a card with "Potential Savings: 10.1 MB"  
**And** it shows a card with the duplication rate as a percentage

#### Scenario: Show empty state when no duplicates

**Given** a session with 3 mods but no duplicated files  
**When** the Session Statistics tab is rendered  
**Then** the duplication report shows "No duplicated files detected"  
**And** overview metric cards display "0 bytes" for all values

#### Scenario: Hide report when only one mod processed

**Given** only 1 mod has been processed in the session  
**When** the Session Statistics tab is rendered  
**Then** the duplication report section is not displayed  
**Or** shows a message "Process multiple mods to see duplication analysis"

### Requirement: Display top duplicated files table

The system shall show a table of the most duplicated files with sortable columns for occurrence count, size, and total impact.

**Priority**: P0 (blocking)  
**Dependencies**: duplication-tracker capability

#### Scenario: Show top 50 duplicated files by default

**Given** 100 files are duplicated across mods  
**When** the duplication report is rendered  
**Then** a table shows the top 50 files sorted by occurrence count (descending)  
**And** each row displays: file path, occurrence count, file size, total impact  
**And** a message indicates "Showing top 50 of 100 duplicated files"

#### Scenario: Sort table by different criteria

**Given** the duplicated files table is displayed  
**When** the user clicks the "Total Impact" column header  
**Then** the table re-sorts by total impact (count × size) in descending order  
**And** the currently sorted column is visually indicated (arrow icon or highlight)

#### Scenario: Table columns display formatted values

**Given** a duplicated file with size 2048 bytes and count 5  
**When** the file appears in the table  
**Then** the size column shows "2.0 KB" (human-readable)  
**And** the impact column shows "10.0 KB" (size × count, formatted)  
**And** the count column shows "5 mods"

### Requirement: Provide file drill-down panel

The system shall show a detailed panel when a duplicated file is selected, displaying all mods containing that file and a content preview.

**Priority**: P0 (blocking)  
**Dependencies**: duplication-tracker capability, file-preview-mixin

#### Scenario: Open drill-down for selected file

**Given** the duplicated files table is displayed  
**When** the user clicks on a file row (e.g., "lib/common.lua")  
**Then** a drill-down panel expands below the table  
**And** the panel shows "File: lib/common.lua" as the title  
**And** the panel lists all mods containing this file with their full paths within each mod

#### Scenario: Display file content preview in drill-down

**Given** the drill-down panel is open for "lib/common.lua"  
**When** the panel renders  
**Then** it shows a code preview section with syntax highlighting  
**And** the preview displays the first 500 lines of the file content  
**And** if the file is Lua, it applies Lua syntax highlighting via highlight.js

#### Scenario: Navigate to file in mod from drill-down

**Given** the drill-down panel shows "lib/common.lua" appears in "mod1.zip" and "mod2.zip"  
**When** the user clicks on "mod1.zip" in the locations list  
**Then** the application switches to the File Browser tab  
**And** the file browser shows mod1's file tree  
**And** "lib/common.lua" is automatically selected and previewed

#### Scenario: Close drill-down panel

**Given** the drill-down panel is open  
**When** the user clicks the same file row again or clicks a close button  
**Then** the drill-down panel collapses and is hidden  
**And** no file is selected in the table

### Requirement: Support duplication data export

The system shall provide CSV and XML export options for duplication data including all duplicated files and their locations.

**Priority**: P1 (important)  
**Dependencies**: data-exporter utility

#### Scenario: Export duplication report as CSV

**Given** a session with 20 duplicated files  
**When** the user clicks "Export CSV" in the duplication report section  
**Then** a CSV file is downloaded with filename "duplication-report-[timestamp].csv"  
**And** the CSV contains headers: "File Path, Hash, Size (bytes), Occurrences, Total Impact (bytes), Mods"  
**And** each row represents one duplicated file with all its locations listed

#### Scenario: Export duplication report as XML

**Given** a session with duplication data  
**When** the user clicks "Export XML" in the duplication report section  
**Then** an XML file is downloaded with structured duplication data  
**And** the XML includes a <summary> section with aggregate metrics  
**And** each <file> element contains hash, size, occurrences, and nested <location> elements

### Requirement: Integrate with session statistics lifecycle

The system shall update the duplication report whenever mods are added or removed from the session, and clear data when the session is reset.

**Priority**: P0 (blocking)  
**Dependencies**: statistics-tab lifecycle

#### Scenario: Update report when new mod processed

**Given** the duplication report is displayed with data from 3 mods  
**When** a 4th mod is processed that contains files duplicated from existing mods  
**Then** the duplication report automatically refreshes  
**And** the metrics reflect the new mod's files  
**And** the duplicated files table updates to show increased occurrence counts

#### Scenario: Clear report when session cleared

**Given** the duplication report shows data from multiple mods  
**When** the user clicks "Clear Session" in the Session Statistics tab  
**Then** the DuplicationTracker is reset  
**And** the duplication report displays the empty state  
**And** all metrics show zero

### Requirement: Display file type distribution

The system shall show a breakdown of duplicated files by file type (extension) to help identify patterns.

**Priority**: P2 (nice-to-have)  
**Dependencies**: chart-renderer utility

#### Scenario: Show file type distribution chart

**Given** duplicated files include 10 .lua files, 5 .png files, 3 .json files  
**When** the duplication report is rendered  
**Then** a bar chart or pie chart displays file type distribution  
**And** the chart shows ".lua: 10 files (56%)" as the largest segment  
**And** clicking a segment filters the table to show only that file type

### Requirement: Provide copy-to-clipboard functionality

The system shall allow users to copy file locations to clipboard for easy sharing and documentation.

**Priority**: P2 (nice-to-have)  
**Dependencies**: Clipboard API

#### Scenario: Copy file locations to clipboard

**Given** the drill-down panel shows "lib/common.lua" in 5 mods  
**When** the user clicks the [📋] clipboard icon next to the file  
**Then** a formatted list of locations is copied to clipboard  
**And** the format is: "lib/common.lua appears in: mod1.zip (lib/common.lua), mod2.zip (utils/common.lua), ..."  
**And** a brief toast notification confirms "Copied to clipboard"

## MODIFIED Requirements

None (this is a new section added to an existing tab)

## Implementation Notes

**Module Location**: `src/web/js/tabs/statistics-tab.mjs` (extended)

**New Rendering Methods**:
```javascript
renderDuplicationReport(): string;
renderDuplicationMetrics(metrics): string;
renderDuplicatedFilesTable(files): string;
renderFileDrillDown(fileInfo): string;
```

**Integration Points**:
- Queries DuplicationTracker.getInstance() for data
- Reuses chart-renderer.mjs for any charts
- Reuses data-exporter.mjs for CSV/XML export
- Reuses FilePreviewMixin for code previews

**UI Placement**: 
- New section appears after existing charts in session statistics
- Uses similar card layout and styling as other statistics sections
- Respects existing responsive design patterns
