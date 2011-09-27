from nose.tools import *
import os
import unittest
import pymongo
import gridfs
import iso8601
import tempfile
import shutil
import bson

import simplejson as json
import time
import mimetypes
import figure


TESTDB = "FIG_TESTDB"
TESTDIR = "testfigs"

def generate_oid(i):
    return bson.objectid.ObjectId("0"*22 + "%02d" % i)


def create_fig(figure_filename, db):
    gf = gridfs.GridFS(db)
    
    mimetype = mimetypes.guess_type(figure_filename)


    f = gf.new_file(content_type=mimetype)
    
    f.write(file(figure_filename).read())
    f.close()
    
    return f._id
               

class FigureTestCase(unittest.TestCase):

    def __init__(self, otherarg):
        unittest.TestCase.__init__(self, otherarg)
        
        
    def setUp(self):
        self.conn = pymongo.Connection()
        self.db = self.conn[TESTDB]
        self.tempdir = tempfile.mkdtemp()
        

    def tearDown(self):
        self.conn.drop_database(TESTDB)
        
    
    def test_convert_primitives(self):
        f_id = create_fig("testfigs/test1.pdf", self.db)

        reqdoc = {'_id' : generate_oid(0), 
                  'source' : f_id,
                  'outputformat' : 'png',
                  'max' : {'height' : 600,
                           'width' : 300}}
        figure.conversion_start(self.db, reqdoc, 
                                self.tempdir)
        
        
        while True:
            r = figure.conversion_check_done(self.db, reqdoc, self.tempdir)
            
            if r['done'] :
                break
            time.sleep(0.5)
        assert_equal(r['done'], True)
        shutil.copyfile(r['filename'], "/tmp/test.png")

        print "R=", r
        figure.conversion_cleanup(reqdoc, self.tempdir)
                
    def test_convert_1(self):
        
        f_id = create_fig("testfigs/test1.pdf", self.db)

        reqdoc = {
            'outputformat' : 'png',
            'max' : {'height' : 600,
                     'width' : 300}}

        x = figure.convert_request(self.db.fs, f_id, reqdoc, self.tempdir)

        # this should be the first of these requests, so
        assert_equal(x['state'], 'pending')
        assert_equal(x['source'], f_id)
        assert_equal(x['type'], 'conversion')
        assert_equal(x['outputformat'], 'png')
        
        # try again, should trigger a check
        while True:
            x = figure.convert_request(self.db.fs, f_id, reqdoc, self.tempdir)

            time.sleep(1)
            if x['state'] == 'done' :
                break

        assert_equal(x['error'], None)
        # get the id of the new doc
        g = gridfs.GridFS(self.db)
        f = g.get(x['output'])
        file("/tmp/test2.png", 'w').write(f.read())
        
