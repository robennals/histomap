// Visualization Module
// Handles SVG rendering of the timeline

const Visualization = (function() {
    const SVG_NS = 'http://www.w3.org/2000/svg';

    // Font configuration - use PDF-compatible fonts for consistent rendering
    const FONT_FAMILY = 'Helvetica, Arial, sans-serif';

    // GDP Bloc color scheme
    // Colors chosen to be distinct, with successors having related but distinguishable hues
    // Order in file: China, Independent Indian States, India, British Empire,
    //                NATO + Aligned, US, Russian Empire, USSR + Aligned,
    //                Japanese Empire, Ottoman Empire, Other European Empires, Other, BRICS + Aligned
    const GDP_BLOC_COLORS = {
        'China': '#e74c3c',                      // Red (large bloc)
        'Independent Indian States': '#f39c12',  // Orange (adjacent to China)
        'India': '#d68910',                      // Darker orange (succeeds Independent Indian, similar but distinct)
        'British Empire': '#2874a6',             // Dark blue (distinct from India/China)
        'NATO + Aligned': '#1abc9c',             // Teal (succeeds British, related blue tone but distinct)
        'US': '#9b59b6',                         // Purple (next to NATO, distinct)
        'Russian Empire': '#e84393',             // Pink (distinct from others)
        'USSR + Aligned': '#b03a69',             // Darker pink (succeeds Russian, similar but distinct)
        'BRICS + Aligned': '#c0392b',            // Dark red (succeeds USSR, distinct but related)
        'Japanese Empire': '#27ae60',            // Green (distinct from orange India)
        'Ottoman Empire': '#16a085',             // Dark teal (distinct)
        'Other European Empires': '#f1c40f',     // Yellow (moved from Japanese, distinct from teal/blue)
        'Other': '#7f8c8d'                       // Gray (neutral)
    };

    // Configuration
    const config = {
        width: 2400,
        height: 800,
        startYear: 1750,
        endYear: 2025,
        // left = margin (40) + space for band titles (100)
        padding: { top: 60, right: 40, bottom: 60, left: 140, marginLeft: 40 },
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

    /**
     * Initialize visualization with event sets
     * @param {Array} eventSets - Array of event sets to visualize
     * @param {Object} settings - Visualization settings
     */
    function render(eventSets, settings = {}) {
        // Update configuration if settings provided
        if (settings.width) config.width = settings.width;
        if (settings.startYear) config.startYear = settings.startYear;
        if (settings.endYear) config.endYear = settings.endYear;

        selectedEventSets = eventSets;

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

        const startTimestamp = new Date(config.startYear, 0, 1).getTime();
        const endTimestamp = new Date(config.endYear, 11, 31).getTime();
        const timeRange = endTimestamp - startTimestamp;

        const chartWidth = config.width - config.padding.left - config.padding.right;

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

        // Round start year down to nearest year
        const startYear = Math.floor(config.startYear);
        const endYear = config.endYear;

        // Draw lines every year with three levels of prominence
        for (let year = startYear; year <= endYear; year += 1) {
            const yearTimestamp = new Date(year, 0, 1).getTime();
            const x = config.padding.left + ((yearTimestamp - startTimestamp) / timeRange) * chartWidth;

            const is50Year = (year % 50 === 0);
            const isDecade = (year % 10 === 0);

            if (is50Year) {
                // Most prominent: 50-year marks
                const tick = createSVGElement('line', {
                    x1: x,
                    y1: config.padding.top - 28,
                    x2: x,
                    y2: config.padding.top - 15,
                    stroke: '#5a6c7d',
                    'stroke-width': 2.5
                });
                axisGroup.appendChild(tick);

                // Year label (every 50 years)
                const label = createSVGElement('text', {
                    x: x,
                    y: config.padding.top - 32,
                    'text-anchor': 'middle',
                    'font-family': FONT_FAMILY,
                    'font-size': '11px',
                    'font-weight': 'bold',
                    fill: '#7f8c8d'
                });
                label.textContent = year;
                axisGroup.appendChild(label);

                // Bold vertical grid line (every 50 years)
                const gridLine = createSVGElement('line', {
                    x1: x,
                    y1: config.padding.top,
                    x2: x,
                    y2: actualHeight - config.padding.bottom,
                    stroke: '#95a5a6',
                    'stroke-width': 2
                });
                axisGroup.appendChild(gridLine);
            } else if (isDecade) {
                // Medium: decade marks
                const tick = createSVGElement('line', {
                    x1: x,
                    y1: config.padding.top - 23,
                    x2: x,
                    y2: config.padding.top - 17,
                    stroke: '#7f8c8d',
                    'stroke-width': 1.5
                });
                axisGroup.appendChild(tick);

                // Year label (every decade)
                const label = createSVGElement('text', {
                    x: x,
                    y: config.padding.top - 26,
                    'text-anchor': 'middle',
                    'font-family': FONT_FAMILY,
                    'font-size': '11px',
                    'font-weight': 'normal',
                    fill: '#7f8c8d'
                });
                label.textContent = year;
                axisGroup.appendChild(label);

                // Moderate vertical grid line (every decade)
                const gridLine = createSVGElement('line', {
                    x1: x,
                    y1: config.padding.top,
                    x2: x,
                    y2: actualHeight - config.padding.bottom,
                    stroke: '#bdc3c7',
                    'stroke-width': 1
                });
                axisGroup.appendChild(gridLine);
            } else {
                // Faintest: yearly marks
                const gridLine = createSVGElement('line', {
                    x1: x,
                    y1: config.padding.top,
                    x2: x,
                    y2: actualHeight - config.padding.bottom,
                    stroke: '#e8e8e8',
                    'stroke-width': 0.5,
                    'stroke-opacity': 0.6
                });
                axisGroup.appendChild(gridLine);
            }
        }

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
        const startTimestamp = new Date(config.startYear, 0, 1).getTime();
        const endTimestamp = new Date(config.endYear, 11, 31).getTime();
        const timeRange = endTimestamp - startTimestamp;
        const chartWidth = config.width - config.padding.left - config.padding.right;

        // Get all data points for the first bloc to determine years
        const allDataPoints = blocs[blocList[0]];

        // Filter to include years within our visible range
        let visibleDataPoints = allDataPoints.filter(dp =>
            dp.year >= config.startYear && dp.year < config.endYear
        );

        // Always extend to endYear + 1 to ensure bands go to the right edge
        // (the right edge of the year 2025 is actually Jan 1, 2026)
        if (visibleDataPoints.length > 0) {
            const lastDataYear = visibleDataPoints[visibleDataPoints.length - 1].year;
            // Add a synthetic point beyond endYear to reach the right edge
            visibleDataPoints = [...visibleDataPoints, {
                year: config.endYear + 1,
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

                // Calculate X position (time-aligned)
                const timestamp = new Date(year, 0, 1).getTime();
                const x = config.padding.left +
                          ((timestamp - startTimestamp) / timeRange) * chartWidth;

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
                const timestamp = new Date(year, 0, 1).getTime();
                const x = config.padding.left +
                          ((timestamp - startTimestamp) / timeRange) * chartWidth;

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
                if (point.year >= config.startYear && point.year <= config.endYear) {
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
                if (point.year >= config.startYear && point.year <= config.endYear) {
                    if (point.gdpPercent === peakGDP) {
                        if (!peakPoint || point.year - config.startYear >= 10) {
                            peakPoint = point;
                        }
                    }
                }
            });

            if (peakPoint && peakPoint.year - config.startYear >= 10) {
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
                    if (year - config.startYear < 10) return; // Too close to start

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
        } else {
            // Use special rendering for "People"
            const allEvents = [...eventSet.events].sort((a, b) => a.priority - b.priority);
            const topPadding = 8;
            const bottomPadding = 8;
            const fontSize = 12;
            // startY should be baseline position, accounting for text ascent above baseline
            const startY = y + topPadding + fontSize;

            if (eventSet.name === "People") {
                const maxRows = eventSet.maxRows || 999;
                maxY = drawPeopleBand(bandGroup, allEvents, startY, eventSet.color, y, maxRows);
            } else {
                const maxRows = eventSet.maxRows || 999;
                maxY = drawBandEvents(bandGroup, allEvents, startY, eventSet.color, y, maxRows);
            }

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
            'stroke-opacity': 0.2
        });
        bandGroup.appendChild(background);

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
     * Draw people band with unique colors and smart positioning
     * @param {SVGElement} group - Parent SVG group
     * @param {Array} events - People to draw
     * @param {number} baseY - Base Y position
     * @param {string} baseColor - Base color (not used, each person gets unique color)
     * @param {number} bandY - Y position of the band
     * @returns {number} The maximum Y position used
     */
    function drawPeopleBand(group, events, baseY, baseColor, bandY, maxRows = 999) {
        const startTimestamp = new Date(config.startYear, 0, 1).getTime();
        const endTimestamp = new Date(config.endYear, 11, 31).getTime();
        const timeRange = endTimestamp - startTimestamp;
        const chartWidth = config.width - config.padding.left - config.padding.right;

        const lineHeight = 3;
        const fontSize = 12;
        const textHeight = fontSize + 4;

        // Calculate max height based on row equivalence with regular bands
        const verticalSpacing = fontSize + 4; // Same as regular events
        const maxHeight = maxRows * verticalSpacing;
        const lineGap = 6; // Minimum gap between lines (double the original 3px)
        const textGap = 20; // Minimum gap between text labels
        const charWidth = 6.5; // Estimated character width

        // Generate unique colors for each person
        // Colors with maximum hue spacing - each adjacent color is ~180° apart on color wheel
        const colors = [
            '#e74c3c', // red
            '#1abc9c', // cyan/teal
            '#f39c12', // orange
            '#3498db', // blue
            '#2ecc71', // green
            '#e84393', // magenta/pink
            '#f1c40f', // yellow
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
            const startYear = event.startDate.getFullYear();
            const endYear = event.endDate ? event.endDate.getFullYear() : config.endYear;

            // Include event if it overlaps with the visible time range
            if (endYear >= config.startYear && startYear <= config.endYear) {
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

        sortedPeople.forEach(person => {
            // Calculate the actual timeline position (may be outside visible range)
            const actualStartX = config.padding.left +
                ((person.startTimestamp - startTimestamp) / timeRange) * chartWidth;

            let actualEndX = actualStartX;
            if (person.endDate && person.endDate.getFullYear() <= config.endYear) {
                // Person has died
                actualEndX = config.padding.left +
                    ((person.endTimestamp - startTimestamp) / timeRange) * chartWidth;
            } else if (!person.endDate) {
                // Person is still alive, extend line to current end of timeline
                actualEndX = config.padding.left + chartWidth;
            }

            // Clamp the visible line to the visible range
            const startX = Math.max(actualStartX, config.padding.left);
            const endX = Math.min(actualEndX, config.padding.left + chartWidth);

            const lineLength = endX - startX;
            const textWidth = person.name.length * charWidth;
            const maxTextX = startX + lineLength - textWidth;

            // Find Y position and text position together
            let lineY = baseY;
            let textX = startX;
            let foundPosition = false;
            let safetyCounter = 0;

            while (!foundPosition && safetyCounter < 50) {
                safetyCounter++;

                // Step 1: Check if line position has any line overlaps
                let hasLineOverlap = false;
                for (const placed of placedItems) {
                    const horizontalOverlap = (startX < placed.endX) && (endX > placed.startX);
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
                textX = startX;
                let foundTextPosition = false;

                // Get all placed items that are vertically close enough for text to overlap
                const nearbyItems = placedItems.filter(p => {
                    const verticalGap = Math.abs(lineY - p.lineY);
                    return verticalGap < textHeight;
                });

                // Try to find a position along the line where the text doesn't overlap
                while (textX <= maxTextX && !foundTextPosition) {
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

                    if (!hasTextOverlap) {
                        foundTextPosition = true;
                    } else if (textX > maxTextX) {
                        break;
                    }
                }

                if (foundTextPosition) {
                    foundPosition = true;
                } else {
                    // Couldn't find text position, shift line down
                    lineY += textHeight;
                }
            }

            // Constrain text to line bounds
            if (textX < startX) textX = startX;
            if (textX > maxTextX) textX = maxTextX;

            // Check if this person exceeds the height limit
            const heightUsed = lineY - baseY;
            if (heightUsed > maxHeight) {
                return; // Skip this person - exceeds height limit
            }

            // Record this placement
            placedItems.push({
                person: person,
                lineY: lineY,
                startX: startX,
                endX: endX,
                textX: textX,
                textWidth: textWidth
            });
        });

        // Sort placed items by Y position and assign colors based on vertical order
        placedItems.sort((a, b) => a.lineY - b.lineY);
        placedItems.forEach((item, idx) => {
            item.person.personColor = colors[idx % colors.length];
        });

        // Draw all timeline lines first (continuous from start to end)
        placedItems.forEach(item => {
            const line = createSVGElement('line', {
                x1: item.startX,
                y1: item.lineY,
                x2: item.endX,
                y2: item.lineY,
                stroke: item.person.personColor,
                'stroke-width': lineHeight,
                'stroke-opacity': 0.7
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
                'fill-opacity': 0.8
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

        const startTimestamp = new Date(config.startYear, 0, 1).getTime();
        const endTimestamp = new Date(config.endYear, 11, 31).getTime();
        const timeRange = endTimestamp - startTimestamp;
        const chartWidth = config.width - config.padding.left - config.padding.right;

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
            const startYear = event.startDate.getFullYear();
            const endYear = event.endDate ? event.endDate.getFullYear() : startYear;

            // Skip if event doesn't overlap with visible range
            if (endYear < config.startYear || startYear > config.endYear) {
                return;
            }

            // Calculate actual position (may be outside visible range)
            const actualStartX = config.padding.left +
                ((event.startTimestamp - startTimestamp) / timeRange) * chartWidth;

            // Calculate end X for duration events
            let actualEndX = actualStartX;
            if (event.endDate && event.endDate.getFullYear() <= config.endYear) {
                actualEndX = config.padding.left +
                    ((event.endTimestamp - startTimestamp) / timeRange) * chartWidth;
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
                return; // Skip this event - it exceeds the row limit
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
            group.appendChild(label);

            // Draw underline beneath text extending for the duration
            if (event.endDate && event.endDate.getFullYear() <= config.endYear) {
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
