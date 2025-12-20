// PDF Export Module
// Handles exporting the visualization as a PDF

const PDFExport = (function() {
    /**
     * Export the current visualization to PDF
     */
    async function exportToPDF() {
        try {
            const svg = Visualization.getSVG();

            if (!svg) {
                alert('No visualization to export. Please create a visualization first.');
                return;
            }

            // Show loading indicator
            const exportButton = document.getElementById('export-pdf');
            const originalText = exportButton.textContent;
            exportButton.textContent = 'Generating PDF...';
            exportButton.disabled = true;

            // Get SVG dimensions
            const width = parseFloat(svg.getAttribute('width'));
            const height = parseFloat(svg.getAttribute('height'));

            // Convert pixels to points (1 px = 0.75 pt)
            const widthPt = width * 0.75;
            const heightPt = height * 0.75;

            // Create jsPDF instance with custom dimensions
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: width > height ? 'landscape' : 'portrait',
                unit: 'pt',
                format: [widthPt, heightPt]
            });

            // Clone the SVG to avoid modifying the original
            const svgClone = svg.cloneNode(true);

            // Convert SVG to PDF using svg2pdf
            await pdf.svg(svgClone, {
                x: 0,
                y: 0,
                width: widthPt,
                height: heightPt
            });

            // Generate filename with current date
            const date = new Date().toISOString().split('T')[0];
            const filename = `histomap-${date}.pdf`;

            // Save the PDF
            pdf.save(filename);

            // Reset button
            exportButton.textContent = originalText;
            exportButton.disabled = false;

        } catch (error) {
            console.error('Error exporting PDF:', error);
            alert('Failed to export PDF. Please try again.');

            // Reset button
            const exportButton = document.getElementById('export-pdf');
            exportButton.textContent = 'Export as PDF';
            exportButton.disabled = false;
        }
    }

    // Public API
    return {
        exportToPDF
    };
})();
