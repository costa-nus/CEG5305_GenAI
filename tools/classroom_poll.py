#!/usr/bin/env python3
"""Small classroom poll requiring a student name. Serves only the poll, not workspace files."""
import argparse
import http.cookies
import json
import secrets
import socket
import sqlite3
import threading
from functools import lru_cache
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
from vendor.qrcodegen import QrCode

SITE = Path(__file__).resolve().parents[1]
SLIDES = SITE / 'part2/lecture-1/session-2/slides'
SPEC = json.loads((SLIDES / 'h100-memory-quiz.json').read_text())
IDS = [o['id'] for o in SPEC['options']]


class PollServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, db_path, public_url=None, origins=(), auto_address=False):
        self.db = sqlite3.connect(db_path, check_same_thread=False)
        self.lock = threading.Lock()
        self.db.executescript('''
          CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, admin TEXT, open INTEGER);
          CREATE TABLE IF NOT EXISTS votes (room TEXT, voter TEXT, choice TEXT, name TEXT NOT NULL DEFAULT '',
                                           PRIMARY KEY(room, voter));
        ''')
        # Preserve existing rooms and votes when upgrading the anonymous schema.
        columns = {row[1] for row in self.db.execute('PRAGMA table_info(votes)')}
        if 'name' not in columns:
            self.db.execute("ALTER TABLE votes ADD COLUMN name TEXT NOT NULL DEFAULT ''")
        self.db.commit()
        self.origins = set(origins)
        try:
            super().__init__(address, Handler)
        except OSError:
            self.db.close()
            raise
        self.auto_address = auto_address and not public_url
        self._public_url = public_url or f'http://127.0.0.1:{self.server_port}'

    @property
    def public_url(self):
        return f'http://{lan_ip()}:{self.server_port}' if self.auto_address else self._public_url


@lru_cache(maxsize=128)
def qr_svg(url):
    """Local SVG QR with a four-module quiet zone, no third-party requests."""
    qr = QrCode.encode_text(url, QrCode.Ecc.MEDIUM)
    size = qr.get_size()
    cells = ' '.join(f'M{x+4},{y+4}h1v1h-1z' for y in range(size) for x in range(size) if qr.get_module(x, y))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size+8} {size+8}" '
            f'shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/>'
            f'<path d="{cells}" fill="black"/></svg>').encode()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # Do not log student IP addresses or votes.

    def reply(self, status, obj, cookie=None):
        body = json.dumps(obj).encode()
        self.send_response(status)
        origin = self.headers.get('Origin')
        if origin in self.server.origins:
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Vary', 'Origin')
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        if cookie:
            self.send_header('Set-Cookie', f'classroom_voter={cookie}; Path=/; HttpOnly; SameSite=Lax')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        if self.headers.get('Origin') not in self.server.origins:
            return self.reply(403, {'error': 'Presenter origin not allowed'})
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', self.headers['Origin'])
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Poll-Admin')
        self.send_header('Vary', 'Origin')
        self.end_headers()

    def route(self):
        return urlparse(self.path).path.strip('/').split('/')

    def voter(self):
        cookie = http.cookies.SimpleCookie()
        try:
            cookie.load(self.headers.get('Cookie', ''))
            value = cookie.get('classroom_voter')
            if value and len(value.value) == 32 and all(c in '0123456789abcdef' for c in value.value):
                return value.value, False
        except http.cookies.CookieError:
            pass
        return secrets.token_hex(16), True

    def do_GET(self):
        parts = self.route()
        if parts == ['api', 'config']:
            return self.reply(200, {'service': 'ceg5305-classroom-poll', 'public_url': self.server.public_url})
        if len(parts) == 4 and parts[:2] == ['api', 'rooms'] and parts[3] == 'qr.svg':
            with self.server.lock:
                exists = self.server.db.execute('SELECT 1 FROM rooms WHERE id=?', (parts[2],)).fetchone()
            if not exists:
                return self.reply(404, {'error': 'Poll not found'})
            body = qr_svg(self.server.public_url + '/r/' + parts[2])
            self.send_response(200)
            self.send_header('Content-Type', 'image/svg+xml')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if len(parts) == 3 and parts[:2] == ['api', 'rooms']:
            room = parts[2]
            with self.server.lock:
                row = self.server.db.execute('SELECT admin, open FROM rooms WHERE id=?', (room,)).fetchone()
                if not row:
                    return self.reply(404, {'error': 'Poll not found'})
                voter, fresh = self.voter()
                vote = self.server.db.execute('SELECT choice, name FROM votes WHERE room=? AND voter=?', (room, voter)).fetchone()
                admin = secrets.compare_digest(self.headers.get('X-Poll-Admin', ''), row[0])
                data = {'id': room, 'open': bool(row[1]), 'question': SPEC['question'],
                        'options': SPEC['options'], 'vote': vote[0] if vote else None,
                        'choices': vote[0].split(',') if vote else [],
                        'name': vote[1] if vote else '',
                        'activation_gb_per_sequence': SPEC['activation_gb_per_sequence'],
                        'buffer_gb': SPEC['buffer_gb'],
                        'join_url': self.server.public_url + '/r/' + room}
                if not row[1]:
                    data['bytes_per_parameter'] = SPEC['bytes_per_parameter']
                if admin or not row[1]:
                    counts = dict.fromkeys(IDS, 0)
                    rows = self.server.db.execute('SELECT choice FROM votes WHERE room=?', (room,)).fetchall()
                    for (choice,) in rows:
                        for selected in choice.split(','):
                            if selected in counts: counts[selected] += 1
                    data.update(counts=counts, total=len(rows))
            return self.reply(200, data, voter if fresh else None)
        if len(parts) == 2 and parts[0] == 'r' and len(parts[1]) == 6:
            body = (SITE / 'tools/classroom_poll_student.html').read_bytes()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)
            return
        self.reply(404, {'error': 'Not found'})

    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 4096:
                return self.reply(400, {'error': 'Invalid request size'})
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict):
                raise ValueError()
        except (ValueError, json.JSONDecodeError):
            return self.reply(400, {'error': 'Invalid JSON'})
        parts = self.route()
        if parts == ['api', 'server', 'stop']:
            if self.client_address[0] not in ('127.0.0.1', '::1') or self.headers.get('Origin') not in self.server.origins:
                return self.reply(403, {'error': 'Stop the poll from the instructor computer'})
            if data != {}:
                return self.reply(400, {'error': 'Invalid stop request'})
            with self.server.lock:
                self.server.db.execute('UPDATE rooms SET open=0')
                self.server.db.commit()
            self.reply(200, {'running': False})
            # Shutdown must run outside the request/serve_forever thread.
            def stop():
                self.server.shutdown()
                self.server.server_close()
            threading.Thread(target=stop, daemon=True).start()
            return
        if parts == ['api', 'rooms']:
            if self.client_address[0] not in ('127.0.0.1', '::1') or self.headers.get('Origin') not in self.server.origins:
                return self.reply(403, {'error': 'Start the poll from the instructor computer'})
            room = secrets.token_hex(3).upper()
            admin = secrets.token_urlsafe(32)
            with self.server.lock:
                while self.server.db.execute('SELECT 1 FROM rooms WHERE id=?', (room,)).fetchone():
                    room = secrets.token_hex(3).upper()
                self.server.db.execute('INSERT INTO rooms VALUES (?, ?, 1)', (room, admin))
                self.server.db.commit()
            return self.reply(201, {'id': room, 'admin': admin,
                                   'join_url': self.server.public_url + '/r/' + room})
        if len(parts) == 4 and parts[:2] == ['api', 'rooms']:
            room, action = parts[2:]
            with self.server.lock:
                row = self.server.db.execute('SELECT admin, open FROM rooms WHERE id=?', (room,)).fetchone()
                if not row:
                    return self.reply(404, {'error': 'Poll not found'})
                if action == 'state':
                    if not secrets.compare_digest(self.headers.get('X-Poll-Admin', ''), row[0]):
                        return self.reply(403, {'error': 'Instructor control required'})
                    if type(data.get('open')) is not bool:
                        return self.reply(400, {'error': 'Invalid poll state'})
                    self.server.db.execute('UPDATE rooms SET open=? WHERE id=?', (int(data['open']), room))
                elif action == 'vote':
                    if not row[1]:
                        return self.reply(409, {'error': 'Voting has closed'})
                    choices = data.get('choices', [data.get('choice')])
                    if not isinstance(choices, list) or not 1 <= len(choices) <= len(IDS) or any(c not in IDS for c in choices) or len(set(choices)) != len(choices):
                        return self.reply(400, {'error': 'Select one or more of A, B, C or D'})
                    choices = [c for c in IDS if c in choices]
                    choice = ','.join(choices)
                    name = data.get('name')
                    if not isinstance(name, str) or not name.strip() or len(name.strip()) > 100 or any(ord(c) < 32 for c in name):
                        return self.reply(400, {'error': 'Enter your name (1–100 characters)'})
                    name = name.strip()
                    voter, fresh = self.voter()
                    self.server.db.execute('INSERT INTO votes (room, voter, choice, name) VALUES (?, ?, ?, ?) ON CONFLICT(room, voter) DO UPDATE SET choice=excluded.choice, name=excluded.name', (room, voter, choice, name))
                    self.server.db.commit()
                    return self.reply(200, {'vote': choice, 'choices': choices, 'name': name}, voter if fresh else None)
                else:
                    return self.reply(404, {'error': 'Not found'})
                self.server.db.commit()
            return self.reply(200, {'open': data['open']})
        self.reply(404, {'error': 'Not found'})


def lan_ip():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(('8.8.8.8', 80))  # Route discovery; sends no UDP packet.
            return s.getsockname()[0]
    except OSError:
        return '127.0.0.1'


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', default='0.0.0.0')
    parser.add_argument('--port', type=int, default=8001)
    parser.add_argument('--public-url', help='Student-reachable address, e.g. http://192.168.1.5:8001')
    parser.add_argument('--presenter-origin', action='append', default=['http://127.0.0.1:8000', 'http://localhost:8000'])
    parser.add_argument('--db', type=Path, default=SITE.parent / '.classroom-polls/votes.sqlite3')
    args = parser.parse_args()
    args.db.parent.mkdir(parents=True, exist_ok=True)
    server = PollServer((args.host, args.port), args.db, args.public_url, args.presenter_origin, auto_address=True)
    print(f'Classroom poll ready: {server.public_url}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        server.db.close()
