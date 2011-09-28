
import pymongo
import bson
import sys

import mementa
import datamodel as dm

def appmain():

    if len(sys.argv) > 1:
        dburl = sys.argv[1]
    else:
        dburl = None

    if dburl:
        mongoconn = pymongo.Connection(dburl)
    else:
        mongoconn = pymongo.Connection()


def create_system_indices(systemdb):
    systemdb.notebooks.create_index('name', unique=True)
    systemdb.notebooks.create_index('dbname', unique=True)
    systemdb.notebooks.create_index('users')
    systemdb.notebooks.create_index('admins')

    systemdb.users.create_index("username", unique=True)
    
    pass


def create_notebook_indices(db):
    
    # tag index
    db.tags.create_index('tag', unique=True)
    db.tags.create_index('count')
    db.tags.create_index([('tag', pymongo.ASCENDING), 
                          ('count', pymongo.DESCENDING)])
    
