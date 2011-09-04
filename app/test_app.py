import os
import datamodel as dm
from nose.tools import *
import unittest
import pymongo
import mementa
import datamodel as dm

import simplejson as json


class MementaTestCase(unittest.TestCase):
        
    def setUp(self):
        mementa.app.config['DB_DATABASE'] = "LALALA"
        mementa.app.config['TESTING'] = True
        self.conn = pymongo.Connection()
        self.conn[mementa.app.config['DB_DATABASE']].dummycol.insert({'dummydoc' : True})

        self.user_name = "eric"
        self.user_password = "testing"
        pw_hash = mementa.saltpassword(self.user_password, mementa.PASSWORDSALT)
        
        user = dm.user_create(self.user_name, pw_hash)
        
        db = self.conn[mementa.app.config['DB_DATABASE']]
        db.users.insert(user)

        
        self. app = mementa.app.test_client()

    def teardown(self):
        self.conn.drop_database(mementa.app.config['DB_DATABASE'])

        pass

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
        
                     
