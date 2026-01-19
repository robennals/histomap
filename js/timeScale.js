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
            if (this.scale === 'linear') {
                return this.getLinearTicks();
            } else {
                return this.getLogTicks();
            }
        }

        /**
         * Generate linear scale ticks
         * @returns {Array} Array of tick objects
         */
        getLinearTicks() {
            const ticks = [];

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

            return ticks;
        }

        /**
         * Generate logarithmic scale ticks
         * @returns {Array} Array of tick objects
         */
        getLogTicks() {
            // Key historical years that make sense on log scale
            const majorYears = [
                -20000, -10000, -5000, -3000, -2000, -1000, -500,
                0, 500, 1000, 1500, 1800, 1900, 1950, 1975, 2000, 2015, 2025
            ];

            return majorYears
                .filter(y => y >= this.startYear && y <= this.endYear)
                .map(year => {
                    const isPrimaryTick = (
                        year === -20000 || year === -10000 ||
                        year === -5000 || year === 0 ||
                        year === 1000 || year === 2000
                    );

                    return {
                        year,
                        showLabel: true,
                        showGrid: true,
                        height: isPrimaryTick ? 13 : 8,
                        width: isPrimaryTick ? 2 : 1,
                        color: isPrimaryTick ? '#5a6c7d' : '#bdc3c7',
                        labelWeight: isPrimaryTick ? 'bold' : 'normal'
                    };
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
