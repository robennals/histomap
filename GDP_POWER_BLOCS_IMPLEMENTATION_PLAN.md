# GDP Power Blocs Visualization - Implementation Plan

## Overview
Add an optional visualization band showing GDP power bloc distribution over time (1750-2020) to the histomap timeline. Each bloc displays as a colored horizontal region with height proportional to its GDP percentage, with periodic name labels.

---

## Design Requirements

### Visual Design
1. **Stacked area chart** showing GDP share by power bloc over time
2. **Each bloc has unique color** with semi-transparent fill
3. **Name labels** appear on the band when:
   - Bloc has >5% of world GDP
   - Substantial gap since last label (e.g., 50+ years or major size change)
   - Labels use darker version of base color (reduce opacity or darken hue)
4. **Time-aligned** with other histomap bands
5. **User-configurable height** - allocate vertical space via controls

### Blocs to Visualize (from bloc_gdp_summary.csv)
- China
- Independent Indian States → India
- British Empire → NATO + Aligned
- US
- Russian Empire → USSR + Aligned
- Japanese Empire
- Ottoman Empire
- Other European Empires
- Other

---

## Technical Approach

### Data Loading Strategy

**Option 1: Load CSV Directly (Recommended)**
- Modify `dataLoader.js` to support CSV loading
- Parse `bloc_gdp_summary.csv` into band data
- Advantages:
  - No JSON conversion needed
  - Easy to regenerate from Python scripts
  - Data already in optimal format (decades × blocs)

**Option 2: Convert to JSON**
- Transform CSV to JSON event set format
- Advantages:
  - Fits existing data loading infrastructure
  - No dataLoader modifications needed

**Decision: Option 1** - CSV is native format, avoid conversion overhead

---

## Implementation Steps

### Step 1: Data Loading
**File:** `js/dataLoader.js`

Add CSV loading capability:
```javascript
// Add to DATA_FILES array
const DATA_FILES = [
  'data/wars.json',
  'data/historical-events.json',
  'data/notable-people.json',
  'data/media.json',
  { type: 'csv', path: 'data/bloc_gdp_summary.csv', name: 'GDP Power Blocs' }
];

// New function: loadCSV()
async function loadCSV(filePath) {
  const response = await fetch(filePath);
  const text = await response.text();
  return parseCSV(text);
}

// New function: parseCSV()
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    data.push(row);
  }

  return { headers, data };
}

// New function: processGDPData()
function processGDPData(csvData) {
  // Transform CSV rows into bloc timeseries
  const blocs = csvData.headers.slice(1); // Skip 'Year' column
  const blocData = {};

  blocs.forEach(bloc => {
    blocData[bloc] = [];
  });

  csvData.data.forEach(row => {
    const year = parseInt(row.Year);
    blocs.forEach(bloc => {
      blocData[bloc].push({
        year: year,
        gdpPercent: parseFloat(row[bloc])
      });
    });
  });

  return {
    name: 'GDP Power Blocs',
    color: '#16a085', // Teal base color
    type: 'gdp-blocs',
    blocs: blocData,
    blocList: blocs
  };
}

// Update loadAllEventSets() to handle CSV files
```

---

### Step 2: Color Scheme
**File:** `js/visualization.js` or new `js/gdpBlocColors.js`

Define unique color for each bloc:
```javascript
const GDP_BLOC_COLORS = {
  'China': '#e74c3c',                      // Red
  'Independent Indian States': '#f39c12',  // Orange
  'India': '#e67e22',                      // Dark orange
  'British Empire': '#c0392b',             // Dark red
  'NATO + Aligned': '#3498db',             // Blue
  'US': '#2980b9',                         // Dark blue
  'Russian Empire': '#9b59b6',             // Purple
  'USSR + Aligned': '#8e44ad',             // Dark purple
  'Japanese Empire': '#e84393',            // Pink
  'Ottoman Empire': '#16a085',             // Teal
  'Other European Empires': '#27ae60',     // Green
  'Other': '#95a5a6'                       // Gray
};

// Function to darken color for labels (reduce lightness by 20%)
function darkenColor(hexColor, amount = 0.2) {
  // Convert hex to HSL, reduce lightness, convert back
  // Implementation details...
}
```

---

### Step 3: Rendering Function
**File:** `js/visualization.js`

Add new rendering function for GDP blocs band:
```javascript
/**
 * Draw GDP Power Blocs as stacked area chart
 * @param {SVGElement} bandGroup - SVG group for this band
 * @param {Object} gdpData - Processed GDP bloc data
 * @param {number} startY - Y coordinate for top of band
 * @param {number} bandHeight - Total height allocated to band
 * @returns {number} - Y coordinate after band
 */
function drawGDPBlocsband(bandGroup, gdpData, startY, bandHeight) {
  const { blocs, blocList } = gdpData;
  const startTimestamp = new Date(config.startYear, 0, 1).getTime();
  const endTimestamp = new Date(config.endYear, 11, 31).getTime();
  const timeRange = endTimestamp - startTimestamp;
  const chartWidth = config.width - config.padding.left - config.padding.right;

  // For each decade, calculate stacked positions
  const decades = Object.keys(blocs[blocList[0]]).map(idx =>
    blocs[blocList[0]][idx].year
  );

  // Create SVG paths for each bloc (stacked areas)
  blocList.forEach((blocName, blocIndex) => {
    const points = [];
    const reversedPoints = []; // For closing the path

    blocs[blocName].forEach((dataPoint, idx) => {
      const year = dataPoint.year;
      const gdpPercent = dataPoint.gdpPercent;

      // Calculate X position (time-aligned)
      const timestamp = new Date(year, 0, 1).getTime();
      const x = config.padding.left +
                ((timestamp - startTimestamp) / timeRange) * chartWidth;

      // Calculate Y position (stacked from bottom)
      // Sum all previous blocs' GDP percentages
      let stackedPercent = 0;
      for (let i = 0; i < blocIndex; i++) {
        stackedPercent += blocs[blocList[i]][idx].gdpPercent;
      }

      // Top edge of this bloc's region
      const topY = startY + bandHeight - (stackedPercent + gdpPercent) * bandHeight / 100;

      // Bottom edge of this bloc's region
      const bottomY = startY + bandHeight - stackedPercent * bandHeight / 100;

      points.push(`${x},${topY}`);
      reversedPoints.unshift(`${x},${bottomY}`);
    });

    // Create closed path for filled area
    const pathData = `M ${points.join(' L ')} L ${reversedPoints.join(' L ')} Z`;

    const path = createSVGElement('path', {
      d: pathData,
      fill: GDP_BLOC_COLORS[blocName],
      'fill-opacity': 0.7,
      stroke: GDP_BLOC_COLORS[blocName],
      'stroke-width': 1,
      'stroke-opacity': 0.9
    });

    bandGroup.appendChild(path);

    // Add labels where appropriate
    addGDPBlocLabels(bandGroup, blocName, blocs[blocName],
                     blocIndex, blocList, startY, bandHeight);
  });

  return startY + bandHeight;
}

/**
 * Add labels to GDP bloc regions
 * Labels appear when:
 * - Bloc has >5% GDP
 * - 50+ years since last label OR significant size change
 */
function addGDPBlocLabels(bandGroup, blocName, blocData, blocIndex,
                          blocList, startY, bandHeight) {
  const startTimestamp = new Date(config.startYear, 0, 1).getTime();
  const endTimestamp = new Date(config.endYear, 11, 31).getTime();
  const timeRange = endTimestamp - startTimestamp;
  const chartWidth = config.width - config.padding.left - config.padding.right;

  let lastLabelYear = -1000; // Force first label
  let lastGdpPercent = 0;

  blocData.forEach((dataPoint, idx) => {
    const year = dataPoint.year;
    const gdpPercent = dataPoint.gdpPercent;

    // Skip if too small
    if (gdpPercent < 5) return;

    // Check if we should show label
    const yearsSinceLabel = year - lastLabelYear;
    const gdpChange = Math.abs(gdpPercent - lastGdpPercent);

    const shouldShowLabel = yearsSinceLabel >= 50 ||
                           (yearsSinceLabel >= 25 && gdpChange > 5);

    if (!shouldShowLabel) return;

    // Calculate position
    const timestamp = new Date(year, 0, 1).getTime();
    const x = config.padding.left +
              ((timestamp - startTimestamp) / timeRange) * chartWidth;

    // Calculate stacked Y position (center of this bloc's region)
    let stackedPercent = 0;
    for (let i = 0; i < blocIndex; i++) {
      stackedPercent += blocList[i] in blocs ?
                        blocs[blocList[i]][idx].gdpPercent : 0;
    }

    const topY = startY + bandHeight - (stackedPercent + gdpPercent) * bandHeight / 100;
    const bottomY = startY + bandHeight - stackedPercent * bandHeight / 100;
    const centerY = (topY + bottomY) / 2;

    // Create label text
    const text = createSVGElement('text', {
      x: x,
      y: centerY,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      fill: darkenColor(GDP_BLOC_COLORS[blocName]),
      'font-size': '12px',
      'font-weight': 'bold',
      'opacity': 0.9
    });
    text.textContent = blocName;

    bandGroup.appendChild(text);

    lastLabelYear = year;
    lastGdpPercent = gdpPercent;
  });
}
```

---

### Step 4: Integrate into Main Rendering
**File:** `js/visualization.js`

Modify `drawEventBand()` to handle GDP blocs:
```javascript
function drawEventBand(svg, eventSet, currentY, maxRows) {
  // ... existing code ...

  if (eventSet.type === 'gdp-blocs') {
    // Use custom rendering for GDP blocs
    const bandHeight = eventSet.height || 200; // Default or user-configured
    maxY = drawGDPBlocsband(bandGroup, eventSet, startY, bandHeight);
  } else if (eventSet.name === "People") {
    maxY = drawPeopleBand(bandGroup, allEvents, startY, maxRows, bandTitle);
  } else {
    maxY = drawBandEvents(bandGroup, allEvents, startY,
                          eventSet.color, y, maxRows, eventSet.name);
  }

  // ... rest of existing code ...
}
```

---

### Step 5: User Controls
**File:** `js/controls.js`

Add height slider for GDP blocs band:
```javascript
// In renderEventSetSelector():
if (eventSet.type === 'gdp-blocs') {
  // Add height control instead of maxRows
  const heightControl = document.createElement('div');
  heightControl.className = 'control-group';
  heightControl.innerHTML = `
    <label>Band Height: <span id="gdp-height-value">200</span>px</label>
    <input type="range"
           id="gdp-height-slider"
           min="100"
           max="500"
           value="200"
           data-event-set="${eventSet.name}">
  `;

  const slider = heightControl.querySelector('input');
  slider.addEventListener('input', (e) => {
    const height = parseInt(e.target.value);
    document.getElementById('gdp-height-value').textContent = height;
    eventSetSettings[eventSet.name].height = height;
    updateVisualization();
  });

  settingsContent.appendChild(heightControl);
}
```

---

### Step 6: Testing Checklist

1. **Data Loading**
   - [ ] CSV loads correctly
   - [ ] All 12 blocs parsed
   - [ ] Years 1750-2020 included
   - [ ] GDP percentages sum to ~100% per year

2. **Rendering**
   - [ ] Stacked areas display correctly
   - [ ] Colors are distinct and readable
   - [ ] Time alignment matches other bands
   - [ ] No gaps or overlaps in stacked areas

3. **Labels**
   - [ ] Labels appear for blocs >5% GDP
   - [ ] Labels spaced appropriately (50+ year gaps)
   - [ ] Label colors darker than band colors
   - [ ] Labels readable and not overlapping

4. **Controls**
   - [ ] Band can be toggled on/off
   - [ ] Height slider works (100-500px range)
   - [ ] Changes update immediately
   - [ ] Settings persist during session

5. **Edge Cases**
   - [ ] Works with different year ranges (1750-1850, 1900-2020, etc.)
   - [ ] Works with different width settings
   - [ ] Handles blocs that start at 0% (Russia pre-1820, etc.)
   - [ ] Handles blocs that disappear (USSR → 0% in 1990)

6. **PDF Export**
   - [ ] GDP blocs band exports correctly
   - [ ] Colors preserved
   - [ ] Labels visible in PDF

---

## Color Palette Rationale

Assigned colors based on historical/geographic associations:
- **China**: Red (traditional Chinese color)
- **India/Indian States**: Orange/saffron (Indian flag color)
- **British Empire**: Dark red (British red)
- **NATO + Aligned**: Blue (Western bloc)
- **US**: Dark blue (American blue)
- **Russian/USSR**: Purple (distinct, imperial connotation)
- **Japan**: Pink (cherry blossom association)
- **Ottoman**: Teal (distinct from Europe)
- **Other European Empires**: Green (neutral European)
- **Other**: Gray (neutral)

---

## Alternative Approaches Considered

### Alternative 1: Timeline Events Model
Convert GDP dominance periods to "events" (e.g., "British Empire Peak 1850-1914").
- **Rejected**: Loses granular GDP information, doesn't show transitions clearly

### Alternative 2: Separate Line Chart
Show each bloc as a line chart of GDP % over time.
- **Rejected**: Harder to see total = 100%, lines would overlap heavily

### Alternative 3: Heatmap
Color intensity shows GDP strength over time for each bloc in separate rows.
- **Possible future enhancement**: Good for detail view, but less intuitive than stacked areas

---

## File Structure Summary

New/Modified Files:
```
/js/dataLoader.js          (Modified: Add CSV loading)
/js/visualization.js       (Modified: Add drawGDPBlocsband())
/js/gdpBlocColors.js       (New: Color definitions)
/js/controls.js            (Modified: Add height slider for GDP band)
/data/bloc_gdp_summary.csv (Exists: No changes needed)
```

---

## Estimated Effort

- **Data Loading**: 1-2 hours (CSV parsing, integration)
- **Rendering Logic**: 3-4 hours (stacked areas, coordinate calculations)
- **Label Placement**: 2-3 hours (collision detection, spacing logic)
- **Controls**: 1 hour (height slider)
- **Testing**: 2-3 hours (edge cases, visual QA)
- **Total**: 9-13 hours

---

## Future Enhancements

1. **Interactive tooltips**: Show exact GDP % on hover
2. **Smooth transitions**: Animate between decades for smoother appearance
3. **Detail mode toggle**: Switch between stacked areas and line chart
4. **Historical annotations**: Mark major events (WWI, WWII, decolonization)
5. **Export data**: Download visible GDP data as CSV
