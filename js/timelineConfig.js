// Timeline Configuration Module
// Defines available timeline types and their configurations

const TimelineConfig = (function() {
    const TIMELINE_TYPES = {
        us: {
            id: 'us',
            name: 'US History',
            title: 'Timeline of US History',
            startYear: 1750,
            endYear: 2025,
            scale: 'linear',
            dataPath: 'data/us/',
            defaultWidth: 2400
        },
        world: {
            id: 'world',
            name: 'World History',
            title: 'Timeline of World History',
            startYear: -20000,
            endYear: 2025,
            scale: 'logarithmic',
            dataPath: 'data/world/',
            defaultWidth: 3000,
            logConfig: {
                referenceYear: 2500,  // Future reference to avoid compressing present
                base: 2              // Doubling periods take equal space
            }
        }
    };

    /**
     * Get configuration for a specific timeline type
     * @param {string} timelineId - ID of the timeline ('us' or 'world')
     * @returns {Object} Timeline configuration object
     */
    function getConfig(timelineId) {
        const config = TIMELINE_TYPES[timelineId];
        if (!config) {
            throw new Error(`Unknown timeline ID: ${timelineId}`);
        }
        return config;
    }

    /**
     * Get all available timeline types
     * @returns {Array} Array of timeline configuration objects
     */
    function getAllTimelines() {
        return Object.values(TIMELINE_TYPES);
    }

    /**
     * Check if a timeline ID is valid
     * @param {string} timelineId - ID to check
     * @returns {boolean} True if valid
     */
    function isValidTimelineId(timelineId) {
        return timelineId in TIMELINE_TYPES;
    }

    // Public API
    return {
        getConfig,
        getAllTimelines,
        isValidTimelineId
    };
})();
