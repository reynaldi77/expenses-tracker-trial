/**
 * SpendWise PDF Export Module
 * Uses jsPDF and jsPDF-AutoTable to generate printable corporate expense reports.
 */

window.PdfExporter = {
    exportToPdf(expenses, options = {}) {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            alert('jsPDF library is not loaded. Please check your network connection.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const currency = options.currency || '$';
        const todayStr = new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        // Compute Key Metrics
        const totalAmount = expenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        const totalReimbursed = expenses.reduce((sum, item) => {
            if (item.isReimbursed && item.reimbursementStatus === 'REIMBURSED') {
                return sum + (parseFloat(item.reimbursedAmount || item.amount) || 0);
            }
            return sum;
        }, 0);
        const totalPending = expenses.reduce((sum, item) => {
            if (item.isReimbursed && item.reimbursementStatus === 'PENDING') {
                return sum + (parseFloat(item.reimbursedAmount || item.amount) || 0);
            }
            return sum;
        }, 0);
        const netOutofPocket = totalAmount - totalReimbursed;

        // Header Background Banner
        doc.setFillColor(30, 41, 59); // Slate dark 800
        doc.rect(0, 0, 297, 32, 'F');

        // Brand Title
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text('SPENDWISE EXPENSE REPORT', 14, 18);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184); // Slate 400
        doc.text(`Generated: ${todayStr} | Total Records: ${expenses.length}`, 14, 26);

        // Header Top Right Badge
        doc.setFillColor(79, 70, 229); // Indigo
        doc.roundedRect(220, 8, 63, 16, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('STATEMENT SUMMARY', 224, 15);
        doc.setFontSize(11);
        doc.text(`${currency} ${totalAmount.toFixed(2)}`, 224, 21);

        // Summary Metric Cards Below Header
        const startY = 40;

        // Card 1: Total
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(14, startY, 62, 18, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('TOTAL EXPENSES', 18, startY + 6);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`${currency} ${totalAmount.toFixed(2)}`, 18, startY + 14);

        // Card 2: Reimbursed
        doc.setFillColor(236, 253, 245);
        doc.roundedRect(82, startY, 62, 18, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(16, 185, 129);
        doc.text('SETTLED REIMBURSEMENTS', 86, startY + 6);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${currency} ${totalReimbursed.toFixed(2)}`, 86, startY + 14);

        // Card 3: Pending
        doc.setFillColor(254, 243, 199);
        doc.roundedRect(150, startY, 62, 18, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(217, 119, 6);
        doc.text('PENDING CLAIMS', 154, startY + 6);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${currency} ${totalPending.toFixed(2)}`, 154, startY + 14);

        // Card 4: Net Out of Pocket
        doc.setFillColor(239, 246, 255);
        doc.roundedRect(218, startY, 65, 18, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(37, 99, 235);
        doc.text('NET OUT-OF-POCKET', 222, startY + 6);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${currency} ${netOutofPocket.toFixed(2)}`, 222, startY + 14);

        // AutoTable Generation
        const tableBody = expenses.map(item => {
            const dtFormatted = item.datetime ? item.datetime.replace('T', ' ') : 'N/A';
            const statusStr = item.isReimbursed 
                ? (item.reimbursementStatus === 'REIMBURSED' ? 'Reimbursed' : 'Pending Claim')
                : 'Not Reimbursed';
            
            const payerInfo = item.isReimbursed 
                ? (item.reimbursedBy ? `${item.reimbursedBy} (${currency}${item.reimbursedAmount || item.amount})` : 'Reimbursed')
                : '-';

            return [
                dtFormatted,
                item.category || 'Other',
                item.paymentType || 'Cashless',
                `${currency} ${parseFloat(item.amount || 0).toFixed(2)}`,
                item.comment || '',
                statusStr,
                payerInfo
            ];
        });

        doc.autoTable({
            startY: startY + 24,
            head: [['Date & Time', 'Category', 'Payment Type', 'Amount', 'Description / Comment', 'Reimbursement Status', 'Payer / Ref Details']],
            body: tableBody,
            theme: 'grid',
            headStyles: {
                fillColor: [30, 41, 59],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9,
                halign: 'left'
            },
            styles: {
                fontSize: 8.5,
                cellPadding: 3,
                overflow: 'linebreak'
            },
            columnStyles: {
                0: { cellWidth: 32 },
                1: { cellWidth: 30 },
                2: { cellWidth: 26 },
                3: { cellWidth: 26, fontStyle: 'bold', halign: 'right' },
                4: { cellWidth: 68 },
                5: { cellWidth: 36, halign: 'center' },
                6: { cellWidth: 50 }
            },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 5) {
                    const text = data.cell.text[0];
                    if (text === 'Reimbursed') {
                        data.cell.styles.textColor = [16, 185, 129];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (text === 'Pending Claim') {
                        data.cell.styles.textColor = [217, 119, 6];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });

        // Signature / Approval Block at Bottom
        const finalY = doc.lastAutoTable.finalY + 15;
        if (finalY < 185) {
            doc.setDrawColor(203, 213, 225);
            
            // Signature Line 1
            doc.line(14, finalY + 15, 80, finalY + 15);
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text('Claimant Signature / Date', 14, finalY + 20);

            // Signature Line 2
            doc.line(120, finalY + 15, 190, finalY + 15);
            doc.text('Manager / Finance Approval', 120, finalY + 20);
        }

        // Footer Page Number
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`Page ${i} of ${pageCount} • SpendWise Expense System`, 297 - 14, 205, { align: 'right' });
        }

        // Download File
        const dateStr = new Date().toISOString().split('T')[0];
        doc.save(`SpendWise_Expense_Report_${dateStr}.pdf`);
    }
};
