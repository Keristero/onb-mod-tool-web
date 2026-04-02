# Implementation Tasks: Enhance Mod Analysis Reporting

## 1. Add Validation Functions
- [ ] 1.1 Create `validateModField()` function in `parser.mjs` for generic field validation
- [ ] 1.2 Create `validateModSummary()` function that runs all validation rules
- [ ] 1.3 Add constants for invalid values (e.g., INVALID_VALUES = ['none', 'null', '', 'unknown'])
- [ ] 1.4 Return structured validation errors with field names and messages

## 2. Update Results Tab Validation Logic
- [ ] 2.1 Import validation functions in `results-tab.mjs`
- [ ] 2.2 Run validation after parsing completes in `onFileProcessed()`
- [ ] 2.3 Store validation errors in mod object (`mod.validationErrors`)
- [ ] 2.4 Calculate three-tier status (Success/Validation Failed/Failed) based on category and validation errors

## 3. Update Results Tab Summary Display
- [ ] 3.1 Remove Path field from `renderSummary()`
- [ ] 3.2 Add validation error indicators to summary fields that fail validation
- [ ] 3.3 Display validation errors section below summary grid
- [ ] 3.4 Add tooltips explaining validation requirements
- [ ] 3.5 Update status display to show three-tier state with appropriate colors

## 4. Add Stdout Display
- [ ] 4.1 Check for `result.stdout` in `renderConsoleOutput()`
- [ ] 4.2 Create stdout `<pre>` block with syntax highlighting
- [ ] 4.3 Place stdout block above stderr block
- [ ] 4.4 Reuse existing `highlightConsoleOutput()` function for stdout

## 5. Update Statistics Tab Error Tracking
- [ ] 5.1 Add `validationErrors` tracking to mod objects in statistics
- [ ] 5.2 Update `calculateStats()` to separate parser errors from validation errors
- [ ] 5.3 Track validation error types (which fields fail most often)
- [ ] 5.4 Update `categorizeError()` to distinguish parser vs validation errors

## 6. Update Statistics Success Rate Tracking
- [ ] 6.1 Modify success rate calculation to use three states
- [ ] 6.2 Add `validationFailed` count to statistics objects
- [ ] 6.3 Calculate separate parse success rate and validation success rate
- [ ] 6.4 Update `renderSuccessRateChart()` to show three segments

## 7. Add Error Type Distribution Chart
- [ ] 7.1 Create `renderErrorTypeChart()` function in `statistics-tab.mjs`
- [ ] 7.2 Implement pie chart with two segments (parser vs validation)
- [ ] 7.3 Add chart to statistics view HTML
- [ ] 7.4 Handle empty state when no errors exist

## 8. Update Statistics Overview Cards
- [ ] 8.1 Update `renderOverviewCards()` for file view with three-tier status
- [ ] 8.2 Add Parser Errors and Validation Errors cards
- [ ] 8.3 Update session view cards with validation metrics
- [ ] 8.4 Add Parse Success Rate and Validation Success Rate cards

## 9. Update CSV Export
- [ ] 9.1 Add validation status column to CSV headers
- [ ] 9.2 Add parser error count and validation error count columns
- [ ] 9.3 Add validation error details column
- [ ] 9.4 Update `exportCSV()` to include validation data

## 10. Update XML Export
- [ ] 10.1 Add `<validationStatus>` element to XML structure
- [ ] 10.2 Add `<parserErrors>` and `<validationErrors>` elements
- [ ] 10.3 Nest validation error details in structured format
- [ ] 10.4 Update `exportXML()` to include validation data

## 11. Add Visual Styling
- [ ] 11.1 Add CSS classes for validation error styling in `styles.css`
- [ ] 11.2 Add colors for three-tier status (success green, validation-failed yellow/orange, failed red)
- [ ] 11.3 Style validation error section in summary
- [ ] 11.4 Style validation error pie chart

## 12. Testing and Validation
- [ ] 12.1 Test with mod that has all valid fields (Success state)
- [ ] 12.2 Test with mod missing UUID or name (Validation Failed state)
- [ ] 12.3 Test with mod that fails parsing (Failed state)
- [ ] 12.4 Verify stdout displays correctly when present
- [ ] 12.5 Verify statistics charts show correct counts
- [ ] 12.6 Verify CSV/XML exports include validation data
- [ ] 12.7 Test error type distribution chart with mixed errors
- [ ] 12.8 Verify backward compatibility with existing error tracking
