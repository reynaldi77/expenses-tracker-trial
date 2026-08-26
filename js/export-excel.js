/**
 * SpendWise Excel Export Module
 * Uses SheetJS (XLSX) to convert expense records into structured Excel spreadsheets.
 */

window.ExcelExporter = {
    exportToXlsx(expenses, options = {}) {
        if (!window.XLSX) {
            alert('SheetJS (XLSX) library not loaded. Please check your internet connection.');
            return;
        }

        const currency = options.currency || '$';
        const exportDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });

        // Compute summary totals
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

        // Build Excel Data Grid
        const excelRows = [
            ["SPENDWISE EXPENSE REPORT & REIMBURSEMENT LOG"],
            [`Generated On: ${exportDate}`, `Currency: ${currency}`],
            [],
            // Summary KPI Table
            ["SUMMARY METRICS"],
            ["Total Expenses", "Total Reimbursed", "Pending Claims", "Net Out-of-Pocket"],
            [
                `${currency} ${totalAmount.toFixed(2)}`,
                `${currency} ${totalReimbursed.toFixed(2)}`,
                `${currency} ${totalPending.toFixed(2)}`,
                `${currency} ${netOutofPocket.toFixed(2)}`
            ],
            [],
            // Data Header Row
            [
                "Date & Time",
                "Category",
                "Payment Type",
                `Expenses (${currency})`,
                "Comment / Description",
                "Reimbursed?",
                "Claim Status",
                "Reimbursed By",
                `Reimbursed Amount (${currency})`,
                "Reimbursement Notes"
            ]
        ];

        // Format expense items
        expenses.forEach(item => {
            const dtFormatted = item.datetime ? item.datetime.replace('T', ' ') : 'N/A';
            const reimbursedFlag = item.isReimbursed ? 'YES' : 'NO';
            const statusLabel = item.isReimbursed 
                ? (item.reimbursementStatus === 'REIMBURSED' ? 'Reimbursed' : 'Pending Claim')
                : 'Not Reimbursed';

            excelRows.push([
                dtFormatted,
                item.category || 'Other',
                item.paymentType || 'Cashless',
                parseFloat(item.amount || 0),
                item.comment || '',
                reimbursedFlag,
                statusLabel,
                item.reimbursedBy || '',
                item.isReimbursed ? parseFloat(item.reimbursedAmount || item.amount || 0) : 0,
                item.reimbursementNotes || ''
            ]);
        });

        // Add Total Summary Footer Row
        excelRows.push([]);
        excelRows.push([
            "TOTAL FILTERED",
            "",
            totalAmount,
            `${expenses.length} transaction(s)`,
            "",
            "",
            "",
            totalReimbursed,
            ""
        ]);

        // Create Worksheet
        const ws = XLSX.utils.aoa_to_sheet(excelRows);

        // Column Widths Styling
        ws['!cols'] = [
            { wch: 18 }, // Date Time
            { wch: 18 }, // Category
            { wch: 16 }, // Expense Amount
            { wch: 36 }, // Comment/Description
            { wch: 13 }, // Reimbursed?
            { wch: 16 }, // Claim Status
            { wch: 22 }, // Reimbursed By
            { wch: 20 }, // Reimbursed Amount
            { wch: 26 }  // Reimbursement Notes
        ];

        // Create Workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Expenses & Claims");

        // Save File
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `SpendWise_Expense_Report_${dateStr}.xlsx`;
        XLSX.writeFile(wb, filename);
    }
};
