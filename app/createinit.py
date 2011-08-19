import pymongo
import bson
import datamodel as dm


DATABASE = 'testdb'
mongoconn = pymongo.Connection()
mongoconn.drop_database(DATABASE)

db = mongoconn[DATABASE]

col_user = db['users']
col_entries = db['entries']
col_revisions = db['revisions']


u1 = dm.user_create("eric", "test", "Eric Jonas", "jonas@ericjonas.com")
u1oid = col_user.insert(u1)
print u1oid

u2 = dm.user_create("cap", "test", "Cap Petschulat", "zfcd21@gmail.com")
u2oid = col_user.insert(u2)
print u2oid

docs_to_create = {'Hello World 1' : 3,
                  'Goodbye World' : 2,
                  'THis is a test' : 5}

entries = []

for title, revisions in docs_to_create.iteritems():

    parent = None
    for r in range(revisions):
        
        t = dm.text_entry_revision_create(title,
                                          "This is some <b>EXCITING TEXT</b> %d" % r)
        
        u1ref = bson.dbref.DBRef("users", u1oid)

        t.update(dm.revision_create(u1ref, parent=parent))

        toid = col_revisions.insert(t)

        tref = bson.dbref.DBRef("revisions", toid)
        parent = tref
        
    e = dm.entry_create(tref, t['class'])
    eoid = col_entries.insert(e)
    entries.append(bson.dbref.DBRef("entries", eoid))
                   


p = dm.page_entry_revision_create("This is a title for a page", entries, [])
p.update(dm.revision_create(u1ref))

poid = col_revisions.insert(p)

tref = bson.dbref.DBRef("revisions", poid)
        
e = dm.entry_create(tref, p['class'])
eoid = col_entries.insert(e)


