/**
 * SpendWise Main Application Controller
 * Handles UI interactions, authentication, role-based controls, admin panel, table rendering, filters, and exports.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Application State
    let expenses = [];
    let filteredExpenses = [];
    let sortField = 'datetime';
    let sortDirection = 'desc';
    let activeReceiptBase64 = null;

    const storage = window.storageManager;
    let settings = storage.settings;
    let currentUser = storage.currentUser;

    // Initialize UI Elements
    const elements = {
        // Main Sections & Dashboard
        dashboardMain: document.getElementById('dashboardMain'),
        
        // Header Profile & Auth
        userProfileBadge: document.getElementById('userProfileBadge'),
        userAvatar: document.getElementById('userAvatar'),
        userNameText: document.getElementById('userNameText'),
        userRoleTag: document.getElementById('userRoleTag'),
        headerCurrencyBtn: document.getElementById('headerCurrencyBtn'),
        headerCurrencyText: document.getElementById('headerCurrencyText'),
        adminPanelBtn: document.getElementById('adminPanelBtn'),
        logoutBtn: document.getElementById('logoutBtn'),

        // Main Summary & Widgets
        statTotalAmount: document.getElementById('statTotalAmount'),
        statTotalCount: document.getElementById('statTotalCount'),
        statReimbursedAmount: document.getElementById('statReimbursedAmount'),
        statReimbursedCount: document.getElementById('statReimbursedCount'),
        statPendingAmount: document.getElementById('statPendingAmount'),
        statPendingCount: document.getElementById('statPendingCount'),
        statNetOutofPocket: document.getElementById('statNetOutofPocket'),
        
        budgetText: document.getElementById('budgetText'),
        budgetProgressBar: document.getElementById('budgetProgressBar'),
        editBudgetBtn: document.getElementById('editBudgetBtn'),

        // Badges & Header Controls
        storageStatusBadge: document.getElementById('storageStatusBadge'),
        storageStatusText: document.getElementById('storageStatusText'),
        statusDot: document.getElementById('statusDot'),
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        themeIcon: document.getElementById('themeIcon'),
        openAddModalBtn: document.getElementById('openAddModalBtn'),
        emptyAddBtn: document.getElementById('emptyAddBtn'),

        // Filters & Toolbar
        searchInput: document.getElementById('searchInput'),
        filterCategory: document.getElementById('filterCategory'),
        filterPaymentType: document.getElementById('filterPaymentType'),
        filterReimbursed: document.getElementById('filterReimbursed'),
        filterDateRange: document.getElementById('filterDateRange'),
        filterUserGroup: document.getElementById('filterUserGroup'),
        filterUser: document.getElementById('filterUser'),
        exportXlsxBtn: document.getElementById('exportXlsxBtn'),
        exportPdfBtn: document.getElementById('exportPdfBtn'),
        dataBackupBtn: document.getElementById('dataBackupBtn'),
        backupDropdown: document.getElementById('backupDropdown'),
        exportJsonBtn: document.getElementById('exportJsonBtn'),
        importJsonBtn: document.getElementById('importJsonBtn'),
        jsonFileInput: document.getElementById('jsonFileInput'),
        toggleChartsBtn: document.getElementById('toggleChartsBtn'),
        chartsGrid: document.getElementById('chartsGrid'),
        chartsToggleIcon: document.getElementById('chartsToggleIcon'),
        chartsToggleText: document.getElementById('chartsToggleText'),

        // Table
        expenseTableBody: document.getElementById('expenseTableBody'),
        emptyState: document.getElementById('emptyState'),
        showingRecordsText: document.getElementById('showingRecordsText'),
        tableFilteredTotal: document.getElementById('tableFilteredTotal'),

        // Auth / Login Modal Overlay
        loginModal: document.getElementById('loginModal'),
        loginForm: document.getElementById('loginForm'),
        loginUsername: document.getElementById('loginUsername'),
        loginPassword: document.getElementById('loginPassword'),
        loginErrorMsg: document.getElementById('loginErrorMsg'),

        // Admin Management Modal
        adminModal: document.getElementById('adminModal'),
        closeAdminModalBtn: document.getElementById('closeAdminModalBtn'),
        closeAdminPanelBtn: document.getElementById('closeAdminPanelBtn'),
        addUserForm: document.getElementById('addUserForm'),
        newUsername: document.getElementById('newUsername'),
        newPassword: document.getElementById('newPassword'),
        newRole: document.getElementById('newRole'),
        adminUserTableBody: document.getElementById('adminUserTableBody'),

        // Change Password Modal
        changePasswordModal: document.getElementById('changePasswordModal'),
        closeChangePassModalBtn: document.getElementById('closeChangePassModalBtn'),
        cancelChangePassBtn: document.getElementById('cancelChangePassBtn'),
        changePasswordForm: document.getElementById('changePasswordForm'),
        targetPassUsername: document.getElementById('targetPassUsername'),
        targetUsernameDisplay: document.getElementById('targetUsernameDisplay'),
        newPassInput: document.getElementById('newPassInput'),

        // My Account Settings Modal
        userProfileBadge: document.getElementById('userProfileBadge'),
        myAccountModal: document.getElementById('myAccountModal'),
        closeMyAccountModalBtn: document.getElementById('closeMyAccountModalBtn'),
        cancelMyAccountBtn: document.getElementById('cancelMyAccountBtn'),
        myAccountForm: document.getElementById('myAccountForm'),
        myAccountUsernameInput: document.getElementById('myAccountUsernameInput'),
        myAccountPasswordInput: document.getElementById('myAccountPasswordInput'),
        myAccountCurrencyGrid: document.getElementById('myAccountCurrencyGrid'),

        // Expense Form Modal
        expenseModal: document.getElementById('expenseModal'),
        modalTitle: document.getElementById('modalTitle'),
        expenseForm: document.getElementById('expenseForm'),
        expenseId: document.getElementById('expenseId'),
        expenseDate: document.getElementById('expenseDate'),
        expenseTime: document.getElementById('expenseTime'),
        expenseAmount: document.getElementById('expenseAmount'),
        expenseCategory: document.getElementById('expenseCategory'),
        expensePaymentType: document.getElementById('expensePaymentType'),
        expenseComment: document.getElementById('expenseComment'),
        isReimbursedCheck: document.getElementById('isReimbursedCheck'),
        reimbursementFields: document.getElementById('reimbursementFields'),
        reimbursementStatus: document.getElementById('reimbursementStatus'),
        reimbursedBy: document.getElementById('reimbursedBy'),
        reimbursedAmount: document.getElementById('reimbursedAmount'),
        reimbursementNotes: document.getElementById('reimbursementNotes'),
        receiptFile: document.getElementById('receiptFile'),
        receiptPreviewThumb: document.getElementById('receiptPreviewThumb'),
        thumbImg: document.getElementById('thumbImg'),
        removeThumbBtn: document.getElementById('removeThumbBtn'),
        closeModalBtn: document.getElementById('closeModalBtn'),
        cancelModalBtn: document.getElementById('cancelModalBtn'),
        formCurrencyPrefix: document.getElementById('formCurrencyPrefix'),
        thAmountLabel: document.getElementById('thAmountLabel'),
        reimbursedAmountLabel: document.getElementById('reimbursedAmountLabel'),
        budgetLimitLabel: document.getElementById('budgetLimitLabel'),

        // Settings Modal
        settingsModal: document.getElementById('settingsModal'),
        closeSettingsModalBtn: document.getElementById('closeSettingsModalBtn'),
        saveSettingsBtn: document.getElementById('saveSettingsBtn'),
        currencySelector: document.getElementById('currencySelector'),
        serverEndpointBox: document.getElementById('serverEndpointBox'),
        serverApiUrl: document.getElementById('serverApiUrl'),
        testServerBtn: document.getElementById('testServerBtn'),
        serverConnectionResult: document.getElementById('serverConnectionResult'),

        // Budget Modal
        budgetModal: document.getElementById('budgetModal'),
        closeBudgetModalBtn: document.getElementById('closeBudgetModalBtn'),
        cancelBudgetBtn: document.getElementById('cancelBudgetBtn'),
        saveBudgetBtn: document.getElementById('saveBudgetBtn'),
        budgetLimitInput: document.getElementById('budgetLimitInput'),

        // Lightbox Modal
        lightboxModal: document.getElementById('lightboxModal'),
        closeLightboxBtn: document.getElementById('closeLightboxBtn'),
        lightboxImg: document.getElementById('lightboxImg'),
        lightboxCaption: document.getElementById('lightboxCaption'),

        // Quick Currency Modal
        quickCurrencyModal: document.getElementById('quickCurrencyModal'),
        closeQuickCurrencyModalBtn: document.getElementById('closeQuickCurrencyModalBtn'),

        // Toast Container
        toastContainer: document.getElementById('toastContainer')
    };

    // ==========================================
    // Core Application Initialization
    // ==========================================
    async function initApp() {
        // Apply Theme & Currency
        applyTheme(settings.theme || 'dark');
        updateCurrencyUI(settings.currency || 'Rp');
        updateStorageStatusUI();

        // Setup Event Listeners
        setupEventListeners();

        // Session Check
        if (!currentUser) {
            showLoginOverlay();
        } else {
            await authorizeAndStartSession();
        }
    }

    function updateUserHeaderUI(user) {
        if (!user) return;
        if (elements.userNameText) elements.userNameText.textContent = user.username;
        if (elements.userAvatar) elements.userAvatar.textContent = user.username.charAt(0).toUpperCase();
        if (elements.userRoleTag) elements.userRoleTag.textContent = user.role;
    }

    // Authenticate Session & Load Dashboard
    async function authorizeAndStartSession() {
        currentUser = storage.currentUser || storage.getCurrentUser();
        hideLoginOverlay();

        // Update User Profile Badge in Header
        updateUserHeaderUI(currentUser);

        // Role-based visibility
        const isOwnerOrAdmin = currentUser ? (currentUser.role === 'admin' || currentUser.role === 'owner') : false;
        if (elements.adminPanelBtn) elements.adminPanelBtn.style.display = isOwnerOrAdmin ? 'inline-flex' : 'none';
        if (elements.filterUserGroup) elements.filterUserGroup.style.display = isOwnerOrAdmin ? 'block' : 'none';

        // Toggle User Column Header in Table
        const userColHeaders = document.querySelectorAll('.col-user');
        userColHeaders.forEach(el => el.style.display = isOwnerOrAdmin ? 'table-cell' : 'none');

        // Populate User Filter Dropdown if Admin or Owner
        if (isOwnerOrAdmin) {
            await populateAdminUserFilter();
        }

        // Set Default Datetime Input
        setDefaultDatetime();

        // Refresh Expense Data
        await refreshExpenseData();

        if (window.lucide) window.lucide.createIcons();
    }

    // Login Overlay Controller
    function showLoginOverlay() {
        if (elements.loginForm) elements.loginForm.reset();
        if (elements.loginUsername) elements.loginUsername.value = '';
        if (elements.loginPassword) elements.loginPassword.value = '';
        if (elements.loginErrorMsg) elements.loginErrorMsg.textContent = '';

        elements.loginModal.classList.add('show');
        elements.dashboardMain.style.opacity = '0.3';
        elements.dashboardMain.style.pointerEvents = 'none';

        setTimeout(() => {
            if (elements.loginUsername) elements.loginUsername.focus();
        }, 100);
    }

    function hideLoginOverlay() {
        elements.loginModal.classList.remove('show');
        elements.dashboardMain.style.opacity = '1';
        elements.dashboardMain.style.pointerEvents = 'auto';
    }

    // Refresh Data from Storage Engine
    async function refreshExpenseData() {
        expenses = await storage.getExpenses();
        applyFiltersAndRender();
    }

    // Set Default Datetime Picker Value
    function setDefaultDatetime() {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const dateStr = now.toISOString().slice(0, 10);
        if (elements.expenseDate) elements.expenseDate.value = dateStr;
        if (elements.expenseTime) elements.expenseTime.value = '';
    }

    // Format Currency Helper
    function formatMoney(amount) {
        const num = parseFloat(amount) || 0;
        const symbol = settings.currency || 'Rp';
        const space = (symbol === 'Rp' || symbol === 'A$' || symbol === 'IDR') ? ' ' : '';
        return `${symbol}${space}${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }

    // Toast Notification System
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let iconName = 'info';
        if (type === 'success') iconName = 'check-circle';
        if (type === 'error') iconName = 'alert-triangle';

        toast.innerHTML = `
            <i data-lucide="${iconName}"></i>
            <span>${message}</span>
        `;

        elements.toastContainer.appendChild(toast);
        if (window.lucide) window.lucide.createIcons();

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(40px)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // Populate User Filter Dropdown for Admin
    async function populateAdminUserFilter() {
        const usersList = await storage.getUsers();
        elements.filterUser.innerHTML = '<option value="ALL">All Account Users</option>';
        usersList.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.username;
            opt.textContent = `${u.username} (${u.role})`;
            elements.filterUser.appendChild(opt);
        });
    }

    // ==========================================
    // Filter, Sort & Render Engine
    // ==========================================
    function applyFiltersAndRender() {
        const query = elements.searchInput.value.trim().toLowerCase();
        const selectedCat = elements.filterCategory.value;
        const selectedPayment = elements.filterPaymentType ? elements.filterPaymentType.value : 'ALL';
        const selectedStatus = elements.filterReimbursed.value;
        const dateRange = elements.filterDateRange.value;
        const selectedUser = elements.filterUser.value;

        const now = new Date();
        const isAdmin = currentUser && currentUser.role === 'admin';

        filteredExpenses = expenses.filter(item => {
            // Admin User Filter
            if (isAdmin && selectedUser !== 'ALL' && (item.username || 'mariahd') !== selectedUser) {
                return false;
            }

            // Keyword Search
            if (query) {
                const commentMatch = (item.comment || '').toLowerCase().includes(query);
                const categoryMatch = (item.category || '').toLowerCase().includes(query);
                const paymentMatch = (item.paymentType || '').toLowerCase().includes(query);
                const payerMatch = (item.reimbursedBy || '').toLowerCase().includes(query);
                const notesMatch = (item.reimbursementNotes || '').toLowerCase().includes(query);
                const userMatch = (item.username || '').toLowerCase().includes(query);
                if (!commentMatch && !categoryMatch && !paymentMatch && !payerMatch && !notesMatch && !userMatch) return false;
            }

            // Category Filter
            if (selectedCat !== 'ALL' && item.category !== selectedCat) {
                return false;
            }

            // Payment Type Filter
            if (selectedPayment !== 'ALL' && (item.paymentType || 'Cashless') !== selectedPayment) {
                return false;
            }

            // Reimbursement Status Filter
            if (selectedStatus === 'YES' && (!item.isReimbursed || item.reimbursementStatus !== 'REIMBURSED')) {
                return false;
            }
            if (selectedStatus === 'PENDING' && (!item.isReimbursed || item.reimbursementStatus !== 'PENDING')) {
                return false;
            }
            if (selectedStatus === 'NO' && item.isReimbursed && item.reimbursementStatus !== 'NONE') {
                return false;
            }

            // Date Range Filter
            if (dateRange !== 'ALL' && item.datetime) {
                const itemDate = new Date(item.datetime.includes('T') ? item.datetime : item.datetime.replace(' ', 'T'));
                if (dateRange === 'THIS_MONTH') {
                    if (itemDate.getMonth() !== now.getMonth() || itemDate.getFullYear() !== now.getFullYear()) return false;
                } else if (dateRange === 'LAST_MONTH') {
                    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    if (itemDate.getMonth() !== prevMonth.getMonth() || itemDate.getFullYear() !== prevMonth.getFullYear()) return false;
                } else if (dateRange === 'THIS_YEAR') {
                    if (itemDate.getFullYear() !== now.getFullYear()) return false;
                }
            }

            return true;
        });

        // Sorting Logic
        filteredExpenses.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            if (sortField === 'amount') {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            } else if (sortField === 'datetime') {
                valA = new Date(valA ? (valA.includes('T') ? valA : valA.replace(' ', 'T')) : 0).getTime();
                valB = new Date(valB ? (valB.includes('T') ? valB : valB.replace(' ', 'T')) : 0).getTime();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        renderTable();
        renderSummaryMetrics();
        renderBudgetProgress();

        // Update Charts
        if (window.AnalyticsEngine) {
            window.AnalyticsEngine.updateCharts(filteredExpenses, settings.currency || 'Rp');
        }
    }

    // Render Data Table Rows
    function renderTable() {
        elements.expenseTableBody.innerHTML = '';
        const isAdmin = currentUser && currentUser.role === 'admin';

        if (filteredExpenses.length === 0) {
            elements.emptyState.style.display = 'flex';
            elements.expenseTableBody.parentElement.style.display = 'none';
        } else {
            elements.emptyState.style.display = 'none';
            elements.expenseTableBody.parentElement.style.display = 'table';

            filteredExpenses.forEach(item => {
                const tr = document.createElement('tr');

                // Format Date & Time (Time is optional!)
                let dateDisplay = 'N/A';
                let timeDisplay = '';
                if (item.datetime) {
                    const str = String(item.datetime).trim();
                    const hasTime = str.includes('T') || (str.includes(' ') && str.length > 10);
                    const dt = new Date(str.includes('T') ? str : str.replace(' ', 'T'));
                    if (!isNaN(dt.getTime())) {
                        dateDisplay = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        if (hasTime) {
                            timeDisplay = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                        }
                    } else {
                        dateDisplay = str;
                    }
                }

                // Payment Type Pill
                const pType = item.paymentType || 'Cashless';
                const pIcon = pType === 'Cash' ? 'banknote' : 'credit-card';
                const pClass = pType === 'Cash' ? 'cash' : 'cashless';
                const paymentTypeCell = `<td><span class="payment-pill ${pClass}"><i data-lucide="${pIcon}"></i> ${escapeHtml(pType)}</span></td>`;

                // Reimbursement Badge Status
                let statusBadge = `<span class="badge-status none">Not Reimbursed</span>`;
                let reimbursedDetailsStr = '-';

                if (item.isReimbursed) {
                    if (item.reimbursementStatus === 'REIMBURSED') {
                        statusBadge = `<span class="badge-status reimbursed"><i data-lucide="check"></i> Reimbursed</span>`;
                        reimbursedDetailsStr = `
                            <div class="reimbursed-details-text">
                                <span class="reimbursed-payer">${escapeHtml(item.reimbursedBy || 'Payer')}</span>
                                <div>${formatMoney(item.reimbursedAmount || item.amount)}</div>
                            </div>
                        `;
                    } else {
                        statusBadge = `<span class="badge-status pending"><i data-lucide="clock"></i> Pending Claim</span>`;
                        reimbursedDetailsStr = `
                            <div class="reimbursed-details-text">
                                <span class="reimbursed-payer">${escapeHtml(item.reimbursedBy || 'Claim Pending')}</span>
                                ${item.reimbursementNotes ? `<div>${escapeHtml(item.reimbursementNotes)}</div>` : ''}
                            </div>
                        `;
                    }
                }

                // Receipt Icon Button
                let receiptBtn = '-';
                if (item.receipt) {
                    receiptBtn = `
                        <button class="btn-receipt-thumb" data-id="${item.id}" title="View Receipt Attachment">
                            <i data-lucide="file-image"></i>
                        </button>
                    `;
                }

                // Admin User Cell
                const userCell = isAdmin ? `<td class="col-user"><span class="user-pill"><i data-lucide="user"></i> ${escapeHtml(item.username || 'mariahd')}</span></td>` : '';

                tr.innerHTML = `
                    <td>
                        <span class="cell-date">${dateDisplay}</span>
                        ${timeDisplay ? `<span class="cell-time" style="display:block; font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${timeDisplay}</span>` : ''}
                    </td>
                    <td class="text-right cell-amount">${formatMoney(item.amount)}</td>
                    ${userCell}
                    <td><span class="category-pill">${escapeHtml(item.category)}</span></td>
                    ${paymentTypeCell}
                    <td>${escapeHtml(item.comment)}</td>
                    <td>${statusBadge}</td>
                    <td>${reimbursedDetailsStr}</td>
                    <td class="text-center">${receiptBtn}</td>
                    <td class="text-center">
                        <div class="action-btns">
                            <button class="btn-table-action edit" data-id="${item.id}" title="Edit Expense">
                                <i data-lucide="edit-2"></i>
                            </button>
                            <button class="btn-table-action delete" data-id="${item.id}" title="Delete Expense">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </td>
                `;

                elements.expenseTableBody.appendChild(tr);
            });
        }

        // Update Record Count & Total
        elements.showingRecordsText.textContent = `Showing ${filteredExpenses.length} of ${expenses.length} transactions`;
        
        const sumFiltered = filteredExpenses.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
        elements.tableFilteredTotal.textContent = formatMoney(sumFiltered);

        if (window.lucide) window.lucide.createIcons();
    }

    // Render KPI Metrics
    function renderSummaryMetrics() {
        const totalAmount = expenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        
        let reimbursedTotal = 0;
        let reimbursedCount = 0;
        let pendingTotal = 0;
        let pendingCount = 0;

        expenses.forEach(item => {
            if (item.isReimbursed) {
                if (item.reimbursementStatus === 'REIMBURSED') {
                    reimbursedTotal += parseFloat(item.reimbursedAmount || item.amount) || 0;
                    reimbursedCount++;
                } else if (item.reimbursementStatus === 'PENDING') {
                    pendingTotal += parseFloat(item.reimbursedAmount || item.amount) || 0;
                    pendingCount++;
                }
            }
        });

        const netOutofPocket = totalAmount - reimbursedTotal;

        elements.statTotalAmount.textContent = formatMoney(totalAmount);
        elements.statTotalCount.textContent = `${expenses.length} transaction(s)`;

        elements.statReimbursedAmount.textContent = formatMoney(reimbursedTotal);
        elements.statReimbursedCount.textContent = `${reimbursedCount} settled`;

        elements.statPendingAmount.textContent = formatMoney(pendingTotal);
        elements.statPendingCount.textContent = `${pendingCount} claim(s) pending`;

        elements.statNetOutofPocket.textContent = formatMoney(netOutofPocket);
    }

    // Render Budget Bar
    function renderBudgetProgress() {
        const cap = parseFloat(settings.monthlyBudget) || 1000.00;
        const now = new Date();

        const thisMonthSpent = expenses.reduce((sum, item) => {
            if (item.datetime) {
                const dt = new Date(item.datetime);
                if (dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()) {
                    return sum + (parseFloat(item.amount) || 0);
                }
            }
            return sum;
        }, 0);

        const pct = Math.min(100, Math.round((thisMonthSpent / cap) * 100));

        elements.budgetText.textContent = `${pct}% used (${formatMoney(thisMonthSpent)} of ${formatMoney(cap)} limit)`;
        elements.budgetProgressBar.style.width = `${pct}%`;

        elements.budgetProgressBar.classList.remove('warning', 'danger');
        if (pct >= 90) {
            elements.budgetProgressBar.classList.add('danger');
        } else if (pct >= 75) {
            elements.budgetProgressBar.classList.add('warning');
        }
    }

    // Render Admin Accounts List Table
    async function openAdminPanel() {
        if (elements.newRole) {
            const isOwner = currentUser && currentUser.role === 'owner';
            elements.newRole.innerHTML = `
                <option value="user">User</option>
                ${isOwner ? '<option value="admin">Admin</option><option value="owner">Owner</option>' : ''}
            `;
        }
        elements.adminModal.classList.add('show');
        await renderAdminUserTable();
    }

    async function renderAdminUserTable() {
        const usersList = await storage.getUsers();
        elements.adminUserTableBody.innerHTML = '';
        const isOwner = currentUser && currentUser.role === 'owner';

        usersList.forEach(u => {
            const tr = document.createElement('tr');
            const createdStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'System Default';
            
            const isSelfOrPrimary = u.username === 'reynaldiw' || u.username === 'admin';
            
            let deleteBtn = '';
            if (!isSelfOrPrimary) {
                if (u.role === 'user' || isOwner) {
                    deleteBtn = `
                        <button class="btn-table-action delete btn-delete-user" data-username="${u.username}" title="Delete User Account">
                            <i data-lucide="trash-2"></i>
                        </button>
                    `;
                }
            }

            let roleCellHtml = `<span class="badge-role ${u.role}">${u.role}</span>`;
            if (isOwner && !isSelfOrPrimary) {
                roleCellHtml = `
                    <select class="role-change-select" data-username="${u.username}" title="Change user role">
                        <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                        <option value="owner" ${u.role === 'owner' ? 'selected' : ''}>Owner</option>
                    </select>
                `;
            }

            const changePassBtn = `
                <button class="btn-table-action key btn-change-pass" data-username="${u.username}" title="Change Password">
                    <i data-lucide="key"></i>
                </button>
            `;

            tr.innerHTML = `
                <td><strong>${escapeHtml(u.username)}</strong></td>
                <td>${roleCellHtml}</td>
                <td>${createdStr}</td>
                <td class="text-center">
                    <div class="action-btns">
                        ${changePassBtn}
                        ${deleteBtn}
                    </div>
                </td>
            `;

            elements.adminUserTableBody.appendChild(tr);
        });

        if (window.lucide) window.lucide.createIcons();
    }

    // ==========================================
    // Event Listeners & Modals
    // ==========================================
    function setupEventListeners() {
        // Login Submit
        elements.loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            elements.loginErrorMsg.textContent = '';

            const un = elements.loginUsername.value.trim();
            const pw = elements.loginPassword.value.trim();

            const result = await storage.login(un, pw);
            if (result.success) {
                showToast(`Welcome back, ${result.user.username}!`, 'success');
                await authorizeAndStartSession();
            } else {
                elements.loginErrorMsg.textContent = result.error || 'Invalid credentials';
            }
        });

        // Logout
        elements.logoutBtn.addEventListener('click', () => {
            storage.logout();
            currentUser = null;
            showToast('Logged out successfully.', 'info');
            showLoginOverlay();
        });

        // Admin Panel Modal
        elements.adminPanelBtn.addEventListener('click', openAdminPanel);
        elements.closeAdminModalBtn.addEventListener('click', () => elements.adminModal.classList.remove('show'));
        elements.closeAdminPanelBtn.addEventListener('click', () => elements.adminModal.classList.remove('show'));

        // Add User Form (Admin)
        elements.addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const un = elements.newUsername.value.trim();
            const pw = elements.newPassword.value.trim();
            const role = elements.newRole.value;

            const res = await storage.addUser({ username: un, password: pw, role });
            if (res.success) {
                showToast(`Account '${un}' created successfully!`, 'success');
                elements.addUserForm.reset();
                await renderAdminUserTable();
                await populateAdminUserFilter();
            } else {
                showToast(res.error || 'Failed to create user', 'error');
            }
        });

        // User Table Actions (Change Password & Delete User)
        elements.adminUserTableBody.addEventListener('click', async (e) => {
            const passBtn = e.target.closest('.btn-change-pass');
            const delBtn = e.target.closest('.btn-delete-user');

            if (passBtn) {
                const targetUn = passBtn.getAttribute('data-username');
                elements.targetPassUsername.value = targetUn;
                elements.targetUsernameDisplay.value = targetUn;
                elements.newPassInput.value = '';
                elements.changePasswordModal.classList.add('show');
            }

            if (delBtn) {
                const targetUn = delBtn.getAttribute('data-username');
                if (confirm(`Are you sure you want to delete user account '${targetUn}'?`)) {
                    const res = await storage.deleteUser(targetUn);
                    if (res.success) {
                        showToast(`User '${targetUn}' deleted.`, 'info');
                        await renderAdminUserTable();
                        await populateAdminUserFilter();
                        await refreshExpenseData();
                    } else {
                        showToast(res.error || 'Failed to delete user', 'error');
                    }
                }
            }
        });

        // Inline Role Change Listener (Owner Only)
        elements.adminUserTableBody.addEventListener('change', async (e) => {
            const selectEl = e.target.closest('.role-change-select');
            if (selectEl) {
                const targetUn = selectEl.getAttribute('data-username');
                const newRole = selectEl.value;
                const res = await storage.changeRole(targetUn, newRole);
                if (res.success) {
                    showToast(`Role for user '${targetUn}' updated to ${newRole.toUpperCase()}!`, 'success');
                    await renderAdminUserTable();
                    await populateAdminUserFilter();
                } else {
                    showToast(res.error || 'Failed to update role', 'error');
                    await renderAdminUserTable();
                }
            }
        });

        // Change Password Modal Handlers
        if (elements.closeChangePassModalBtn) {
            elements.closeChangePassModalBtn.addEventListener('click', () => {
                elements.changePasswordModal.classList.remove('show');
            });
        }
        if (elements.cancelChangePassBtn) {
            elements.cancelChangePassBtn.addEventListener('click', () => {
                elements.changePasswordModal.classList.remove('show');
            });
        }
        if (elements.changePasswordForm) {
            elements.changePasswordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const targetUn = elements.targetPassUsername.value;
                const newPass = elements.newPassInput.value.trim();

                const res = await storage.changePassword(targetUn, newPass);
                if (res.success) {
                    showToast(`Password for account '${targetUn}' updated successfully!`, 'success');
                    elements.changePasswordModal.classList.remove('show');
                } else {
                    showToast(res.error || 'Failed to update password', 'error');
                }
            });
        }

        // Search & Filter Events
        elements.searchInput.addEventListener('input', applyFiltersAndRender);
        elements.filterCategory.addEventListener('change', applyFiltersAndRender);
        if (elements.filterPaymentType) elements.filterPaymentType.addEventListener('change', applyFiltersAndRender);
        elements.filterReimbursed.addEventListener('change', applyFiltersAndRender);
        elements.filterDateRange.addEventListener('change', applyFiltersAndRender);
        elements.filterUser.addEventListener('change', applyFiltersAndRender);

        // Sort Column Clicks
        document.querySelectorAll('th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.getAttribute('data-sort');
                if (sortField === field) {
                    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    sortField = field;
                    sortDirection = 'desc';
                }
                applyFiltersAndRender();
            });
        });

        // Open Add Expense Modal
        elements.openAddModalBtn.addEventListener('click', () => openExpenseModal());
        elements.emptyAddBtn.addEventListener('click', () => openExpenseModal());

        // Close Expense Modal
        elements.closeModalBtn.addEventListener('click', closeExpenseModal);
        elements.cancelModalBtn.addEventListener('click', closeExpenseModal);

        // Toggle Reimbursement Form Fields
        elements.isReimbursedCheck.addEventListener('change', (e) => {
            elements.reimbursementFields.style.display = e.target.checked ? 'block' : 'none';
        });

        // Dynamic Comment Required State (Required only for 'Other' category)
        elements.expenseCategory.addEventListener('change', updateCommentRequiredState);

        // Receipt File Upload Preview
        elements.receiptFile.addEventListener('change', handleReceiptUpload);
        elements.removeThumbBtn.addEventListener('click', removeReceiptPreview);

        // Expense Form Submission
        elements.expenseForm.addEventListener('submit', handleExpenseSubmit);

        // Table Actions (Edit, Delete, Receipt View)
        elements.expenseTableBody.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.btn-table-action.edit');
            const deleteBtn = e.target.closest('.btn-table-action.delete');
            const receiptBtn = e.target.closest('.btn-receipt-thumb');

            if (editBtn) {
                const id = editBtn.getAttribute('data-id');
                const item = expenses.find(x => x.id === id);
                if (item) openExpenseModal(item);
            }

            if (deleteBtn) {
                const id = deleteBtn.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this expense transaction?')) {
                    deleteExpenseItem(id);
                }
            }

            if (receiptBtn) {
                const id = receiptBtn.getAttribute('data-id');
                const item = expenses.find(x => x.id === id);
                if (item && item.receipt) {
                    openLightbox(item.receipt, `${item.category} - ${item.comment} (${formatMoney(item.amount)})`);
                }
            }
        });

        // Export Actions
        elements.exportXlsxBtn.addEventListener('click', () => {
            if (filteredExpenses.length === 0) {
                showToast('No expense records to export.', 'error');
                return;
            }
            window.ExcelExporter.exportToXlsx(filteredExpenses, { currency: settings.currency });
            showToast('Excel (.xlsx) report generated successfully!', 'success');
        });

        elements.exportPdfBtn.addEventListener('click', () => {
            if (filteredExpenses.length === 0) {
                showToast('No expense records to export.', 'error');
                return;
            }
            window.PdfExporter.exportToPdf(filteredExpenses, { currency: settings.currency });
            showToast('PDF expense report generated successfully!', 'success');
        });

        // Backup Dropdown Toggle
        elements.dataBackupBtn.addEventListener('click', () => {
            elements.backupDropdown.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!elements.dataBackupBtn.contains(e.target) && !elements.backupDropdown.contains(e.target)) {
                elements.backupDropdown.classList.remove('show');
            }

            // Unmask / Toggle Password Visibility
            const toggleBtn = e.target.closest('.toggle-password-btn');
            if (toggleBtn) {
                const targetId = toggleBtn.getAttribute('data-target');
                const input = document.getElementById(targetId);
                if (input) {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    toggleBtn.innerHTML = `<i data-lucide="${isPassword ? 'eye-off' : 'eye'}"></i>`;
                    if (window.lucide) window.lucide.createIcons();
                }
            }
        });

        // JSON Export & Import
        elements.exportJsonBtn.addEventListener('click', exportJsonData);
        elements.importJsonBtn.addEventListener('click', () => elements.jsonFileInput.click());
        elements.jsonFileInput.addEventListener('change', importJsonData);

        // Toggle Charts Collapse
        elements.toggleChartsBtn.addEventListener('click', () => {
            const isHidden = elements.chartsGrid.classList.toggle('collapsed');
            elements.chartsToggleText.textContent = isHidden ? 'Show Charts' : 'Hide Charts';
            elements.chartsToggleIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        });

        // Storage & App Settings Modal
        elements.storageStatusBadge.addEventListener('click', openSettingsModal);
        elements.closeSettingsModalBtn.addEventListener('click', closeSettingsModal);
        elements.saveSettingsBtn.addEventListener('click', saveSettingsFromModal);
        elements.testServerBtn.addEventListener('click', testServerConnection);

        document.querySelectorAll('input[name="storageMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                elements.serverEndpointBox.style.display = e.target.value === 'server' ? 'block' : 'none';
            });
        });

        // Theme Toggle
        elements.themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(nextTheme);
            settings = storage.saveSettings({ theme: nextTheme });
        });

        // Budget Target Modal
        elements.editBudgetBtn.addEventListener('click', () => {
            elements.budgetLimitInput.value = settings.monthlyBudget || 1000;
            elements.budgetModal.classList.add('show');
            setTimeout(() => elements.budgetLimitInput.focus(), 100);
        });
        elements.closeBudgetModalBtn.addEventListener('click', () => elements.budgetModal.classList.remove('show'));
        elements.cancelBudgetBtn.addEventListener('click', () => elements.budgetModal.classList.remove('show'));

        function saveBudgetHandler(e) {
            if (e) e.preventDefault();
            const newCap = parseFloat(elements.budgetLimitInput.value) || 1000;
            settings = storage.saveSettings({ monthlyBudget: newCap });
            renderBudgetProgress();
            elements.budgetModal.classList.remove('show');
            showToast('Monthly budget cap updated!', 'success');
        }

        const budgetForm = document.getElementById('budgetForm');
        if (budgetForm) {
            budgetForm.addEventListener('submit', saveBudgetHandler);
        }
        elements.saveBudgetBtn.addEventListener('click', saveBudgetHandler);

        // Lightbox Close
        elements.closeLightboxBtn.addEventListener('click', closeLightbox);
        elements.lightboxModal.addEventListener('click', (e) => {
            if (e.target === elements.lightboxModal) closeLightbox();
        });

        // Quick Currency Switcher
        if (elements.headerCurrencyBtn) {
            elements.headerCurrencyBtn.addEventListener('click', () => {
                elements.quickCurrencyModal.classList.add('show');
            });
        }
        if (elements.closeQuickCurrencyModalBtn) {
            elements.closeQuickCurrencyModalBtn.addEventListener('click', () => {
                elements.quickCurrencyModal.classList.remove('show');
            });
        }
        if (elements.quickCurrencyModal) {
            elements.quickCurrencyModal.addEventListener('click', (e) => {
                if (e.target === elements.quickCurrencyModal) elements.quickCurrencyModal.classList.remove('show');
            });
        }

        document.querySelectorAll('.currency-option-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const selected = btn.getAttribute('data-currency');
                settings = storage.saveSettings({ currency: selected });
                if (elements.currencySelector) elements.currencySelector.value = selected;
                updateCurrencyUI(selected);
                elements.quickCurrencyModal.classList.remove('show');
                showToast(`Active currency updated to ${selected}`, 'success');
                await refreshExpenseData();
            });
        });

        // My Account Settings Modal Handlers
        let activeAccountCurrency = settings.currency || 'Rp';

        function openMyAccountModal() {
            const user = storage.getCurrentUser();
            if (!user) return;

            elements.myAccountUsernameInput.value = user.username;
            elements.myAccountPasswordInput.value = '';
            activeAccountCurrency = settings.currency || 'Rp';

            // Highlight active currency button
            if (elements.myAccountCurrencyGrid) {
                elements.myAccountCurrencyGrid.querySelectorAll('.currency-option-btn').forEach(btn => {
                    const c = btn.getAttribute('data-currency');
                    btn.classList.toggle('active', c === activeAccountCurrency);
                });
            }

            elements.myAccountModal.classList.add('show');
            setTimeout(() => elements.myAccountUsernameInput.focus(), 100);
        }

        function closeMyAccountModal() {
            elements.myAccountModal.classList.remove('show');
        }

        if (elements.userProfileBadge) elements.userProfileBadge.addEventListener('click', openMyAccountModal);
        if (elements.closeMyAccountModalBtn) elements.closeMyAccountModalBtn.addEventListener('click', closeMyAccountModal);
        if (elements.cancelMyAccountBtn) elements.cancelMyAccountBtn.addEventListener('click', closeMyAccountModal);

        // Global Event Delegation Fallback for Top Navbar Controls
        document.addEventListener('click', (e) => {
            const profileBadge = e.target.closest('#userProfileBadge');
            if (profileBadge) {
                openMyAccountModal();
                return;
            }

            const currencyBtn = e.target.closest('#headerCurrencyBtn');
            if (currencyBtn) {
                if (elements.quickCurrencyModal) elements.quickCurrencyModal.classList.add('show');
                return;
            }

            const storageBadge = e.target.closest('#storageStatusBadge');
            if (storageBadge) {
                openSettingsModal();
                return;
            }

            const adminBtn = e.target.closest('#adminPanelBtn');
            if (adminBtn) {
                openAdminPanel();
                return;
            }

            const themeBtn = e.target.closest('#themeToggleBtn');
            if (themeBtn) {
                const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
                const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
                applyTheme(nextTheme);
                settings = storage.saveSettings({ theme: nextTheme });
                return;
            }

            const logoutBtn = e.target.closest('#logoutBtn');
            if (logoutBtn) {
                storage.logout();
                currentUser = null;
                showToast('Logged out successfully.', 'info');
                showLoginOverlay();
                return;
            }
        });

        // Currency selection inside My Account Modal
        if (elements.myAccountCurrencyGrid) {
            elements.myAccountCurrencyGrid.querySelectorAll('.currency-option-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    activeAccountCurrency = btn.getAttribute('data-currency');
                    elements.myAccountCurrencyGrid.querySelectorAll('.currency-option-btn').forEach(b => {
                        b.classList.toggle('active', b === btn);
                    });
                });
            });
        }

        if (elements.myAccountForm) {
            elements.myAccountForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const user = storage.getCurrentUser();
                if (!user) return;

                const newUsername = elements.myAccountUsernameInput.value.trim();
                const newPassword = elements.myAccountPasswordInput.value.trim();

                if (!newUsername) {
                    showToast('Username cannot be empty.', 'error');
                    return;
                }

                let usernameChanged = false;

                // 1. Update Username if changed
                if (newUsername !== user.username) {
                    const resUn = await storage.updateUsername(user.username, newUsername);
                    if (!resUn.success) {
                        showToast(resUn.error || 'Failed to update username.', 'error');
                        return;
                    }
                    usernameChanged = true;
                }

                // 2. Update Password if provided
                if (newPassword) {
                    const targetName = usernameChanged ? newUsername : user.username;
                    const resPw = await storage.changePassword(targetName, newPassword);
                    if (!resPw.success) {
                        showToast(resPw.error || 'Failed to update password.', 'error');
                        return;
                    }
                }

                // 3. Update Currency Preference if changed
                if (activeAccountCurrency !== settings.currency) {
                    settings = storage.saveSettings({ currency: activeAccountCurrency });
                    if (elements.currencySelector) elements.currencySelector.value = activeAccountCurrency;
                    updateCurrencyUI(activeAccountCurrency);
                }

                closeMyAccountModal();
                const updatedUser = storage.getCurrentUser();
                currentUser = updatedUser;
                updateUserHeaderUI(updatedUser);
                await refreshExpenseData();
                showToast('My Account settings saved successfully!', 'success');
            });
        }
    }

    // Dynamic Comment Required State
    function updateCommentRequiredState() {
        const category = elements.expenseCategory.value;
        const isOther = (category === 'Other');
        
        elements.expenseComment.required = isOther;
        
        const reqLabel = document.getElementById('expenseCommentReqLabel');
        if (reqLabel) {
            if (isOther) {
                reqLabel.className = 'req';
                reqLabel.textContent = '*';
            } else {
                reqLabel.className = 'text-sub';
                reqLabel.textContent = '(Optional)';
            }
        }

        if (isOther) {
            elements.expenseComment.placeholder = "Please specify details for 'Other' category...";
        } else {
            elements.expenseComment.placeholder = "Enter transaction comments, vendor name, purpose (Optional)...";
        }
    }

    // Open Add / Edit Modal
    function openExpenseModal(item = null) {
        elements.expenseForm.reset();
        activeReceiptBase64 = null;
        removeReceiptPreview();

        if (item) {
            elements.modalTitle.textContent = 'Edit Expense Record';
            elements.expenseId.value = item.id;
            
            if (item.datetime) {
                const str = String(item.datetime).trim();
                if (str.includes('T')) {
                    const parts = str.split('T');
                    if (elements.expenseDate) elements.expenseDate.value = parts[0] || '';
                    if (elements.expenseTime) elements.expenseTime.value = parts[1] ? parts[1].slice(0, 5) : '';
                } else if (str.includes(' ') && str.length > 10) {
                    const parts = str.split(' ');
                    if (elements.expenseDate) elements.expenseDate.value = parts[0] || '';
                    if (elements.expenseTime) elements.expenseTime.value = parts[1] ? parts[1].slice(0, 5) : '';
                } else {
                    if (elements.expenseDate) elements.expenseDate.value = str;
                    if (elements.expenseTime) elements.expenseTime.value = '';
                }
            } else {
                setDefaultDatetime();
            }

            elements.expenseAmount.value = item.amount || '';
            elements.expenseCategory.value = item.category || 'Food & Dining';
            if (elements.expensePaymentType) elements.expensePaymentType.value = item.paymentType || 'Cashless';
            elements.expenseComment.value = item.comment || '';
            
            elements.isReimbursedCheck.checked = Boolean(item.isReimbursed);
            elements.reimbursementFields.style.display = item.isReimbursed ? 'block' : 'none';
            
            elements.reimbursementStatus.value = item.reimbursementStatus || 'PENDING';
            elements.reimbursedBy.value = item.reimbursedBy || '';
            elements.reimbursedAmount.value = item.reimbursedAmount || item.amount || '';
            elements.reimbursementNotes.value = item.reimbursementNotes || '';

            if (item.receipt) {
                activeReceiptBase64 = item.receipt;
                elements.thumbImg.src = item.receipt;
                elements.receiptPreviewThumb.style.display = 'block';
            }
        } else {
            elements.modalTitle.textContent = 'Add New Expense';
            elements.expenseId.value = '';
            setDefaultDatetime();
            if (elements.expensePaymentType) elements.expensePaymentType.value = 'Cashless';
            elements.reimbursementFields.style.display = 'none';
        }

        updateCommentRequiredState();
        elements.expenseModal.classList.add('show');
    }

    function closeExpenseModal() {
        elements.expenseModal.classList.remove('show');
    }

    // Receipt File Handler
    function handleReceiptUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 3 * 1024 * 1024) {
            showToast('Receipt file size should be less than 3MB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(evt) {
            activeReceiptBase64 = evt.target.result;
            elements.thumbImg.src = activeReceiptBase64;
            elements.receiptPreviewThumb.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    function removeReceiptPreview() {
        activeReceiptBase64 = null;
        elements.receiptFile.value = '';
        elements.thumbImg.src = '';
        elements.receiptPreviewThumb.style.display = 'none';
    }

    // Submit Expense Handler
    async function handleExpenseSubmit(e) {
        e.preventDefault();

        const id = elements.expenseId.value;
        const isReimbursed = elements.isReimbursedCheck.checked;

        const dateVal = elements.expenseDate.value;
        const timeVal = elements.expenseTime.value ? elements.expenseTime.value.trim() : '';
        const datetimeVal = timeVal ? `${dateVal}T${timeVal}` : dateVal;
        const paymentTypeVal = elements.expensePaymentType ? elements.expensePaymentType.value : 'Cashless';

        const expenseData = {
            datetime: datetimeVal,
            amount: parseFloat(elements.expenseAmount.value) || 0,
            category: elements.expenseCategory.value,
            paymentType: paymentTypeVal,
            comment: elements.expenseComment.value.trim(),
            isReimbursed: isReimbursed,
            reimbursementStatus: isReimbursed ? elements.reimbursementStatus.value : 'NONE',
            reimbursedBy: isReimbursed ? elements.reimbursedBy.value.trim() : '',
            reimbursedAmount: isReimbursed ? (parseFloat(elements.reimbursedAmount.value) || parseFloat(elements.expenseAmount.value) || 0) : 0,
            reimbursementNotes: isReimbursed ? elements.reimbursementNotes.value.trim() : '',
            receipt: activeReceiptBase64
        };

        if (id) {
            await storage.updateExpense(id, expenseData);
            showToast('Expense transaction updated successfully.', 'success');
        } else {
            await storage.addExpense(expenseData);
            showToast('New expense recorded!', 'success');
        }

        closeExpenseModal();
        await refreshExpenseData();
    }

    // Delete Expense Handler
    async function deleteExpenseItem(id) {
        await storage.deleteExpense(id);
        showToast('Expense item removed.', 'info');
        await refreshExpenseData();
    }

    // JSON Data Export/Import
    function exportJsonData() {
        const jsonStr = JSON.stringify(expenses, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SpendWise_Backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('JSON backup downloaded!', 'success');
    }

    function importJsonData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                if (Array.isArray(parsed)) {
                    await storage.importExpenses(parsed);
                    await refreshExpenseData();
                    showToast(`Successfully imported ${parsed.length} expense records!`, 'success');
                } else {
                    showToast('Invalid JSON file format.', 'error');
                }
            } catch (err) {
                showToast('Failed to parse JSON file.', 'error');
            }
        };
        reader.readAsText(file);
    }

    // Settings Modal Functions
    function openSettingsModal() {
        if (elements.currencySelector) elements.currencySelector.value = settings.currency || 'Rp';
        
        const modeRadio = document.querySelector(`input[name="storageMode"][value="${settings.storageMode || 'local'}"]`);
        if (modeRadio) modeRadio.checked = true;

        elements.serverEndpointBox.style.display = (settings.storageMode === 'server') ? 'block' : 'none';
        elements.serverApiUrl.value = settings.serverApiUrl || 'http://localhost:5050/api';
        elements.serverConnectionResult.textContent = '';

        elements.settingsModal.classList.add('show');
    }

    function closeSettingsModal() {
        elements.settingsModal.classList.remove('show');
    }

    async function saveSettingsFromModal() {
        const selectedMode = document.querySelector('input[name="storageMode"]:checked')?.value || 'local';
        const serverUrl = elements.serverApiUrl.value.trim();

        settings = storage.saveSettings({
            storageMode: selectedMode,
            serverApiUrl: serverUrl
        });

        updateStorageStatusUI();
        closeSettingsModal();
        showToast('Settings saved successfully.', 'success');

        await refreshExpenseData();
    }

    async function testServerConnection() {
        const url = elements.serverApiUrl.value.trim();
        elements.serverConnectionResult.textContent = 'Testing connection...';
        elements.serverConnectionResult.style.color = 'var(--warning-color)';

        const ok = await storage.checkServerHealth(url);
        if (ok) {
            elements.serverConnectionResult.textContent = '✓ Server Online & Responding!';
            elements.serverConnectionResult.style.color = 'var(--success-color)';
        } else {
            elements.serverConnectionResult.textContent = '✕ Server connection failed. Run server.py backend.';
            elements.serverConnectionResult.style.color = 'var(--danger-color)';
        }
    }

    // UI Updates Helpers
    function updateCurrencyUI(symbol) {
        if (elements.formCurrencyPrefix) elements.formCurrencyPrefix.textContent = symbol;
        if (elements.thAmountLabel) elements.thAmountLabel.textContent = `Expenses (${symbol})`;
        if (elements.reimbursedAmountLabel) elements.reimbursedAmountLabel.textContent = `Reimbursed Amount (${symbol})`;
        if (elements.budgetLimitLabel) elements.budgetLimitLabel.textContent = `Monthly Target Limit (${symbol})`;
        if (elements.headerCurrencyText) elements.headerCurrencyText.textContent = `Currency: ${symbol}`;

        document.querySelectorAll('.currency-option-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-currency') === symbol);
        });
    }

    function updateStorageStatusUI() {
        const isServer = settings.storageMode === 'server';
        if (elements.storageStatusText) elements.storageStatusText.textContent = isServer ? 'Server API Storage' : 'Local Storage';
        if (elements.statusDot) elements.statusDot.className = `status-dot ${isServer ? 'online' : 'online'}`;
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        elements.themeIcon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
        if (window.lucide) window.lucide.createIcons();
    }

    // Lightbox Modal
    function openLightbox(src, caption) {
        elements.lightboxImg.src = src;
        elements.lightboxCaption.textContent = caption || '';
        elements.lightboxModal.classList.add('show');
    }

    function closeLightbox() {
        elements.lightboxModal.classList.remove('show');
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Start App
    initApp();
});
