// Main Application Module
// Initializes and coordinates all modules

(async function() {
    try {
        // Show loading state
        const container = document.getElementById('svg-container');
        container.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 40px;">Loading data...</p>';

        // Load all event sets
        const eventSets = await DataLoader.loadAllEventSets();
        console.log('Loaded event sets:', eventSets);

        // Initialize controls
        Controls.init(eventSets);

        // Create initial visualization with all event sets
        Controls.updateVisualization();

        console.log('Histomap initialized successfully!');

    } catch (error) {
        console.error('Failed to initialize Histomap:', error);

        const container = document.getElementById('svg-container');
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #e74c3c;">
                <h3>Failed to load Histomap</h3>
                <p>Error: ${error.message}</p>
                <p style="color: #7f8c8d; font-size: 0.9em;">Please check the console for more details.</p>
            </div>
        `;
    }
})();
