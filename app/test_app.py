import os
import datamodel as dm
from nose.tools import *
import unittest
import pymongo
import mementa
import datamodel as dm
import iso8601

import simplejson as json
import time


user_password = "testing"
    
def create_users(conn):



    users = ['eric', 'cap', 'vimal', 'chicken']
    user_oids = {}
    
    for u in users:

        pw_hash = mementa.saltpassword(user_password,
                                       mementa.PASSWORDSALT)
        
        user = dm.user_create(u, pw_hash)
        
        db = conn[mementa.app.config['DB_DATABASE']]
        uoid = db.users.insert(user)
        
        user_oids[u] = uoid
    return user_oids


    
class MementaTestCase(unittest.TestCase):

    def __init__(self, otherarg):
        unittest.TestCase.__init__(self, otherarg)
        
        
    def setUp(self):
        mementa.app.config['DB_DATABASE'] = "LALALA"
        mementa.app.config['TESTING'] = True
        

        self.conn = pymongo.Connection()
        self.user_oids = create_users(self.conn)
        

        self.user_password = user_password
        self.user_name = "eric"

        
        self.app = mementa.app.test_client()

    def tearDown(self):
        self.conn.drop_database(mementa.app.config['DB_DATABASE'])
        

    def login(self, username, password):
        return self.app.post('/login', data=dict(
            username=username,
            password=password
        ), follow_redirects=True)

    def logout(self):
        return self.app.get('/logout', follow_redirects=True)




    def post_json(self, url, data):

        return self.app.post(url, data=json.dumps(data),
                             content_type="application/json")

    def test_login(self):
        self.login(self.user_name, self.user_password)
        
        rv = self.app.get("/test")

        assert "login successful" in rv.data

    def test_create_text_entry(self):
        self.login(self.user_name, self.user_password)

        body = "11, 22, 33, 44"
        title = "This is a title"
        rv = self.post_json("/api/entry/text/new",
                           {'title' : title,'body' : body})

        
        rv_json = json.loads(rv.data)
        assert_equal(rv_json['revision']['body'], body)
        assert_equal(rv_json['revision']['title'], title)
        
        rv = self.app.get("/api/entry/%s" % rv_json['entry']['_id'])
        rv_json = json.loads(rv.data)
        assert_equal(rv_json['revision']['body'], body)
        
    
    def test_create_page(self):
        """


        """
        
        self.login(self.user_name, self.user_password)

        # create empty page
        title = "Empty Page"
        rv = self.post_json("/api/page/new", data={'title' : title, 
                                                  'entries' : None})

        rv_json = json.loads(rv.data)

        assert_equal(rv_json['revision']['title'], title)
        
        # create page with one doc

        rv = self.post_json("/api/entry/text/new", data={'title' : "Page Title 1", 
                                                        'body' : "Body Body"})
        rv_json = json.loads(rv.data)

        page_id = rv_json['entry']['_id']

                
        title = "non-Empty Page"
        rv = self.post_json("/api/page/new",
                           data={'title' : title, 
                                 'entries' : [{'entry' : page_id,
                                               'hidden' : True}] })
        
        rv_json = json.loads(rv.data)
        
        
        
    def test_page_mutate(self):
        """
        Simple page mutation tests. No concurrency tests.

        """


        # create the page with one entry
        # 

        self.login(self.user_name, self.user_password)

        # create empty page
        title = "Empty Page One"
        rv = self.post_json("/api/page/new", data={'title' : title, 
                                                  'entries' : None})

        rv_json = json.loads(rv.data)
        page_rev_id = rv_json['entry']['head']
        entry_id = rv_json['entry']['_id']

        # try and do an update
        rv = self.post_json("/api/page/%s" % entry_id,
                            data = {'old_rev_id' : page_rev_id,
                                    'doc' : {'title':  "THIS IS A NEW TITLE", 
                                             'entries' : []}})
        
        rv_json = json.loads(rv.data)
        assert(rv_json['latest_page_revision_doc']['title'] == "THIS IS A NEW TITLE")

        # now this update should fail; out of date rev
        rv = self.post_json("/api/page/%s" % entry_id,
                            data = {'old_rev_id' : page_rev_id,
                                    'doc' : {'title':  "THIS IS A NEW TITLE 2", 
                                             'entries' : []}})
        assert_equal(rv.status, '400')

        rv_json = json.loads(rv.data)
        assert_equal(rv_json['reason'], "Incorrect latest")
        
                     
    def test_entry_text_mutate(self):
        """
        Simple text entry mutation tests. No concurrency tests.

        """


        # create the page with one entry
        # 

        self.login(self.user_name, self.user_password)

        # create empty page
        title = "Test text entry"
        body = "test body"
        rv = self.post_json("/api/entry/text/new",
                            data={'title' : title, 
                                  'body' : body})

        rv_json = json.loads(rv.data)
        page_rev_id = rv_json['entry']['head']
        entry_id = rv_json['entry']['_id']

        rv = self.app.get("/api/entry/%s" % entry_id)
        rv_json =  json.loads(rv.data)
        assert_equal(rv_json['revision']['title'], title)

        
        # try and do an update
        rv = self.post_json("/api/entry/%s" % entry_id,
                            data = {'parent' : page_rev_id,
                                    'title':  "THIS IS A NEW TITLE",
                                    'class' : 'text', 
                                    'body' : "NEW BODY"})

        rv_json = json.loads(rv.data)
        assert(rv_json['latest_revision_doc']['title'] == "THIS IS A NEW TITLE")

        # now this update should fail; out of date rev
        rv = self.post_json("/api/entry/%s" % entry_id,
                            data = {'parent' : page_rev_id,
                                    'title':  "THIS IS A NEW TITLE 2",
                                    'body' : "wooo",
                                    'class' : 'text'})
                                    
        assert_equal(rv.status, '400')

        rv_json = json.loads(rv.data)
        assert_equal(rv_json['reason'], "Incorrect latest")
        
                     
    def test_query_sort(self):
        """
        Create a bunch of entries and pages and then validate that search works
        correctly on them

        """

        text_entries_all = {}
        page_entries_all = {}

        ENTRY_N = 40
        PAGE_N = 20

        for user, oid  in self.user_oids.iteritems():
            self.login(user, self.user_password)

            text_entries = []
            for d in range(ENTRY_N):
                title = "Text entry title %s %d" % (user, d)
                rv = self.post_json("/api/entry/text/new", data={'title' : title,
                                                                 'body' : "Body Body"})
                rv_json = json.loads(rv.data)

                id = rv_json['entry']['_id']

                text_entries.append(id)

            text_entries_all[user] = text_entries
            
            
            page_entries = []
            
            for d in range(PAGE_N):
                title = "Page entry title %s %d" % (user, d)
                
                rv = self.post_json("/api/page/new", data={'title' : title, 
                                                  'entries' : text_entries})

                rv_json = json.loads(rv.data)

                page_entries.append(rv_json['entry']['_id'])

            page_entries_all[user] = page_entries

        # now test

        url = "/api/list/entries"
        for user, oid in self.user_oids.iteritems():
            rv = self.app.get(url + "?author=%s" % str(oid ))
            rv_json = json.loads(rv.data)
            assert_equal(len(rv_json['results']), ENTRY_N + PAGE_N)
            
            rv = self.app.get(url + "?author=%s&class=page" % str(oid ))
            rv_json = json.loads(rv.data)
            assert_equal(len(rv_json['results']), PAGE_N)

            rv = self.app.get(url + "?author=%s&class=notpage" % str(oid ))
            rv_json = json.loads(rv.data)
            assert_equal(len(rv_json['results']), ENTRY_N)

            rv = self.app.get(url + "?author=%s&class=text" % str(oid ))
            rv_json = json.loads(rv.data)
            assert_equal(len(rv_json['results']), ENTRY_N)


            rv = self.app.get(url + "?author=%s&limit=17" % str(oid ))
            rv_json = json.loads(rv.data)
            assert_equal(len(rv_json['results']), 17)

            # assert ordering

            
            # check ordering
        rv = self.app.get(url)
        rv_data = json.loads(rv.data)
        last = None
        for d in rv_data['results']:
            dt = iso8601.parse_date(d['date'] + "Z")
            if last != None:
                ok_(dt < last)
                
            last = dt

        #time.sleep(1000)
                
            
