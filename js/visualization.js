// Visualization Module
// Handles SVG rendering of the timeline

const Visualization = (function() {
    const SVG_NS = 'http://www.w3.org/2000/svg';

    // Configuration
    const config = {
        width: 2400,
        height: 800,
        startYear: 1775,
        endYear: 2025,
        padding: { top: 60, right: 40, bottom: 60, left: 140 },
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
        if (settings.height) config.height = settings.height;
        if (settings.startYear) config.startYear = settings.startYear;
        if (settings.endYear) config.endYear = settings.endYear;

        selectedEventSets = eventSets;

        // Clear existing SVG
        const container = document.getElementById('svg-container');
        container.innerHTML = '';

        // Create new SVG
        svg = createSVGElement('svg', {
            width: config.width,
            height: config.height,
            id: 'histomap-viz'
        });

        // Add background
        svg.appendChild(createSVGElement('rect', {
            x: 0,
            y: 0,
            width: config.width,
            height: config.height,
            fill: 'white'
        }));

        // Draw timeline axis
        drawTimelineAxis();

        // Draw event bands
        drawEventBands();

        container.appendChild(svg);
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

        // Round start year down to nearest 5
        const startYear = Math.floor(config.startYear / 5) * 5;
        const endYear = config.endYear;

        // Draw lines every 5 years
        for (let year = startYear; year <= endYear; year += 5) {
            const yearTimestamp = new Date(year, 0, 1).getTime();
            const x = config.padding.left + ((yearTimestamp - startTimestamp) / timeRange) * chartWidth;

            const is25YearMark = (year % 25 === 0);

            if (is25YearMark) {
                // Major tick mark (every 25 years)
                const tick = createSVGElement('line', {
                    x1: x,
                    y1: config.padding.top - 25,
                    x2: x,
                    y2: config.padding.top - 15,
                    stroke: '#7f8c8d',
                    'stroke-width': 2
                });
                axisGroup.appendChild(tick);

                // Year label (only for 25-year marks)
                const label = createSVGElement('text', {
                    x: x,
                    y: config.padding.top - 30,
                    'text-anchor': 'middle',
                    class: 'timeline-label'
                });
                label.textContent = year;
                axisGroup.appendChild(label);

                // Prominent vertical grid line (every 25 years)
                const gridLine = createSVGElement('line', {
                    x1: x,
                    y1: config.padding.top,
                    x2: x,
                    y2: config.height - config.padding.bottom,
                    stroke: '#bdc3c7',
                    'stroke-width': 1.5
                });
                axisGroup.appendChild(gridLine);
            } else {
                // Minor tick mark (every 5 years)
                const tick = createSVGElement('line', {
                    x1: x,
                    y1: config.padding.top - 22,
                    x2: x,
                    y2: config.padding.top - 18,
                    stroke: '#95a5a6',
                    'stroke-width': 1
                });
                axisGroup.appendChild(tick);

                // Faint vertical grid line (every 5 years)
                const gridLine = createSVGElement('line', {
                    x1: x,
                    y1: config.padding.top,
                    x2: x,
                    y2: config.height - config.padding.bottom,
                    stroke: '#e0e0e0',
                    'stroke-width': 1,
                    'stroke-opacity': 0.7
                });
                axisGroup.appendChild(gridLine);
            }
        }

        svg.appendChild(axisGroup);
    }


    /**
     * Draw all event bands (separate sections for each event set)
     */
    function drawEventBands() {
        // Calculate required left padding based on longest band label
        const charWidth = 7; // Approximate width per character for band titles
        const labelGap = 10; // Gap between label and band edge
        const maxLabelLength = Math.max(...selectedEventSets.map(set => set.name.length));
        const requiredLeftPadding = maxLabelLength * charWidth + labelGap;

        // Update left padding if needed
        const originalLeftPadding = config.padding.left;
        config.padding.left = Math.max(config.padding.left, requiredLeftPadding);

        let currentY = config.padding.top;

        selectedEventSets.forEach(eventSet => {
            const bandHeight = drawEventBand(eventSet, currentY);
            currentY += bandHeight + config.bandSpacing;
        });

        // Restore original padding
        config.padding.left = originalLeftPadding;
    }

    /**
     * Draw a single event band
     * @param {Object} eventSet - The event set to draw
     * @param {number} y - Y position of the band
     * @returns {number} The actual height used by the band
     */
    function drawEventBand(eventSet, y) {
        const bandGroup = createSVGElement('g', { class: 'event-band' });

        // Use special rendering for "Notable People"
        const allEvents = [...eventSet.events].sort((a, b) => a.priority - b.priority);
        const topPadding = 8;
        const bottomPadding = 8;
        const fontSize = 12;
        // startY should be baseline position, accounting for text ascent above baseline
        const startY = y + topPadding + fontSize;

        let maxY;
        if (eventSet.name === "Notable People") {
            maxY = drawPeopleBand(bandGroup, allEvents, startY, eventSet.color, y);
        } else {
            maxY = drawBandEvents(bandGroup, allEvents, startY, eventSet.color, y);
        }

        // Calculate actual height needed (maxY already includes content, just add bottom padding)
        const actualHeight = (maxY - y) + bottomPadding;

        // Create clipPath for this band with actual height
        const clipPathId = `clip-${eventSet.name.replace(/\s+/g, '-')}`;
        const clipPath = createSVGElement('clipPath', { id: clipPathId });
        const clipRect = createSVGElement('rect', {
            x: config.padding.left,
            y: y,
            width: config.width - config.padding.left - config.padding.right,
            height: actualHeight
        });
        clipPath.appendChild(clipRect);
        svg.appendChild(clipPath);

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
            class: 'band-title',
            fill: eventSet.color
        });
        title.textContent = eventSet.name;
        svg.appendChild(title);

        svg.appendChild(bandGroup);

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
    function drawPeopleBand(group, events, baseY, baseColor, bandY) {
        const startTimestamp = new Date(config.startYear, 0, 1).getTime();
        const endTimestamp = new Date(config.endYear, 11, 31).getTime();
        const timeRange = endTimestamp - startTimestamp;
        const chartWidth = config.width - config.padding.left - config.padding.right;

        const lineHeight = 3;
        const fontSize = 12;
        const textHeight = fontSize + 4;
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

        // Filter events within time range (don't assign colors yet)
        const visiblePeople = [];
        events.forEach((event) => {
            if (event.startDate.getFullYear() >= config.startYear &&
                event.startDate.getFullYear() <= config.endYear) {
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
            const startX = config.padding.left +
                ((person.startTimestamp - startTimestamp) / timeRange) * chartWidth;

            let endX = startX;
            if (person.endDate && person.endDate.getFullYear() <= config.endYear) {
                // Person has died
                endX = config.padding.left +
                    ((person.endTimestamp - startTimestamp) / timeRange) * chartWidth;
            } else if (!person.endDate) {
                // Person is still alive, extend line to current end of timeline
                endX = config.padding.left + chartWidth;
            }

            const lineLength = endX - startX;
            const textWidth = person.name.length * charWidth;

            // Step 1: Find Y position for the line that avoids line overlaps (4px gap)
            let lineY = baseY;
            let foundLinePosition = false;

            while (!foundLinePosition) {
                let hasLineOverlap = false;

                for (const placed of placedItems) {
                    const horizontalOverlap = (startX < placed.endX) && (endX > placed.startX);
                    const verticalGap = Math.abs(lineY - placed.lineY);

                    // Lines overlap if they're horizontally overlapping and vertically too close
                    if (horizontalOverlap && verticalGap < lineGap) {
                        hasLineOverlap = true;
                        lineY = placed.lineY + lineGap;
                        break;
                    }
                }

                if (!hasLineOverlap) {
                    foundLinePosition = true;
                }
            }

            // Step 2: Try to find horizontal position for text that avoids text overlaps
            let textX = startX; // Prefer start of line
            const maxTextX = startX + lineLength - textWidth;
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
                        // Jump to after this text
                        textX = placed.textX + placed.textWidth + textGap;
                        break;
                    }
                }

                if (!hasTextOverlap) {
                    foundTextPosition = true;
                } else if (textX > maxTextX) {
                    // Can't fit text without overlap, need to shift line down
                    break;
                }
            }

            // Step 3: If we couldn't find a text position, shift the line down and retry
            if (!foundTextPosition) {
                // Shift down and try again
                lineY += textHeight;
                textX = startX; // Reset to beginning of line
            }

            // Constrain text to line bounds
            if (textX < startX) textX = startX;
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

        // Draw white background rectangles behind text to make it readable over lines
        // Stop the background just above the person's own timeline
        placedItems.forEach(item => {
            const textBg = createSVGElement('rect', {
                x: item.textX - 2,
                y: item.lineY - fontSize - 2,
                width: item.textWidth + 4,
                height: fontSize - 2,
                fill: 'white',
                'fill-opacity': 0.8
            });
            group.appendChild(textBg);
        });

        // Draw text on top
        placedItems.forEach(item => {
            const text = createSVGElement('text', {
                x: item.textX,
                y: item.lineY - 4,
                class: 'event-label-major',
                fill: item.person.personColor,
                'fill-opacity': 1
            });
            text.textContent = item.person.name;
            group.appendChild(text);
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
     * @returns {number} The maximum Y position used
     */
    function drawBandEvents(group, events, baseY, color, bandY) {

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
            // Only draw events within the visible time range
            if (event.startDate.getFullYear() < config.startYear ||
                event.startDate.getFullYear() > config.endYear) {
                return;
            }

            const x = config.padding.left +
                ((event.startTimestamp - startTimestamp) / timeRange) * chartWidth;

            // Calculate end X for duration events
            let endX = x;
            if (event.endDate && event.endDate.getFullYear() <= config.endYear) {
                endX = config.padding.left +
                    ((event.endTimestamp - startTimestamp) / timeRange) * chartWidth;
            }

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

            // Draw event label
            const label = createSVGElement('text', {
                x: labelStartX,
                y: labelY,
                class: 'event-label-major',
                fill: color,
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
                    stroke: color,
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
