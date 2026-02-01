// Data Loader Module
// Handles loading and managing event set data

const DataLoader = (function() {
    let eventSets = [];

    /**
     * Get data files list based on path
     * @param {string} path - Data path (e.g., 'data/us/' or 'data/world/')
     * @returns {Array} Array of file paths/objects
     */
    function getDataFilesForPath(path) {
        const base = path.endsWith('/') ? path : path + '/';

        if (path.includes('world')) {
            return [
                `${base}eras.json`,
                `${base}notable-people.json`,
                `${base}technology.json`,
                `${base}media.json`,
                { type: 'csv', path: `${base}world_power.csv`, name: 'World Power' }
            ];
        } else if (path.includes('earth')) {
            return [
                `${base}eras.json`,
                `${base}life-forms.json`,
                `${base}events.json`,
                { type: 'timeseries', path: `${base}climate-temp.csv`, name: 'Climate (Temp & CO₂)' }
            ];
        } else if (path.includes('british')) {
            return [
                `${base}eras.json`,
                `${base}monarchs.json`,
                `${base}notable-people.json`,
                `${base}events.json`,
                `${base}stories.json`,
                `${base}technology.json`,
                { type: 'csv', path: `${base}world_power.csv`, name: 'World Power' }
            ];
        } else {
            // US timeline
            return [
                `${base}eras.json`,
                `${base}presidents.json`,
                `${base}notable-people.json`,
                `${base}media.json`,
                `${base}technology.json`,
                { type: 'csv', path: `${base}bloc_gdp_summary.csv`, name: 'World Power' }
            ];
        }
    }

    /**
     * Load all event sets from JSON files and CSV files
     * @param {string} dataPath - Path to data directory (default: 'data/us/')
     * @returns {Promise<Array>} Array of event sets
     */
    async function loadAllEventSets(dataPath = 'data/us/') {
        try {
            const DATA_FILES = getDataFilesForPath(dataPath);

            const promises = DATA_FILES.map(file => {
                const filePath = typeof file === 'string' ? file : file.path;

                if (typeof file === 'string') {
                    // JSON file
                    return fetch(filePath).then(response => {
                        if (!response.ok) {
                            throw new Error(`Failed to load ${filePath}`);
                        }
                        return response.json();
                    });
                } else if (file.type === 'csv') {
                    // CSV file
                    return fetch(filePath).then(response => {
                        if (!response.ok) {
                            throw new Error(`Failed to load ${filePath}`);
                        }
                        return response.text();
                    }).then(text => processGDPCSV(text, file.name));
                } else if (file.type === 'timeseries') {
                    return fetch(filePath).then(response => {
                        if (!response.ok) {
                            throw new Error(`Failed to load ${filePath}`);
                        }
                        return response.text();
                    }).then(text => processTimeSeriesCSV(text, file.name));
                }
            });

            eventSets = await Promise.all(promises);

            // Process dates for each event set (skip GDP blocs as they're already processed)
            eventSets.forEach(eventSet => {
            if (eventSet.type !== 'gdp-blocs' && eventSet.type !== 'timeseries-lines') {
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
     * Process time series CSV data (year,value)
     * @param {string} csvText - Raw CSV text
     * @param {string} name - Name for this event set
     * @returns {Object} Processed time series data
     */
    function processTimeSeriesCSV(csvText, name) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());

        const yearIdx = headers.indexOf('year');
        if (yearIdx === -1) {
            throw new Error(`Time series CSV must include a year column`);
        }

        const seriesKeys = headers.filter((h, idx) => idx !== yearIdx);
        if (seriesKeys.length === 0) {
            throw new Error(`Time series CSV must include at least one data column`);
        }

        const points = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const year = parseInt(values[yearIdx]);
            if (!Number.isFinite(year)) continue;

            const point = { year };
            seriesKeys.forEach((key, idx) => {
                const valueIdx = headers.indexOf(key);
                const value = parseFloat(values[valueIdx]);
                if (Number.isFinite(value)) {
                    point[key] = value;
                }
            });
            points.push(point);
        }

        const seriesMeta = [
            { key: 'temp_c', label: 'Temp (°C)', color: '#e67e22', unit: '°C' },
            { key: 'co2_ppm', label: 'CO₂ (ppm)', color: '#3498db', unit: 'ppm' }
        ].filter(series => seriesKeys.includes(series.key));

        return {
            name,
            color: '#95a5a6',
            type: 'timeseries-lines',
            series: seriesMeta,
            points
        };
    }

    /**
     * Extract year from ISO date string (handles negative years for BC)
     * @param {string} dateString - ISO date string (e.g., "1776-07-04" or "-500-01-01")
     * @returns {number} Year as integer (negative for BC)
     */
    function extractYear(dateString) {
        const match = dateString.match(/^(-?\d+)-/);
        return match ? parseInt(match[1]) : 0;
    }

    /**
     * Process an event set - convert date strings to Date objects and extract years
     * @param {Object} eventSet - The event set to process
     */
    function processEventSet(eventSet) {
        eventSet.events.forEach(event => {
            // Extract numeric year (handles negative for BC)
            event.startYear = extractYear(event.start);
            event.endYear = event.end ? extractYear(event.end) : null;

            // Extract flexible placement range if provided
            event.flexStartYear = event.flexStart ? extractYear(event.flexStart) : null;
            event.flexEndYear = event.flexEnd ? extractYear(event.flexEnd) : null;

            // Extract manual display year if provided (overrides automatic placement)
            event.displayYear = event.display ? extractYear(event.display) : null;

            // Keep Date objects for compatibility (unreliable for BC but kept for legacy)
            event.startDate = new Date(event.start);
            event.endDate = event.end ? new Date(event.end) : null;

            // Use year values for timestamp calculations (works for BC)
            event.startTimestamp = event.startYear;
            event.endTimestamp = event.endYear;
        });

        // Sort events by start year
        eventSet.events.sort((a, b) => a.startYear - b.startYear);
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
