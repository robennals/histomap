// Main Application Module
// Initializes and coordinates all modules

// SEO metadata for each timeline
const SEO_METADATA = {
    us: {
        title: 'US History Timeline (1770-2025) - Histomap',
        description: 'Interactive visualization of US history from the American Revolution to today. Explore presidents, wars, cultural movements, and the rise of American power.'
    },
    world: {
        title: 'World History Timeline (4000 BC - Today) - Histomap',
        description: 'Six millennia of human civilization in one interactive timeline. Explore the rise and fall of empires, major religions, scientific revolutions, and global conflicts.'
    },
    british: {
        title: 'British History Timeline (100 BC - Today) - Histomap',
        description: 'Interactive visualization of British history from Roman times to modern day. Explore monarchs, wars, the Industrial Revolution, and cultural transformation.'
    }
};

/**
 * Update page SEO metadata for the current timeline
 * @param {string} timelineId - Timeline ID
 */
function updateSEOMetadata(timelineId) {
    const metadata = SEO_METADATA[timelineId] || SEO_METADATA.us;

    // Update page title
    document.title = metadata.title;

    // Update meta description
    let descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
        descMeta.setAttribute('content', metadata.description);
    }

    // Update Open Graph tags
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
        ogTitle.setAttribute('content', metadata.title);
    }

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
        ogDesc.setAttribute('content', metadata.description);
    }

    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
        canonical.setAttribute('href', `https://histomap.robennals.org/${timelineId}`);
    }

    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
        ogUrl.setAttribute('href', `https://histomap.robennals.org/${timelineId}`);
    }
}

// Application state
const AppState = {
    currentTimelineId: 'us',
    timelineConfig: null,
    eventSets: [],
    timeScale: null
};

/**
 * Get timeline ID from URL query parameter
 * @returns {string} Timeline ID ('us' or 'world')
 */
function getTimelineFromURL() {
    const params = new URLSearchParams(window.location.search);
    const timeline = params.get('timeline');
    return TimelineConfig.isValidTimelineId(timeline) ? timeline : 'us';
}

/**
 * Update URL with current timeline
 * @param {string} timelineId - Timeline ID to set in URL
 */
function updateURL(timelineId) {
    const url = new URL(window.location);
    url.searchParams.set('timeline', timelineId);
    window.history.pushState({}, '', url);
}

/**
 * Initialize a specific timeline
 * @param {string} timelineId - ID of timeline to initialize ('us' or 'world')
 * @param {boolean} updateUrl - Whether to update the URL (default: true)
 */
async function initializeTimeline(timelineId, updateUrl = true) {
    try {
        // Show loading state
        const container = document.getElementById('svg-container');
        container.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 40px;">Loading timeline...</p>';

        // Get timeline configuration
        const config = TimelineConfig.getConfig(timelineId);
        AppState.currentTimelineId = timelineId;
        AppState.timelineConfig = config;

        console.log(`Initializing ${config.name}...`);

        // Update URL if requested
        if (updateUrl) {
            updateURL(timelineId);
        }

        // Update SEO metadata for the timeline
        updateSEOMetadata(timelineId);

        // Update dropdown to match
        const timelineSelect = document.getElementById('timeline-select');
        if (timelineSelect && timelineSelect.value !== timelineId) {
            timelineSelect.value = timelineId;
        }

        // Sync controls to the selected timeline defaults
        const startInput = document.getElementById('start-year');
        const endInput = document.getElementById('end-year');
        const widthInput = document.getElementById('width');

        if (startInput && endInput) {
            startInput.value = config.startYear;
            endInput.value = config.endYear;
            startInput.min = config.startYear;
            startInput.max = config.endYear;
            endInput.min = config.startYear;
            endInput.max = config.endYear;
        }

        if (widthInput) {
            widthInput.value = config.defaultWidth;
        }

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

/**
 * Open Wikipedia modal for an event
 * @param {string} eventName - Name of the event
 * @param {string} wikiSlug - Wikipedia page slug
 */
window.openWikiModal = function(eventName, wikiSlug) {
    const modal = document.getElementById('wiki-modal');
    const iframe = document.getElementById('wiki-iframe');
    const title = document.getElementById('wiki-modal-title');

    // Construct Wikipedia URL
    const wikiUrl = `https://en.wikipedia.org/wiki/${wikiSlug}`;

    // Update modal content
    title.textContent = eventName;
    iframe.src = wikiUrl;

    // Show modal
    modal.classList.add('show');
};

/**
 * Close Wikipedia modal
 */
function closeWikiModal() {
    const modal = document.getElementById('wiki-modal');
    const iframe = document.getElementById('wiki-iframe');

    // Hide modal
    modal.classList.remove('show');

    // Clear iframe to stop loading
    iframe.src = '';
}

// Initialize app when DOM is ready
(async function() {
    // Set up timeline selector event listener
    const timelineSelect = document.getElementById('timeline-select');
    if (timelineSelect) {
        timelineSelect.addEventListener('change', async (event) => {
            const selectedTimeline = event.target.value;
            console.log(`Switching to ${selectedTimeline} timeline...`);
            await initializeTimeline(selectedTimeline);
        });
    }

    // Set up Wikipedia modal event listeners
    const wikiModal = document.getElementById('wiki-modal');
    const wikiModalClose = document.getElementById('wiki-modal-close');

    if (wikiModalClose) {
        wikiModalClose.addEventListener('click', closeWikiModal);
    }

    if (wikiModal) {
        // Close modal when clicking outside the content
        wikiModal.addEventListener('click', (event) => {
            if (event.target === wikiModal) {
                closeWikiModal();
            }
        });

        // Close modal on Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && wikiModal.classList.contains('show')) {
                closeWikiModal();
            }
        });
    }

    // Handle browser back/forward buttons
    window.addEventListener('popstate', async () => {
        const timelineId = getTimelineFromURL();
        await initializeTimeline(timelineId, false); // Don't update URL again
    });

    // Start with timeline from URL (or default to US)
    const initialTimeline = getTimelineFromURL();
    await initializeTimeline(initialTimeline, false); // Don't update URL on initial load
})();
