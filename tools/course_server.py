#!/usr/bin/env python3
"""Serve the course locally, with a slide button to start its classroom poll."""
import argparse
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request, urlopen
from classroom_poll import PollServer, SITE


class PollManager:
    def __init__(self, port=8001, db_path=None, origins=()):
        self.port = port
        self.db_path = db_path or SITE.parent / '.classroom-polls/votes.sqlite3'
        self.origins = set(origins)
        self.poll = None
        self.thread = None
        self.lock = threading.Lock()

    def status(self):
        if self.poll and self.thread and self.thread.is_alive():
            return {'running': True, 'public_url': self.poll.public_url}
        try:
            with urlopen(f'http://127.0.0.1:{self.port}/api/config', timeout=1) as response:
                config = json.load(response)
            if config.get('service') == 'ceg5305-classroom-poll':
                return {'running': True, 'public_url': config['public_url']}
        except (OSError, ValueError):
            pass
        return {'running': False}

    def start(self):
        with self.lock:
            state = self.status()
            if state['running']:
                return state
            if self.poll is not None:
                self.poll.server_close()
                self.poll.db.close()
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
            try:
                self.poll = PollServer(('0.0.0.0', self.port), self.db_path,
                                       origins=self.origins, auto_address=True)
            except OSError as error:
                self.poll = None
                raise RuntimeError(f'Cannot start the poll: port {self.port} is already in use or unavailable.') from error
            self.thread = threading.Thread(target=self.poll.serve_forever, daemon=True)
            self.thread.start()
            return {'running': True, 'public_url': self.poll.public_url}

    def close(self):
        with self.lock:
            if self.poll is not None:
                with self.poll.lock:
                    self.poll.db.execute('UPDATE rooms SET open=0')
                    self.poll.db.commit()
                if self.thread and self.thread.is_alive():
                    self.poll.shutdown()
                    self.thread.join(timeout=3)
                self.poll.server_close()
                self.poll.db.close()
                self.poll = self.thread = None
            elif self.status()['running']:
                # Also stop a separately launched instance of our poll service.
                request = Request(f'http://127.0.0.1:{self.port}/api/server/stop',
                                  data=b'{}', headers={'Content-Type': 'application/json',
                                                     'Origin': next(iter(self.origins))})
                with urlopen(request, timeout=5) as response:
                    json.load(response)
            return {'running': False}


class CourseServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, poll_port=8001, db_path=None):
        super().__init__(address, CourseHandler)
        self.origins = {f'http://127.0.0.1:{self.server_port}', f'http://localhost:{self.server_port}'}
        self.polls = PollManager(poll_port, db_path, self.origins)


class CourseHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SITE), **kwargs)

    def log_message(self, *args):
        pass

    def local_request(self):
        expected_hosts = {f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'}
        return self.client_address[0] in ('127.0.0.1', '::1') and self.headers.get('Host') in expected_hosts

    def reply(self, status, body):
        payload = json.dumps(body).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        if self.path == '/api/classroom/server':
            if not self.local_request():
                return self.reply(403, {'error': 'Instructor computer only'})
            return self.reply(200, self.server.polls.status())
        if self.path.startswith('/api/classroom/'):
            return self.reply(404, {'error': 'Unknown classroom action'})
        super().do_GET()

    def do_POST(self):
        if self.path not in ('/api/classroom/server/start', '/api/classroom/server/stop'):
            return self.reply(404, {'error': 'Unknown classroom action'})
        if not self.local_request() or self.headers.get('Origin') not in self.server.origins:
            return self.reply(403, {'error': 'Start from the local lecture page'})
        if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
            return self.reply(400, {'error': 'Expected JSON'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 256 or json.loads(self.rfile.read(length)) != {}:
                return self.reply(400, {'error': 'Invalid server request'})
            action = self.server.polls.start if self.path.endswith('/start') else self.server.polls.close
            return self.reply(200, action())
        except (ValueError, RuntimeError) as error:
            return self.reply(400, {'error': str(error)})


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--poll-port', type=int, default=8001)
    args = parser.parse_args()
    server = CourseServer(('127.0.0.1', args.port), args.poll_port)
    print(f'Course ready: http://127.0.0.1:{server.server_port}/', flush=True)
    print('Use Start poll server on the H100 question slide. Polling starts only when requested.', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.polls.close()
        server.server_close()
