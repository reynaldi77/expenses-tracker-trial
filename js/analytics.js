/**
 * SpendWise Analytics Module
 * Manages Chart.js interactive visualizations for Category Breakdown & Monthly Spending Trends.
 */

window.AnalyticsEngine = {
    categoryChart: null,
    trendChart: null,

    // Initialize or update charts with expenses data & selected currency symbol
    updateCharts(expenses, currency = 'Rp') {
        if (!window.Chart) {
            console.warn('Chart.js library not loaded');
            return;
        }

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#9ca3af' : '#475569';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

        this.renderCategoryChart(expenses, textColor, currency);
        this.renderTrendChart(expenses, textColor, gridColor, currency);
    },

    // 1. Donut Chart: Expenses by Category
    renderCategoryChart(expenses, textColor, currency = 'Rp') {
        const categoryTotals = {};

        expenses.forEach(item => {
            const cat = item.category || 'Other';
            const amt = parseFloat(item.amount) || 0;
            categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
        });

        const labels = Object.keys(categoryTotals);
        const data = Object.values(categoryTotals);

        const palette = [
            '#6366f1', '#10b981', '#f59e0b', '#ef4444',
            '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6'
        ];

        const ctx = document.getElementById('categoryChart')?.getContext('2d');
        if (!ctx) return;

        if (this.categoryChart) {
            this.categoryChart.destroy();
        }

        if (labels.length === 0) {
            return;
        }

        this.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: palette.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: 'transparent',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: textColor,
                            font: { family: 'Plus Jakarta Sans', size: 11 },
                            padding: 14,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const val = context.raw || 0;
                                return ` ${context.label}: ${currency} ${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
                            }
                        }
                    }
                },
                cutout: '70%'
            }
        });
    },

    // 2. Bar Chart: Monthly Spending & Reimbursement Trend
    renderTrendChart(expenses, textColor, gridColor, currency = 'Rp') {
        const monthlySpent = {};
        const monthlyReimbursed = {};

        // Sort expenses by date
        const sorted = [...expenses].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

        sorted.forEach(item => {
            if (!item.datetime) return;
            const dateObj = new Date(item.datetime);
            const monthKey = dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
            
            const amt = parseFloat(item.amount) || 0;
            monthlySpent[monthKey] = (monthlySpent[monthKey] || 0) + amt;

            if (item.isReimbursed && item.reimbursementStatus === 'REIMBURSED') {
                const rAmt = parseFloat(item.reimbursedAmount || item.amount) || 0;
                monthlyReimbursed[monthKey] = (monthlyReimbursed[monthKey] || 0) + rAmt;
            }
        });

        const labels = Object.keys(monthlySpent);
        const spentData = labels.map(k => monthlySpent[k] || 0);
        const reimbursedData = labels.map(k => monthlyReimbursed[k] || 0);

        const ctx = document.getElementById('trendChart')?.getContext('2d');
        if (!ctx) return;

        if (this.trendChart) {
            this.trendChart.destroy();
        }

        if (labels.length === 0) {
            return;
        }

        this.trendChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total Spent',
                        data: spentData,
                        backgroundColor: 'rgba(99, 102, 241, 0.8)',
                        borderRadius: 6
                    },
                    {
                        label: 'Reimbursed',
                        data: reimbursedData,
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: textColor, font: { size: 10 } }
                    },
                    y: {
                        grid: { color: gridColor },
                        ticks: {
                            color: textColor,
                            font: { size: 10 },
                            callback: value => `${currency} ${value.toLocaleString()}`
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: textColor,
                            font: { family: 'Plus Jakarta Sans', size: 11 },
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const val = context.raw || 0;
                                return ` ${context.dataset.label}: ${currency} ${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
                            }
                        }
                    }
                }
            }
        });
    }
};
