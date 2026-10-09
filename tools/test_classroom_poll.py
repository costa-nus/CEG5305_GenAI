"""End-to-end HTTP tests: independent voters, vote replacement and instructor controls."""
import http.client
import json
import tempfile
import sqlite3
import threading
import socket
import unittest
from unittest.mock import patch
from pathlib import Path
from classroom_poll import PollServer, SPEC, qr_svg
from course_server import CourseServer

ORIGIN = 'http://127.0.0.1:8000'


class PollTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.server = PollServer(('127.0.0.1', 0), Path(self.temp.name)/'votes.sqlite3', origins=[ORIGIN])
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        status, self.room, _ = self.request('POST', '/api/rooms', {}, {'Origin': ORIGIN})
        self.assertEqual(status, 201)
        self.path = '/api/rooms/' + self.room['id']

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.server.db.close()
        self.temp.cleanup()

    def request(self, method, path, data=None, headers=None):
        conn = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=5)
        hs = dict(headers or {})
        if data is not None:
            hs['Content-Type'] = 'application/json'
        conn.request(method, path, json.dumps(data) if data is not None else None, hs)
        response = conn.getresponse()
        cookie = response.getheader('Set-Cookie')
        body = json.loads(response.read())
        status = response.status
        conn.close()
        return status, body, cookie

    def test_votes_change_without_double_counting(self):
        cookies = []
        for choice in ['A', 'B', 'D']:
            status, _, cookie = self.request('POST', self.path+'/vote', {'choice': choice, 'name': 'Test Student '+choice})
            self.assertEqual(status, 200)
            cookies.append(cookie.split(';')[0])
        self.request('POST', self.path+'/vote', {'choice': 'C', 'name': 'Test Student B'}, {'Cookie': cookies[1]})
        _, tally, _ = self.request('GET', self.path, headers={'X-Poll-Admin':self.room['admin']})
        self.assertEqual(tally['counts'], {'A':1, 'B':0, 'C':1, 'D':1})
        self.assertEqual(tally['total'], 3)
        _, public, _ = self.request('GET', self.path, headers={'Cookie':cookies[1]})
        self.assertEqual(public['vote'], 'C')
        self.assertNotIn('counts', public)

    def test_close_rejects_votes_and_protects_controls(self):
        status, _, _ = self.request('POST', self.path+'/state', {'open':False})
        self.assertEqual(status, 403)
        status, _, _ = self.request('POST', self.path+'/state', {'open':False}, {'X-Poll-Admin':self.room['admin']})
        self.assertEqual(status, 200)
        status, _, _ = self.request('POST', self.path+'/vote', {'choice':'A', 'name':'Test Student'})
        self.assertEqual(status, 409)
        _, public, _ = self.request('GET', self.path)
        self.assertFalse(public['open'])
        self.assertEqual(public['total'], 0)
        self.request('POST', self.path+'/state', {'open':True}, {'X-Poll-Admin':self.room['admin']})
        self.assertEqual(self.request('POST', self.path+'/vote', {'choice':'D', 'name':'Test Student'})[0], 200)

    def test_invalid_input_and_unapproved_origin(self):
        self.assertEqual(self.request('POST', self.path+'/vote', {'choice':'Z'})[0], 400)
        self.assertEqual(self.request('POST', '/api/rooms', {}, {'Origin':'https://example.com'})[0], 403)
        status, _, _ = self.request('GET', '/api/rooms/ABSENT')
        self.assertEqual(status, 404)

    def test_names_required_saved_and_recalled_for_own_vote(self):
        for name in [None, '', '   ', 123, 'x'*101, 'bad\nname']:
            self.assertEqual(self.request('POST', self.path+'/vote', {'choice':'A','name':name})[0], 400)
        _, tally, _ = self.request('GET', self.path, headers={'X-Poll-Admin':self.room['admin']})
        self.assertEqual(tally['total'], 0)
        status, result, cookie = self.request('POST', self.path+'/vote', {'choice':'A','name':'  李明  '})
        self.assertEqual(status, 200)
        self.assertEqual(result['name'], '李明')
        headers={'Cookie':cookie.split(';')[0]}
        _, own, _ = self.request('GET', self.path, headers=headers)
        self.assertEqual(own['name'], '李明')
        self.assertEqual(self.request('POST', self.path+'/vote', {'choice':'B'}, headers)[0], 400)
        self.assertEqual(self.request('POST', self.path+'/vote', {'choice':'B','name':'李明'}, headers)[0], 200)
        _, other, _ = self.request('GET', self.path)
        self.assertEqual(other['name'], '')
        _, tally, _ = self.request('GET', self.path, headers={'X-Poll-Admin':self.room['admin']})
        self.assertEqual(tally['total'], 1)
        self.assertEqual(tally['counts']['B'], 1)

    def test_multiple_choices_and_hints_only_after_closing(self):
        for choices in [[], ['A','A'], ['Z'], 'A']:
            self.assertEqual(self.request('POST', self.path+'/vote', {'choices':choices,'name':'Test Student'})[0], 400)
        status, result, cookie=self.request('POST',self.path+'/vote',{'choices':['B','A'],'name':'Test Student'})
        self.assertEqual(status,200)
        self.assertEqual(result['choices'],['A','B'])
        _, public, _=self.request('GET',self.path,headers={'Cookie':cookie.split(';')[0]})
        self.assertNotIn('bytes_per_parameter',public)
        self.assertEqual(public['choices'],['A','B'])
        _, tally, _=self.request('GET',self.path,headers={'X-Poll-Admin':self.room['admin']})
        self.assertEqual(tally['total'],1)
        self.assertEqual(tally['counts'],{'A':1,'B':1,'C':0,'D':0})
        self.request('POST',self.path+'/state',{'open':False},{'X-Poll-Admin':self.room['admin']})
        _, closed, _=self.request('GET',self.path)
        self.assertEqual(closed['bytes_per_parameter'],16)
        self.request('POST',self.path+'/state',{'open':True},{'X-Poll-Admin':self.room['admin']})
        self.assertNotIn('bytes_per_parameter',self.request('GET',self.path)[1])

    def test_existing_anonymous_database_migrates_without_losing_votes(self):
        path=Path(self.temp.name)/'legacy.sqlite3'
        with sqlite3.connect(path) as db:
            db.executescript("CREATE TABLE rooms (id TEXT PRIMARY KEY, admin TEXT, open INTEGER); CREATE TABLE votes (room TEXT, voter TEXT, choice TEXT, PRIMARY KEY(room,voter)); INSERT INTO rooms VALUES ('ABCDEF','admin',1); INSERT INTO votes VALUES ('ABCDEF','voter','A');")
        upgraded=PollServer(('127.0.0.1',0),path,origins=[ORIGIN])
        try:
            self.assertEqual(upgraded.db.execute('SELECT choice,name FROM votes').fetchone(), ('A',''))
        finally:
            upgraded.server_close();upgraded.db.close()

    def test_question_has_two_models_two_batches_two_fits(self):
        self.assertEqual({o['parameters_b'] for o in SPEC['options']}, {3,7})
        self.assertEqual({o['batch'] for o in SPEC['options']}, {1,8})
        totals = [SPEC['bytes_per_parameter']*o['parameters_b'] + SPEC['activation_gb_per_sequence'][str(o['parameters_b'])]*o['batch'] + SPEC['buffer_gb'] for o in SPEC['options']]
        self.assertEqual(totals, [53,60,120,148])
        self.assertEqual([o['id'] for o,t in zip(SPEC['options'],totals) if t<=SPEC['capacity_gb']], ['A', 'B'])

    def test_address_changes_preserve_room_votes_and_update_qr(self):
        self.server.auto_address = True
        self.request('POST', self.path+'/vote', {'choice':'A', 'name':'Test Student'})
        with patch('classroom_poll.lan_ip', return_value='192.168.1.10'):
            _, old, _ = self.request('GET', self.path, headers={'X-Poll-Admin':self.room['admin']})
        with patch('classroom_poll.lan_ip', return_value='192.168.1.20'):
            _, new, _ = self.request('GET', self.path, headers={'X-Poll-Admin':self.room['admin']})
            conn = http.client.HTTPConnection('127.0.0.1', self.server.server_port)
            conn.request('GET', self.path+'/qr.svg')
            response = conn.getresponse()
            self.assertEqual(response.status, 200)
            self.assertEqual(response.getheader('Content-Type'), 'image/svg+xml')
            self.assertEqual(response.read(), qr_svg(new['join_url']))
            conn.close()
        self.assertNotEqual(old['join_url'], new['join_url'])
        self.assertEqual(new['counts']['A'], 1)
        self.assertEqual(new['id'], old['id'])
        self.assertNotEqual(qr_svg(old['join_url']), qr_svg(new['join_url']))


class CourseServerTest(unittest.TestCase):
    def test_stop_releases_port_and_restart_preserves_closed_votes(self):
        with tempfile.TemporaryDirectory() as temp:
            server = CourseServer(('127.0.0.1', 0), poll_port=0, db_path=Path(temp)/'poll.sqlite3')
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            origin = f'http://127.0.0.1:{server.server_port}'
            def request(port, path, data=None, headers=None):
                conn = http.client.HTTPConnection('127.0.0.1', port, timeout=5)
                hs = {'Content-Type':'application/json', 'Origin':origin, **(headers or {})}
                conn.request('POST' if data is not None else 'GET', path,
                             json.dumps(data) if data is not None else None, hs)
                response = conn.getresponse()
                result = response.status, json.loads(response.read())
                conn.close()
                return result
            try:
                request(server.server_port, '/api/classroom/server/start', {})
                port = server.polls.poll.server_port
                server.polls.port = port
                _, room = request(port, '/api/rooms', {})
                path = '/api/rooms/' + room['id']
                self.assertEqual(request(port, path+'/vote', {'choices':['A','B'], 'name':'Test Student'})[0], 200)
                self.assertEqual(request(server.server_port, '/api/classroom/server/stop', {}, {'Origin':'https://example.com'})[0], 403)
                self.assertEqual(request(server.server_port, '/api/classroom/server/stop', {})[1], {'running':False})
                self.assertIsNone(server.polls.poll)
                self.assertFalse(request(server.server_port, '/api/classroom/server')[1]['running'])
                with socket.socket() as listener:
                    listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                    listener.bind(('0.0.0.0', port))
                self.assertEqual(request(server.server_port, '/api/classroom/server/start', {})[0], 200)
                _, result = request(port, path, headers={'X-Poll-Admin':room['admin']})
                self.assertFalse(result['open'])
                self.assertEqual(result['total'], 1)
                self.assertEqual(result['counts'], {'A':1,'B':1,'C':0,'D':0})
                self.assertEqual(request(port, path+'/state', {'open':True}, {'X-Poll-Admin':room['admin']})[0], 200)
                self.assertTrue(request(port, path)[1]['open'])
                # A standalone poll also allows only the local presenter to stop it.
                self.assertEqual(request(port, '/api/server/stop', {}, {'Origin':'https://example.com'})[0], 403)
                self.assertEqual(request(port, '/api/server/stop', {})[0], 200)
                server.polls.thread.join(timeout=3)
                self.assertFalse(server.polls.thread.is_alive())
                with socket.socket() as listener:
                    listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                    listener.bind(('0.0.0.0', port))
            finally:
                server.shutdown();server.server_close();server.polls.close()

    def test_button_starts_server_and_reconnects_without_reset(self):
        with tempfile.TemporaryDirectory() as temp:
            server = CourseServer(('127.0.0.1', 0), poll_port=0, db_path=Path(temp)/'poll.sqlite3')
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            def request(method, data=None, origin=None):
                conn = http.client.HTTPConnection('127.0.0.1', server.server_port)
                headers = {'Content-Type':'application/json'}
                if origin: headers['Origin'] = origin
                path='/api/classroom/server/start' if method=='POST' else '/api/classroom/server'
                conn.request(method,path,json.dumps(data) if data is not None else None,headers)
                response=conn.getresponse();status=response.status;body=json.loads(response.read());conn.close()
                return status,body
            try:
                self.assertFalse(request('GET')[1]['running'])
                self.assertEqual(request('POST',{},'https://example.com')[0],403)
                self.assertEqual(request('POST',{'command':'anything'},f'http://127.0.0.1:{server.server_port}')[0],400)
                status, first=request('POST',{},f'http://127.0.0.1:{server.server_port}')
                self.assertEqual(status,200);self.assertTrue(first['running'])
                poll=server.polls.poll
                status,again=request('POST',{},f'http://127.0.0.1:{server.server_port}')
                self.assertEqual(status,200);self.assertTrue(again['running'])
                self.assertIs(server.polls.poll,poll)
                self.assertTrue(request('GET')[1]['running'])
            finally:
                server.shutdown();server.server_close();server.polls.close()


if __name__ == '__main__':
    unittest.main()
