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
import dbutils
from contextlib import contextmanager

user_password = "testing"

NBBASENAME = "testapp"

def generate_oid(i):
    return "0"*22 + "%02d" % i
    

def create_users(conn):



    users = ['eric', 'cap', 'vimal', 'chicken']
    user_oids = {}
    
    for u in users:

        pw_hash = mementa.saltpassword(user_password,
                                       mementa.PASSWORDSALT)
        
        user = dm.user_create(u, pw_hash)
        
        db = conn[mementa.app.config['DB_SYSTEM_DATABASE']]
        uoid = db.users.insert(user)
        
        user_oids[u] = uoid
    return user_oids


@contextmanager
def newnotebook(self, name):
    print "Creating nb name=", name
    rv = self.post_json("/api/notebookadmin/new",
                        {'name' : name,
                         'title' : "title-" + name})
    print rv.data
    assert_equal(rv.status_code, 200)
    
    assert_equal(json.loads(rv.data)['name'], name)

    # add users

    
    yield 

    self.notebooks.append(name)
    

class MementaTestCase(unittest.TestCase):

    def __init__(self, otherarg):
        unittest.TestCase.__init__(self, otherarg)
        
        
    def setUp(self):
        mementa.app.config['DB_SYSTEM_DATABASE'] = "LALALA"
        mementa.app.config['TESTING'] = True
        

        self.conn = pymongo.Connection()
        self.sysdb = self.conn[mementa.app.config['DB_SYSTEM_DATABASE']]
        dbutils.create_system_indices(self.sysdb)
        
        self.user_oids = create_users(self.conn)
        

        self.user_password = user_password
        self.user_name = "eric"

        
        self.app = mementa.app.test_client()
        self.notebooks = []
        
    def tearDown(self):
        self.conn.drop_database(mementa.app.config['DB_SYSTEM_DATABASE'])
        for s in self.notebooks:
            self.conn.drop_database("notebook:" + s)
            self.conn.drop_database(s)
            

    def login(self, username, password):
        return self.app.post('/login', data=dict(
            username=username,
            password=password
        ), follow_redirects=True)

    def logout(self):
        return self.app.get('/logout', follow_redirects=True)



    def get_json(self, url):
        return self.app.get(url, content_type="application/json")
        
    def post_json(self, url, data):

        return self.app.post(url, data=json.dumps(data),
                             content_type="application/json")

    def test_login(self):
        self.login(self.user_name, self.user_password)
        
        rv = self.app.get("/test")

        assert "login successful" in rv.data

    def test_create_notebook(self):
        self.login(self.user_name, self.user_password)

        body = "11, 22, 33, 44"
        title = "This is a title"
        name = NBBASENAME + "testnotebook1"
        rv = self.post_json("/api/notebookadmin/new",
                            {'name' : name, 
                             'title' : title})
        
        assert_equal(json.loads(rv.data)['name'], name)
        rv = self.post_json("/api/notebookadmin/new",
                            {'name' : name, 
                             'title' : title})
        
        assert_equal(rv.status_code, 409)

        # now check get-notebook code

        rv = self.get_json("/api/%s/config" % name)

        rvd = json.loads(rv.data)
        assert_equal(rvd['notebook']['name'], name)
        
        
        self.notebooks = [name]  # for cleanup

    def test_mutate_notebook(self):
        self.login(self.user_name, self.user_password)

        body = "11, 22, 33, 44"
        title = "This is a title"
        name = NBBASENAME + "testnotebook1"
        rv = self.post_json("/api/notebookadmin/new",
                            {'name' : name, 
                             'title' : title})
        

        rv = self.get_json("/api/%s/config" % name)

        rvd = json.loads(rv.data)
        assert_equal(rvd['notebook']['title'], title)

        # Mutate the title
        newtitle = "This is the new title"
        
        rv = self.post_json('/api/%s/config' % name,
                             {'title' : newtitle})
        rvd = json.loads(rv.data)
        assert_equal(rvd['notebook']['title'], newtitle)
        
        rv = self.get_json("/api/%s/config" % name)
        rvd = json.loads(rv.data)
        assert_equal(rvd['notebook']['title'], newtitle)

        users = rvd['notebook']['users']
        uid = self.user_oids['cap']
        users.append(str(uid))
        rv = self.post_json('/api/%s/config' % name,
                            {'users' : users})

        rvd = json.loads(rv.data)
        assert(str(uid) in rvd['notebook']['users'])
        
        self.notebooks = [name]  # for cleanup

        
    def test_create_text_entry(self):
        self.login(self.user_name, self.user_password)

        nbname = NBBASENAME + "testnotebook1"
        with newnotebook(self, nbname):
            body = "11, 22, 33, 44"
            title = "This is a title"
            rv = self.post_json("/api/%s/entry/new" % nbname,
                               {'class' : 'text',
                                'title' : title,'body' : body})


            rv_json = json.loads(rv.data)
            assert_equal(rv_json['revision']['body'], body)
            assert_equal(rv_json['revision']['title'], title)

            rv = self.app.get("/api/%s/entry/%s" % (nbname, rv_json['entry']['_id']))
            rv_json = json.loads(rv.data)
            assert_equal(rv_json['revision']['body'], body)
            pass
    
    def test_create_figure_entry(self):
        self.login(self.user_name, self.user_password)

        nbname = NBBASENAME + "testfigcreate"
        with newnotebook(self, nbname):
            title = "This is a title"
            caption = "new caption"
            print "POSTING JSON"
            rv = self.post_json("/api/%s/entry/new" % nbname,
                               {'class' : 'figure',
                                'title' : title,
                                'caption' : caption,
                                'images' : []})
            print "Posted JSON" 

            rv_json = json.loads(rv.data)
            assert_equal(rv_json['revision']['caption'], caption)
            assert_equal(rv_json['revision']['title'], title)
            assert_equal(rv_json['revision']['images'], [])

            rv = self.app.get("/api/%s/entry/%s" % (nbname, rv_json['entry']['_id']))
            rv_json = json.loads(rv.data)
            assert_equal(rv_json['revision']['caption'], caption)
            pass

    def test_create_page(self):
        """


        """
        
        self.login(self.user_name, self.user_password)

        nbname = NBBASENAME + "testnotebook2" 
        with newnotebook(self, nbname):
            # create empty page
            title = "Empty Page"
            rv = self.post_json("/api/%s/entry/new" % nbname,
                                data={'class' : 'page',
                                      'title' : title, 
                                      'entries' : None})

            rv_json = json.loads(rv.data)

            assert_equal(rv_json['revision']['title'], title)

            # create page with one doc

            rv = self.post_json("/api/%s/entry/new" % nbname,
                                data={'class'  : "text",
                                      'title' : "Page Title 1", 
                                      'body' : "Body Body"})

            rv_json = json.loads(rv.data)

            page_id = rv_json['entry']['_id']


            title = "non-Empty Page"
            rv = self.post_json("/api/%s/entry/new" % nbname,
                               data={'title' : title,
                                     'class' : 'page', 
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
        nbname = NBBASENAME + "testpagemutate"
        
        with newnotebook(self, nbname) : 
            # create empty page
            title = "Empty Page One"
            rv = self.post_json("/api/%s/entry/new" % nbname,
                                data={'title' : title,
                                      'class' : 'page', 
                                      'entries' : None})


            rv_json = json.loads(rv.data)
            page_rev_id = rv_json['entry']['head']
            entry_id = rv_json['entry']['_id']

            # try and do an update
            rv = self.post_json("/api/%s/entry/%s" % (nbname, entry_id),
                                data = {'title':  "THIS IS A NEW TITLE", 
                                        'entries' : [],
                                        'class' : 'page', 
                                        'parent' : page_rev_id})

            rv_json = json.loads(rv.data)
            assert(rv_json['latest_revision_doc']['title'] == "THIS IS A NEW TITLE")

            # now this update should fail; out of date rev
            rv = self.post_json("/api/%s/entry/%s" % (nbname, entry_id),
                                data = 
                                        {'title':  "THIS IS A NEW TITLE 2", 
                                         'entries' : [],
                                         'class' : 'page',
                                         'parent' : page_rev_id})
            assert_equal(rv.status_code, 409)

                     
    def test_entry_text_mutate(self):
        """
        Simple text entry mutation tests. No concurrency tests.

        """


        # create the page with one entry
        # 

        self.login(self.user_name, self.user_password)

        nbname = NBBASENAME + "test1"
        with newnotebook(self, nbname):
            # create empty page
            title = "Test text entry"
            body = "test body"
            rv = self.post_json("/api/%s/entry/new" % nbname,
                                data={'title' : title,
                                      'class' : 'text', 
                                      'body' : body,
                                      'tags' : ['foo', 'bar']})


            rv_json = json.loads(rv.data)
            page_rev_id = rv_json['entry']['head']
            entry_id = rv_json['entry']['_id']

            rv = self.app.get("/api/%s/entry/%s" % (nbname, entry_id))
            rv_json =  json.loads(rv.data)
            assert_equal(rv_json['revision']['title'], title)


            # try and do an update
            rv = self.post_json("/api/%s/entry/%s" % (nbname, entry_id),
                                data = {'parent' : page_rev_id,
                                        'title':  "THIS IS A NEW TITLE",
                                        'class' : 'text', 
                                        'body' : "NEW BODY"})

            rv_json = json.loads(rv.data)
            assert(rv_json['latest_revision_doc']['title'] == "THIS IS A NEW TITLE")

            # now this update should fail; out of date rev
            rv = self.post_json("/api/%s/entry/%s" % (nbname, entry_id),
                                data = {'parent' : page_rev_id,
                                        'title':  "THIS IS A NEW TITLE 2",
                                        'body' : "wooo",
                                        'class' : 'text'})


            assert_equal(rv.status_code, 409)
            
            rv_json = json.loads(rv.data)
            assert_equal(rv_json['reason'], "Incorrect latest")


    def test_entry_figure_mutate(self):
        """
        Simple figure entry mutation tests. No concurrency tests.

        """


        # create the page with one entry
        # 

        self.login(self.user_name, self.user_password)

        nbname = NBBASENAME + "test1figure"
        with newnotebook(self, nbname):
            # create empty page
            title = "Test text entry"
            caption = "test caption"
            images = [{'id' : generate_oid(0)},
                      {'id' : generate_oid(1)}]
            rv = self.post_json("/api/%s/entry/new" % nbname,
                                data={'title' : title,
                                      'class' : 'figure', 
                                      'caption' : caption,
                                      'maxsize' : {'x' : 100, 'y' : 200},
                                      'images' : images,
                                      'gallery' : True, 
                                      'tags' : ['foo', 'bar']})


            rv_json = json.loads(rv.data)
            page_rev_id = rv_json['entry']['head']
            entry_id = rv_json['entry']['_id']

            rv = self.app.get("/api/%s/entry/%s" % (nbname, entry_id))
            rv_json =  json.loads(rv.data)
            assert_equal(rv_json['revision']['title'], title)
            assert_equal(rv_json['revision']['gallery'], True)
            assert_equal(rv_json['revision']['images'], images)


            # try and do an update
            images.append({'id' : generate_oid(2)})
            
            rv = self.post_json("/api/%s/entry/%s" % (nbname, entry_id),
                                data={'title' : title + " AND MORE",
                                      'class' : 'figure',
                                      'parent' : page_rev_id, 
                                      'caption' : caption + " MORE CAPTION",
                                      'maxsize' : {'x' : 100, 'y' : 300},
                                      'images' : images,
                                      'gallery' : False, 
                                      'tags' : ['foo', 'bar', 'baz']})

            rv_json = json.loads(rv.data)
            assert_equal(rv_json['latest_revision_doc']['title'],
                         title + " AND MORE")
            assert_equal(rv_json['latest_revision_doc']['caption'],
                         caption + " MORE CAPTION")
                         
            assert_equal(rv_json['latest_revision_doc']['maxsize'],
                         {'x' : 100, 'y' : 300})

            assert_equal(rv_json['latest_revision_doc']['images'],
                         images)
            assert_equal(rv_json['latest_revision_doc']['tags'],
                         ['foo', 'bar', 'baz'])
            
            rv = self.post_json("/api/%s/entry/%s" % (nbname, entry_id),
                                data={'title' : title + " AND MORE",
                                      'class' : 'figure',
                                      'parent' : page_rev_id, 
                                      'caption' : caption + " MORE CAPTION",
                                      'maxsize' : {'x' : 100, 'y' : 300},
                                      'images' : images,
                                      'gallery' : False, 
                                      'tags' : ['foo', 'bar', 'baz']})
            

            assert_equal(rv.status_code, 409)
            
            # rv_json = json.loads(rv.data)
            # assert_equal(rv_json['reason'], "Incorrect latest")

                     
    def test_query_sort(self):
        """
        Create a bunch of entries and pages and then validate that search works
        correctly on them

        """

        nbname = NBBASENAME + "testnb3"

        self.login(self.user_name, self.user_password)

        with newnotebook(self, nbname):
            # take the notebook and add the users
            uoids = [str(u) for n, u in self.user_oids.iteritems()]
            
            rv = self.post_json('/api/%s/config' % nbname,
                                {'users' : uoids})

            
            text_entries_all = {}
            page_entries_all = {}

            ENTRY_N = 40
            PAGE_N = 20

            for user, oid  in self.user_oids.iteritems():
                self.login(user, self.user_password)

                text_entries = []
                for d in range(ENTRY_N):
                    title = "Text entry title %s %d" % (user, d)
                    rv = self.post_json("/api/%s/entry/new" % nbname,
                                        data={'title' : title,
                                              'class' : 'text', 
                                              'body' : "Body Body"})
                    rv_json = json.loads(rv.data)

                    id = rv_json['entry']['_id']

                    text_entries.append({'entry' : id,
                                         'hidden' : False})

                text_entries_all[user] = text_entries


                page_entries = []

                for d in range(PAGE_N):
                    title = "Page entry title %s %d" % (user, d)

                    rv = self.post_json("/api/%s/entry/new" % nbname,
                                        data={'title' : title,
                                              'class' : 'page', 
                                              'entries' : text_entries})

                    rv_json = json.loads(rv.data)

                    page_entries.append(rv_json['entry']['_id'])

                page_entries_all[user] = page_entries

            # now test

            url = "/api/%s/list/entries" % nbname
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
                
    def test_tag_queries_and_updates(self):
        """

        """


        # create the page with one entry
        # 
        nbname = NBBASENAME + "testnb3"

        self.login(self.user_name, self.user_password)

        with newnotebook(self, nbname):


            def get_tag_counts(tlist):
                ts = {}
                for t in tlist:
                    rv = self.app.get("/api/%s/tags/count/%s" % (nbname, t))
                    d = json.loads(rv.data)
                    ts[t] = d['count']
                return ts

            # create empty page
            title = "Test text entry"
            body = "test body"
            rv = self.post_json("/api/%s/entry/new" % nbname,
                                data={'title' : title,
                                      'class' : 'text', 
                                      'body' : body,
                                      'tags' : ['foo', 'bar']})

            rv_json = json.loads(rv.data)
            page_rev_id = rv_json['entry']['head']
            entry_id = rv_json['entry']['_id']

            tc = get_tag_counts(['foo', 'bar', 'baz'])

            assert_equal(tc['foo'], 1)
            assert_equal(tc['bar'], 1)
            assert_equal(tc['baz'], 0)


            self.post_json("/api/%s/entry/new" % nbname,
                                data={'title' : "another title", 
                                      'class' : 'text', 
                                      'body' : body,
                                      'tags' : ['bar', 'baz']})


            tc = get_tag_counts(['foo', 'bar', 'baz'])

            assert_equal(tc['foo'], 1)
            assert_equal(tc['bar'], 2)
            assert_equal(tc['baz'], 1)



            rv = self.app.get("/api/%s/entry/%s" % (nbname, entry_id))

            # try and do an update
            tc = get_tag_counts(['foo', 'bar', 'baz', 'quxx'])



            rv = self.post_json("/api/%s/entry/%s" % (nbname, entry_id),
                                data = {'parent' : page_rev_id,
                                        'title':  "THIS IS A NEW TITLE",
                                        'class' : 'text', 
                                        'body' : "NEW BODY",
                                        'tags' : ['bar', 'quxx']})

            rv_json = json.loads(rv.data)
            assert(rv_json['latest_revision_doc']['title'] == "THIS IS A NEW TITLE")

            tc = get_tag_counts(['foo', 'bar', 'baz', 'quxx'])

            assert_equal(tc['foo'], 0)
            assert_equal(tc['bar'], 2)
            assert_equal(tc['baz'], 1)
            assert_equal(tc['quxx'], 1)

            # now check queries
            rv_json = json.loads(self.app.get("/api/%s/tags/all/3" % nbname).data)
            tc = rv_json['tagcounts']
            assert_equal(tc[0], ['bar', 2])
            assert_equal(len(tc), 3)


            rv_json = json.loads(self.app.get("/api/%s/tags/subset/ba/2" % nbname).data)
            tc = rv_json['tagcounts']
            assert_equal(tc[0], ['bar', 2])
            assert_equal(tc[1], ['baz', 1])




            # # now this update should fail; out of date rev
            # rv = self.post_json("/api/entry/%s" % entry_id,
            #                     data = {'parent' : page_rev_id,
            #                             'title':  "THIS IS A NEW TITLE 2",
            #                             'body' : "wooo",
            #                             'class' : 'text'})

            # assert_equal(rv.status, "409")

            # rv_json = json.loads(rv.data)
            # assert_equal(rv_json['reason'], "Incorrect latest")
        
                                 
