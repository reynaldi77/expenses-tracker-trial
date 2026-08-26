# SpendWise - Smart Expense & Reimbursement Tracker

**SpendWise** is a full-featured, modern web application built to track personal and corporate expenses, manage reimbursements, analyze spending habits, and export formatted reports in Excel (`.xlsx`) and PDF formats.

---

## 🌟 Key Features

1. **Required Core Expense Table Fields**:
   - 📅 **Date & Time of Transaction**: Timestamp selector (`YYYY-MM-DD HH:mm`).
   - 💰 **Number of Expenses (Amount)**: Numeric input with dynamic currency formatting (\$, €, £, Rp, ¥).
   - 🏷️ **Category**: Categorization (Food & Dining, Transportation, Utilities & Bills, Office & Work, Entertainment, Healthcare, Shopping, Other).
   - 💬 **Comment / Description**: Full transaction comments & details.
   - 🤝 **Is Reimbursed by Another Party**: Fillable reimbursement section (Status: *Reimbursed*, *Pending Claim*, or *Not Reimbursed*, with payer name, claim notes, & reimbursed amount).

2. **📄 Exporting & Reports**:
   - 📊 **Convert to Excel (.xlsx)**: Generates formatted `.xlsx` workbooks with summary KPIs, totals, and formatted columns using SheetJS.
   - 📑 **Convert to PDF**: Generates printable corporate expense reports complete with company header, summary metrics, auto-formatted table, and sign-off blocks using jsPDF.
   - 💾 **JSON Backup & Restore**: Export full database snapshot and restore on any device.

3. **💡 Added Value Features**:
   - 📈 **Interactive Spending Analytics**: Donut chart for category breakdown & Bar chart for monthly trend powered by Chart.js.
   - 🎯 **Monthly Budget Target & Alerts**: Set monthly budget caps with visual progress bars and alert thresholds.
   - 🔎 **Real-time Search & Multi-Filters**: Filter by category, reimbursement status, date ranges, or keyword search across comments & payer details.
   - 🖼️ **Receipt Attachment & Lightbox**: Attach image files to transactions with full-screen lightbox preview.
   - 🌙 **Dark & Light Mode**: Modern glassmorphism UI design system.

4. **💾 Dual Storage Strategy**:
   - **Local Mode (Default)**: Instant browser storage (`localStorage` / `IndexedDB`) — works out of the box with 0 setup required!
   - **Server Mode**: Built-in **Python SQLite REST API server** (`server.py`) for server-side persistence and future backend deployment.

---

## 🚀 How to Run Locally

### Option 1: Instant Local Browser Mode (Zero Backend Required)

You can serve the static folder using Python's built-in web server:

```bash
cd /path/to/expense-tracker
python3 -m http.server 8080
```

Open `http://localhost:8080` in your web browser.

### Option 2: Python SQLite Server API Mode

To run with backend SQLite persistence:

```bash
cd /path/to/expense-tracker
python3 server.py 5000
```

1. Open `http://localhost:5000` in your browser.
2. In the app top header, click **Local Storage** to open settings and select **Python SQLite REST API Server**.
3. Transactions will now persist directly to the server's SQLite database (`expenses.db`).

---

## 🔌 REST API Reference

When running `server.py`:

- `GET /api/health` — Check server status.
- `GET /api/expenses` — Fetch all expense records sorted by date descending.
- `POST /api/expenses` — Create a new expense record.
- `PUT /api/expenses/:id` — Update an existing expense record.
- `DELETE /api/expenses/:id` — Delete an expense record by ID.
- `POST /api/expenses/import` — Bulk import expense records.

---

## 🛠️ Tech Stack & Dependencies

- **HTML5 & CSS3**: Custom CSS design system with HSL colors, glassmorphism, responsive grid & flexbox layouts.
- **JavaScript (ES6+)**: Modular vanilla JS controllers and state management.
- **SheetJS (XLSX)**: `.xlsx` spreadsheet generation.
- **jsPDF & AutoTable**: Vector PDF report generator.
- **Chart.js**: Dynamic interactive visual canvas graphs.
- **Lucide Icons**: Clean modern vector iconography.
- **Python (3.x)**: Built-in HTTP server & `sqlite3` API wrapper.

---

## 🚢 Deployment Guidelines & Vercel Authentication Setup

### Deploying on Vercel

1. Deploy the project folder directly to **Vercel**.
2. To enable secure login **without storing plaintext passwords in git**, configure Environment Variables in **Vercel Project Settings (`Settings -> Environment Variables`)**:

#### Option A: Single JSON Configuration (`AUTH_USERS`)
Set key `AUTH_USERS` with value:
```json
[
  { "username": "reynaldiw", "password": "YOUR_SECURE_OWNER_PASSWORD", "role": "owner" },
  { "username": "mariahd", "password": "YOUR_SECURE_USER_PASSWORD", "role": "user" }
]
```

#### Option B: Key-Value Pair Configuration
- `ADMIN_USERNAME`: `reynaldiw`
- `ADMIN_PASSWORD`: `YOUR_SECURE_OWNER_PASSWORD`
- `ADMIN_ROLE`: `owner`
- `USER_USERNAME`: `mariahd`
- `USER_PASSWORD`: `YOUR_SECURE_USER_PASSWORD`
- `USER_ROLE`: `user`

When submitted, `POST /api/login` verifies credentials against these Vercel Environment Variables safely on the server side!

---

### Local Server Deployment (`server.py`)
Run `server.py` on any Python environment. You can set the same `AUTH_USERS` or `ADMIN_USERNAME` / `ADMIN_PASSWORD` environment variables in your local shell or `.env` file before launching `python3 server.py 5050`.
# expenses-tracker-trial
# expenses-tracker-trial
# expenses-tracker-trial
# expenses-tracker-trial
