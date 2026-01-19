// Data Loader Module
// Handles loading and managing event set data

const DataLoader = (function() {
    // List of available data files
    const DATA_FILES = [
        // 'data/wars.json',
        // 'data/historical-events.json',
        'data/eras.json',
        'data/presidents.json',
        'data/notable-people.json',
        'data/media.json',
        'data/technology.json',
        { type: 'csv', path: 'data/bloc_gdp_summary.csv', name: 'Powers' }
    ];

    let eventSets = [];

    /**
     * Load all event sets from JSON files and CSV files
     * @returns {Promise<Array>} Array of event sets
     */
    async function loadAllEventSets() {
        try {
            const promises = DATA_FILES.map(file => {
                if (typeof file === 'string') {
                    // JSON file
                    return fetch(file).then(response => {
                        if (!response.ok) {
                            throw new Error(`Failed to load ${file}`);
                        }
                        return response.json();
                    });
                } else if (file.type === 'csv') {
                    // CSV file
                    return fetch(file.path).then(response => {
                        if (!response.ok) {
                            throw new Error(`Failed to load ${file.path}`);
                        }
                        return response.text();
                    }).then(text => processGDPCSV(text, file.name));
                }
            });

            eventSets = await Promise.all(promises);

            // Process dates for each event set (skip GDP blocs as they're already processed)
            eventSets.forEach(eventSet => {
                if (eventSet.type !== 'gdp-blocs') {
                    processEventSet(eventSet);
                }
            });

            return eventSets;
        } catch (error) {
            console.error('Error loading event sets:', error);
            throw error;
        }
    }

    /**
     * Process GDP CSV data
     * @param {string} csvText - Raw CSV text
     * @param {string} name - Name for this event set
     * @returns {Object} Processed GDP blocs data
     */
    function processGDPCSV(csvText, name) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const blocNames = headers.slice(1); // Skip 'Year' column

        // Initialize data structure
        const blocData = {};
        blocNames.forEach(bloc => {
            blocData[bloc] = [];
        });

        // Parse each row
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const year = parseInt(values[0]);

            blocNames.forEach((bloc, idx) => {
                const gdpPercent = parseFloat(values[idx + 1]);
                blocData[bloc].push({
                    year: year,
                    gdpPercent: gdpPercent
                });
            });
        }

        return {
            name: name,
            color: '#16a085', // Teal base color
            type: 'gdp-blocs',
            blocs: blocData,
            blocList: blocNames
        };
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
