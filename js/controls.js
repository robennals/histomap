// Controls Module
// Handles user interface controls

const Controls = (function() {
    let eventSets = [];
    let selectedEventSets = new Set();
    let eventSetHeights = {}; // Maps event set name to height setting

    /**
     * Initialize controls with event sets
     * @param {Array} sets - Array of event sets
     */
    function init(sets) {
        eventSets = sets;

        // Initialize all event sets as selected by default
        eventSets.forEach(set => {
            selectedEventSets.add(set.name);
            eventSetHeights[set.name] = 'normal';
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

            const colorIndicator = document.createElement('div');
            colorIndicator.className = 'color-indicator';
            colorIndicator.style.backgroundColor = eventSet.color;

            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            checkboxDiv.appendChild(colorIndicator);

            // Height selector
            const heightDiv = document.createElement('div');
            heightDiv.className = 'height-selector';

            const heightLabel = document.createElement('label');
            heightLabel.textContent = 'Height:';

            const heightSelect = document.createElement('select');
            heightSelect.dataset.eventSet = eventSet.name;

            ['half', 'normal', 'double'].forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option;
                optionElement.textContent = option.charAt(0).toUpperCase() + option.slice(1);
                if (option === 'normal') {
                    optionElement.selected = true;
                }
                heightSelect.appendChild(optionElement);
            });

            heightDiv.appendChild(heightLabel);
            heightDiv.appendChild(heightSelect);

            itemDiv.appendChild(checkboxDiv);
            itemDiv.appendChild(heightDiv);
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

        // Height selectors
        document.querySelectorAll('.height-selector select').forEach(select => {
            select.addEventListener('change', handleHeightChange);
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
     * Handle height selector change
     * @param {Event} e - Change event
     */
    function handleHeightChange(e) {
        const eventSetName = e.target.dataset.eventSet;
        const height = e.target.value;

        eventSetHeights[eventSetName] = height;
        Visualization.setEventSetHeight(eventSetName, height);

        // Auto-update visualization
        updateVisualization();
    }

    /**
     * Update the visualization with current settings
     */
    function updateVisualization() {
        // Get selected event sets
        const selectedSets = eventSets.filter(set =>
            selectedEventSets.has(set.name)
        );

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

        // Update visualization height settings
        Object.entries(eventSetHeights).forEach(([name, height]) => {
            Visualization.setEventSetHeight(name, height);
        });

        // Render visualization
        Visualization.render(selectedSets, {
            startYear,
            endYear,
            width,
            height
        });
    }

    /**
     * Get current settings
     * @returns {Object} Current control settings
     */
    function getSettings() {
        return {
            selectedEventSets: Array.from(selectedEventSets),
            eventSetHeights,
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
