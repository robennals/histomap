import { chromium } from 'playwright';

const timelines = ['us', 'world', 'british'];

const browser = await chromium.launch({ headless: true });

for (const timeline of timelines) {
    console.log(`Capturing ${timeline} timeline...`);

    const page = await browser.newPage({
        viewport: { width: 1400, height: 900 }
    });

    await page.goto(`http://localhost:8000/app.html?timeline=${timeline}`);
    await page.waitForLoadState('networkidle');

    // Wait for SVG to render
    await page.waitForSelector('#svg-container svg', { timeout: 10000 });
    await page.waitForTimeout(1000); // Extra time for rendering

    // Screenshot just the visualization area (not toolbar/footer)
    const vizArea = await page.$('.visualization-area');
    await vizArea.screenshot({
        path: `assets/screenshots/${timeline}-timeline.png`,
        type: 'png'
    });

    console.log(`  Saved assets/screenshots/${timeline}-timeline.png`);
    await page.close();
}

await browser.close();
console.log('Done!');
