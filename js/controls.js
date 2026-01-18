// Controls Module
// Handles user interface controls

const Controls = (function() {
    let eventSets = [];
    let selectedEventSets = new Set();
    let eventSetSettings = {}; // Maps event set name to { color, maxRows }

    /**
     * Initialize controls with event sets
     * @param {Array} sets - Array of event sets
     */
    function init(sets) {
        eventSets = sets;

        // Initialize all event sets as selected by default with their original settings
        eventSets.forEach(set => {
            selectedEventSets.add(set.name);
            eventSetSettings[set.name] = {
                color: set.color,
                maxRows: 3, // Default to 3 rows for non-people bands
                height: set.type === 'gdp-blocs' ? 100 : undefined // Default height for GDP blocs
            };
        });

        renderEventSetSelector();
        attachEventListeners();
    }

    /**
     * Render event set selector checkboxes
     */
    function renderEventSetSelector() {
        const container = document.getElementById('event-set-selector');
        container.innerHTML = '';

        eventSets.forEach(eventSet => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'event-set-item';

            // Header with checkbox and expand button
            const headerDiv = document.createElement('div');
            headerDiv.className = 'event-set-header';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `checkbox-${eventSet.name}`;
            checkbox.checked = selectedEventSets.has(eventSet.name);
            checkbox.dataset.eventSet = eventSet.name;
            checkbox.className = 'event-set-checkbox';

            const label = document.createElement('label');
            label.htmlFor = `checkbox-${eventSet.name}`;
            label.textContent = eventSet.name;
            label.className = 'event-set-label';

            const expandBtn = document.createElement('button');
            expandBtn.className = 'expand-btn';
            expandBtn.innerHTML = '▼';
            expandBtn.dataset.eventSet = eventSet.name;

            headerDiv.appendChild(checkbox);
            headerDiv.appendChild(label);
            headerDiv.appendChild(expandBtn);

            // Settings container (collapsed by default)
            const settingsDiv = document.createElement('div');
            settingsDiv.className = 'event-set-settings collapsed';
            settingsDiv.dataset.eventSet = eventSet.name;

            // Color picker row
            const colorRow = document.createElement('div');
            colorRow.className = 'setting-row';

            const colorLabel = document.createElement('label');
            colorLabel.textContent = 'Color';
            colorLabel.className = 'setting-label';

            const colorPicker = document.createElement('input');
            colorPicker.type = 'color';
            colorPicker.value = eventSetSettings[eventSet.name].color;
            colorPicker.dataset.eventSet = eventSet.name;
            colorPicker.className = 'color-picker';

            colorRow.appendChild(colorLabel);
            colorRow.appendChild(colorPicker);

            settingsDiv.appendChild(colorRow);

            // Row/Height limit row
            const limitRow = document.createElement('div');
            limitRow.className = 'setting-row';

            const limitLabel = document.createElement('label');
            const limitInput = document.createElement('input');
            limitInput.type = 'number';
            limitInput.dataset.eventSet = eventSet.name;

            if (eventSet.type === 'gdp-blocs') {
                // Height control for GDP blocs
                limitLabel.textContent = 'Height (px)';
                limitInput.min = '100';
                limitInput.max = '500';
                limitInput.value = eventSetSettings[eventSet.name].height || 100;
                limitInput.className = 'height-input';
            } else {
                // Row limit for other bands
                limitLabel.textContent = eventSet.name === 'People' ? 'Height (rows)' : 'Max rows';
                limitInput.min = '1';
                limitInput.max = '20';
                limitInput.value = eventSetSettings[eventSet.name].maxRows;
                limitInput.className = 'row-limit-input';
            }

            limitLabel.className = 'setting-label';

            limitRow.appendChild(limitLabel);
            limitRow.appendChild(limitInput);

            settingsDiv.appendChild(limitRow);

            itemDiv.appendChild(headerDiv);
            itemDiv.appendChild(settingsDiv);
            container.appendChild(itemDiv);
        });
    }

    /**
     * Attach event listeners to controls
     */
    function attachEventListeners() {
        // Panel toggle buttons
        document.getElementById('toggle-controls').addEventListener('click', () => {
            document.getElementById('controls-panel').classList.add('open');
        });

        document.getElementById('close-controls').addEventListener('click', () => {
            document.getElementById('controls-panel').classList.remove('open');
        });

        // Expand buttons for event sets
        document.querySelectorAll('.expand-btn').forEach(btn => {
            btn.addEventListener('click', handleExpandToggle);
        });

        // Event set checkboxes
        document.querySelectorAll('.event-set-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', handleEventSetToggle);
        });

        // Color pickers
        document.querySelectorAll('.color-picker').forEach(picker => {
            picker.addEventListener('input', handleColorChange);
        });

        // Row limit inputs
        document.querySelectorAll('.row-limit-input').forEach(input => {
            input.addEventListener('input', handleRowLimitChange);
        });

        // Height inputs for GDP blocs
        document.querySelectorAll('.height-input').forEach(input => {
            input.addEventListener('input', handleHeightChange);
        });

        // Time range controls - auto-update on change
        document.getElementById('start-year').addEventListener('input', updateVisualization);
        document.getElementById('end-year').addEventListener('input', updateVisualization);

        // Dimension controls - auto-update on change
        document.getElementById('width').addEventListener('input', updateVisualization);

        // Update visualization button
        document.getElementById('update-viz').addEventListener('click', updateVisualization);

        // Export PDF button
        document.getElementById('export-pdf').addEventListener('click', () => {
            PDFExport.exportToPDF();
        });
    }

    /**
     * Handle expand/collapse toggle for event set settings
     * @param {Event} e - Click event
     */
    function handleExpandToggle(e) {
        const eventSetName = e.target.dataset.eventSet;
        const settingsDiv = document.querySelector(`.event-set-settings[data-event-set="${eventSetName}"]`);
        const expandBtn = e.target;

        if (settingsDiv.classList.contains('collapsed')) {
            settingsDiv.classList.remove('collapsed');
            expandBtn.innerHTML = '▲';
        } else {
            settingsDiv.classList.add('collapsed');
            expandBtn.innerHTML = '▼';
        }
    }

    /**
     * Handle event set checkbox toggle
     * @param {Event} e - Change event
     */
    function handleEventSetToggle(e) {
        const eventSetName = e.target.dataset.eventSet;

        if (e.target.checked) {
            selectedEventSets.add(eventSetName);
        } else {
            selectedEventSets.delete(eventSetName);
        }

        // Auto-update visualization
        updateVisualization();
    }

    /**
     * Handle color picker change
     * @param {Event} e - Input event
     */
    function handleColorChange(e) {
        const eventSetName = e.target.dataset.eventSet;
        const color = e.target.value;

        eventSetSettings[eventSetName].color = color;

        // Auto-update visualization
        updateVisualization();
    }

    /**
     * Handle row limit change
     * @param {Event} e - Input event
     */
    function handleRowLimitChange(e) {
        const eventSetName = e.target.dataset.eventSet;
        const maxRows = parseInt(e.target.value);

        if (maxRows >= 1 && maxRows <= 20) {
            eventSetSettings[eventSetName].maxRows = maxRows;

            // Auto-update visualization
            updateVisualization();
        }
    }

    /**
     * Handle height change for GDP blocs
     * @param {Event} e - Input event
     */
    function handleHeightChange(e) {
        const eventSetName = e.target.dataset.eventSet;
        const height = parseInt(e.target.value);

        if (height >= 100 && height <= 500) {
            eventSetSettings[eventSetName].height = height;

            // Auto-update visualization
            updateVisualization();
        }
    }

    /**
     * Update the visualization with current settings
     */
    function updateVisualization() {
        // Get selected event sets
        const selectedSets = eventSets
            .filter(set => selectedEventSets.has(set.name))
            .map(set => ({
                ...set,
                color: eventSetSettings[set.name].color,
                maxRows: eventSetSettings[set.name].maxRows,
                height: eventSetSettings[set.name].height
            }));

        if (selectedSets.length === 0) {
            alert('Please select at least one event set to visualize.');
            return;
        }

        // Get time range
        const startYear = parseInt(document.getElementById('start-year').value);
        const endYear = parseInt(document.getElementById('end-year').value);

        if (startYear >= endYear) {
            alert('Start year must be before end year.');
            return;
        }

        // Get dimensions
        const width = parseInt(document.getElementById('width').value);

        // Render visualization (height will be auto-calculated)
        Visualization.render(selectedSets, {
            startYear,
            endYear,
            width
        });
    }

    /**
     * Get current settings
     * @returns {Object} Current control settings
     */
    function getSettings() {
        return {
            selectedEventSets: Array.from(selectedEventSets),
            eventSetSettings,
            startYear: parseInt(document.getElementById('start-year').value),
            endYear: parseInt(document.getElementById('end-year').value),
            width: parseInt(document.getElementById('width').value),
            height: parseInt(document.getElementById('height').value)
        };
    }

    // Public API
    return {
        init,
        updateVisualization,
        getSettings
    };
})();
