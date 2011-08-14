import pymongo
import bson
import datamodel as dm


DATABASE = 'testdb'
mongoconn = pymongo.Connection()
mongoconn.drop_database(DATABASE)

db = mongoconn[DATABASE]

col_user = db['users']
col_entries = db['entries']
col_versions = db['versions']


u1 = dm.create_user("eric", "test", "Eric Jonas", "jonas@ericjonas.com")
u1oid = col_user.insert(u1)
print u1oid

u2 = dm.create_user("cap", "test", "Cap Petschulat", "zfcd21@gmail.com")
u2oid = col_user.insert(u2)
print u2oid

t = dm.text_entry_version_create("Hello World", "This is some <b>EXCITING TEXT</b>")
u1ref = bson.dbref.DBRef("users", u1oid)

t.update(dm.entry_version_create(u1ref))

toid = col_versions.insert(t)
print toid

tref = bson.dbref.DBRef("versions", toid)

e = dm.create_entry(tref)
col_entries.insert(e)

print e
