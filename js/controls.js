// Controls Module
// Handles user interface controls

const Controls = (function() {
    let eventSets = [];
    let selectedEventSets = new Set();
    let eventSetSettings = {}; // Maps event set name to { priority, color }
    let displayMode = 'bands'; // 'unified' or 'bands'

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
                priority: 5, // Default priority (1-10, lower is higher priority)
                color: set.color // Use original color
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

            // Checkbox and label container
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'event-set-checkbox';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `checkbox-${eventSet.name}`;
            checkbox.checked = selectedEventSets.has(eventSet.name);
            checkbox.dataset.eventSet = eventSet.name;

            const label = document.createElement('label');
            label.htmlFor = `checkbox-${eventSet.name}`;
            label.textContent = eventSet.name;

            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);

            // Settings container (color and priority)
            const settingsDiv = document.createElement('div');
            settingsDiv.className = 'event-set-settings';

            // Color picker
            const colorDiv = document.createElement('div');
            colorDiv.className = 'color-picker-wrapper';

            const colorLabel = document.createElement('label');
            colorLabel.textContent = 'Color:';

            const colorPicker = document.createElement('input');
            colorPicker.type = 'color';
            colorPicker.value = eventSetSettings[eventSet.name].color;
            colorPicker.dataset.eventSet = eventSet.name;
            colorPicker.className = 'color-picker';

            colorDiv.appendChild(colorLabel);
            colorDiv.appendChild(colorPicker);

            // Priority selector
            const priorityDiv = document.createElement('div');
            priorityDiv.className = 'priority-selector';

            const priorityLabel = document.createElement('label');
            priorityLabel.textContent = 'Priority:';

            const priorityInput = document.createElement('input');
            priorityInput.type = 'number';
            priorityInput.min = '1';
            priorityInput.max = '10';
            priorityInput.value = eventSetSettings[eventSet.name].priority;
            priorityInput.dataset.eventSet = eventSet.name;
            priorityInput.className = 'priority-input';

            priorityDiv.appendChild(priorityLabel);
            priorityDiv.appendChild(priorityInput);

            settingsDiv.appendChild(colorDiv);
            settingsDiv.appendChild(priorityDiv);

            itemDiv.appendChild(checkboxDiv);
            itemDiv.appendChild(settingsDiv);
            container.appendChild(itemDiv);
        });
    }

    /**
     * Attach event listeners to controls
     */
    function attachEventListeners() {
        // Event set checkboxes
        document.querySelectorAll('#event-set-selector input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', handleEventSetToggle);
        });

        // Color pickers
        document.querySelectorAll('.color-picker').forEach(picker => {
            picker.addEventListener('input', handleColorChange);
        });

        // Priority inputs
        document.querySelectorAll('.priority-input').forEach(input => {
            input.addEventListener('input', handlePriorityChange);
        });

        // Display mode toggle
        document.querySelectorAll('input[name="display-mode"]').forEach(radio => {
            radio.addEventListener('change', handleDisplayModeChange);
        });

        // Time range controls - auto-update on change
        document.getElementById('start-year').addEventListener('input', updateVisualization);
        document.getElementById('end-year').addEventListener('input', updateVisualization);

        // Dimension controls - auto-update on change
        document.getElementById('width').addEventListener('input', updateVisualization);
        document.getElementById('height').addEventListener('input', updateVisualization);

        // Update visualization button
        document.getElementById('update-viz').addEventListener('click', updateVisualization);

        // Export PDF button
        document.getElementById('export-pdf').addEventListener('click', () => {
            PDFExport.exportToPDF();
        });
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
     * Handle priority input change
     * @param {Event} e - Input event
     */
    function handlePriorityChange(e) {
        const eventSetName = e.target.dataset.eventSet;
        const priority = parseInt(e.target.value);

        if (priority >= 1 && priority <= 10) {
            eventSetSettings[eventSetName].priority = priority;

            // Auto-update visualization
            updateVisualization();
        }
    }

    /**
     * Handle display mode change
     * @param {Event} e - Change event
     */
    function handleDisplayModeChange(e) {
        displayMode = e.target.value;

        // Auto-update visualization
        updateVisualization();
    }

    /**
     * Update the visualization with current settings
     */
    function updateVisualization() {
        // Get selected event sets with their settings applied
        const selectedSets = eventSets
            .filter(set => selectedEventSets.has(set.name))
            .map(set => ({
                ...set,
                color: eventSetSettings[set.name].color,
                setBasePriority: eventSetSettings[set.name].priority
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
        const height = parseInt(document.getElementById('height').value);

        // Render visualization
        Visualization.render(selectedSets, {
            startYear,
            endYear,
            width,
            height,
            displayMode
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
