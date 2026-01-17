import { chromium } from 'playwright';
import fs from 'fs';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => {
    console.log('BROWSER:', msg.text());
});

console.log('Navigating to page...');
await page.goto('http://localhost:8773');
await page.waitForLoadState('networkidle');

// Get detailed SVG info
const info = await page.evaluate(() => {
    const svg = document.querySelector('#svg-container svg');

    // Get all band groups with their background rects
    const bandGroups = [];
    svg.querySelectorAll('.event-band').forEach((group, i) => {
        // The background rect should be the one with fill-opacity
        const rects = group.querySelectorAll('rect');
        let bgRect = null;
        rects.forEach(r => {
            if (r.getAttribute('fill-opacity')) {
                bgRect = r;
            }
        });

        bandGroups.push({
            index: i,
            totalRects: rects.length,
            bgY: bgRect ? parseFloat(bgRect.getAttribute('y')) : null,
            bgHeight: bgRect ? parseFloat(bgRect.getAttribute('height')) : null
        });
    });

    return {
        svgWidth: svg.getAttribute('width'),
        svgHeight: svg.getAttribute('height'),
        bandGroups: bandGroups
    };
});

console.log('SVG dimensions:', info.svgWidth, 'x', info.svgHeight);
console.log('\nBand background rects (with fill-opacity):');
info.bandGroups.forEach(bg => console.log(`  Band ${bg.index}: totalRects=${bg.totalRects}, bgY=${bg.bgY}, bgHeight=${bg.bgHeight}`));

// Export PDF and verify
const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
await page.click('#toggle-controls');
await page.waitForTimeout(500);
await page.click('#export-pdf');

try {
    const download = await downloadPromise;
    await download.saveAs('/tmp/test-export.pdf');

    const buffer = fs.readFileSync('/tmp/test-export.pdf');
    const content = buffer.toString('utf8');
    const mediaBoxMatch = content.match(/\/MediaBox\s*\[\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)\s*\]/);
    if (mediaBoxMatch) {
        console.log('\nPDF MediaBox:', mediaBoxMatch[1], 'x', mediaBoxMatch[2], 'points');
    }

    console.log('✓ PDF exported successfully');
} catch (e) {
    console.log('Export failed:', e.message);
}

await browser.close();
