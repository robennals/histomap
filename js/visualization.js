// Visualization Module
// Handles SVG rendering of the timeline

const Visualization = (function() {
    const SVG_NS = 'http://www.w3.org/2000/svg';

    // Configuration
    const config = {
        width: 1200,
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
    let eventSetHeights = {}; // Maps event set name to height setting

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

        // Draw tick marks and labels
        const yearStep = Math.ceil((config.endYear - config.startYear) / config.timelineTickCount);

        for (let year = config.startYear; year <= config.endYear; year += yearStep) {
            const yearTimestamp = new Date(year, 0, 1).getTime();
            const x = config.padding.left + ((yearTimestamp - startTimestamp) / timeRange) * chartWidth;

            // Tick mark
            const tick = createSVGElement('line', {
                x1: x,
                y1: config.padding.top - 25,
                x2: x,
                y2: config.padding.top - 15,
                stroke: '#95a5a6',
                'stroke-width': 2
            });
            axisGroup.appendChild(tick);

            // Year label
            const label = createSVGElement('text', {
                x: x,
                y: config.padding.top - 30,
                'text-anchor': 'middle',
                class: 'timeline-label'
            });
            label.textContent = year;
            axisGroup.appendChild(label);

            // Vertical grid line
            const gridLine = createSVGElement('line', {
                x1: x,
                y1: config.padding.top,
                x2: x,
                y2: config.height - config.padding.bottom,
                stroke: '#ecf0f1',
                'stroke-width': 1,
                'stroke-dasharray': '4,4'
            });
            axisGroup.appendChild(gridLine);
        }

        svg.appendChild(axisGroup);
    }

    /**
     * Draw all event bands
     */
    function drawEventBands() {
        let currentY = config.padding.top;

        selectedEventSets.forEach(eventSet => {
            const heightSetting = eventSetHeights[eventSet.name] || 'normal';
            const bandHeight = config.bandHeights[heightSetting];

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

        // Band title
        const title = createSVGElement('text', {
            x: config.padding.left - 10,
            y: y + height / 2,
            'text-anchor': 'end',
            'dominant-baseline': 'middle',
            class: 'band-title',
            fill: eventSet.color
        });
        title.textContent = eventSet.name;
        bandGroup.appendChild(title);

        // Separate events by priority
        const majorEvents = eventSet.events.filter(e => e.priority <= 2);
        const minorEvents = eventSet.events.filter(e => e.priority > 2);

        // Draw major events in upper portion
        const majorY = y + height * 0.3;
        drawEvents(bandGroup, majorEvents, majorY, eventSet.color, true);

        // Draw minor events in lower portion
        const minorY = y + height * 0.7;
        drawEvents(bandGroup, minorEvents, minorY, eventSet.color, false);

        svg.appendChild(bandGroup);
    }

    /**
     * Draw events
     * @param {SVGElement} group - Parent SVG group
     * @param {Array} events - Events to draw
     * @param {number} baseY - Base Y position for events
     * @param {string} color - Base color
     * @param {boolean} isMajor - Whether these are major events
     */
    function drawEvents(group, events, baseY, color, isMajor) {
        const size = isMajor ? config.majorEventSize : config.minorEventSize;
        const opacity = isMajor ? 1.0 : 0.6;

        const startTimestamp = new Date(config.startYear, 0, 1).getTime();
        const endTimestamp = new Date(config.endYear, 11, 31).getTime();
        const timeRange = endTimestamp - startTimestamp;
        const chartWidth = config.width - config.padding.left - config.padding.right;

        // Sort events by priority (lower number = higher priority = drawn first)
        const sortedEvents = [...events].sort((a, b) => a.priority - b.priority);

        // Track placed events to detect overlaps
        const placedEvents = [];
        const verticalSpacing = size.fontSize + 10; // Space between rows
        const labelPadding = 10; // Horizontal padding around labels
        const lineHeight = size.dotRadius * 2 + 6; // Height needed for dot and line above label

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

            // Estimate label width (rough approximation: ~6px per character for major, ~5px for minor)
            const charWidth = isMajor ? 6 : 5;
            const estimatedLabelWidth = event.name.length * charWidth;
            const labelStartX = x; // Align with start of event
            const labelEndX = labelStartX + estimatedLabelWidth;

            // Find a Y position that doesn't overlap with existing events
            let labelY = baseY;
            let attempts = 0;
            const maxAttempts = 20; // Prevent infinite loops

            while (attempts < maxAttempts) {
                let hasOverlap = false;
                const lineY = labelY - lineHeight; // Line and dot are above the label

                for (const placed of placedEvents) {
                    // Check for line overlap
                    const lineOverlapX = (x <= placed.endX) && (endX >= placed.x);
                    const lineOverlapY = Math.abs(lineY - placed.lineY) < 4; // Lines need small vertical clearance

                    // Check for label text overlap
                    const labelOverlapX = (labelStartX <= placed.labelEndX + labelPadding) &&
                                          (labelEndX >= placed.labelStartX - labelPadding);
                    const labelOverlapY = Math.abs(labelY - placed.labelY) < verticalSpacing;

                    if ((lineOverlapX && lineOverlapY) || (labelOverlapX && labelOverlapY)) {
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

            const lineY = labelY - lineHeight; // Line and dot are above the label

            // Record this event's position
            placedEvents.push({
                x: x,
                endX: endX,
                labelY: labelY,
                lineY: lineY,
                labelStartX: labelStartX,
                labelEndX: labelEndX
            });

            // Calculate event duration in years
            let durationYears = 0;
            if (event.endDate) {
                durationYears = (event.endTimestamp - event.startTimestamp) / (1000 * 60 * 60 * 24 * 365.25);
            }

            // Draw duration line if event has an end date
            if (event.endDate && event.endDate.getFullYear() <= config.endYear) {
                const line = createSVGElement('line', {
                    x1: x,
                    y1: lineY,
                    x2: endX,
                    y2: lineY,
                    stroke: color,
                    'stroke-width': size.lineWidth,
                    'stroke-opacity': opacity
                });
                group.appendChild(line);
            }

            // Draw dot for events with duration less than 4 years (or point events)
            if (!event.endDate || durationYears < 4) {
                const dot = createSVGElement('circle', {
                    cx: x,
                    cy: lineY,
                    r: size.dotRadius,
                    fill: color,
                    'fill-opacity': opacity,
                    stroke: 'white',
                    'stroke-width': 1
                });
                group.appendChild(dot);
            }

            // Draw event label (below the line)
            const label = createSVGElement('text', {
                x: labelStartX,
                y: labelY,
                class: isMajor ? 'event-label-major' : 'event-label-minor',
                fill: color,
                'fill-opacity': opacity
            });
            label.textContent = event.name;
            group.appendChild(label);
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
     * Set which event sets should be displayed
     * @param {Array} eventSets - Array of event sets to display
     */
    function setSelectedEventSets(eventSets) {
        selectedEventSets = eventSets;
    }

    /**
     * Set height setting for an event set
     * @param {string} eventSetName - Name of the event set
     * @param {string} height - Height setting (half, normal, double)
     */
    function setEventSetHeight(eventSetName, height) {
        eventSetHeights[eventSetName] = height;
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
        setSelectedEventSets,
        setEventSetHeight,
        getSVG
    };
})();
