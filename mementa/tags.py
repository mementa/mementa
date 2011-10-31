import pymongo



def inc_tag(db, tag):
    """
    Increment the tag count if it exists, create it and set it to one if not
    
    """
    db.tags.update({'tag' : tag},
                   {"$inc" : {"count" : 1}}, True) 

def dec_tag(db, tag):
    """
    Decrement the tag

    """
    db.tags.update({'tag' : tag},
                   {"$inc" : {"count" : -1}})

def count(db, tag):
    r = db.tags.find({'tag' : tag})
    if r.count() == 0:
        return 0

    return r[0]['count']
    
def top_n(db, N):
    r = db.tags.find({}, sort = [('count', pymongo.DESCENDING)], limit=N)
    return [t for t in r]


def top_n_str(db, s, N):
    r = db.tags.find({'tag' : {"$regex": "^%s*" % s , "$options": "i" }},
                     sort = [('count', pymongo.DESCENDING)], limit=N)

    return [t for t in r]
        

def tagdelta(old, new):
    """
    returns two lists:
    tags in new but not old
    tags in old but not new
    
    """

    return list(set(new) - set(old)), list(set(old) - set(new))
