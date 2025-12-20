# Histomap Implementation Plan

## Overview
Build a web-based history visualization tool with SVG rendering and PDF export capabilities.

## Technology Stack
- **Frontend**: Vanilla JavaScript (no framework overhead for SVG manipulation)
- **Rendering**: SVG for resolution-independent graphics
- **PDF Export**: jsPDF + svg2pdf.js for client-side PDF generation
- **Styling**: CSS with modern layout (flexbox/grid)
- **Data Format**: Static JSON files

## Project Structure
```
histomap/
├── index.html              # Main HTML file
├── css/
│   └── styles.css         # Styling
├── js/
│   ├── main.js            # Application initialization
│   ├── controls.js        # UI controls logic
│   ├── visualization.js   # SVG rendering logic
│   ├── dataLoader.js      # Load and manage event sets
│   └── pdfExport.js       # PDF export functionality
├── data/
│   ├── wars.json
│   ├── historical-events.json
│   ├── notable-people.json
│   └── media.json
└── docs/
    ├── overview.md
    └── plans/
```

## Data Format Specification

Each JSON event set will follow this schema:
```json
{
  "name": "Wars",
  "color": "#e74c3c",
  "events": [
    {
      "name": "Civil War",
      "start": "1861-04-12",
      "end": "1865-05-09",
      "priority": 1
    }
  ]
}
```

- **name**: Display name for the event set
- **color**: Base color for the band (we'll generate lighter shades for minor events)
- **events**: Array of events
  - **name**: Short event name
  - **start**: ISO date string (YYYY-MM-DD)
  - **end**: Optional ISO date string
  - **priority**: Integer (1 = most important, higher = less important)

## Implementation Phases

### Phase 1: Project Setup & Data Structure
- [x] Create project directory structure
- [ ] Create HTML skeleton
- [ ] Set up basic CSS structure
- [ ] Create initial data files with sample events
- [ ] Implement data loader module

### Phase 2: Basic Visualization
- [ ] Create SVG container with proper viewBox
- [ ] Implement timeline axis rendering
- [ ] Render single event set with dots and lines
- [ ] Add event labels
- [ ] Implement time-to-x-coordinate conversion

### Phase 3: Controls Implementation
- [ ] Event set selector (checkboxes for each dataset)
- [ ] Event set height selector (dropdown per dataset)
- [ ] Time range controls (start/end date pickers)
- [ ] Width/height dimension controls
- [ ] Color scheme selector

### Phase 4: Multi-band Visualization
- [ ] Stack multiple event bands vertically
- [ ] Apply different colors to each band
- [ ] Handle relative heights (half/normal/double)
- [ ] Implement priority-based rendering (major vs minor events)
- [ ] Different styling for major/minor events

### Phase 5: Visual Polish
- [ ] Add tasteful color gradients
- [ ] Improve typography and spacing
- [ ] Add grid lines/markers for time reference
- [ ] Responsive sizing
- [ ] Handle edge cases (overlapping labels, dense events)

### Phase 6: PDF Export
- [ ] Integrate jsPDF and svg2pdf.js
- [ ] Implement export button
- [ ] Convert SVG to PDF with proper dimensions
- [ ] Test print quality

### Phase 7: Initial Datasets
- [ ] Populate wars.json (Revolutionary War, War of 1812, Civil War, WWI, WWII, Korean War, Vietnam War, Gulf War, etc.)
- [ ] Populate historical-events.json (Louisiana Purchase, Trail of Tears, Great Depression, etc.)
- [ ] Populate notable-people.json (Founding Fathers, presidents, scientists, artists, etc.)
- [ ] Populate media.json (Classic films, books, songs from 1900-present)

## Key Technical Decisions

### SVG Rendering Strategy
- Use `<svg>` element with responsive viewBox
- Create `<g>` groups for each event band
- Use `<circle>` for event dots
- Use `<line>` for event durations
- Use `<text>` for labels
- Apply transforms for positioning

### Time Scaling
- Convert dates to timestamps
- Map time range to SVG x-coordinates using linear scale
- Formula: `x = (timestamp - startTimestamp) / (endTimestamp - startTimestamp) * width`

### Priority Rendering
- Sort events by priority
- Top 2 priorities → "major events" row (larger dots, darker colors, bigger text)
- Priorities 3+ → "minor events" rows (smaller dots, lighter colors, smaller text)
- Position major events in upper portion of band, minor events below

### Color Strategy
- Each dataset has a base color
- Major events: 100% opacity of base color
- Minor events: 60% opacity of base color
- Use CSS filters or rgba() for transparency

### PDF Export Flow
1. User clicks "Export PDF" button
2. Clone current SVG element
3. Use svg2pdf.js to convert SVG to PDF document
4. Use jsPDF to save PDF file
5. Trigger download

## Development Order

1. **Start Simple**: Build with one hardcoded dataset first
2. **Iterate**: Add controls one at a time
3. **Expand**: Add multiple datasets
4. **Polish**: Refine visuals and add export
5. **Data**: Populate comprehensive datasets

## Success Criteria

- [ ] Can visualize multiple event sets simultaneously
- [ ] Time range is adjustable
- [ ] Major and minor events are visually distinct
- [ ] Each band has configurable height
- [ ] Colors are aesthetically pleasing
- [ ] PDF export works and is print-ready
- [ ] Initial 4 datasets are comprehensive (50+ events total)
- [ ] Handles time range 1775-2025 (250 years)

## Next Steps
Start with Phase 1: Create the basic HTML structure and implement the data loader to read JSON files.
