import pymongo
import bson
import sys
import time



DATABASE = 'testtagdb'
mongoconn = pymongo.Connection()
mongoconn.drop_database(DATABASE)
db = mongoconn[DATABASE]

docs = [{'title' : "doc 1",
         'tags' : ['hello', 'World', 'is', 'great']},
        {'title' : "doc 2",
         'tags' : ['hello', 'world', 'is', 'lame']},
        {'title' : "doc 2",
         'tags' : ['great', 'expectations']},]

for d in docs:
    db.docs.insert(d, safe=True)

print "Searching"

d = []
t1 = time.time()
#for r in db.docs.find({'tags' : {"$all" : ['great', 'hello']}}):

# wow, regexs work

for r in db.docs.find({'tags' : {"$regex": "^wor*", "$options": "i" }}):

    d.append(r)
t2 = time.time()

for r in d:
    print r

    
print "Query completed in", (t2-t1)*1000, "ms"
