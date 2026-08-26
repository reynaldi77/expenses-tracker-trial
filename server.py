#!/usr/bin/env python3
"""
SpendWise - Python SQLite REST API Backend & Web Server
Supports User Authentication, Role Management (Owner/Admin/User), Password Reset, Role Conversion, and Expense Persistence.

Default Credentials:
  - Username: mariahd    | Password: loveyou    | Role: user
  - Username: reynaldiw  | Password: tracker07  | Role: owner (Can manage & convert roles)

Run server:
    python3 server.py [port]
"""

import sys
import os
import json
import sqlite3
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5050
DB_FILE = os.path.join(os.path.dirname(__file__), 'expenses.db')

def get_env_users():
    """Reads authorized users from system or Vercel Environment Variables."""
    env_users = []
    auth_users_json = os.environ.get('AUTH_USERS', '').strip()
    if auth_users_json:
        try:
            parsed = json.loads(auth_users_json)
            if isinstance(parsed, list):
                env_users.extend(parsed)
        except Exception:
            pass

    admin_un = os.environ.get('ADMIN_USERNAME', '').strip()
    admin_pw = os.environ.get('ADMIN_PASSWORD', '').strip()
    if admin_un and admin_pw:
        env_users.append({
            'username': admin_un,
            'password': admin_pw,
            'role': os.environ.get('ADMIN_ROLE', 'owner')
        })

    user_un = os.environ.get('USER_USERNAME', '').strip()
    user_pw = os.environ.get('USER_PASSWORD', '').strip()
    if user_un and user_pw:
        env_users.append({
            'username': user_un,
            'password': user_pw,
            'role': os.environ.get('USER_ROLE', 'user')
        })

    return env_users

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # 1. Users Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            createdAt TEXT
        )
    ''')

    # Migration: Upgrade 'admin' username to 'reynaldiw'
    cursor.execute("UPDATE users SET username = 'reynaldiw', role = 'owner' WHERE username = 'admin'")

    # 2. Expenses Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY,
            username TEXT,
            datetime TEXT,
            amount REAL,
            category TEXT,
            paymentType TEXT DEFAULT 'Cashless',
            comment TEXT,
            isReimbursed INTEGER,
            reimbursementStatus TEXT,
            reimbursedBy TEXT,
            reimbursedAmount REAL,
            reimbursementNotes TEXT,
            receipt TEXT,
            createdAt TEXT
        )
    ''')

    # Migration check: Update expenses assigned to 'admin' to 'reynaldiw'
    cursor.execute("UPDATE expenses SET username = 'reynaldiw' WHERE username = 'admin'")

    # Migration check: Ensure 'username' and 'paymentType' columns exist
    cursor.execute("PRAGMA table_info(expenses)")
    columns = [col[1] for col in cursor.fetchall()]
    if 'username' not in columns:
        cursor.execute("ALTER TABLE expenses ADD COLUMN username TEXT DEFAULT 'mariahd'")
    if 'paymentType' not in columns:
        cursor.execute("ALTER TABLE expenses ADD COLUMN paymentType TEXT DEFAULT 'Cashless'")

    conn.commit()
    conn.close()

def db_to_dict(row):
    return {
        "id": row[0],
        "username": row[1] if len(row) > 13 else 'mariahd',
        "datetime": row[2],
        "amount": row[3],
        "category": row[4],
        "paymentType": row[5] if len(row) > 5 and row[5] else 'Cashless',
        "comment": row[6],
        "isReimbursed": bool(row[7]),
        "reimbursementStatus": row[8],
        "reimbursedBy": row[9],
        "reimbursedAmount": row[10],
        "reimbursementNotes": row[11],
        "receipt": row[12],
        "createdAt": row[13] if len(row) > 13 else ''
    }

class SpendWiseHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Accept, X-User-Role, X-Username')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/api/health':
            self._send_json({"status": "ok", "storage": "SQLite Database", "db_file": DB_FILE})

        elif path == '/api/users':
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute('SELECT username, role, createdAt FROM users')
            rows = cursor.fetchall()
            conn.close()
            users_list = [{"username": r[0], "role": r[1], "createdAt": r[2]} for r in rows]
            self._send_json(users_list)

        elif path == '/api/expenses':
            username = self.headers.get('X-Username', '')
            role = self.headers.get('X-User-Role', 'user')

            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            
            if role in ['admin', 'owner'] or not username:
                cursor.execute('SELECT id, username, datetime, amount, category, paymentType, comment, isReimbursed, reimbursementStatus, reimbursedBy, reimbursedAmount, reimbursementNotes, receipt, createdAt FROM expenses ORDER BY datetime DESC')
            else:
                cursor.execute('SELECT id, username, datetime, amount, category, paymentType, comment, isReimbursed, reimbursementStatus, reimbursedBy, reimbursedAmount, reimbursementNotes, receipt, createdAt FROM expenses WHERE username = ? ORDER BY datetime DESC', (username,))
            
            rows = cursor.fetchall()
            conn.close()

            expenses_list = [db_to_dict(r) for r in rows]
            self._send_json(expenses_list)
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else b'{}'
        
        try:
            data = json.loads(body.decode('utf-8'))
        except Exception:
            self._send_json({"error": "Invalid JSON body"}, status=400)
            return

        # 1. Login Endpoint
        if path == '/api/login':
            un = data.get('username', '').strip()
            pw = data.get('password', '').strip()

            # Check environment variables credentials first
            env_users = get_env_users()
            env_match = next((u for u in env_users if u.get('username') == un and u.get('password') == pw), None)
            if env_match:
                self._send_json({
                    "success": True,
                    "user": {"username": env_match['username'], "role": env_match.get('role', 'user')}
                })
                return

            # Secondary check: SQLite DB users
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute('SELECT username, password, role FROM users WHERE username = ?', (un,))
            row = cursor.fetchone()
            conn.close()

            if row and row[1] == pw:
                self._send_json({
                    "success": True,
                    "user": {"username": row[0], "role": row[2]}
                })
            else:
                self._send_json({"success": False, "error": "Invalid username or password"}, status=401)

        # 2. Users Management Endpoint (Create User)
        elif path == '/api/users':
            un = data.get('username', '').strip()
            pw = data.get('password', '').strip()
            role = data.get('role', 'user').strip()
            requester_role = self.headers.get('X-User-Role', 'admin')

            if not un or not pw:
                self._send_json({"error": "Username and password required"}, status=400)
                return

            # Permission Check: only owner can create admin or owner accounts
            if role in ['admin', 'owner'] and requester_role != 'owner':
                self._send_json({"error": "Only Owner role can create Admin or Owner accounts"}, status=403)
                return

            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            try:
                cursor.execute('INSERT INTO users (username, password, role, createdAt) VALUES (?, ?, ?, ?)',
                               (un, pw, role, data.get('createdAt', '')))
                conn.commit()
                conn.close()
                self._send_json({"username": un, "role": role}, status=201)
            except sqlite3.IntegrityError:
                conn.close()
                self._send_json({"error": "Username already exists"}, status=400)

        # 3. Add Expense Endpoint
        elif path == '/api/expenses':
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            
            exp_id = data.get('id') or f"exp_srv_{os.urandom(4).hex()}"
            username = data.get('username') or self.headers.get('X-Username') or 'mariahd'

            cursor.execute('''
                INSERT OR REPLACE INTO expenses (id, username, datetime, amount, category, paymentType, comment, isReimbursed, reimbursementStatus, reimbursedBy, reimbursedAmount, reimbursementNotes, receipt, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                exp_id,
                username,
                data.get('datetime', ''),
                float(data.get('amount', 0)),
                data.get('category', 'Other'),
                data.get('paymentType', 'Cashless'),
                data.get('comment', ''),
                1 if data.get('isReimbursed') else 0,
                data.get('reimbursementStatus', 'NONE'),
                data.get('reimbursedBy', ''),
                float(data.get('reimbursedAmount', 0)),
                data.get('reimbursementNotes', ''),
                data.get('receipt', None),
                data.get('createdAt', '')
            ))
            conn.commit()

            cursor.execute('SELECT id, username, datetime, amount, category, paymentType, comment, isReimbursed, reimbursementStatus, reimbursedBy, reimbursedAmount, reimbursementNotes, receipt, createdAt FROM expenses WHERE id = ?', (exp_id,))
            row = cursor.fetchone()
            conn.close()

            self._send_json(db_to_dict(row), status=201)

        # 4. Import Bulk Expenses
        elif path == '/api/expenses/import':
            if not isinstance(data, list):
                self._send_json({"error": "Expected array of expenses"}, status=400)
                return

            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            for item in data:
                cursor.execute('''
                    INSERT OR REPLACE INTO expenses (id, username, datetime, amount, category, paymentType, comment, isReimbursed, reimbursementStatus, reimbursedBy, reimbursedAmount, reimbursementNotes, receipt, createdAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    item.get('id') or f"exp_srv_{os.urandom(4).hex()}",
                    item.get('username', 'mariahd'),
                    item.get('datetime', ''),
                    float(item.get('amount', 0)),
                    item.get('category', 'Other'),
                    item.get('paymentType', 'Cashless'),
                    item.get('comment', ''),
                    1 if item.get('isReimbursed') else 0,
                    item.get('reimbursementStatus', 'NONE'),
                    item.get('reimbursedBy', ''),
                    float(item.get('reimbursedAmount', 0)),
                    item.get('reimbursementNotes', ''),
                    item.get('receipt', None),
                    item.get('createdAt', '')
                ))
            conn.commit()
            conn.close()
            self._send_json({"message": f"Successfully imported {len(data)} items"})

        else:
            self._send_json({"error": "Endpoint not found"}, status=404)

    def do_PUT(self):
        parsed = urlparse(self.path)
        path_parts = parsed.path.strip('/').split('/')

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else b'{}'
        data = json.loads(body.decode('utf-8'))

        # 1. Update User Password Endpoint
        if len(path_parts) == 4 and path_parts[0] == 'api' and path_parts[1] == 'users' and path_parts[3] == 'password':
            username = path_parts[2]
            new_password = data.get('password', '').strip()

            if not new_password:
                self._send_json({"error": "New password cannot be empty"}, status=400)
                return

            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute('UPDATE users SET password = ? WHERE username = ?', (new_password, username))
            conn.commit()
            conn.close()
            self._send_json({"success": True, "username": username})

        # 1b. Update Username Endpoint
        elif len(path_parts) == 4 and path_parts[0] == 'api' and path_parts[1] == 'users' and path_parts[3] == 'username':
            old_username = path_parts[2]
            new_username = data.get('newUsername', '').strip()

            if not new_username:
                self._send_json({"error": "New username cannot be empty"}, status=400)
                return

            if old_username == new_username:
                self._send_json({"success": True, "username": new_username})
                return

            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()

            # Check if new username is already taken
            cursor.execute('SELECT username FROM users WHERE username = ?', (new_username,))
            if cursor.fetchone():
                conn.close()
                self._send_json({"error": f"Username '{new_username}' is already taken"}, status=400)
                return

            try:
                cursor.execute('UPDATE users SET username = ? WHERE username = ?', (new_username, old_username))
                cursor.execute('UPDATE expenses SET username = ? WHERE username = ?', (new_username, old_username))
                conn.commit()
                conn.close()
                self._send_json({"success": True, "oldUsername": old_username, "newUsername": new_username})
            except Exception as e:
                conn.close()
                self._send_json({"error": f"Database error: {str(e)}"}, status=500)

        # 2. Update User Role Endpoint (Owner Only)
        elif len(path_parts) == 4 and path_parts[0] == 'api' and path_parts[1] == 'users' and path_parts[3] == 'role':
            username = path_parts[2]
            new_role = data.get('role', '').strip()
            requester_role = self.headers.get('X-User-Role', 'admin')

            if requester_role != 'owner':
                self._send_json({"error": "Only Owner role can convert account roles"}, status=403)
                return

            if not new_role or new_role not in ['user', 'admin', 'owner']:
                self._send_json({"error": "Invalid role specified"}, status=400)
                return

            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute('UPDATE users SET role = ? WHERE username = ?', (new_role, username))
            conn.commit()
            conn.close()
            self._send_json({"success": True, "username": username, "role": new_role})

        # 3. Update Expense Endpoint
        elif len(path_parts) == 3 and path_parts[0] == 'api' and path_parts[1] == 'expenses':
            exp_id = path_parts[2]

            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE expenses SET
                    datetime = ?,
                    amount = ?,
                    category = ?,
                    paymentType = ?,
                    comment = ?,
                    isReimbursed = ?,
                    reimbursementStatus = ?,
                    reimbursedBy = ?,
                    reimbursedAmount = ?,
                    reimbursementNotes = ?,
                    receipt = ?
                WHERE id = ?
            ''', (
                data.get('datetime', ''),
                float(data.get('amount', 0)),
                data.get('category', 'Other'),
                data.get('paymentType', 'Cashless'),
                data.get('comment', ''),
                1 if data.get('isReimbursed') else 0,
                data.get('reimbursementStatus', 'NONE'),
                data.get('reimbursedBy', ''),
                float(data.get('reimbursedAmount', 0)),
                data.get('reimbursementNotes', ''),
                data.get('receipt', None),
                exp_id
            ))
            conn.commit()

            cursor.execute('SELECT id, username, datetime, amount, category, paymentType, comment, isReimbursed, reimbursementStatus, reimbursedBy, reimbursedAmount, reimbursementNotes, receipt, createdAt FROM expenses WHERE id = ?', (exp_id,))
            row = cursor.fetchone()
            conn.close()

            if row:
                self._send_json(db_to_dict(row))
            else:
                self._send_json({"error": "Record not found"}, status=404)
        else:
            self._send_json({"error": "Invalid PUT endpoint"}, status=404)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path_parts = parsed.path.strip('/').split('/')

        if len(path_parts) == 3 and path_parts[0] == 'api' and path_parts[1] == 'expenses':
            exp_id = path_parts[2]
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute('DELETE FROM expenses WHERE id = ?', (exp_id,))
            conn.commit()
            conn.close()
            self._send_json({"success": True, "deleted_id": exp_id})

        elif len(path_parts) == 3 and path_parts[0] == 'api' and path_parts[1] == 'users':
            username = path_parts[2]
            requester_role = self.headers.get('X-User-Role', 'admin')

            if username in ['reynaldiw', 'admin']:
                self._send_json({"error": "Cannot delete primary owner account"}, status=400)
                return

            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            
            # Check target role
            cursor.execute('SELECT role FROM users WHERE username = ?', (username,))
            row = cursor.fetchone()
            if row and row[0] in ['admin', 'owner'] and requester_role != 'owner':
                conn.close()
                self._send_json({"error": "Only Owner can delete Admin or Owner accounts"}, status=403)
                return

            cursor.execute('DELETE FROM users WHERE username = ?', (username,))
            conn.commit()
            conn.close()
            self._send_json({"success": True, "deleted_user": username})

        else:
            self._send_json({"error": "Invalid DELETE endpoint"}, status=404)

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

if __name__ == '__main__':
    init_db()
    os.chdir(os.path.dirname(__file__))
    server = HTTPServer(('0.0.0.0', PORT), SpendWiseHandler)
    print(f"==================================================")
    print(f" SpendWise Server Running on http://localhost:{PORT}")
    print(f" Auth Mode: Vercel / Environment Variables Configured")
    print(f"==================================================")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        server.server_close()
