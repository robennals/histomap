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
            // Set default heights based on band type
            let defaultMaxHeight = 80; // Default for most bands
            if (set.name === 'Fiction' || set.name === 'Events') {
                defaultMaxHeight = 60; // Media and Events bands get less height
            }

            eventSetSettings[set.name] = {
                color: set.color,
                maxHeight: set.type === 'gdp-blocs' ? undefined : defaultMaxHeight,
                height: set.type === 'gdp-blocs' ? 80 : undefined // Height for GDP blocs
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

        eventSets.forEach((eventSet, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'event-set-item';
            itemDiv.draggable = true;
            itemDiv.dataset.eventSet = eventSet.name;
            itemDiv.dataset.index = index;

            // Add drag handle
            const dragHandle = document.createElement('div');
            dragHandle.className = 'drag-handle';
            dragHandle.innerHTML = '☰';
            dragHandle.title = 'Drag to reorder';

            // Header with checkbox and expand button
            const headerDiv = document.createElement('div');
            headerDiv.className = 'event-set-header';

            headerDiv.appendChild(dragHandle);

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
                limitInput.min = '50';
                limitInput.max = '500';
                limitInput.step = '10';
                limitInput.value = eventSetSettings[eventSet.name].height || 80;
                limitInput.className = 'height-input';
            } else {
                // Max height for other bands
                limitLabel.textContent = 'Max Height (px)';
                limitInput.min = '50';
                limitInput.max = '500';
                limitInput.step = '10';
                limitInput.value = eventSetSettings[eventSet.name].maxHeight || 80;
                limitInput.className = 'max-height-input';
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

        // Max height inputs for event bands
        document.querySelectorAll('.max-height-input').forEach(input => {
            input.addEventListener('input', handleMaxHeightChange);
        });

        // Height inputs for GDP blocs
        document.querySelectorAll('.height-input').forEach(input => {
            input.addEventListener('input', handleHeightChange);
        });

        // Drag and drop for reordering
        document.querySelectorAll('.event-set-item').forEach(item => {
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragover', handleDragOver);
            item.addEventListener('drop', handleDrop);
            item.addEventListener('dragend', handleDragEnd);
        });

        // Time range controls - auto-update on change
        document.getElementById('start-year').addEventListener('input', updateVisualization);
        document.getElementById('end-year').addEventListener('input', updateVisualization);

        // Dimension controls - auto-update on change
        document.getElementById('width').addEventListener('input', updateVisualization);

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
     * Handle max height change for event bands
     * @param {Event} e - Input event
     */
    function handleMaxHeightChange(e) {
        const eventSetName = e.target.dataset.eventSet;
        const maxHeight = parseInt(e.target.value);

        if (maxHeight >= 50 && maxHeight <= 500) {
            eventSetSettings[eventSetName].maxHeight = maxHeight;

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

        if (height >= 50 && height <= 500) {
            eventSetSettings[eventSetName].height = height;

            // Auto-update visualization
            updateVisualization();
        }
    }

    let draggedItem = null;

    /**
     * Handle drag start
     * @param {Event} e - Drag event
     */
    function handleDragStart(e) {
        draggedItem = e.currentTarget;
        e.currentTarget.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
    }

    /**
     * Handle drag over
     * @param {Event} e - Drag event
     */
    function handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';

        const targetItem = e.currentTarget;
        if (draggedItem !== targetItem) {
            const container = targetItem.parentNode;
            const allItems = [...container.querySelectorAll('.event-set-item')];
            const draggedIndex = allItems.indexOf(draggedItem);
            const targetIndex = allItems.indexOf(targetItem);

            if (draggedIndex < targetIndex) {
                targetItem.parentNode.insertBefore(draggedItem, targetItem.nextSibling);
            } else {
                targetItem.parentNode.insertBefore(draggedItem, targetItem);
            }
        }

        return false;
    }

    /**
     * Handle drop
     * @param {Event} e - Drag event
     */
    function handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }

        // Update the eventSets array order based on DOM order
        const container = document.getElementById('event-set-selector');
        const items = [...container.querySelectorAll('.event-set-item')];
        const newOrder = items.map(item => item.dataset.eventSet);

        // Reorder eventSets array
        eventSets = newOrder.map(name => eventSets.find(set => set.name === name));

        // Update visualization with new order
        updateVisualization();

        return false;
    }

    /**
     * Handle drag end
     * @param {Event} e - Drag event
     */
    function handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        draggedItem = null;
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
                maxHeight: eventSetSettings[set.name].maxHeight,
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

        // Render visualization with TimeScale (height will be auto-calculated)
        Visualization.render(selectedSets, AppState.timeScale, {
            startYear,
            endYear,
            width,
            title: AppState.timelineConfig.title
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
