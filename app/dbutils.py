
import pymongo
import bson
import sys

from app import mementa
from app import datamodel as dm

def appmain():

    if len(sys.argv) > 1:
        dburl = sys.argv[1]
    else:
        dburl = None


    DATABASE = 'testdb'
    if dburl:
        mongoconn = pymongo.Connection(dburl)
    else:
        mongoconn = pymongo.Connection()


def create_indices(db):

    
    # tag index
    db.tags.create_index('tag', unique=True)
    db.tags.create_index('count')
    db.tags.create_index([('tag', pymongo.ASCENDING), 
                          ('count', pymongo.DESCENDING)])
    
