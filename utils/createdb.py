
import pymongo
import bson
import sys

from app import mementa
from app import datamodel as dm


if len(sys.argv) > 1:
    dburl = sys.argv[1]
else:
    dburl = None
    

DATABASE = 'testdb'
if dburl:
    mongoconn = pymongo.Connection(dburl)
else:
    mongoconn = pymongo.Connection()
