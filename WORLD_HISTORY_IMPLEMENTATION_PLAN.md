# World History Timeline Implementation Plan

## Overview
Add world history visualization (-20,000 BC to 2025 AD) with logarithmic time scaling to the existing Histomap application. Use incremental approach to keep US timeline working throughout. Create initial world datasets from internal knowledge to test UI/UX before investing in production data curation.

## Status: Phase 1 Complete ✅

### Completed Phases:
- ✅ Phase 1: Architecture Foundation (timelineConfig.js, timeScale.js, refactored visualization.js)

### In Progress:
- 🔄 Phase 2: UI Updates (next)

---

## Key Design Decisions

- **Logarithmic scale reference point**: 2500 AD (not 2025) to avoid over-allocating space to present day
- **Data strategy**: Initial datasets from internal knowledge for 5 core bands (Eras, People, Fiction, Technology, World Power)
- **Implementation approach**: Incremental - refactor for multi-timeline first, keep US working, then add World
- **Data organization**: Completely separate `data/us/` and `data/world/` directories
- **UI pattern**: Simple dropdown selector in top toolbar (moved from footer)

---

## Implementation Phases

### ✅ Phase 1: Architecture Foundation (COMPLETE)

**Goal: Refactor for multi-timeline without breaking US timeline**

**Completed:**
1. ✅ Created `js/timelineConfig.js` with TIMELINE_TYPES
2. ✅ Created `js/timeScale.js` with TimeScale class (linear implementation)
3. ✅ Moved existing linear scale logic from visualization.js into TimeScale
4. ✅ Updated visualization.js to use timeScale.yearToX() instead of inline calculations
5. ✅ Updated main.js to initialize with TimeScale
6. ✅ Updated index.html to include new script files
7. ✅ US timeline verified working with TimeScale abstraction

**Files Modified:**
- Created: `js/timelineConfig.js`
- Created: `js/timeScale.js`
- Modified: `js/visualization.js` (replaced position calculations at lines 199, 343, 371, 787, 792, 822, 828, 832, 1128, 1133)
- Modified: `js/main.js` (complete rewrite with AppState)
- Modified: `js/controls.js` (updated updateVisualization to pass TimeScale)
- Modified: `index.html` (added script includes)

**Success: US timeline renders identically to before refactor** ✅

---

### 🔄 Phase 2: UI Updates (NEXT)

**Goal: Add timeline selector UI without switching functionality**

**Tasks:**
1. Modify `index.html` - add toolbar header, move footer content
2. Update `css/styles.css` - style toolbar
3. Add dropdown with US/World options (World disabled initially)
4. Update main.js with timeline switcher handler (stub for world)

**HTML Structure to Add:**
```html
<header class="toolbar">
  <div class="toolbar-content">
    <div class="toolbar-left">
      <h1 class="app-title">Histomap</h1>
      <div class="timeline-selector">
        <label for="timeline-select">Timeline:</label>
        <select id="timeline-select">
          <option value="us" selected>US History (1750-2025)</option>
          <option value="world" disabled>World History (20,000 BC - Today)</option>
        </select>
      </div>
    </div>
    <div class="toolbar-right">
      <button id="toggle-controls">Settings</button>
      <button id="export-pdf">Export PDF</button>
    </div>
  </div>
</header>
```

**CSS to Add:**
```css
.toolbar {
  background: white;
  padding: 12px 20px;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 16px;
}
.toolbar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 24px;
}
.timeline-selector select {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 260px;
}
```

**Success criteria:** Clean toolbar UI, US timeline still works

---

### Phase 3: Data Reorganization

**Goal: Separate US and World data**

**Tasks:**
1. Create `data/us/` directory
2. Move existing data files to `data/us/`:
   - eras.json
   - presidents.json
   - notable-people.json
   - media.json
   - technology.json
   - bloc_gdp_summary.csv
3. Update `js/dataLoader.js` for path-based loading
4. Add `getDataFilesForPath()` function
5. Update main.js to use 'data/us/' path
6. Test: US timeline loads from new location

**dataLoader.js Changes:**
```javascript
async function loadAllEventSets(dataPath = 'data/us/') {
  const DATA_FILES = getDataFilesForPath(dataPath);
  // ... existing logic with prepended dataPath
}

function getDataFilesForPath(path) {
  const base = path.endsWith('/') ? path : path + '/';
  if (path.includes('world')) {
    return [
      `${base}eras.json`,
      `${base}notable-people.json`,
      `${base}technology.json`,
      `${base}media.json`,
      `${base}world-power.json`
    ];
  } else {
    return [
      `${base}eras.json`,
      `${base}presidents.json`,
      `${base}notable-people.json`,
      `${base}media.json`,
      `${base}technology.json`,
      { type: 'csv', path: `${base}bloc_gdp_summary.csv`, name: 'World Power' }
    ];
  }
}
```

**Success criteria:** US timeline works with data from data/us/

---

### Phase 4: BC Date Support

**Goal: Handle negative years and BC dates**

**Tasks:**
1. Add `extractYear()` function to dataLoader.js
2. Update `processEventSet()` to use numeric years
3. Add `formatYearLabel()` to visualization.js (ALREADY DONE ✅)
4. Create test file with BC dates to verify parsing

**dataLoader.js Changes:**
```javascript
function processEventSet(eventSet) {
  eventSet.events.forEach(event => {
    // Extract numeric year (handles negative)
    event.startYear = extractYear(event.start);
    event.endYear = event.end ? extractYear(event.end) : null;

    // Keep Date objects for compatibility
    event.startDate = new Date(event.start);
    event.endDate = event.end ? new Date(event.end) : null;

    // Use year values for timestamp calculations
    event.startTimestamp = event.startYear;
    event.endTimestamp = event.endYear;
  });

  eventSet.events.sort((a, b) => a.startYear - b.startYear);
}

function extractYear(dateString) {
  const match = dateString.match(/^(-?\d+)-/);
  return match ? parseInt(match[1]) : 0;
}
```

**Success criteria:** Can load and display events with negative year dates

---

### Phase 5: Logarithmic Scale Implementation

**Goal: Add log scale to TimeScale class** (Already implemented in timeScale.js ✅)

**Formula (IMPLEMENTED):**
```javascript
// Convert to years before reference point
yearsBeforeRef = referenceYear - year

// Apply log with offset
logValue = log_base(yearsBeforeRef + offset)

// Normalize to 0-1 range (reversed so older = left)
normalizedPosition = (maxLogValue - logValue) / (maxLogValue - minLogValue)

// Map to pixel space
x = padding.left + normalizedPosition * chartWidth
```

**Example with referenceYear=2500, base=2:**
- Year 2025: log2(476) = 8.9 → right side
- Year 1950: log2(551) = 9.1
- Year 1000: log2(1501) = 10.55
- Year 0: log2(2501) = 11.29
- Year -10000: log2(12501) = 13.61
- Year -20000: log2(22501) = 14.46

**Tasks:**
1. ✅ Logarithmic formulas already in TimeScale class
2. ✅ Log tick generation already implemented
3. ✅ Axis drawing already uses TimeScale ticks
4. Create test data with wide year range to verify
5. Test with referenceYear=2500, base=2

**Success criteria:** Can render timeline with logarithmic scale correctly

---

### Phase 6: World History Data

**Goal: Create initial world datasets**

**Directory Structure:**
```
data/world/
  ├── eras.json              (40-50 events)
  ├── notable-people.json    (100-120 people)
  ├── technology.json        (60-80 inventions)
  ├── media.json            (50-70 works)
  └── world-power.json      (major empires)
```

#### 1. World Eras (`data/world/eras.json`)

**40-50 events spanning:**
- Prehistoric: Upper Paleolithic (-20000), Mesolithic (-10000), Neolithic Revolution (-10000 to -6000)
- Ancient: Bronze Age (-3300), Iron Age (-1200), Classical Antiquity (-800 to 476)
- Post-classical: Early/High/Late Middle Ages (500-1500), Islamic Golden Age (750-1250)
- Early Modern: Renaissance (1300-1600), Age of Discovery (1400-1600), Scientific Revolution (1550-1700)
- Modern: Enlightenment (1650-1800), Industrial Revolution (1760-1840), Age of Imperialism (1800-1914)
- Contemporary: WWI/II (1914-1945), Cold War (1947-1991), Information Age (1970+), Digital Revolution (1990+)

#### 2. Notable People (`data/world/notable-people.json`)

**100-120 globally significant figures:**
- Ancient: Hammurabi (-1810), Confucius (-551), Buddha (-563), Socrates (-470), Plato (-428), Aristotle (-384), Alexander (-356), Qin Shi Huang (-259), Julius Caesar (-100), Cleopatra (-69), Jesus (0), Augustus (-63)
- Classical/Medieval: Constantine (272), Muhammad (570), Charlemagne (742), Saladin (1138), Genghis Khan (1162), Marco Polo (1254), Dante (1265), Ibn Battuta (1304)
- Renaissance/Early Modern: Gutenberg (1400), Leonardo (1452), Columbus (1451), Michelangelo (1475), Martin Luther (1483), Copernicus (1473), Shakespeare (1564), Galileo (1564), Descartes (1596), Newton (1643), Bach (1685)
- Enlightenment/Modern: Voltaire (1694), Mozart (1756), Napoleon (1769), Beethoven (1770), Darwin (1809), Lincoln (1809), Marx (1818), Edison (1847), Gandhi (1869), Einstein (1879), Picasso (1881), Hitler (1889), Churchill (1874), Mao (1893), MLK (1929), Mandela (1918)
- Contemporary: Jobs (1955), Gates (1955), Berners-Lee (1955)

#### 3. Technology (`data/world/technology.json`)

**60-80 inventions:**
- Prehistoric: Fire (-400000), Stone tools (-2600000), Agriculture (-10000), Pottery (-18000), Wheel (-3500)
- Ancient: Bronze (-3300), Iron (-1200), Writing (-3200), Alphabet (-1800), Paper (105), Compass (206), Gunpowder (800)
- Medieval: Mechanical clock (1300), Printing press (1440)
- Early Modern: Telescope (1608), Microscope (1590), Steam engine (1712)
- Modern: Telegraph (1837), Telephone (1876), Light bulb (1879), Automobile (1886), Airplane (1903), Radio (1895), Television (1927), Penicillin (1928), Nuclear energy (1942), Transistor (1947), Computer (1945), Internet (1969), Personal computer (1975), Mobile phone (1973), WWW (1989), Smartphone (2007)

#### 4. Fiction/Media (`data/world/media.json`)

**50-70 works:**
- Ancient: Epic of Gilgamesh (-2100), Iliad (-750), Odyssey (-725), Mahabharata (-400), Bible (-1000 to 100)
- Classical/Medieval: Aeneid (-19), Tale of Genji (1010), One Thousand and One Nights (800), Beowulf (1000), Divine Comedy (1320)
- Renaissance: Canterbury Tales (1400), Don Quixote (1605), Hamlet (1600), Paradise Lost (1667)
- 18th-19th Century: Robinson Crusoe (1719), Wealth of Nations (1776), Frankenstein (1818), Pride and Prejudice (1813), Origin of Species (1859), War and Peace (1869), Alice (1865), Sherlock Holmes (1887)
- 20th Century: Interpretation of Dreams (1899), Ulysses (1922), Great Gatsby (1925), 1984 (1949), LOTR (1954), To Kill a Mockingbird (1960)
- Contemporary: Star Wars (1977), Harry Potter (1997), LOTR films (2001)

#### 5. World Power (`data/world/world-power.json`)

**Major empires (simplified for initial testing):**
```json
{
  "name": "World Power",
  "color": "#16a085",
  "type": "empires",
  "events": [
    {"name": "Ancient Egypt", "start": "-3100-01-01", "end": "-30-01-01", "priority": 1},
    {"name": "Persian Empire", "start": "-550-01-01", "end": "-330-01-01", "priority": 1},
    {"name": "Roman Empire", "start": "-27-01-01", "end": "476-01-01", "priority": 1},
    {"name": "Han Dynasty", "start": "-206-01-01", "end": "220-01-01", "priority": 1},
    {"name": "Byzantine Empire", "start": "330-01-01", "end": "1453-01-01", "priority": 1},
    {"name": "Islamic Caliphates", "start": "632-01-01", "end": "1258-01-01", "priority": 1},
    {"name": "Mongol Empire", "start": "1206-01-01", "end": "1368-01-01", "priority": 1},
    {"name": "Ottoman Empire", "start": "1299-01-01", "end": "1922-01-01", "priority": 1},
    {"name": "Spanish Empire", "start": "1492-01-01", "end": "1898-01-01", "priority": 1},
    {"name": "British Empire", "start": "1583-01-01", "end": "1997-01-01", "priority": 1},
    {"name": "Russian Empire", "start": "1721-01-01", "end": "1917-01-01", "priority": 1},
    {"name": "Soviet Union", "start": "1922-01-01", "end": "1991-01-01", "priority": 1},
    {"name": "United States", "start": "1776-01-01", "end": "2025-01-01", "priority": 1},
    {"name": "PRC", "start": "1949-01-01", "end": "2025-01-01", "priority": 1}
  ]
}
```

**Success criteria:** All 5 world datasets created with quality content

---

### Phase 7: Integration & Testing

**Goal: Enable timeline switching and polish**

**Tasks:**
1. Update timelineConfig.js world config (already done ✅)
2. Enable World option in dropdown (remove `disabled`)
3. Add timeline switcher handler in main.js
4. Test switching between timelines
5. Fix any rendering issues
6. Test PDF export for both timelines
7. Performance testing
8. Update CLAUDE.md documentation

**Timeline Switcher (to add to main.js):**
```javascript
document.getElementById('timeline-select').addEventListener('change', async (e) => {
  const timelineId = e.target.value;
  await initializeTimeline(timelineId);
});
```

**Success criteria:** Both timelines work smoothly, can switch between them

---

## Technical Notes

### Logarithmic Scale Key Points
- Reference year 2500 avoids compressing recent history
- Base 2 logarithm creates intuitive doubling pattern
- Offset of 1 prevents log(0) errors
- Formula normalizes to 0-1 range before mapping to pixels
- Older events appear on left (visual convention)

### Year 0 Handling
- ISO 8601 doesn't have year 0 (1 BC → 1 AD)
- Use -1 for 1 BC, -2 for 2 BC, etc.
- Display "1 BC/AD" for year 0 in labels
- JavaScript Date unreliable for BC, use numeric years

### BC Date Format
```json
{
  "name": "Stone Age",
  "start": "-20000-01-01",
  "end": "-3000-01-01",
  "priority": 2
}
```

---

## Critical Files Reference

### Files Created (Phase 1 ✅)
- ✅ `js/timelineConfig.js` - Timeline definitions
- ✅ `js/timeScale.js` - Time scale abstraction

### Files to Create (Phases 6-7)
- `data/world/eras.json`
- `data/world/notable-people.json`
- `data/world/technology.json`
- `data/world/media.json`
- `data/world/world-power.json`

### Files to Modify
- Phase 2: `index.html`, `css/styles.css`, `js/main.js`
- Phase 3: `js/dataLoader.js`, create `data/us/` directory
- Phase 4: `js/dataLoader.js`
- Phase 7: `index.html` (enable dropdown), `CLAUDE.md`

---

## Estimated Effort

- ✅ Phase 1: 6-8 hours (COMPLETE)
- Phase 2: 2-3 hours
- Phase 3: 2-3 hours
- Phase 4: 2-3 hours
- Phase 5: 4-6 hours
- Phase 6: 8-12 hours
- Phase 7: 4-6 hours

**Total: 28-41 hours** (1-2 weeks full-time)
**Remaining: 22-33 hours**

---

## Future Enhancements (Out of Scope)
- Replace initial datasets with thoroughly researched data
- Add zoom capability for compressed regions
- Side-by-side timeline comparison
- Interactive tooltips with event details
- Additional timeline types (regional histories)
- GDP data extended to 1 AD from Maddison Project
- Additional world bands: civilizations, religions, pandemics, climate events
