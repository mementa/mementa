import pymongo
import datamodel as dm

DATABASE = 'testdb'
mongoconn = pymongo.Connection()
db = mongoconn[DATABASE]
