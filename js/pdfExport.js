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

            // Get SVG dimensions (in pixels)
            const width = parseFloat(svg.getAttribute('width'));
            const height = parseFloat(svg.getAttribute('height'));

            // Add left margin to PDF for band labels (matching top margin spacing)
            const pdfMarginLeft = 28;
            const pdfWidth = width + pdfMarginLeft;

            // Create jsPDF instance with dimensions in points
            // jsPDF at 96 DPI: 1 px = 72/96 = 0.75 pt
            // But svg2pdf renders SVG at 1:1 scale into the PDF coordinate space
            // So we create a PDF page in points that matches the SVG pixel dimensions
            const { jsPDF } = window.jspdf;
            const orientation = pdfWidth > height ? 'landscape' : 'portrait';
            const pdf = new jsPDF({
                unit: 'pt',
                format: [pdfWidth, height],
                orientation: orientation
            });

            // Clone the SVG to avoid modifying the original
            const svgClone = svg.cloneNode(true);

            // Convert SVG to PDF using svg2pdf
            // Offset by left margin so content doesn't touch left edge
            await pdf.svg(svgClone, {
                x: pdfMarginLeft,
                y: 0,
                width: width,
                height: height
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
