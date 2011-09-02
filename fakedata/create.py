"""
The purpose of this file is to create a legitimate synthetic user
experience in a notebook to test interface scalability, etc.

"""

import text_entries

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

pw = mementa.saltpassword("password", mementa.PASSWORDSALT)

users = {}

for user, pw, name, email, twitter in \
    [('eric', 'password', 'Eric Jonas', 'jonas@ericjonas.com', 'stochastician'),
     ('cap', 'password', 'Cap Petschulat', 'zfcd21@gmail.com', 'cpets'),
     ('astronut', 'password', 'Erica Peterson', 'astronut@mit.edu', 'probabilistic')]:
    
    u1 = dm.user_create(user, pw, name, email, twitter=twitter)
    u1oid = db.users.insert(u1)
    users[user] = u1oid


# now we proudly create a collection of entries and keep them around for a bit

