import pymongo
import bson
import sys
import time



DATABASE = 'testtagdb'
mongoconn = pymongo.Connection()
mongoconn.drop_database(DATABASE)
db = mongoconn[DATABASE]


def simpletest():
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

def tagcounttest():
    """

    """
    TAGN = 10000;

    
    db.tags.create_index('tag', unique=True)
    db.tags.create_index('count')
    db.tags.create_index([('tag', pymongo.ASCENDING), 
                          ('count', pymongo.DESCENDING)])
    
    fid = file("/usr/share/dict/words")
    words = [x.strip() for x in fid.readlines()]
    print "Done reading words"
    nth = (len(words) / TAGN) -2
    tagwords = []
    for ti in range(TAGN):
        tagwords.append(words[ti * nth])
    tagwords = tagwords[:TAGN]
    assert(len(tagwords) == TAGN)
    print "Done selecting tags"
        
    def create_tags():
        for w in tagwords:
            db.tags.insert({"tag" : w,
                            'count' : 1})

    def inc(tag):
        r = db.tags.update({'tag' : tag}, {"$inc" : {"count" : 1}}, True) #  , safe=True)
        
    t1 = time.time() 
    create_tags()
    t2 = time.time()
    print "Time to create", TAGN, "tags: ", t2-t1, "secs"

    # increment each tag based on its length:
    total_incs = 0
    for w in tagwords:
        l = len(w)
        for li in range(l): 
            inc(w)
            total_incs += 1
    t3 = time.time()
    
    print total_incs, "incs took", t3-t2, "seconds, or ", total_incs/(t3-t2), " incs/sec"
    
    # now an initial search
    # what are the most popular tags?
    for TOPN in [5, 10, 20, 30, 50]:
        t4 = time.time()
        x = []
        r = db.tags.find({}, sort = [('count', pymongo.DESCENDING)], limit=TOPN)
        for i in r:
            x.append(i)
        t5 = time.time()
        print 'getting the top %d tags took' % TOPN, t5-t4, "seconds"

    times = {}
    for query in ["h", "he", "fun", "rob"]:
        t4 = time.time()
        
        x = []
        r = db.tags.find({'tag' : {"$regex": "^%s*" % query , "$options": "i" }},
                         sort = [('count', pymongo.DESCENDING)], limit=30)
        for i in r:
            x.append(i)
        t5 = time.time()
        times[query] = (t5-t4, len(x))

    for q, t in times.iteritems():
        print "Query for", q, "took", t[0], "with ", t[1], "hits"

        
    # gimme the most popular tags
    
