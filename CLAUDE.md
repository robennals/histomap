# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Histomap is a web-based historical timeline visualization tool that renders multiple event bands (datasets) on a single interactive timeline. It exports visualizations as PDFs for printing. The application is built with vanilla JavaScript and SVG rendering (no frameworks).

## Development Commands

```bash
# Start local development server
npm run dev
# Opens http://localhost:8000

# Test PDF export functionality (requires dev server running)
node test-pdf.mjs
```

## Architecture

### Core Modules (JavaScript)

The application uses a modular architecture with separate concerns:

- **`js/main.js`**: Application entry point, coordinates initialization
- **`js/dataLoader.js`**: Loads and processes event datasets (JSON and CSV)
- **`js/visualization.js`**: SVG rendering engine - creates timeline bands, events, and scales
- **`js/controls.js`**: UI controls - event set selection, reordering, time range, dimensions
- **`js/pdfExport.js`**: PDF export using jsPDF and svg2pdf.js

### Data Structure

Event datasets are JSON files in `data/` with this structure:

```json
{
  "name": "Event Set Name",
  "color": "#hexcolor",
  "events": [
    {
      "name": "Event Name",
      "start": "YYYY-MM-DD",
      "end": "YYYY-MM-DD",  // optional
      "priority": 1-5  // lower = more important
    }
  ]
}
```

**Special dataset type**: `data/bloc_gdp_summary.csv` contains GDP percentage data for world power blocs over time, rendered as filled area charts. This is loaded by `dataLoader.js:processGDPCSV()`.

### Rendering System

The visualization uses SVG for resolution-independent rendering:

1. **Timeline bands**: Each event set becomes a horizontal band
2. **Event positioning**: X-axis = time (year), Y-axis = band assignment
3. **Event priority**: Events with priority 1-2 are "major" (larger dots, thicker lines), 3+ are "minor"
4. **GDP visualization**: Area charts show relative power bloc GDP percentages over time
5. **Band heights**: Configurable per band (half/normal/double) via controls
6. **Collision detection**: Events are positioned in rows to prevent text overlap

Key rendering function: `visualization.js:render(eventSets, settings)`

### Python Scripts

Python scripts in `data/` generate processed datasets:

- **`generate_bloc_gdp.py`**: Merges country GDP data with bloc assignments to create time-series GDP data
- **`generate_bloc_summary.py`**: Aggregates GDP data into summary CSV for visualization

These use the Maddison Project Database (historical world GDP data).

## Key Implementation Details

### Event Positioning Algorithm

The visualization uses a sophisticated collision detection system in `visualization.js`:

1. Events are grouped by priority (major/minor)
2. Within each priority group, events are sorted by start date
3. Row assignment uses greedy algorithm checking for text/line overlaps
4. GDP bloc areas are rendered as stacked area charts with smooth transitions

### Font Configuration

Uses `Helvetica, Arial, sans-serif` for PDF compatibility. Text width measurements use HTML5 canvas context to calculate required padding dynamically.

### Band Title Positioning

Band titles are positioned at `padding.left - 10` with `text-anchor: end`, creating a left margin that adapts to the longest title text.

### Timeline Scale

Time scale uses linear mapping from years to pixels. Decade markers are rendered at bottom with configurable tick count.

## Data Sources

- **Primary focus**: US history (1750-2025)
- **World Power data**: Based on Maddison Project Database (GDP historical development data)
- **Event datasets**: Eras, Presidents, Notable People, Media, Technology, Wars, Historical Events

## Common Tasks

### Adding a New Event Dataset

1. Create JSON file in `data/` following the event structure
2. Add file path to `DATA_FILES` array in `js/dataLoader.js`
3. Reload page - new dataset appears in controls automatically

### Modifying Visualization Appearance

- **Colors**: Edit `GDP_BLOC_COLORS` in `visualization.js` or event set JSON `color` field
- **Sizes**: Modify `config.majorEventSize` / `config.minorEventSize` in `visualization.js`
- **Spacing**: Adjust `config.bandSpacing` and `config.bandHeights`

### Testing PDF Export

The `test-pdf.mjs` script uses Playwright to automate browser testing:
- Launches headless browser
- Loads the app, triggers PDF export
- Validates PDF dimensions and structure

## Notes

- No build step required - serves static files directly
- All visualization rendering happens client-side
- CSV processing happens at load time (not pre-built)
- SVG DOM is directly manipulated (not using a charting library)
