// Data Loader Module
// Handles loading and managing event set data

const DataLoader = (function() {
    // List of available data files
    const DATA_FILES = [
        'data/wars.json',
        'data/historical-events.json',
        'data/notable-people.json',
        'data/media.json'
    ];

    let eventSets = [];

    /**
     * Load all event sets from JSON files
     * @returns {Promise<Array>} Array of event sets
     */
    async function loadAllEventSets() {
        try {
            const promises = DATA_FILES.map(file =>
                fetch(file).then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to load ${file}`);
                    }
                    return response.json();
                })
            );

            eventSets = await Promise.all(promises);

            // Process dates for each event set
            eventSets.forEach(processEventSet);

            return eventSets;
        } catch (error) {
            console.error('Error loading event sets:', error);
            throw error;
        }
    }

    /**
     * Process an event set - convert date strings to Date objects
     * @param {Object} eventSet - The event set to process
     */
    function processEventSet(eventSet) {
        eventSet.events.forEach(event => {
            // Convert start date string to Date object
            event.startDate = new Date(event.start);

            // Convert end date if it exists
            if (event.end) {
                event.endDate = new Date(event.end);
            }

            // Add timestamp for easier calculations
            event.startTimestamp = event.startDate.getTime();
            event.endTimestamp = event.endDate ? event.endDate.getTime() : null;
        });

        // Sort events by start date
        eventSet.events.sort((a, b) => a.startTimestamp - b.startTimestamp);
    }

    /**
     * Get all loaded event sets
     * @returns {Array} Array of event sets
     */
    function getEventSets() {
        return eventSets;
    }

    /**
     * Get a specific event set by name
     * @param {string} name - Name of the event set
     * @returns {Object|null} The event set or null if not found
     */
    function getEventSetByName(name) {
        return eventSets.find(set => set.name === name) || null;
    }

    // Public API
    return {
        loadAllEventSets,
        getEventSets,
        getEventSetByName
    };
})();
