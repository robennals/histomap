// Time Scale Module
// Provides abstraction for linear and logarithmic time-to-pixel mapping

const TimeScale = (function() {
    /**
     * TimeScale class for converting years to x-coordinates
     */
    class TimeScale {
        constructor(config, padding, chartWidth) {
            this.config = config;
            this.padding = padding;
            this.chartWidth = chartWidth;
            this.scale = config.scale || 'linear';

            // For linear scale
            this.startYear = config.startYear;
            this.endYear = config.endYear;

            // For logarithmic scale
            if (this.scale === 'logarithmic' && config.logConfig) {
                this.referenceYear = config.logConfig.referenceYear;
                this.base = config.logConfig.base;
                this.offset = 1; // Prevent log(0)

                // Pre-calculate bounds for normalization
                this.maxLogValue = this.calculateLog(this.referenceYear - this.startYear + this.offset);
                this.minLogValue = this.calculateLog(this.referenceYear - this.endYear + this.offset);
            }
        }

        /**
         * Calculate logarithm with specified base
         * @param {number} value - Value to take log of
         * @returns {number} Logarithm result
         */
        calculateLog(value) {
            return Math.log(value) / Math.log(this.base);
        }

        /**
         * Convert year to x-coordinate
         * @param {number} year - Year value (can be negative for BC)
         * @returns {number} X-coordinate in pixels
         */
        yearToX(year) {
            if (this.scale === 'linear') {
                return this.linearYearToX(year);
            } else {
                return this.logarithmicYearToX(year);
            }
        }

        /**
         * Linear year to X mapping
         * @param {number} year - Year value
         * @returns {number} X-coordinate in pixels
         */
        linearYearToX(year) {
            const yearRange = this.endYear - this.startYear;
            const normalizedPosition = (year - this.startYear) / yearRange;
            return this.padding.left + normalizedPosition * this.chartWidth;
        }

        /**
         * Logarithmic year to X mapping
         * @param {number} year - Year value
         * @returns {number} X-coordinate in pixels
         */
        logarithmicYearToX(year) {
            // Convert to years before reference point
            const yearsBeforeRef = this.referenceYear - year;

            // Apply logarithm with offset
            const logValue = this.calculateLog(yearsBeforeRef + this.offset);

            // Normalize to 0-1 range (reversed so older = left)
            const normalizedPosition = (this.maxLogValue - logValue) / (this.maxLogValue - this.minLogValue);

            // Map to pixel space
            return this.padding.left + normalizedPosition * this.chartWidth;
        }

        /**
         * Convert x-coordinate back to year (for interaction)
         * @param {number} x - X-coordinate in pixels
         * @returns {number} Year value
         */
        xToYear(x) {
            const normalizedPosition = (x - this.padding.left) / this.chartWidth;

            if (this.scale === 'linear') {
                const yearRange = this.endYear - this.startYear;
                return this.startYear + normalizedPosition * yearRange;
            } else {
                // Reverse logarithmic calculation
                const logValue = this.maxLogValue - normalizedPosition * (this.maxLogValue - this.minLogValue);
                const yearsBeforeRef = Math.pow(this.base, logValue) - this.offset;
                return this.referenceYear - yearsBeforeRef;
            }
        }

        /**
         * Get appropriate tick marks for the timeline axis
         * @returns {Array} Array of tick objects with year, display properties
         */
        getAxisTicks() {
            const ticks = this.scale === 'linear'
                ? this.getLinearTicks()
                : this.getLogTicks();

            return ticks.filter(tick => tick.year !== 0);
        }

        /**
         * Generate linear scale ticks
         * @returns {Array} Array of tick objects
         */
        getLinearTicks() {
            const ticks = [];

            const yearRange = this.endYear - this.startYear;
            if (yearRange > 10000) {
                return this.getLargeRangeLinearTicks();
            }

            // Generate ticks for every year from start to end
            for (let year = this.startYear; year <= this.endYear; year++) {
                let tick = {
                    year: year,
                    showLabel: false,
                    showGrid: true,
                    height: 0,
                    width: 0.5,
                    color: '#e8e8e8',
                    opacity: 0.6
                };

                // 50-year marks
                if (year % 50 === 0) {
                    tick.showLabel = true;
                    tick.height = 13;
                    tick.width = 2;
                    tick.color = '#5a6c7d';
                    tick.labelWeight = 'bold';
                }
                // Decade marks
                else if (year % 10 === 0) {
                    tick.showLabel = true;
                    tick.height = 6;
                    tick.width = 1;
                    tick.color = '#7f8c8d';
                    tick.labelWeight = 'normal';
                }
                // Only show every other year grid line
                else if (year % 2 !== 0) {
                    continue;
                }

                ticks.push(tick);
            }

            this.ensureReferenceTick(ticks, 1);
            return ticks;
        }

        /**
         * Generate linear scale ticks for very large ranges
         * @returns {Array} Array of tick objects
         */
        getLargeRangeLinearTicks() {
            const ticks = [];
            const yearRange = this.endYear - this.startYear;
            const targetTicks = 12;
            const roughStep = yearRange / targetTicks;
            const power = Math.pow(10, Math.floor(Math.log10(roughStep)));
            const stepOptions = [1, 2, 5, 10].map(m => m * power);
            let step = stepOptions[0];
            for (const option of stepOptions) {
                if (roughStep <= option) {
                    step = option;
                    break;
                }
            }

            const startTick = Math.floor(this.startYear / step) * step;
            const endTick = Math.ceil(this.endYear / step) * step;

            for (let year = startTick; year <= endTick; year += step) {
                if (year < this.startYear || year > this.endYear) continue;
                ticks.push({
                    year,
                    showLabel: true,
                    showGrid: true,
                    height: 12,
                    width: 1.5,
                    color: '#cfcfcf',
                    opacity: 1.0,
                    labelWeight: 'bold'
                });
            }

            this.ensureReferenceTick(ticks, 1);
            return ticks.sort((a, b) => a.year - b.year);
        }

        /**
         * Generate logarithmic scale ticks
         * @returns {Array} Array of tick objects
         */
        getLogTicks() {
            const ticks = [];
            const yearRange = this.endYear - this.startYear;

            if (yearRange > 50000) {
                const largeTicks = this.getLargeRangeLogTicks();
                this.ensureReferenceTick(largeTicks, 1);
                return largeTicks;
            }

            // Helper function to interpolate between two hex colors
            const interpolateColor = (startColor, endColor, factor) => {
                // Expand 3-char hex to 6-char hex if needed
                const expandHex = (hex) => {
                    const h = hex.slice(1);
                    if (h.length === 3) {
                        return '#' + h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
                    }
                    return hex;
                };

                startColor = expandHex(startColor);
                endColor = expandHex(endColor);

                // Parse hex colors
                const start = parseInt(startColor.slice(1), 16);
                const end = parseInt(endColor.slice(1), 16);

                // Extract RGB components
                const startR = (start >> 16) & 0xff;
                const startG = (start >> 8) & 0xff;
                const startB = start & 0xff;

                const endR = (end >> 16) & 0xff;
                const endG = (end >> 8) & 0xff;
                const endB = end & 0xff;

                // Interpolate each component
                const r = Math.round(startR + (endR - startR) * factor);
                const g = Math.round(startG + (endG - startG) * factor);
                const b = Math.round(startB + (endB - startB) * factor);

                // Convert back to hex with proper padding
                const toHex = (n) => ('0' + n.toString(16)).slice(-2);
                return '#' + toHex(r) + toHex(g) + toHex(b);
            };

            // Generate decade gridlines (every 10 years)
            const startDecade = Math.floor(this.startYear / 10) * 10;
            const endDecade = Math.ceil(this.endYear / 10) * 10;

            for (let year = startDecade; year <= endDecade; year += 10) {
                if (year < this.startYear || year > this.endYear) continue;

                // Calculate position factor (0 at start, 1 at end)
                const yearRange = this.endYear - this.startYear;
                const positionFactor = (year - this.startYear) / yearRange;

                // Check if this is a century or millennium
                const isMillennium = (year % 1000 === 0);
                const isCentury = (year % 100 === 0);
                const isHalfMillennium = false;

                // Show labels for millennia, and centuries from 1000 onwards (but not 2001-2025)
                const showLabel = isMillennium || (isCentury && year >= 1000 && year <= 2000);

                // Different styling for millennia, centuries, and decades
                let width, color, height;
                if (isMillennium || isHalfMillennium) {
                    width = 2;
                    color = '#ccc';
                    height = showLabel ? 13 : 0;
                } else if (isCentury) {
                    width = 1;
                    // Interpolate from #eee (past) to #ddd (present)
                    color = interpolateColor('#eee', '#ddd', positionFactor);
                    height = showLabel ? 6 : 0;
                } else {
                    // Decade lines - interpolate from #e3e3e3 (past) to #d0d0d0 (present)
                    width = 0.5;
                    color = interpolateColor('#e3e3e3', '#d0d0d0', positionFactor);
                    height = 0;
                }

                ticks.push({
                    year,
                    showLabel: showLabel,
                    showGrid: true,
                    height: height,
                    width: width,
                    color: color,
                    opacity: isCentury || isMillennium ? 1.0 : 0.5,
                    labelWeight: isMillennium || isHalfMillennium ? 'bold' : 'normal'
                });
            }

            // Sort by year
            const sorted = ticks.sort((a, b) => a.year - b.year);
            this.ensureReferenceTick(sorted, 1);
            return sorted;
        }

        /**
         * Generate logarithmic ticks for very large ranges (e.g., universe timeline)
         * @returns {Array} Array of tick objects
         */
        getLargeRangeLogTicks() {
            const ticks = [];

            const maxYearsBeforeRef = this.referenceYear - this.startYear;
            const minYearsBeforeRef = this.referenceYear - this.endYear;

            const maxPower = Math.floor(Math.log10(maxYearsBeforeRef));
            const minPower = Math.max(0, Math.floor(Math.log10(minYearsBeforeRef)));

            for (let power = minPower; power <= maxPower; power++) {
                const baseValue = Math.pow(10, power);
                const yearsBeforeRef = baseValue;
                if (yearsBeforeRef === 1_000_000_000) {
                    continue;
                }
                const year = this.referenceYear - yearsBeforeRef;

                if (year < this.startYear || year > this.endYear) continue;

                ticks.push({
                    year,
                    showLabel: true,
                    showGrid: true,
                    height: 12,
                    width: 1.5,
                    color: '#cfcfcf',
                    opacity: 1.0,
                    labelWeight: 'bold'
                });
            }

            // Add billion-year ticks (e.g., 4B, 3B, 2B, 1B BC)
            for (let billions = 1; billions <= 5; billions++) {
                const year = -billions * 1_000_000_000;
                if (year < this.startYear || year > this.endYear) continue;
                ticks.push({
                    year,
                    showLabel: true,
                    showGrid: true,
                    height: 12,
                    width: 1.5,
                    color: '#cfcfcf',
                    opacity: 1.0,
                    labelWeight: 'bold'
                });
            }

            // Add 100M-year ticks for more recent deep time (1B to 0)
            const hundredMillion = 100_000_000;
            for (let year = -800_000_000; year <= -100_000_000; year += hundredMillion) {
                if (year < this.startYear || year > this.endYear) continue;
                ticks.push({
                    year,
                    showLabel: true,
                    showGrid: true,
                    height: 10,
                    width: 1,
                    color: '#d5d5d5',
                    opacity: 0.9,
                    labelWeight: 'normal'
                });
            }

            // Always include the end year tick for context
            ticks.push({
                year: this.endYear,
                showLabel: true,
                showGrid: true,
                height: 12,
                width: 1.5,
                color: '#b5b5b5',
                opacity: 1.0,
                labelWeight: 'bold'
            });

            // Always include the start year tick for context
            ticks.push({
                year: this.startYear,
                showLabel: true,
                showGrid: true,
                height: 12,
                width: 1.5,
                color: '#b5b5b5',
                opacity: 1.0,
                labelWeight: 'bold'
            });

            // De-duplicate ticks by year
            const uniqueByYear = new Map();
            ticks.forEach(tick => {
                if (!uniqueByYear.has(tick.year)) {
                    uniqueByYear.set(tick.year, tick);
                }
            });

            return Array.from(uniqueByYear.values()).sort((a, b) => a.year - b.year);
        }

        /**
         * Ensure a specific year tick is present for orientation
         * @param {Array} ticks - Tick array to mutate
         * @param {number} year - Year to ensure
         */
        ensureReferenceTick(ticks, year) {
            if (year < this.startYear || year > this.endYear) return;
            if (ticks.some(t => t.year === year)) return;

            ticks.push({
                year,
                showLabel: true,
                showGrid: true,
                height: 12,
                width: 1.5,
                color: '#b5b5b5',
                opacity: 1.0,
                labelWeight: 'bold'
            });
        }

        /**
         * Update dimensions when chart resizes
         * @param {Object} padding - New padding object
         * @param {number} chartWidth - New chart width
         */
        updateDimensions(padding, chartWidth) {
            this.padding = padding;
            this.chartWidth = chartWidth;
        }
    }

    // Return the class for instantiation
    return TimeScale;
})();
