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
        padding: { top: 60, right: 40, bottom: 60, left: 100 },
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
    let displayMode = 'bands'; // 'unified' or 'bands'

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
        if (settings.displayMode) displayMode = settings.displayMode;

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

        // Draw based on display mode
        if (displayMode === 'bands') {
            drawEventBands();
        } else {
            drawUnifiedTimeline();
        }

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
     * Draw unified timeline with all events merged
     */
    function drawUnifiedTimeline() {
        const timelineGroup = createSVGElement('g', { class: 'unified-timeline' });

        // Merge all events from all event sets
        const allEvents = [];
        selectedEventSets.forEach(eventSet => {
            eventSet.events.forEach(event => {
                // Calculate combined priority (event priority + event set priority)
                // Lower number = higher priority
                const combinedPriority = event.priority + (eventSet.setBasePriority || 5);

                allEvents.push({
                    ...event,
                    color: eventSet.color,
                    eventSetName: eventSet.name,
                    combinedPriority: combinedPriority
                });
            });
        });

        // Sort by combined priority (lower = more important)
        allEvents.sort((a, b) => a.combinedPriority - b.combinedPriority);

        // Determine if events are major or minor based on combined priority
        // Events with combinedPriority <= 7 are major, others are minor
        const majorEvents = allEvents.filter(e => e.combinedPriority <= 7);
        const minorEvents = allEvents.filter(e => e.combinedPriority > 7);

        // Start events at the top of the available vertical space
        const timelineY = config.padding.top + 20;

        // Draw all events starting from the top
        drawUnifiedEvents(timelineGroup, allEvents, timelineY);

        svg.appendChild(timelineGroup);
    }

    /**
     * Draw all event bands (separate sections for each event set)
     */
    function drawEventBands() {
        let currentY = config.padding.top;
        const bandHeight = 120; // Fixed height for bands mode

        selectedEventSets.forEach(eventSet => {
            drawEventBand(eventSet, currentY, bandHeight);
            currentY += bandHeight + config.bandSpacing;
        });
    }

    /**
     * Draw a single event band
     * @param {Object} eventSet - The event set to draw
     * @param {number} y - Y position of the band
     * @param {number} height - Height of the band
     */
    function drawEventBand(eventSet, y, height) {
        const bandGroup = createSVGElement('g', { class: 'event-band' });

        // Create clipPath for this band
        const clipPathId = `clip-${eventSet.name.replace(/\s+/g, '-')}`;
        const clipPath = createSVGElement('clipPath', { id: clipPathId });
        const clipRect = createSVGElement('rect', {
            x: config.padding.left,
            y: y,
            width: config.width - config.padding.left - config.padding.right,
            height: height
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
            height: height,
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
            y: y + height / 2,
            'text-anchor': 'end',
            'dominant-baseline': 'middle',
            class: 'band-title',
            fill: eventSet.color
        });
        title.textContent = eventSet.name;
        svg.appendChild(title);

        // Draw all events together, sorted by priority
        const allEvents = [...eventSet.events].sort((a, b) => a.priority - b.priority);
        const startY = y + 20; // Start near top of band
        drawBandEvents(bandGroup, allEvents, startY, eventSet.color, y, height);

        svg.appendChild(bandGroup);
    }

    /**
     * Draw events for a band
     * @param {SVGElement} group - Parent SVG group
     * @param {Array} events - Events to draw (already sorted by priority)
     * @param {number} baseY - Base Y position for events
     * @param {string} color - Base color
     * @param {number} bandY - Y position of the band (for clipping)
     * @param {number} bandHeight - Height of the band (for clipping)
     */
    function drawBandEvents(group, events, baseY, color, bandY, bandHeight) {
        const bandBottom = bandY + bandHeight;

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

        events.forEach(event => {
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
            let labelY = baseY;
            let attempts = 0;
            const maxAttempts = 20;

            while (attempts < maxAttempts) {
                let hasOverlap = false;

                for (const placed of placedEvents) {
                    // Check if underlines would overlap (for events with durations)
                    const underlineOverlapX = (x <= placed.endX) && (endX >= placed.x);

                    // Check if text labels would overlap
                    const textOverlapX = (labelStartX <= placed.labelEndX + labelPadding) &&
                                        (labelEndX >= placed.labelStartX - labelPadding);

                    const labelOverlapY = Math.abs(labelY - placed.labelY) < verticalSpacing;

                    // Overlap if either underlines or text overlaps
                    if ((underlineOverlapX || textOverlapX) && labelOverlapY) {
                        hasOverlap = true;
                        break;
                    }
                }

                if (!hasOverlap) {
                    break;
                }

                labelY += verticalSpacing;
                attempts++;
            }

            // Check if event would fit within the band
            // Don't draw if the label would extend beyond the band bottom
            if (labelY + size.fontSize / 2 > bandBottom) {
                return; // Skip this event, it doesn't fit
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
    }

    /**
     * Draw events in unified timeline
     * @param {SVGElement} group - Parent SVG group
     * @param {Array} events - Events to draw
     * @param {number} baseY - Base Y position for events
     */
    function drawUnifiedEvents(group, events, baseY) {
        const startTimestamp = new Date(config.startYear, 0, 1).getTime();
        const endTimestamp = new Date(config.endYear, 11, 31).getTime();
        const timeRange = endTimestamp - startTimestamp;
        const chartWidth = config.width - config.padding.left - config.padding.right;

        // Track placed events to detect overlaps
        const placedEvents = [];
        const labelPadding = 20; // Horizontal spacing between labels to prevent them from reading as one word
        // All events use the same size
        const size = config.majorEventSize;
        const opacity = 1.0;
        const verticalSpacing = size.fontSize + 4;
        const dotOffset = 8; // Space between dot and text

        // Events are already sorted by combinedPriority
        events.forEach(event => {
            const color = event.color;
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

            // Find a Y position that doesn't overlap with existing events
            let labelY = baseY;
            let attempts = 0;
            const maxAttempts = 20; // Prevent infinite loops

            while (attempts < maxAttempts) {
                let hasOverlap = false;

                for (const placed of placedEvents) {
                    // Check if underlines would overlap (for events with durations)
                    const underlineOverlapX = (x <= placed.endX) && (endX >= placed.x);

                    // Check if text labels would overlap
                    const textOverlapX = (labelStartX <= placed.labelEndX + labelPadding) &&
                                        (labelEndX >= placed.labelStartX - labelPadding);

                    const labelOverlapY = Math.abs(labelY - placed.labelY) < verticalSpacing;

                    // Overlap if either underlines or text overlaps
                    if ((underlineOverlapX || textOverlapX) && labelOverlapY) {
                        hasOverlap = true;
                        break;
                    }
                }

                if (!hasOverlap) {
                    break; // Found a good position
                }

                // Move down to next row
                labelY += verticalSpacing;
                attempts++;
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
