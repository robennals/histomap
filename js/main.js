// Main Application Module
// Initializes and coordinates all modules

// Application state
const AppState = {
    currentTimelineId: 'us',
    timelineConfig: null,
    eventSets: [],
    timeScale: null
};

/**
 * Initialize a specific timeline
 * @param {string} timelineId - ID of timeline to initialize ('us' or 'world')
 */
async function initializeTimeline(timelineId) {
    try {
        // Show loading state
        const container = document.getElementById('svg-container');
        container.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 40px;">Loading timeline...</p>';

        // Get timeline configuration
        const config = TimelineConfig.getConfig(timelineId);
        AppState.currentTimelineId = timelineId;
        AppState.timelineConfig = config;

        console.log(`Initializing ${config.name}...`);

        // Load event sets for this timeline
        AppState.eventSets = await DataLoader.loadAllEventSets(config.dataPath);
        console.log('Loaded event sets:', AppState.eventSets);

        // Create TimeScale instance with initial dimensions
        // Dimensions will be updated after padding calculation in visualization
        const initialPadding = { top: 100, right: 40, bottom: 60, left: 140 };
        const initialChartWidth = config.defaultWidth - initialPadding.left - initialPadding.right;
        AppState.timeScale = new TimeScale(config, initialPadding, initialChartWidth);

        // Initialize controls
        Controls.init(AppState.eventSets);

        // Create initial visualization
        Controls.updateVisualization();

        console.log(`${config.name} initialized successfully!`);

    } catch (error) {
        console.error('Failed to initialize timeline:', error);

        const container = document.getElementById('svg-container');
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #e74c3c;">
                <h3>Failed to load timeline</h3>
                <p>Error: ${error.message}</p>
                <p style="color: #7f8c8d; font-size: 0.9em;">Please check the console for more details.</p>
            </div>
        `;
    }
}

// Initialize app when DOM is ready
(async function() {
    // Start with US timeline
    await initializeTimeline('us');
})();
