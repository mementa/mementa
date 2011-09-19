"""
The purpose of this file is to create a legitimate synthetic user
experience in a notebook to test interface scalability, etc.

"""

import pymongo
import bson
import sys
sys.path.append("..")


import text_entries
import wikipediatest

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
    
mongoconn.drop_database(DATABASE)

db = mongoconn[DATABASE]

users = {}

for user, pw, name, email, twitter in \
    [('eric', 'password', 'Eric Jonas', 'jonas@ericjonas.com', 'stochastician'),
     ('cap', 'password', 'Cap Petschulat', 'zfcd21@gmail.com', 'cpets'),
     ('astronut', 'password', 'Erica Peterson', 'astronut@mit.edu', 'probabilistic')]:

    pwsalt = mementa.saltpassword(pw, mementa.PASSWORDSALT)
    u1 = dm.user_create(user, pwsalt, name, email, twitter=twitter)
    u1oid = db.users.insert(u1)
    users[user] = u1oid
    
def simple_text_entry(db, user_oid, title, body):
    """
    Simple creation of text entry with only one revision, using title string and body string.
    
    """
    
    
    t = dm.text_entry_revision_create(title, body)
    
    t.update(dm.revision_create(user_oid))
    
    toid = db.revisions.insert(t)
    t['_id'] = toid
            
    e = dm.entry_create(toid, t['class'], t)
    
    eoid = db.entries.insert(e)
    return eoid

def simple_page_create(db, user_oid, title, entry_oid_list, tags=None):
    """
    Create a page with the list of entries, all visible, unpinned
    """

    entries = [{'entry' : bson.dbref.DBRef("entries", e),
                'hidden' : False} for e in entry_oid_list]

    p = dm.page_entry_revision_create(title, entries)
    
    p.update(dm.revision_create(user_oid, tags=tags))

    poid = db.revisions.insert(p)
    p["_id"] = poid

    e = dm.entry_create(poid, p['class'], p)
    eoid = db.entries.insert(e)
    
    return eoid

# now we proudly create a collection of entries and keep them around for a bit

mathjax_entries = [simple_text_entry(db, users['eric'], e['title'], e['body']) for e in text_entries.mathjax()]


# now create a page with these entries
simple_page_create(db, users['eric'], "MathJax Examples", mathjax_entries)


wikipedia_articles = [
    "Bayes'_theorem",
    "Stochastic_process",
    "Markov_chain_Monte_Carlo",
    "Particle_filter",
    "Monte_Carlo_method",
    "Nicholas_Metropolis",
    "Abelian_group",
    "Mathematical_joke",
    "Probability",
    "Linear_algebra",
    "Eigenvalues_and_eigenvectors",
    "Momentum_operator",
    "Fourier_transform"
    ]
for wikipedia_title in wikipedia_articles:
    print "Creating page for", wikipedia_title, "="*40
    
    page_title = wikipedia_title.replace("_", " ")

    psecs =  wikipediatest.get_page(wikipedia_title)
    entries = [simple_text_entry(db, users['eric'], e['title'], e['body']) for e in psecs]

    tags = [x.strip() for x in psecs[0]['textonly'].split(" ")[:5]]
    print "TAGS=", tags
    
    simple_page_create(db, users['eric'], page_title, entries, tags)
