/**
 * SpendWise Storage Manager
 * Handles LocalStorage persistence, User Authentication, Session State, Role Management, and Server REST API interaction.
 */

const STORAGE_KEYS = {
    EXPENSES: 'spendwise_expenses_v1',
    SETTINGS: 'spendwise_settings_v1',
    USERS: 'spendwise_users_v1',
    SESSION: 'spendwise_session_v1'
};

// Default Accounts Seed (Configured via Vercel Environment Variables or Server API)
const DEFAULT_USERS = [];

// Initial Seed Expenses
const INITIAL_SEED_EXPENSES = [
    {
        id: 'exp_seed_1',
        username: 'mariahd',
        datetime: '2026-08-24T09:30',
        amount: 450000,
        category: 'Food & Dining',
        paymentType: 'Cashless',
        comment: 'Client team breakfast at Grand Cafe',
        isReimbursed: true,
        reimbursementStatus: 'REIMBURSED',
        reimbursedBy: 'Acme Corp Marketing',
        reimbursedAmount: 450000,
        reimbursementNotes: 'Claimed via Ref #CLM-8921',
        receipt: null,
        createdAt: new Date().toISOString()
    },
    {
        id: 'exp_seed_2',
        username: 'mariahd',
        datetime: '2026-08-22T14:15',
        amount: 1250000,
        category: 'Transportation',
        paymentType: 'Cash',
        comment: 'Airport Taxi & Tolls for Tech Conference',
        isReimbursed: true,
        reimbursementStatus: 'PENDING',
        reimbursedBy: 'Engineering Dept',
        reimbursedAmount: 1250000,
        reimbursementNotes: 'Awaiting finance approval',
        receipt: null,
        createdAt: new Date().toISOString()
    },
    {
        id: 'exp_seed_3',
        username: 'mariahd',
        datetime: '2026-08-20',
        amount: 850000,
        category: 'Utilities & Bills',
        paymentType: 'Cashless',
        comment: 'High-speed Fiber Internet Monthly Subscription',
        isReimbursed: false,
        reimbursementStatus: 'NONE',
        reimbursedBy: '',
        reimbursedAmount: 0,
        reimbursementNotes: '',
        receipt: null,
        createdAt: new Date().toISOString()
    },
    {
        id: 'exp_seed_4',
        username: 'reynaldiw',
        datetime: '2026-08-15T11:00',
        amount: 3500000,
        category: 'Office & Work',
        comment: 'Annual server subscription & domain renewals',
        isReimbursed: true,
        reimbursementStatus: 'REIMBURSED',
        reimbursedBy: 'Company Account',
        reimbursedAmount: 3500000,
        reimbursementNotes: 'Direct corporate card',
        receipt: null,
        createdAt: new Date().toISOString()
    }
];

class StorageManager {
    constructor() {
        this.settings = this.loadSettings();
        this.users = this.loadUsers();
        this.currentUser = this.loadSession();
    }

    // Load / Save Settings
    loadSettings() {
        const defaultSettings = {
            storageMode: 'local',
            serverApiUrl: 'http://localhost:5050/api',
            currency: 'Rp',
            monthlyBudget: 5000000.00,
            theme: 'dark'
        };

        try {
            const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
        } catch (e) {
            return defaultSettings;
        }
    }

    saveSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        try {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
        } catch (e) {
            console.error('Failed to save settings', e);
        }
        return this.settings;
    }

    // Load / Save Users
    loadUsers() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.USERS);
            let list = raw ? JSON.parse(raw) : DEFAULT_USERS;
            
            // Migration: Ensure 'admin' username is upgraded to 'reynaldiw' and 'owner' role
            let updated = false;
            list = list.map(u => {
                if (u.username === 'admin') {
                    updated = true;
                    return { ...u, username: 'reynaldiw', role: 'owner' };
                }
                return u;
            });

            if (!raw || updated) {
                this.saveUsers(list);
            }
            return list;
        } catch (e) {
            return DEFAULT_USERS;
        }
    }

    saveUsers(usersArray) {
        this.users = usersArray;
        try {
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(usersArray));
        } catch (e) {
            console.error('Error saving users', e);
        }
    }

    // Session Management
    loadSession() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
            if (!raw) return null;
            const sessionObj = JSON.parse(raw);
            
            // Check if active session username needs migration from admin to reynaldiw
            if (sessionObj && sessionObj.username === 'admin') {
                sessionObj.username = 'reynaldiw';
                sessionObj.role = 'owner';
                this.setSession(sessionObj);
            }
            return sessionObj;
        } catch (e) {
            return null;
        }
    }

    setSession(userObj) {
        this.currentUser = userObj;
        try {
            if (userObj) {
                localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(userObj));
            } else {
                localStorage.removeItem(STORAGE_KEYS.SESSION);
            }
        } catch (e) {
            console.error('Error saving session', e);
        }
    }

    getCurrentUser() {
        return this.currentUser || this.loadSession();
    }

    // Authentication Logic
    async login(username, password) {
        const un = username.trim();
        const pw = password.trim();

        // 1. Try server / Vercel API login endpoint first
        try {
            const apiUrl = this.getApiUrl('/login');

            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: un, password: pw })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    this.setSession(data.user);
                    return { success: true, user: data.user };
                }
            } else if (res.status === 401) {
                return { success: false, error: 'Invalid username or password' };
            }
        } catch (err) {
            console.warn('API login check unavailable, using local browser check fallback', err);
        }

        // 2. Local Browser Storage Fallback (User-created local accounts)
        const found = this.users.find(u => u.username === un && u.password === pw);
        if (found) {
            const sessionUser = { username: found.username, role: found.role };
            this.setSession(sessionUser);
            return { success: true, user: sessionUser };
        } else {
            return { success: false, error: 'Invalid username or password' };
        }
    }

    logout() {
        this.setSession(null);
    }

    getApiUrl(endpoint) {
        if (this.settings.storageMode === 'server' && this.settings.serverApiUrl) {
            return `${this.settings.serverApiUrl}${endpoint}`;
        }
        return `/api${endpoint}`;
    }

    // User Management (Admin & Owner)
    async getUsers() {
        try {
            const res = await fetch(this.getApiUrl('/users'));
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) return data;
            }
        } catch (e) {
            console.warn('Failed to fetch users from API, falling back to local', e);
        }
        return this.users.map(u => ({ username: u.username, role: u.role, createdAt: u.createdAt }));
    }

    async addUser(newUserObj) {
        const username = newUserObj.username.trim();
        const password = newUserObj.password.trim();
        const role = newUserObj.role || 'user';
        const createdAt = new Date().toISOString();
        const curUser = this.currentUser || { role: 'user' };

        // Permission check
        if ((role === 'admin' || role === 'owner') && curUser.role !== 'owner') {
            return { success: false, error: 'Only Owner role can create Admin or Owner accounts' };
        }

        if (this.users.some(u => u.username === username)) {
            return { success: false, error: 'Username already exists' };
        }

        const newUser = { username, password, role, createdAt };

        if (this.settings.storageMode === 'server') {
            try {
                const res = await fetch(`${this.settings.serverApiUrl}/users`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-User-Role': curUser.role
                    },
                    body: JSON.stringify(newUser)
                });
                if (!res.ok) {
                    const err = await res.json();
                    return { success: false, error: err.error || 'Server error' };
                }
            } catch (err) {
                console.warn('Server create user failed', err);
            }
        }

        const list = [...this.users, newUser];
        this.saveUsers(list);
        return { success: true, user: { username, role, createdAt } };
    }

    async changePassword(targetUsername, newPassword) {
        const password = newPassword.trim();
        if (!password) return { success: false, error: 'New password cannot be empty' };

        try {
            const res = await fetch(this.getApiUrl(`/users/${targetUsername}/password`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            if (!res.ok) {
                const err = await res.json();
                return { success: false, error: err.error || 'Failed to update password' };
            }
        } catch (err) {
            console.warn('API change password failed, fallback local', err);
        }

        const list = this.users.map(u => {
            if (u.username === targetUsername) {
                return { ...u, password };
            }
            return u;
        });

        this.saveUsers(list);
        return { success: true };
    }

    async updateUsername(oldUsername, newUsername) {
        const cleanOld = (oldUsername || '').trim();
        const cleanNew = (newUsername || '').trim();

        if (!cleanNew) {
            return { success: false, error: 'New username cannot be empty' };
        }

        if (cleanOld === cleanNew) {
            return { success: true, username: cleanNew };
        }

        const exists = this.users.some(u => u.username.toLowerCase() === cleanNew.toLowerCase() && u.username !== cleanOld);
        if (exists) {
            return { success: false, error: `Username '${cleanNew}' is already taken` };
        }

        try {
            const res = await fetch(this.getApiUrl(`/users/${cleanOld}/username`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newUsername: cleanNew })
            });
            if (!res.ok) {
                const err = await res.json();
                return { success: false, error: err.error || 'Failed to update username' };
            }
        } catch (err) {
            console.warn('API update username failed, fallback local', err);
        }

        // Update local users array
        const list = this.users.map(u => {
            if (u.username === cleanOld) {
                return { ...u, username: cleanNew };
            }
            return u;
        });
        this.saveUsers(list);

        // Update local expenses owned by cleanOld
        const localExps = this.getLocalExpenses().map(e => {
            if (e.username === cleanOld) {
                return { ...e, username: cleanNew };
            }
            return e;
        });
        this.saveLocalExpenses(localExps);

        // Update active session if user updating is currently logged in
        if (this.currentUser && this.currentUser.username === cleanOld) {
            const updatedSession = { ...this.currentUser, username: cleanNew };
            this.setSession(updatedSession);
        }

        return { success: true, oldUsername: cleanOld, newUsername: cleanNew };
    }

    async changeRole(targetUsername, newRole) {
        const curUser = this.currentUser || { role: 'user' };
        if (curUser.role !== 'owner') {
            return { success: false, error: 'Only Owner role can convert account roles' };
        }

        if (this.settings.storageMode === 'server') {
            try {
                const res = await fetch(`${this.settings.serverApiUrl}/users/${targetUsername}/role`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-User-Role': curUser.role
                    },
                    body: JSON.stringify({ role: newRole })
                });
                if (!res.ok) {
                    const err = await res.json();
                    return { success: false, error: err.error || 'Failed to update role on server' };
                }
            } catch (err) {
                console.warn('Server change role failed', err);
            }
        }

        const list = this.users.map(u => {
            if (u.username === targetUsername) {
                return { ...u, role: newRole };
            }
            return u;
        });

        this.saveUsers(list);
        return { success: true };
    }

    async deleteUser(username) {
        const curUser = this.currentUser || { role: 'user' };

        if (username === 'reynaldiw' || username === 'admin') return { success: false, error: 'Cannot delete primary owner' };

        const targetUser = this.users.find(u => u.username === username);
        if (targetUser && (targetUser.role === 'admin' || targetUser.role === 'owner') && curUser.role !== 'owner') {
            return { success: false, error: 'Only Owner role can delete Admin or Owner accounts' };
        }

        if (this.settings.storageMode === 'server') {
            try {
                const res = await fetch(`${this.settings.serverApiUrl}/users/${username}`, { 
                    method: 'DELETE',
                    headers: { 'X-User-Role': curUser.role }
                });
                if (!res.ok) {
                    const err = await res.json();
                    return { success: false, error: err.error || 'Server delete failed' };
                }
            } catch (e) {
                console.warn('Server delete user failed', e);
            }
        }

        const list = this.users.filter(u => u.username !== username);
        this.saveUsers(list);
        return { success: true };
    }

    // Fetch Expenses (User Scoped / Admin & Owner View)
    async getExpenses() {
        const curUser = this.currentUser || { username: 'mariahd', role: 'user' };

        if (this.settings.storageMode === 'server') {
            try {
                const response = await fetch(`${this.settings.serverApiUrl}/expenses`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'X-Username': curUser.username,
                        'X-User-Role': curUser.role
                    }
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (err) {
                console.warn('Server storage fetch failed, using local storage', err);
            }
        }

        // Local Storage
        const allExpenses = this.getLocalExpenses();
        if (curUser.role === 'admin' || curUser.role === 'owner') {
            return allExpenses;
        } else {
            return allExpenses.filter(e => (e.username || 'mariahd') === curUser.username);
        }
    }

    getLocalExpenses() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
            if (!raw) {
                this.saveLocalExpenses(INITIAL_SEED_EXPENSES);
                return INITIAL_SEED_EXPENSES;
            }
            return JSON.parse(raw);
        } catch (e) {
            return [];
        }
    }

    saveLocalExpenses(expenses) {
        try {
            localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
        } catch (e) {
            console.error('Error saving local expenses', e);
        }
    }

    async addExpense(expenseData) {
        const curUser = this.currentUser || { username: 'mariahd', role: 'user' };

        const newExpense = {
            id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            username: curUser.username,
            datetime: expenseData.datetime || new Date().toISOString(),
            amount: parseFloat(expenseData.amount) || 0,
            category: expenseData.category || 'Other',
            comment: expenseData.comment || '',
            isReimbursed: Boolean(expenseData.isReimbursed),
            reimbursementStatus: expenseData.reimbursementStatus || 'NONE',
            reimbursedBy: expenseData.reimbursedBy || '',
            reimbursedAmount: parseFloat(expenseData.reimbursedAmount) || 0,
            reimbursementNotes: expenseData.reimbursementNotes || '',
            receipt: expenseData.receipt || null,
            createdAt: new Date().toISOString()
        };

        if (this.settings.storageMode === 'server') {
            try {
                const res = await fetch(`${this.settings.serverApiUrl}/expenses`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-Username': curUser.username,
                        'X-User-Role': curUser.role
                    },
                    body: JSON.stringify(newExpense)
                });
                if (res.ok) {
                    const serverCreated = await res.json();
                    const list = this.getLocalExpenses();
                    list.unshift(serverCreated);
                    this.saveLocalExpenses(list);
                    return serverCreated;
                }
            } catch (err) {
                console.warn('Server error on add expense', err);
            }
        }

        const list = this.getLocalExpenses();
        list.unshift(newExpense);
        this.saveLocalExpenses(list);
        return newExpense;
    }

    async updateExpense(id, expenseData) {
        let updatedItem = null;

        if (this.settings.storageMode === 'server') {
            try {
                const res = await fetch(`${this.settings.serverApiUrl}/expenses/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(expenseData)
                });
                if (res.ok) {
                    updatedItem = await res.json();
                }
            } catch (err) {
                console.warn('Server update error', err);
            }
        }

        const list = this.getLocalExpenses();
        const index = list.findIndex(e => e.id === id);
        if (index !== -1) {
            list[index] = { ...list[index], ...expenseData, id };
            updatedItem = list[index];
            this.saveLocalExpenses(list);
        }

        return updatedItem;
    }

    async deleteExpense(id) {
        if (this.settings.storageMode === 'server') {
            try {
                await fetch(`${this.settings.serverApiUrl}/expenses/${id}`, { method: 'DELETE' });
            } catch (err) {
                console.warn('Server delete error', err);
            }
        }

        const list = this.getLocalExpenses();
        const filtered = list.filter(e => e.id !== id);
        this.saveLocalExpenses(filtered);
        return true;
    }

    async importExpenses(expensesArray) {
        if (!Array.isArray(expensesArray)) return false;
        this.saveLocalExpenses(expensesArray);

        if (this.settings.storageMode === 'server') {
            try {
                await fetch(`${this.settings.serverApiUrl}/expenses/import`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(expensesArray)
                });
            } catch (err) {
                console.warn('Server bulk import failed', err);
            }
        }
        return true;
    }

    async checkServerHealth(url = null) {
        const apiUrl = url || this.settings.serverApiUrl;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            const res = await fetch(`${apiUrl}/health`, { signal: controller.signal });
            clearTimeout(timeoutId);
            return res.ok;
        } catch (e) {
            return false;
        }
    }
}

window.storageManager = new StorageManager();
