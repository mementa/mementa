import pymongo
import bson
import datamodel as dm
import randomtext

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
                  'This is a test' : 5,
                  "And here is some more": 4}

entries = []


for title, revisions in docs_to_create.iteritems():

    parent = None
    for r in range(revisions):

        rt = randomtext.text[revisions]
        t = dm.text_entry_revision_create(title,
                                          rt)        
        t.update(dm.revision_create(u1oid, parent=parent))

        toid = col_revisions.insert(t)

        parent = toid
        
    e = dm.entry_create(toid, t['class'])
    eoid = col_entries.insert(e)
    entries.append({'entry' : bson.dbref.DBRef("entries", eoid),
                    'hidden' : False})


p = dm.page_entry_revision_create("This is a title for a page", entries)
p.update(dm.revision_create(u1oid))

poid = col_revisions.insert(p)
        
e = dm.entry_create(poid, p['class'])
eoid = col_entries.insert(e)




                           
