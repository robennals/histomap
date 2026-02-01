// Visualization Module
// Handles SVG rendering of the timeline

const Visualization = (function() {
    const SVG_NS = 'http://www.w3.org/2000/svg';

    // Font configuration - use PDF-compatible fonts for consistent rendering
    const FONT_FAMILY = 'Helvetica, Arial, sans-serif';

    // GDP Bloc color scheme
    // Colors chosen to be distinct, with successors having related but distinguishable hues
    // Both US and British column names are mapped to ensure consistent colors
    const GDP_BLOC_COLORS = {
        'China': '#e74c3c',                      // Red (large bloc)
        'BRICS + Aligned': '#d68910',            // Dark orange (succeeds USSR, distinct but related)
        'India': '#f39c12',                      // Orange (adjacent to China)
        'British Empire': '#2874a6',             // Dark blue (distinct from India/China)
        'NATO + Aligned': '#1abc9c',             // Teal (succeeds British, related blue tone but distinct)
        'US': '#9b59b6',                         // Purple (next to NATO, distinct)
        'Russian Empire': '#e84393',             // Pink (distinct from others)
        'USSR + Aligned': '#b03a69',             // Darker pink (succeeds Russian, similar but distinct)
        'Japanese Empire': '#27ae60',            // Green (distinct from orange India)
        'Ottoman Empire': '#16a085',             // Dark teal (distinct)
        'Other European Empires': '#f1c40f',     // Yellow (distinct from teal/blue)
        'Other': '#7f8c8d',                      // Gray (neutral)
        // Ancient empires (for British History pre-1750)
        'Roman Empire': '#8e44ad',               // Deep purple (ancient power)
        'Parthian/Sassanid Empire': '#c0392b',   // Dark red (Persian)
        'Byzantine Empire': '#2980b9',           // Blue (successor to Rome)
        'Islamic Caliphate': '#27ae60',          // Green (traditional Islamic color)
        'Mongol Empire': '#d35400'               // Burnt orange (Asian steppe)
    };

    // Configuration
    const config = {
        width: 2400,
        height: 800,
        startYear: 1750,
        endYear: 2025,
        // left = margin (40) + space for band titles (100)
        padding: { top: 100, right: 40, bottom: 60, left: 140, marginLeft: 40 },
        bandHeights: {
            half: 60,
            normal: 120,
            double: 240
        },
        majorEventSize: {
            dotRadius: 5,
            lineWidth: 3,
            fontSize: 12
        },
        minorEventSize: {
            dotRadius: 3,
            lineWidth: 1.5,
            fontSize: 9
        },
        bandSpacing: 20,
        timelineTickCount: 10
    };

    let svg = null;
    let selectedEventSets = [];
    let currentTimeScale = null;

    /**
     * Format year for display (handles BC/AD)
     * @param {number} year - Year to format
     * @returns {string} Formatted year string
     */
    function formatYearLabel(year) {
        const normalizedYear = year === 0 ? 1 : year;
        const absYear = Math.abs(normalizedYear);
        const formatWithSuffix = (value, suffix) => {
            const rounded = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
            return `${rounded.replace(/\\.0$/, '')}${suffix}`;
        };

        if (normalizedYear < 0) {
            if (absYear >= 900_000_000) {
                return `${formatWithSuffix(absYear / 1_000_000_000, 'B')} BC`;
            }
            if (absYear >= 1_000_000) {
                return `${formatWithSuffix(absYear / 1_000_000, 'M')} BC`;
            }
            return `${absYear} BC`;
        }
        if (normalizedYear >= 900_000_000) {
            return `${formatWithSuffix(absYear / 1_000_000_000, 'B')} AD`;
        }
        if (normalizedYear >= 1_000_000) {
            return `${formatWithSuffix(absYear / 1_000_000, 'M')} AD`;
        }
        if (normalizedYear < 1000) return `${normalizedYear} AD`;
        return `${normalizedYear}`;
    }

    /**
     * Initialize visualization with event sets
     * @param {Array} eventSets - Array of event sets to visualize
     * @param {Object} timeScale - TimeScale instance for year-to-pixel conversion
     * @param {Object} settings - Visualization settings
     */
    function render(eventSets, timeScale, settings = {}) {
        // Update configuration if settings provided
        if (settings.width) config.width = settings.width;
        if (settings.startYear) config.startYear = settings.startYear;
        if (settings.endYear) config.endYear = settings.endYear;

        selectedEventSets = eventSets;
        currentTimeScale = timeScale;

        // Calculate required left padding by measuring actual text width
        // Use a canvas to measure text width accurately
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

        const maxTextWidth = Math.max(...selectedEventSets.map(set => {
            return ctx.measureText(set.name).width;
        }));

        // To match the top padding (60px total):
        // Band titles are positioned at (padding.left - 10) with text-anchor: end
        // This means the right edge of text is 10px from the chart area
        // We want: maxTextWidth + 10px (to chart) = total that fits in padding
        // And we want total left padding = 60px (to match top)
        // So we need to ensure: maxTextWidth + 10 <= 60
        // If text is wider, we need more padding
        config.padding.left = maxTextWidth + 24;

        // Update TimeScale dimensions after padding is calculated
        const chartWidth = config.width - config.padding.left - config.padding.right;
        currentTimeScale.updateDimensions(config.padding, chartWidth);

        // Calculate total height needed for all bands
        let totalHeight = config.padding.top;

        // Calculate height for each band
        selectedEventSets.forEach((eventSet, index) => {
            // Estimate band height (will be recalculated more precisely during actual rendering)
            const estimatedBandHeight = 100; // Default estimate
            totalHeight += estimatedBandHeight;
            if (index < selectedEventSets.length - 1) {
                totalHeight += config.bandSpacing;
            }
        });

        totalHeight += config.padding.bottom;
        config.height = totalHeight;

        // Clear existing SVG
        const container = document.getElementById('svg-container');
        container.innerHTML = '';

        // Create new SVG with calculated height
        svg = createSVGElement('svg', {
            width: config.width,
            height: config.height,
            id: 'histomap-viz'
        });

        // Create defs section for clipPaths (must be defined before use for svg2pdf compatibility)
        const defs = createSVGElement('defs');
        svg.appendChild(defs);

        // Add background
        svg.appendChild(createSVGElement('rect', {
            x: 0,
            y: 0,
            width: config.width,
            height: config.height,
            fill: 'white'
        }));

        // Append SVG to container early so getBBox() works for text measurement
        container.appendChild(svg);

        // Add title at the top
        const title = createSVGElement('text', {
            x: config.width / 2,
            y: 40,
            'font-family': FONT_FAMILY,
            'font-size': '32px',
            'font-weight': 'bold',
            'text-anchor': 'middle',
            fill: '#2c3e50'
        });
        title.textContent = settings.title || 'Timeline of US History';
        svg.appendChild(title);

        // Draw event bands and get actual height
        const actualHeight = drawEventBands();

        // Update bottom padding to match top label spacing (32px)
        config.padding.bottom = 32;

        // Update SVG height to actual size
        const finalHeight = actualHeight + config.padding.bottom;
        svg.setAttribute('height', finalHeight);
        // Update the background rect (direct child of SVG, not inside defs)
        svg.querySelector(':scope > rect').setAttribute('height', finalHeight);

        // Now draw timeline axis with correct height
        // It will be inserted right after background, before all event bands
        drawTimelineAxis();
    }

    /**
     * Draw the timeline axis
     */
    function drawTimelineAxis() {
        const axisGroup = createSVGElement('g', { id: 'timeline-axis' });

        // Get actual SVG height
        const actualHeight = parseInt(svg.getAttribute('height'));

        // Draw main axis line
        const axisLine = createSVGElement('line', {
            x1: config.padding.left,
            y1: config.padding.top - 20,
            x2: config.width - config.padding.right,
            y2: config.padding.top - 20,
            stroke: '#95a5a6',
            'stroke-width': 2
        });
        axisGroup.appendChild(axisLine);

        // Get ticks from TimeScale
        const ticks = currentTimeScale.getAxisTicks();

        // Draw ticks and grid lines
        ticks.forEach(tick => {
            const x = currentTimeScale.yearToX(tick.year);

            // Draw vertical grid line
            if (tick.showGrid) {
                const gridLine = createSVGElement('line', {
                    x1: x,
                    y1: config.padding.top,
                    x2: x,
                    y2: actualHeight - config.padding.bottom,
                    stroke: tick.color,
                    'stroke-width': tick.width
                });
                if (tick.opacity) {
                    gridLine.setAttribute('stroke-opacity', tick.opacity);
                }
                axisGroup.appendChild(gridLine);
            }

            // Draw tick mark
            if (tick.height > 0) {
                const tickLine = createSVGElement('line', {
                    x1: x,
                    y1: config.padding.top - 20 - tick.height,
                    x2: x,
                    y2: config.padding.top - 20,
                    stroke: tick.color,
                    'stroke-width': tick.width
                });
                axisGroup.appendChild(tickLine);
            }

            // Draw label
            if (tick.showLabel) {
                const label = createSVGElement('text', {
                    x: x,
                    y: config.padding.top - 32,
                    'text-anchor': 'middle',
                    'font-family': FONT_FAMILY,
                    'font-size': '11px',
                    'font-weight': tick.labelWeight || 'normal',
                    fill: '#7f8c8d'
                });
                label.textContent = formatYearLabel(tick.year);
                axisGroup.appendChild(label);
            }
        });

        // Insert axis group after background and defs, but before event bands
        // Find the background rect (first rect child of SVG)
        const backgroundRect = svg.querySelector(':scope > rect');
        if (backgroundRect && backgroundRect.nextSibling) {
            // Insert right after background rect, before any event bands
            svg.insertBefore(axisGroup, backgroundRect.nextSibling);
        } else {
            // Fallback: append at end
            svg.appendChild(axisGroup);
        }
    }


    /**
     * Darken a hex color by reducing lightness
     * @param {string} hexColor - Hex color string (e.g., '#e74c3c')
     * @param {number} amount - Amount to darken (0-1, default 0.3)
     * @returns {string} Darkened hex color
     */
    function darkenColor(hexColor, amount = 0.3) {
        // Convert hex to RGB
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        // Darken by reducing each component
        const darkenedR = Math.round(r * (1 - amount));
        const darkenedG = Math.round(g * (1 - amount));
        const darkenedB = Math.round(b * (1 - amount));

        // Convert back to hex
        const toHex = (n) => {
            const hex = n.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };

        return `#${toHex(darkenedR)}${toHex(darkenedG)}${toHex(darkenedB)}`;
    }

    /**
     * Draw GDP Power Blocs as stacked area chart
     * @param {SVGElement} bandGroup - SVG group for this band
     * @param {Object} gdpData - Processed GDP bloc data
     * @param {number} startY - Y coordinate for top of band
     * @param {number} bandHeight - Total height allocated to band
     * @returns {number} - Y coordinate after band
     */
    function drawGDPBlocsBand(bandGroup, gdpData, startY, bandHeight) {
        const { blocs, blocList } = gdpData;

        // Get all data points for the first bloc to determine years
        const allDataPoints = blocs[blocList[0]];

        // Filter to include years within our visible range
        let visibleDataPoints = allDataPoints.filter(dp =>
            dp.year >= currentTimeScale.startYear && dp.year < currentTimeScale.endYear
        );

        // Always extend to endYear + 1 to ensure bands go to the right edge
        // (the right edge of the year 2025 is actually Jan 1, 2026)
        if (visibleDataPoints.length > 0) {
            const lastDataYear = visibleDataPoints[visibleDataPoints.length - 1].year;
            // Add a synthetic point beyond endYear to reach the right edge
            visibleDataPoints = [...visibleDataPoints, {
                year: currentTimeScale.endYear + 1,
                gdpPercent: visibleDataPoints[visibleDataPoints.length - 1].gdpPercent
            }];
        }

        // Store all bloc points for label placement later
        const allBlocPoints = [];

        // For each bloc, create stacked areas (from bottom to top)
        blocList.forEach((blocName, blocIndex) => {
            const points = [];

            // Build the top edge of this bloc's region
            visibleDataPoints.forEach((dataPoint, idx) => {
                const year = dataPoint.year;

                // Calculate X position (time-aligned) using TimeScale
                const x = currentTimeScale.yearToX(year);

                // Get GDP data for this year (use last available if year is synthetic)
                const dataIndex = allDataPoints.findIndex(d => d.year === year);
                const actualIndex = dataIndex >= 0 ? dataIndex : allDataPoints.length - 1;

                // Calculate Y position (stacked from bottom)
                // Sum all previous blocs' GDP percentages at this time point
                let stackedPercent = 0;
                for (let i = 0; i < blocIndex; i++) {
                    stackedPercent += blocs[blocList[i]][actualIndex].gdpPercent;
                }

                // Current bloc's GDP percentage
                const currentBlocGDP = blocs[blocName][actualIndex].gdpPercent;

                // Top edge of this bloc's region (lower Y value = higher on screen)
                const topY = startY + bandHeight - ((stackedPercent + currentBlocGDP) * bandHeight / 100);

                points.push({ x, y: topY, year, gdpPercent: currentBlocGDP, stackedPercent });
            });

            // Build bottom edge (in reverse order for closed path)
            const bottomPoints = [];
            visibleDataPoints.forEach((dataPoint, idx) => {
                const year = dataPoint.year;

                // Calculate X position (time-aligned) using TimeScale
                const x = currentTimeScale.yearToX(year);

                // Get GDP data for this year (use last available if year is synthetic)
                const dataIndex = allDataPoints.findIndex(d => d.year === year);
                const actualIndex = dataIndex >= 0 ? dataIndex : allDataPoints.length - 1;

                // Bottom edge is the top of the stack below this bloc
                let stackedPercent = 0;
                for (let i = 0; i < blocIndex; i++) {
                    stackedPercent += blocs[blocList[i]][actualIndex].gdpPercent;
                }

                const bottomY = startY + bandHeight - (stackedPercent * bandHeight / 100);
                bottomPoints.unshift({ x, y: bottomY });
            });

            // Create path with linear interpolation between decade points
            let pathData = '';
            if (points.length > 0) {
                pathData = `M ${points[0].x},${points[0].y}`;
                for (let i = 1; i < points.length; i++) {
                    pathData += ` L ${points[i].x},${points[i].y}`;
                }
                // Connect to bottom edge
                for (let i = 0; i < bottomPoints.length; i++) {
                    pathData += ` L ${bottomPoints[i].x},${bottomPoints[i].y}`;
                }
                pathData += ' Z'; // Close path
            }

            if (pathData) {
                const path = createSVGElement('path', {
                    d: pathData,
                    fill: GDP_BLOC_COLORS[blocName] || '#95a5a6',
                    'fill-opacity': 0.4,
                    stroke: GDP_BLOC_COLORS[blocName] || '#95a5a6',
                    'stroke-width': 1,
                    'stroke-opacity': 0.6
                });

                bandGroup.appendChild(path);

                // Store points for later label placement
                allBlocPoints.push({ blocName, points, bandHeight });
            }
        });

        // Place labels for all blocs with collision detection
        // Priority: smallest blocs first (harder to place)
        placeAllGDPBlocLabels(bandGroup, allBlocPoints);

        return startY + bandHeight;
    }

    /**
     * Place labels for all GDP blocs with two-phase algorithm
     * Phase 1: Label each bloc at its peak (smallest first)
     * Phase 2: Repeatedly add labels at points furthest from existing labels (weighted by bloc size)
     * @param {SVGElement} bandGroup - SVG group for labels
     * @param {Array} allBlocPoints - Array of {blocName, points, bandHeight}
     */
    function placeAllGDPBlocLabels(bandGroup, allBlocPoints) {
        const placedLabels = []; // Track placed label bounding boxes
        const minBoundary = 3; // 3px boundary around each label (when possible)
        const chartRight = config.width - config.padding.right;

        // Store bloc data sorted by peak GDP within visible range
        const blocData = allBlocPoints.map(({ blocName, points, bandHeight }) => {
            let peakGDP = 0;
            points.forEach(point => {
                // Only consider points within visible range
                if (point.year >= currentTimeScale.startYear && point.year <= currentTimeScale.endYear) {
                    if (point.gdpPercent > peakGDP) {
                        peakGDP = point.gdpPercent;
                    }
                }
            });
            return { blocName, points, bandHeight, peakGDP };
        }).sort((a, b) => a.peakGDP - b.peakGDP);

        // Helper function to place a label
        function placeLabel(blocName, x, y, blocPixelHeight) {
            const labelWidth = blocName.length * 6;
            const labelHeight = 12;
            const rightMargin = 10; // 10px margin from right edge
            const labelRight = x + (labelWidth / 2);
            const adjustedX = labelRight > (chartRight - rightMargin) ? (chartRight - rightMargin - labelWidth / 2) : x;

            if (blocPixelHeight >= 2) {
                const text = createSVGElement('text', {
                    x: adjustedX,
                    y: y,
                    'text-anchor': 'middle',
                    'dominant-baseline': 'middle',
                    'font-family': FONT_FAMILY,
                    fill: darkenColor(GDP_BLOC_COLORS[blocName] || '#95a5a6'),
                    'font-size': '11px',
                    'font-weight': 'bold',
                    'opacity': 0.9
                });
                text.textContent = blocName;
                bandGroup.appendChild(text);

                placedLabels.push({
                    x: adjustedX,
                    y: y,
                    width: labelWidth,
                    height: labelHeight,
                    blocName: blocName
                });
                return true;
            }
            return false;
        }

        // PHASE 1: Label each bloc at its peak within visible range (smallest first)
        blocData.forEach(({ blocName, points, bandHeight, peakGDP }) => {
            let peakPoint = null;
            points.forEach(point => {
                // Find peak within visible range
                if (point.year >= currentTimeScale.startYear && point.year <= currentTimeScale.endYear) {
                    if (point.gdpPercent === peakGDP) {
                        if (!peakPoint || point.year - currentTimeScale.startYear >= 10) {
                            peakPoint = point;
                        }
                    }
                }
            });

            if (peakPoint && peakPoint.year - currentTimeScale.startYear >= 10) {
                const blocPixelHeight = (peakPoint.gdpPercent / 100) * bandHeight;
                const centerY = peakPoint.y + (blocPixelHeight / 2);
                placeLabel(blocName, peakPoint.x, centerY, blocPixelHeight);
            }
        });

        // PHASE 2: Add secondary labels (furthest from existing, weighted by size)
        // Do multiple rounds, cycling through blocs smallest first
        const maxSecondaryLabels = 20; // Limit total secondary labels
        for (let round = 0; round < maxSecondaryLabels; round++) {
            let labelPlaced = false;

            for (const { blocName, points, bandHeight } of blocData) {
                // Find the best position for a new label
                let bestPoint = null;
                let bestScore = -Infinity;

                points.forEach(point => {
                    const { year, gdpPercent } = point;
                    if (gdpPercent < 5) return; // Secondary labels only when >5%
                    if (year - currentTimeScale.startYear < 10) return; // Too close to start

                    // Calculate distance to nearest existing label of this bloc
                    let minDistToOwnLabel = Infinity;
                    for (const placed of placedLabels) {
                        if (placed.blocName === blocName) {
                            const dist = Math.abs(point.x - placed.x);
                            minDistToOwnLabel = Math.min(minDistToOwnLabel, dist);
                        }
                    }

                    // Score: distance * size weight (prefer large sections far from labels)
                    const sizeWeight = gdpPercent / 100;
                    const score = minDistToOwnLabel * sizeWeight;

                    if (score > bestScore) {
                        bestScore = score;
                        bestPoint = point;
                    }
                });

                // Place label if we found a good spot and it's far enough
                if (bestPoint && bestScore > 100) { // Minimum distance threshold
                    const blocPixelHeight = (bestPoint.gdpPercent / 100) * bandHeight;
                    const centerY = bestPoint.y + (blocPixelHeight / 2);
                    if (placeLabel(blocName, bestPoint.x, centerY, blocPixelHeight)) {
                        labelPlaced = true;
                    }
                }
            }

            // Stop if no labels were placed this round
            if (!labelPlaced) break;
        }
    }

    /**
     * Draw all event bands (separate sections for each event set)
     * @returns {number} The final Y position after all bands
     */
    function drawEventBands() {
        let currentY = config.padding.top;

        selectedEventSets.forEach((eventSet, index) => {
            const bandHeight = drawEventBand(eventSet, currentY);
            currentY += bandHeight;

            // Add spacing between bands (but not after the last one)
            if (index < selectedEventSets.length - 1) {
                currentY += config.bandSpacing;
            }
        });

        return currentY;
    }

    /**
     * Draw a single event band
     * @param {Object} eventSet - The event set to draw
     * @param {number} y - Y position of the band
     * @returns {number} The actual height used by the band
     */
    function drawEventBand(eventSet, y) {
        const bandGroup = createSVGElement('g', { class: 'event-band' });

        // Append group to SVG early so getBBox() works for text measurement
        svg.appendChild(bandGroup);

        let maxY;
        let actualHeight;

        // Use special rendering for GDP Power Blocs
        if (eventSet.type === 'gdp-blocs') {
            const bandHeight = eventSet.height || 200; // Default or user-configured
            maxY = drawGDPBlocsBand(bandGroup, eventSet, y, bandHeight);
            actualHeight = bandHeight;
        } else if (eventSet.type === 'timeseries-lines') {
            const bandHeight = eventSet.maxHeight || 140;
            maxY = drawTimeSeriesLineBand(bandGroup, eventSet, y, bandHeight);
            actualHeight = bandHeight;
        } else {
            // Use People rendering approach for all bands (allows overlap and compact packing)
            const allEvents = [...eventSet.events].sort((a, b) => a.priority - b.priority);
            const topPadding = 8;
            const bottomPadding = 8;
            const fontSize = 12;
            // startY should be baseline position, accounting for text ascent above baseline
            const startY = y + topPadding + fontSize;

            const maxHeight = eventSet.maxHeight || 999;
            const isPeopleBand = eventSet.name === "People";
            const isPresidentsBand = eventSet.name === "Presidents";
            maxY = drawPeopleBand(bandGroup, allEvents, startY, eventSet.color, y, maxHeight, isPeopleBand, isPresidentsBand);

            // Calculate actual height needed (maxY already includes content, just add bottom padding)
            actualHeight = (maxY - y) + bottomPadding;
        }

        // Create clipPath for this band with actual height
        // Add to defs section for svg2pdf compatibility (clipPaths must be defined before use)
        const clipPathId = `clip-${eventSet.name.replace(/\s+/g, '-')}`;
        const clipPath = createSVGElement('clipPath', { id: clipPathId });
        const clipRect = createSVGElement('rect', {
            x: config.padding.left,
            y: y,
            width: config.width - config.padding.left - config.padding.right,
            height: actualHeight
        });
        clipPath.appendChild(clipRect);
        svg.querySelector('defs').appendChild(clipPath);

        // Apply clip path to band group
        bandGroup.setAttribute('clip-path', `url(#${clipPathId})`);

        // Band background
        const background = createSVGElement('rect', {
            x: config.padding.left,
            y: y,
            width: config.width - config.padding.left - config.padding.right,
            height: actualHeight,
            fill: eventSet.color,
            'fill-opacity': 0.05,
            stroke: eventSet.color,
            'stroke-width': 1,
            'stroke-opacity': 0.2,
            'pointer-events': 'none'
        });
        if (bandGroup.firstChild) {
            bandGroup.insertBefore(background, bandGroup.firstChild);
        } else {
            bandGroup.appendChild(background);
        }

        // Band title (outside the clipped group so it's always visible)
        const title = createSVGElement('text', {
            x: config.padding.left - 10,
            y: y + actualHeight / 2,
            'text-anchor': 'end',
            'dominant-baseline': 'middle',
            'font-family': FONT_FAMILY,
            'font-size': '14px',
            'font-weight': 'bold',
            fill: eventSet.color
        });
        title.textContent = eventSet.name;
        svg.appendChild(title);

        return actualHeight;
    }

    /**
     * Draw a time series band as a filled area
     * @param {SVGElement} group - Parent SVG group
     * @param {Object} seriesSet - Time series event set
     * @param {number} bandY - Y position of the band
     * @param {number} bandHeight - Height of the band
     * @returns {number} The maximum Y position used
     */
    function drawTimeSeriesLineBand(group, seriesSet, bandY, bandHeight) {
        const topPadding = 8;
        const bottomPadding = 8;
        const chartTop = bandY + topPadding;
        const chartBottom = bandY + bandHeight - bottomPadding;
        const chartLeft = config.padding.left;
        const chartRight = config.width - config.padding.right;

        const visiblePoints = seriesSet.points
            .filter(point => point.year >= currentTimeScale.startYear && point.year <= currentTimeScale.endYear)
            .sort((a, b) => a.year - b.year);

        if (visiblePoints.length === 0) {
            return bandY + bandHeight;
        }

        const isClimateBand = seriesSet.name && seriesSet.name.toLowerCase().includes('climate');
        const recentCutoffYear = -50000000;
        const recentPanelStartYear = 1825;
        const recentPanelEndYear = 2025;
        const hasRecentPanel = isClimateBand &&
            currentTimeScale.startYear <= recentCutoffYear &&
            currentTimeScale.endYear >= recentCutoffYear;
        const cutoffXFull = hasRecentPanel ? currentTimeScale.yearToX(recentCutoffYear) : chartRight;
        const chartWidth = chartRight - chartLeft;
        const recentPanelWidth = hasRecentPanel
            ? Math.max(220, Math.min(360, chartWidth * 0.28))
            : 0;
        const panelStartX = hasRecentPanel ? (chartRight - recentPanelWidth) : chartRight;

        const formatAxisValue = (value) => {
            const rounded = Math.round(value * 10) / 10;
            return rounded % 1 === 0 ? String(rounded.toFixed(0)) : String(rounded.toFixed(1));
        };

        const getNiceTicks = (minValue, maxValue, targetTicks = 4) => {
            const range = maxValue - minValue;
            if (!Number.isFinite(range) || range <= 0) {
                return [minValue, maxValue];
            }

            const roughStep = range / (targetTicks - 1);
            const power = Math.pow(10, Math.floor(Math.log10(roughStep)));
            const stepOptions = [1, 2, 5, 10].map(m => m * power);
            let step = stepOptions[0];
            for (const option of stepOptions) {
                if (roughStep <= option) {
                    step = option;
                    break;
                }
            }

            const tickStart = Math.ceil(minValue / step) * step;
            const tickEnd = Math.floor(maxValue / step) * step;
            const ticks = [];
            for (let value = tickStart; value <= tickEnd + step * 0.5; value += step) {
                ticks.push(value);
            }

            if (ticks.length === 0) {
                return [minValue, maxValue];
            }
            return ticks;
        };

        const seriesStats = new Map();
        seriesSet.series.forEach(series => {
            const values = visiblePoints
                .map(p => p[series.key])
                .filter(v => Number.isFinite(v));
            if (values.length === 0) {
                return;
            }

            let minValue = Math.min(...values);
            let maxValue = Math.max(...values);
            if (minValue === maxValue) {
                minValue -= 1;
                maxValue += 1;
            }
            const valuePadding = (maxValue - minValue) * 0.05;
            minValue -= valuePadding;
            maxValue += valuePadding;
            seriesStats.set(series.key, { min: minValue, max: maxValue });
        });

        const tempSeries = seriesSet.series.find(series => series.key === 'temp_c');
        if (tempSeries && seriesStats.has(tempSeries.key)) {
            const tempStats = seriesStats.get(tempSeries.key);
            const toY = (value) => {
                const t = (value - tempStats.min) / (tempStats.max - tempStats.min);
                return chartBottom - t * (chartBottom - chartTop);
            };

            const tickValues = getNiceTicks(tempStats.min, tempStats.max, 4);
            const ticks = tickValues.map(value => ({ value, y: toY(value) }));

            const leftX = chartLeft + 4;
            const rightX = hasRecentPanel ? (panelStartX - 4) : (chartRight - 4);

            ticks.forEach(tick => {
                const tickLabel = formatAxisValue(tick.value);

                const gridLine = createSVGElement('line', {
                    x1: chartLeft,
                    x2: chartRight,
                    y1: tick.y,
                    y2: tick.y,
                    stroke: '#cfcfcf',
                    'stroke-width': 1,
                    'stroke-opacity': 0.25,
                    'pointer-events': 'none'
                });
                group.appendChild(gridLine);

                const leftTick = createSVGElement('line', {
                    x1: leftX,
                    x2: leftX + 6,
                    y1: tick.y,
                    y2: tick.y,
                    stroke: tempSeries.color,
                    'stroke-width': 1,
                    'stroke-opacity': 0.6
                });
                group.appendChild(leftTick);

                const leftText = createSVGElement('text', {
                    x: leftX + 8,
                    y: tick.y + 3,
                    'font-family': FONT_FAMILY,
                    'font-size': '10px',
                    fill: tempSeries.color
                });
                leftText.textContent = tickLabel;
                group.appendChild(leftText);

                const rightTick = createSVGElement('line', {
                    x1: rightX - 6,
                    x2: rightX,
                    y1: tick.y,
                    y2: tick.y,
                    stroke: tempSeries.color,
                    'stroke-width': 1,
                    'stroke-opacity': 0.6
                });
                group.appendChild(rightTick);

                const rightText = createSVGElement('text', {
                    x: rightX - 8,
                    y: tick.y + 3,
                    'text-anchor': 'end',
                    'font-family': FONT_FAMILY,
                    'font-size': '10px',
                    fill: tempSeries.color
                });
                rightText.textContent = tickLabel;
                group.appendChild(rightText);
            });

            const unitLabelLeft = createSVGElement('text', {
                x: leftX + 8,
                y: chartTop + 8,
                'font-family': FONT_FAMILY,
                'font-size': '10px',
                'font-weight': 'bold',
                fill: tempSeries.color
            });
            unitLabelLeft.textContent = tempSeries.unit || '°C';
            group.appendChild(unitLabelLeft);

            const unitLabelRight = createSVGElement('text', {
                x: rightX - 8,
                y: chartTop + 8,
                'text-anchor': 'end',
                'font-family': FONT_FAMILY,
                'font-size': '10px',
                'font-weight': 'bold',
                fill: tempSeries.color
            });
            unitLabelRight.textContent = tempSeries.unit || '°C';
            group.appendChild(unitLabelRight);
        }

        let panelGroup = null;
        const panelXForYear = (year) => {
            const denom = (recentPanelEndYear - recentPanelStartYear);
            const rawT = denom > 0 ? (year - recentPanelStartYear) / denom : 0;
            const t = Math.min(1, Math.max(0, rawT));
            return panelStartX + t * (chartRight - panelStartX);
        };

        const mainXForYear = (year) => {
            if (!hasRecentPanel) {
                return currentTimeScale.yearToX(year);
            }
            const denom = (cutoffXFull - chartLeft);
            if (denom <= 0) {
                return currentTimeScale.yearToX(year);
            }
            const xFull = currentTimeScale.yearToX(year);
            const t = (xFull - chartLeft) / denom;
            return chartLeft + t * (panelStartX - chartLeft);
        };

        if (hasRecentPanel) {
            panelGroup = createSVGElement('g', { class: 'recent-panel' });
            group.appendChild(panelGroup);

            const panelRect = createSVGElement('rect', {
                x: panelStartX,
                y: chartTop,
                width: chartRight - panelStartX,
                height: chartBottom - chartTop,
                fill: '#ffffff',
                'fill-opacity': 0.45,
                stroke: '#cfcfcf',
                'stroke-width': 1,
                'pointer-events': 'none'
            });
            panelGroup.appendChild(panelRect);

            const panelDivider = createSVGElement('line', {
                x1: panelStartX,
                x2: panelStartX,
                y1: chartTop,
                y2: chartBottom,
                stroke: '#b5b5b5',
                'stroke-width': 1,
                'pointer-events': 'none'
            });
            panelGroup.appendChild(panelDivider);

            const panelLabel = createSVGElement('text', {
                x: panelStartX + 6,
                y: chartTop + 12,
                'font-family': FONT_FAMILY,
                'font-size': '10px',
                'font-weight': 'bold',
                fill: '#7f8c8d'
            });
            panelLabel.textContent = `Recent climate (${recentPanelStartYear}–${recentPanelEndYear})`;
            panelGroup.appendChild(panelLabel);

            const panelAxis = createSVGElement('line', {
                x1: panelStartX,
                x2: chartRight,
                y1: chartBottom - 1,
                y2: chartBottom - 1,
                stroke: '#b5b5b5',
                'stroke-width': 1,
                'pointer-events': 'none'
            });
            panelGroup.appendChild(panelAxis);

            const yearTicks = [1825, 1900, 1950, 2000, 2025]
                .filter(year => year >= recentPanelStartYear && year <= recentPanelEndYear);
            yearTicks.forEach(year => {
                const x = panelXForYear(year);
                const tick = createSVGElement('line', {
                    x1: x,
                    x2: x,
                    y1: chartBottom - 6,
                    y2: chartBottom - 1,
                    stroke: '#b5b5b5',
                    'stroke-width': 1,
                    'pointer-events': 'none'
                });
                panelGroup.appendChild(tick);

                const label = createSVGElement('text', {
                    x,
                    y: chartBottom - 8,
                    'text-anchor': 'middle',
                    'font-family': FONT_FAMILY,
                    'font-size': '9px',
                    fill: '#7f8c8d'
                });
                label.textContent = `${year}`;
                panelGroup.appendChild(label);
            });
        }

        seriesSet.series.forEach((series, idx) => {
            if (!seriesStats.has(series.key)) {
                return;
            }

            const stats = seriesStats.get(series.key);
            const toY = (value) => {
                const t = (value - stats.min) / (stats.max - stats.min);
                return chartBottom - t * (chartBottom - chartTop);
            };

            const mainPoints = visiblePoints.filter(point => !hasRecentPanel || point.year <= recentCutoffYear);
            const seriesPoints = mainPoints.map(point => {
                const value = point[series.key];
                if (!Number.isFinite(value)) {
                    return null;
                }
                const x = mainXForYear(point.year);
                const y = toY(value);
                return { x, y };
            }).filter(Boolean);

            const pathParts = [];
            seriesPoints.forEach((pt, ptIdx) => {
                pathParts.push(`${ptIdx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`);
            });

            if (pathParts.length > 1) {
                const linePath = createSVGElement('path', {
                    d: pathParts.join(' '),
                    fill: 'none',
                    stroke: series.color,
                    'stroke-width': 2,
                    'stroke-opacity': 0.9,
                    'pointer-events': 'none'
                });
                group.appendChild(linePath);
            }

            if (hasRecentPanel) {
                const recentPoints = visiblePoints.filter(point => point.year >= recentPanelStartYear && point.year <= recentPanelEndYear);
                const recentSeriesPoints = recentPoints.map(point => {
                    const value = point[series.key];
                    if (!Number.isFinite(value)) {
                        return null;
                    }
                    const x = panelXForYear(point.year);
                    const y = toY(value);
                    return { x, y };
                }).filter(Boolean);

                const recentPathParts = [];
                recentSeriesPoints.forEach((pt, ptIdx) => {
                    recentPathParts.push(`${ptIdx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`);
                });

                if (recentPathParts.length > 1) {
                    const recentPath = createSVGElement('path', {
                        d: recentPathParts.join(' '),
                        fill: 'none',
                        stroke: series.color,
                        'stroke-width': 2.5,
                        'stroke-opacity': 0.95,
                        'pointer-events': 'none'
                    });
                    if (panelGroup) {
                        panelGroup.appendChild(recentPath);
                    } else {
                        group.appendChild(recentPath);
                    }
                }

                if (recentSeriesPoints.length > 0) {
                    const firstPoint = recentSeriesPoints[0];
                    const lastPoint = recentSeriesPoints[recentSeriesPoints.length - 1];
                    [firstPoint, lastPoint].forEach(point => {
                        const marker = createSVGElement('circle', {
                            cx: point.x,
                            cy: point.y,
                            r: 2.5,
                            fill: series.color,
                            'fill-opacity': 0.9,
                            'pointer-events': 'none'
                        });
                        if (panelGroup) {
                            panelGroup.appendChild(marker);
                        } else {
                            group.appendChild(marker);
                        }
                    });
                }
            }

            // Add label at right edge
            const labelX = chartRight + 6;
            const labelY = chartTop + 12 + (idx * 14);
            const label = createSVGElement('text', {
                x: labelX,
                y: labelY,
                'font-family': FONT_FAMILY,
                'font-size': '11px',
                'font-weight': 'bold',
                fill: series.color
            });
            label.textContent = series.label;
            group.appendChild(label);
        });

        if (isClimateBand) {
            const extinctionEvents = selectedEventSets
                .filter(set => Array.isArray(set.events))
                .flatMap(set => set.events)
                .filter(event => event.type === 'extinction');

            const visibleExtinctions = extinctionEvents
                .filter(event => event.startYear >= currentTimeScale.startYear && event.startYear <= currentTimeScale.endYear)
                .sort((a, b) => a.startYear - b.startYear);

            const maxLabelRows = 4;
            const rowSpacing = 10;
            const minLabelGap = 30;
            const lastXByRow = Array.from({ length: maxLabelRows }, () => -Infinity);
            const charWidth = 5.8;

            visibleExtinctions.forEach((event) => {
                    const year = event.startYear;
                    const x = hasRecentPanel && year >= recentPanelStartYear
                        ? panelXForYear(year)
                        : mainXForYear(year);

                    const wikiUrl = event.wiki
                        ? `https://en.wikipedia.org/wiki/${event.wiki}`
                        : null;
                    const baseLabel = event.name || event.short || 'Extinction';
                    const labelText = /extinction/i.test(baseLabel)
                        ? baseLabel
                        : `${baseLabel} Extinction`;

                    let rowIndex = lastXByRow.findIndex(lastX => x - lastX >= minLabelGap);
                    if (rowIndex === -1) {
                        rowIndex = lastXByRow.indexOf(Math.min(...lastXByRow));
                    }
                    const labelY = chartTop + 10 + (rowIndex * rowSpacing);
                    const estimatedWidth = labelText.length * charWidth;
                    lastXByRow[rowIndex] = x + estimatedWidth;

                    const line = createSVGElement('line', {
                        x1: x,
                        x2: x,
                        y1: chartTop,
                        y2: chartBottom,
                        stroke: '#c0392b',
                        'stroke-width': 1,
                        'stroke-opacity': 0.35,
                        'pointer-events': 'none'
                    });
                    const label = createSVGElement('text', {
                        x: x + 2,
                        y: labelY,
                        'font-family': FONT_FAMILY,
                        'font-size': '9px',
                        fill: '#c0392b',
                        'cursor': wikiUrl ? 'pointer' : 'default'
                    });
                    label.textContent = labelText;

                    if (wikiUrl) {
                        const link = createSVGElement('a', {
                            href: wikiUrl,
                            target: '_blank',
                            rel: 'noopener noreferrer'
                        });
                        link.setAttributeNS('http://www.w3.org/1999/xlink', 'href', wikiUrl);
                        link.appendChild(line);
                        link.appendChild(label);
                        group.appendChild(link);
                    } else {
                        group.appendChild(line);
                        group.appendChild(label);
                    }
                });
        }

        return bandY + bandHeight;
    }

    /**
     * Calculate perceptual distance between two hex colors
     * @param {string} color1 - Hex color string (e.g., "#e74c3c")
     * @param {string} color2 - Hex color string
     * @returns {number} Distance value (higher = more different)
     */
    function colorDistance(color1, color2) {
        // Convert hex to RGB
        const hex1 = color1.replace('#', '');
        const hex2 = color2.replace('#', '');

        const r1 = parseInt(hex1.substr(0, 2), 16);
        const g1 = parseInt(hex1.substr(2, 2), 16);
        const b1 = parseInt(hex1.substr(4, 2), 16);

        const r2 = parseInt(hex2.substr(0, 2), 16);
        const g2 = parseInt(hex2.substr(2, 2), 16);
        const b2 = parseInt(hex2.substr(4, 2), 16);

        // Simple Euclidean distance in RGB space
        // (Could use LAB color space for better perceptual accuracy, but RGB is sufficient)
        return Math.sqrt(
            Math.pow(r1 - r2, 2) +
            Math.pow(g1 - g2, 2) +
            Math.pow(b1 - b2, 2)
        );
    }

    /**
     * Draw people band with unique colors and smart positioning
     * @param {SVGElement} group - Parent SVG group
     * @param {Array} events - People/events to draw
     * @param {number} baseY - Base Y position
     * @param {string} baseColor - Base color (not used, each person gets unique color)
     * @param {number} bandY - Y position of the band
     * @param {number} maxHeight - Maximum height in pixels for this band
     * @param {boolean} isPeopleBand - If true, no end date means "still alive"; if false, no end date means "point event"
     * @param {boolean} isPresidentsBand - If true, use strict two-line alternating layout
     * @returns {number} The maximum Y position used
     */
    function drawPeopleBand(group, events, baseY, baseColor, bandY, maxHeight = 999, isPeopleBand = true, isPresidentsBand = false) {
        const lineHeight = 3;
        const fontSize = 12;
        const textHeight = fontSize + 4;

        const lineGap = 6; // Minimum gap between timeline lines when checking for overlap
        const textGap = 20; // Minimum gap between text labels horizontally
        const charWidth = 6.5; // Estimated character width

        // Calculate minimum horizontal gap (1 year in pixels using TimeScale)
        const oneYearWidth = Math.abs(currentTimeScale.yearToX(config.startYear + 1) - currentTimeScale.yearToX(config.startYear));
        const minTimelineGap = oneYearWidth; // Timelines must have at least 1 year separation

        // Generate unique colors for each person
        // Colors with maximum hue spacing - each adjacent color is ~180° apart on color wheel
        const colors = [
            '#e74c3c', // red
            '#1abc9c', // cyan/teal
            '#f39c12', // orange
            '#3498db', // blue
            '#2ecc71', // green
            '#e84393', // magenta/pink
            '#d4af37', // gold (bolder than yellow)
            '#9b59b6', // purple
            '#16a085', // dark teal
            '#e67e22', // dark orange
            '#2980b9', // dark blue
            '#27ae60', // dark green
            '#c0392b', // dark red
            '#00b894', // turquoise
            '#d35400', // burnt orange
            '#6c5ce7', // lavender
            '#8e44ad', // dark purple
            '#95a5a6', // gray
            '#34495e', // dark gray
            '#7f8c8d'  // medium gray
        ];

        // Filter events within time range (include if they overlap with visible range)
        const visiblePeople = [];
        events.forEach((event) => {
            const startYear = event.startYear;
            // For people without end date, they're "still alive" - extend to endYear
            // For non-people without end date, it's a point event - use startYear
            const endYear = event.endYear || (isPeopleBand ? currentTimeScale.endYear : startYear);

            // Include event if it overlaps with the visible time range
            if (endYear >= currentTimeScale.startYear && startYear <= currentTimeScale.endYear) {
                visiblePeople.push(event);
            }
        });

        // Sort by end date (latest first) within priority groups
        const peopleByPriority = {};
        visiblePeople.forEach(person => {
            if (!peopleByPriority[person.priority]) {
                peopleByPriority[person.priority] = [];
            }
            peopleByPriority[person.priority].push(person);
        });

        Object.values(peopleByPriority).forEach(priorityGroup => {
            priorityGroup.sort((a, b) => {
                const aEnd = a.endTimestamp || a.startTimestamp;
                const bEnd = b.endTimestamp || b.startTimestamp;
                return bEnd - aEnd;
            });
        });

        const sortedPeople = [];
        const priorities = Object.keys(peopleByPriority).map(Number).sort((a, b) => a - b);
        priorities.forEach(priority => {
            sortedPeople.push(...peopleByPriority[priority]);
        });

        // Track placed items (we'll draw them after calculating positions)
        const placedItems = [];

        // For Presidents band, use simpler alternating two-line layout
        if (isPresidentsBand) {
            // Sort presidents chronologically by start date
            sortedPeople.sort((a, b) => a.startTimestamp - b.startTimestamp);

            const line1Y = baseY;
            const line2Y = baseY + (lineGap * 3); // Space for text labels to not overlap

            sortedPeople.forEach((person, index) => {
                const startYear = person.startYear;
                const actualStartX = currentTimeScale.yearToX(startYear);

                let actualEndX = actualStartX;
                if (person.endYear && person.endYear <= currentTimeScale.endYear) {
                    actualEndX = currentTimeScale.yearToX(person.endYear);
                } else if (!person.endYear) {
                    actualEndX = currentTimeScale.yearToX(currentTimeScale.endYear);
                }

                const startX = Math.max(actualStartX, config.padding.left);
                const endX = Math.min(actualEndX, currentTimeScale.yearToX(currentTimeScale.endYear));
                const lineLength = endX - startX;
                const textWidth = person.name.length * charWidth;

                // Alternate between two lines
                const lineY = (index % 2 === 0) ? line1Y : line2Y;
                const textX = startX;

                // Store position for rendering
                person.personColor = person.color || colors[index % colors.length];
                placedItems.push({
                    person,
                    lineY,
                    startX,
                    endX,
                    textX,
                    textWidth
                });
            });
        } else {
            // Normal layout logic for non-presidents
            sortedPeople.forEach((person, personIndex) => {
            // Determine display year: use manual override if present, otherwise use start year
            let displayYear = person.displayYear || person.startYear;

            // Calculate the actual timeline position (may be outside visible range)
            const startYear = displayYear;
            const actualStartX = currentTimeScale.yearToX(startYear);

            let actualEndX = actualStartX;
            if (person.endYear && person.endYear <= currentTimeScale.endYear) {
                // Event has ended
                actualEndX = currentTimeScale.yearToX(person.endYear);
            } else if (!person.endYear) {
                if (isPeopleBand) {
                    // Person is still alive, extend line to current end of timeline
                    actualEndX = currentTimeScale.yearToX(currentTimeScale.endYear);
                } else {
                    // Point event - no line extension
                    actualEndX = actualStartX;
                }
            }

            // Clamp the visible line to the visible range
            const startX = Math.max(actualStartX, config.padding.left);
            const endX = Math.min(actualEndX, currentTimeScale.yearToX(currentTimeScale.endYear));

            const lineLength = endX - startX;
            const textWidth = person.name.length * charWidth;
            // For people, constrain text to their timeline
            // For other events, allow text to extend beyond the event (to the right edge)
            const maxTextX = isPeopleBand ?
                (startX + lineLength - textWidth) :
                (currentTimeScale.yearToX(currentTimeScale.endYear) - textWidth);

            // Find Y position and text position together
            let lineY = baseY;
            let textX = startX;
            let foundPosition = false;
            let safetyCounter = 0;

            while (!foundPosition && safetyCounter < 50) {
                safetyCounter++;

                // Check if current position would exceed height limit
                // Measure from band start (bandY), not baseline (baseY)
                // Also account for text height above the line and bottom padding
                const heightUsed = (lineY + textHeight) - bandY;
                if (heightUsed > maxHeight) {
                    // Can't place this event within height limit - skip it
                    break;
                }

                // Step 1: Check if timeline line position overlaps with other timeline lines
                // Timelines must have at least 1 year separation to be on the same line
                let hasLineOverlap = false;
                for (const placed of placedItems) {
                    const horizontalOverlap = (startX < placed.endX + minTimelineGap) && (endX + minTimelineGap > placed.startX);
                    const verticalGap = Math.abs(lineY - placed.lineY);

                    if (horizontalOverlap && verticalGap < lineGap) {
                        hasLineOverlap = true;
                        lineY = placed.lineY + lineGap;
                        break;
                    }
                }

                if (hasLineOverlap) {
                    continue; // Re-check at new Y
                }

                // Step 2: Try to find horizontal position for text at this Y
                // Labels only need to avoid other labels, not timelines
                textX = startX;
                let foundTextPosition = false;

                // Get all placed items that are vertically close enough for text to overlap
                // Using 18px allows space for a timeline (with 6px gap) to fit between labels
                const verticalTextOverlapThreshold = 18;
                const nearbyItems = placedItems.filter(p => {
                    const verticalGap = Math.abs(lineY - p.lineY);
                    return verticalGap < verticalTextOverlapThreshold;
                });

                // Calculate the valid range for text positioning
                // For non-people events, text must start within the event (startX to endX)
                // But can extend beyond endX
                const textMaxStartX = isPeopleBand ? maxTextX : Math.min(endX, maxTextX);

                // Try to find a position along the line where the text doesn't overlap
                while (textX <= textMaxStartX && !foundTextPosition) {
                    let hasTextOverlap = false;

                    for (const placed of nearbyItems) {
                        const textOverlapX = (textX < placed.textX + placed.textWidth + textGap) &&
                                            (textX + textWidth + textGap > placed.textX);

                        if (textOverlapX) {
                            hasTextOverlap = true;
                            textX = placed.textX + placed.textWidth + textGap;
                            break;
                        }
                    }

                    if (!hasTextOverlap && textX <= textMaxStartX) {
                        foundTextPosition = true;
                    } else if (textX > textMaxStartX) {
                        break;
                    }
                }

                if (foundTextPosition) {
                    foundPosition = true;
                } else {
                    // Couldn't find text position, shift timeline down by lineGap
                    // This ensures consistent vertical spacing whether avoiding timelines or labels
                    lineY += lineGap;
                }
            }

            // If we didn't find a position within the height limit, skip this event
            if (!foundPosition) {
                return;
            }

            // Final constraint: ensure text doesn't go off the right edge
            if (textX > maxTextX) textX = maxTextX;

            // Record this placement
            placedItems.push({
                person: person,
                lineY: lineY,
                startX: startX,
                endX: endX,
                textX: textX,
                textWidth: textWidth
            });
            }); // End of non-presidents forEach
        } // End of else block for non-presidents

        // Sort placed items by Y position and assign colors intelligently
        // Skip sorting for presidents to maintain chronological order
        if (!isPresidentsBand) {
            placedItems.sort((a, b) => a.lineY - b.lineY);
        }

        // Assign colors to avoid similar colors for adjacent items
        // Presidents already have their colors assigned
        if (!isPresidentsBand) {
            placedItems.forEach((item, idx) => {
            // If event already has a color (e.g., presidents with party colors), use it
            if (item.person.color) {
                item.person.personColor = item.person.color;
                return;
            }

            if (idx === 0) {
                // First item gets the first color
                item.person.personColor = colors[0];
            } else {
                // Look at items within vertical proximity (up to 3 items above)
                const lookbackCount = Math.min(3, idx);
                const recentColors = [];
                for (let i = 1; i <= lookbackCount; i++) {
                    const prevItem = placedItems[idx - i];
                    const verticalDistance = Math.abs(item.lineY - prevItem.lineY);
                    // Only consider items that are visually close (within ~50px)
                    if (verticalDistance < 50) {
                        recentColors.push(prevItem.person.personColor);
                    }
                }

                // Find the color most different from recent colors
                let bestColor = colors[0];
                let maxMinDistance = -1;

                for (const candidateColor of colors) {
                    if (recentColors.length === 0) {
                        bestColor = candidateColor;
                        break;
                    }

                    // Calculate minimum distance to any recent color
                    let minDistance = Infinity;
                    for (const recentColor of recentColors) {
                        const distance = colorDistance(candidateColor, recentColor);
                        minDistance = Math.min(minDistance, distance);
                    }

                    // Choose color with maximum minimum distance (most different from all nearby)
                    if (minDistance > maxMinDistance) {
                        maxMinDistance = minDistance;
                        bestColor = candidateColor;
                    }
                }

                item.person.personColor = bestColor;
            }
            }); // End of color assignment forEach
        } // End of if (!isPresidentsBand) for color assignment

        // Draw all timeline lines first (continuous from start to end)
        placedItems.forEach(item => {
            const line = createSVGElement('line', {
                x1: item.startX,
                y1: item.lineY,
                x2: item.endX,
                y2: item.lineY,
                stroke: item.person.personColor,
                'stroke-width': lineHeight,
                'stroke-opacity': 0.7,
                'pointer-events': 'none'
            });
            group.appendChild(line);
        });

        // Create text elements first to measure actual width
        const textElements = [];
        placedItems.forEach(item => {
            const text = createSVGElement('text', {
                x: item.textX,
                y: item.lineY - 4,
                'font-family': FONT_FAMILY,
                'font-size': '12px',
                'font-weight': 'normal',
                fill: item.person.personColor,
                'fill-opacity': 1
            });
            text.textContent = item.person.name;

            // Add click handler for Wikipedia links
            if (item.person.wiki) {
                text.setAttribute('class', 'event-label');
                text.style.cursor = 'pointer';
                text.addEventListener('click', (e) => {
                    window.openWikiModal(item.person.name, item.person.wiki);
                });
            }

            group.appendChild(text);
            textElements.push({ text, item });
        });

        // Measure actual text widths and create background rectangles
        // Insert backgrounds before text elements so text renders on top
        textElements.forEach(({ text, item }) => {
            const bbox = text.getBBox();
            const textBg = createSVGElement('rect', {
                x: bbox.x - 2,
                y: item.lineY - fontSize - 2,
                width: bbox.width + 4,
                height: fontSize - 2,
                fill: 'white',
                'fill-opacity': 0.8,
                'pointer-events': 'none'
            });
            group.insertBefore(textBg, text);
        });

        // Return the maximum Y position used
        // lineY is the line center, lineHeight is 3, so bottom is lineY + 1.5
        const maxY = placedItems.length > 0
            ? Math.max(...placedItems.map(item => item.lineY + 1.5))
            : baseY;
        return maxY;
    }

    /**
     * Draw events for a band
     * @param {SVGElement} group - Parent SVG group
     * @param {Array} events - Events to draw (already sorted by priority)
     * @param {number} baseY - Base Y position for events
     * @param {string} color - Base color
     * @param {number} bandY - Y position of the band
     * @param {number} maxRows - Maximum number of rows to display
     * @returns {number} The maximum Y position used
     */
    function drawBandEvents(group, events, baseY, color, bandY, maxRows = 999) {
        // Track placed events to detect overlaps
        const placedEvents = [];
        // All events use the same size
        const size = config.majorEventSize;
        const opacity = 1.0;
        const verticalSpacing = size.fontSize + 4;
        const labelPadding = 20; // Horizontal spacing between labels to prevent them from reading as one word
        const dotOffset = 8; // Space between dot and text
        const minVerticalShift = 1; // Minimum pixels to shift down when avoiding overlap

        // Group events by priority, then sort by end date (latest first) within each priority
        const eventsByPriority = {};
        events.forEach(event => {
            if (!eventsByPriority[event.priority]) {
                eventsByPriority[event.priority] = [];
            }
            eventsByPriority[event.priority].push(event);
        });

        // Sort each priority group by end date (latest first)
        Object.values(eventsByPriority).forEach(priorityGroup => {
            priorityGroup.sort((a, b) => {
                const aEnd = a.endTimestamp || a.startTimestamp;
                const bEnd = b.endTimestamp || b.startTimestamp;
                return bEnd - aEnd; // Descending order (latest first)
            });
        });

        // Flatten back to single array, maintaining priority order
        const sortedEvents = [];
        const priorities = Object.keys(eventsByPriority).map(Number).sort((a, b) => a - b);
        priorities.forEach(priority => {
            sortedEvents.push(...eventsByPriority[priority]);
        });

        sortedEvents.forEach(event => {
            // Only draw events that overlap with the visible time range
            const checkStartYear = event.displayYear || event.startYear;
            const checkEndYear = event.endYear || checkStartYear;

            // Skip if event doesn't overlap with visible range
            if (checkEndYear < currentTimeScale.startYear || checkStartYear > currentTimeScale.endYear) {
                return;
            }

            const startYear = event.startYear;
            const endYear = event.endYear || startYear;

            // Use manual display year if provided, otherwise use start year
            const displayYear = event.displayYear || event.startYear;

            // Calculate actual position (may be outside visible range)
            const actualStartX = currentTimeScale.yearToX(displayYear);

            // Calculate end X for duration events
            let actualEndX = actualStartX;
            if (endYear && endYear <= currentTimeScale.endYear) {
                actualEndX = currentTimeScale.yearToX(endYear);
            }

            // Clamp to visible range
            const x = Math.max(actualStartX, config.padding.left);
            const endX = Math.max(actualEndX, config.padding.left);

            // Estimate label width
            const charWidth = 6;
            const estimatedLabelWidth = event.name.length * charWidth;
            const labelStartX = x + dotOffset;
            const labelEndX = labelStartX + estimatedLabelWidth;

            // Find a Y position that doesn't overlap
            // Start at baseY and shift down just enough to clear any overlaps
            let labelY = baseY;

            // Keep checking and adjusting until we find a position with no overlaps
            let needsAdjustment = true;
            let safetyCounter = 0;
            while (needsAdjustment && safetyCounter < 50) {
                needsAdjustment = false;
                safetyCounter++;

                for (const placed of placedEvents) {
                    // Check vertical proximity
                    const verticallyClose = Math.abs(labelY - placed.labelY) < verticalSpacing;

                    if (verticallyClose) {
                        // Check if there's horizontal overlap
                        const underlineOverlapX = (x <= placed.endX) && (endX >= placed.x);
                        const textOverlapX = (labelStartX <= placed.labelEndX + labelPadding) &&
                                            (labelEndX >= placed.labelStartX - labelPadding);

                        if (underlineOverlapX || textOverlapX) {
                            // We overlap with this placed event, shift down just past it
                            labelY = placed.labelY + verticalSpacing;
                            needsAdjustment = true;
                            break; // Re-check all events with new Y
                        }
                    }
                }
            }

            // Check if this event exceeds the max row limit
            const rowNumber = Math.floor((labelY - baseY) / verticalSpacing) + 1;
            if (rowNumber > maxRows) {
                if (event.name === 'Plow') {
                    console.log('Plow SKIPPED - exceeds maxRows:', { rowNumber, maxRows });
                }
                return; // Skip this event - it exceeds the row limit
            }

            if (event.name === 'Plow') {
                console.log('Plow RENDERED at:', { displayYear, x: actualStartX, labelY, rowNumber });
            }

            // Record this event's position
            placedEvents.push({
                x: x,
                endX: endX,
                labelY: labelY,
                labelStartX: labelStartX,
                labelEndX: labelEndX
            });

            // Calculate event duration in years
            let durationYears = 0;
            if (event.endDate) {
                durationYears = (event.endTimestamp - event.startTimestamp) / (1000 * 60 * 60 * 24 * 365.25);
            }

            // Use event's color if available, otherwise use base color
            const eventColor = event.color || color;

            // Draw event label
            const label = createSVGElement('text', {
                x: labelStartX,
                y: labelY,
                'font-family': FONT_FAMILY,
                'font-size': '12px',
                'font-weight': 'normal',
                fill: eventColor,
                'fill-opacity': opacity
            });
            label.textContent = event.name;

            // Add click handler for Wikipedia links
            if (event.wiki) {
                label.setAttribute('class', 'event-label');
                label.style.cursor = 'pointer';
                label.addEventListener('click', (e) => {
                    window.openWikiModal(event.name, event.wiki);
                });
            }

            group.appendChild(label);

            // Draw underline beneath text extending for the duration
            if (endYear && endYear <= currentTimeScale.endYear) {
                const underlineY = labelY + 2; // Close to bottom of text
                const underline = createSVGElement('line', {
                    x1: labelStartX,
                    y1: underlineY,
                    x2: labelStartX + (endX - x - dotOffset),
                    y2: underlineY,
                    stroke: eventColor,
                    'stroke-width': size.lineWidth,
                    'stroke-opacity': opacity * 0.6
                });
                group.appendChild(underline);
            }
        });

        // Return the maximum Y position used
        // labelY is text baseline, underline is at labelY+2, with stroke-width 3
        // so bottom of underline is at labelY+2+1.5
        const maxY = placedEvents.length > 0
            ? Math.max(...placedEvents.map(ev => ev.labelY + 3.5))
            : baseY;
        return maxY;
    }


    /**
     * Helper function to create SVG elements
     * @param {string} tag - SVG element tag name
     * @param {Object} attrs - Attributes to set
     * @returns {SVGElement}
     */
    function createSVGElement(tag, attrs = {}) {
        const element = document.createElementNS(SVG_NS, tag);
        Object.entries(attrs).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
        return element;
    }

    /**
     * Get the current SVG element
     * @returns {SVGElement}
     */
    function getSVG() {
        return svg;
    }

    // Public API
    return {
        render,
        getSVG
    };
})();
