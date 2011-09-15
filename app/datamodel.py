import datetime
import bson

"""
Datamodel notes:

users live in a collection named "users"
entries live in a collection named "entries"
revisions live in a collection named "revisions"



"""


def user_create(username, password, name=None, email=None,
                twitter = None, avatar = (None, None)):
    """
    username: globally-unique username
    name : ideally real name. used for display porpoises
    email : preferred e-mail address
    twitter : twitter handle
    avatar : ('uploaded', location),
             ('gravitar', gravatarhash),
             ('url', arbitrary URL)

    """

    
    return {'username' : username,
            'password' : password,
            'name' : name,
            'password' : password,
            'email' : email,
            'twitter' : twitter,
            'avatar' : avatar}

    
def revision_create(author, date= None, parent=None, archived=False):
    """
    do smart things with date, parent, author 

    """
    if date == None:
        date = datetime.datetime.utcnow()

    if not isinstance(author, bson.dbref.DBRef):
        if not isinstance(author, bson.objectid.ObjectId):
            author = bson.objectid.ObjectId(author)
        author = bson.dbref.DBRef("users", author)

    if parent != None and not isinstance(parent, bson.dbref.DBRef):
        if not isinstance(parent, bson.objectid.ObjectId):
            parent = bson.objectid.ObjectId(parent)
        parent = bson.dbref.DBRef("revisions", parent)
        
    return {'author' : author,
            'parent' : parent,
            'date' : date,
            'archived' : archived}

def entry_create(head, dclass, revdoc):
    """
    An entry contains:
    class: the class of the entry [text, etc]
    head: a dbref to the most recent head document
    revdoc: the included head document, for denormalization / query

    """

    
    if not isinstance(head, bson.dbref.DBRef):
        if not isinstance(head, bson.objectid.ObjectId):
            head = bson.objectid.ObjectId(head)

        head = bson.dbref.DBRef("revisions", head)
        
    return {'head' : head,
            'class' : dclass,
            'revdoc' : revdoc}


def text_entry_revision_create(title, body, **kargs) :

    return {'title' : title,
            'body' : body,
            'class' : "text"}

def page_entry_revision_create(title, entries, **kargs) :
    """
    entries is a list of {'entry' : dbref to doc,
                          'hidden' : boolean,
                          'rev' : dbref to revision (only present if pinned)}

    """
        
    return {'title' : title,
            'entries' : entries,
            'class' : "page"}

def page_rev_to_json(page):
    """
    replaces all the dblinks in the page with simple strings
    """

    new_page_json = {}
    for k, v in page.iteritems():
        if k == "entries":
            # god this is gross
            entries = []
            for e in v:
                ed = {}
                for ke, kv in e.iteritems():
                    if ke == 'entry':
                        ed[ke] = str(kv.id)
                    else:
                        ed[ke] = kv
                entries.append(ed)
            new_page_json['entries'] =  entries
        elif k == "author":
            new_page_json['author'] = str(v.id)
        elif k == "parent":
            if v:
                new_page_json['parent'] = str(v.id)
        elif k == "_id":
            new_page_json['_id'] = str(v)
        elif k == "date":
            new_page_json['date'] = v.isoformat()
        else:
            new_page_json[k] = v

    return new_page_json

def entry_text_rev_to_json(text):
    new_entry_json = {}
    for k, v in text.iteritems():
        if k == "author":
            new_entry_json['author'] = str(v.id)
        elif k == "parent":
            if v:
                new_entry_json['parent'] = str(v.id)
        elif k == "_id":
            new_entry_json['_id'] = str(v)
        elif k == "date":
            new_entry_json['date'] = v.isoformat()
        else:
            new_entry_json[k] = v
            
    return new_entry_json    

def entry_to_json(entry_doc):
    """
    Does not currently return the included (denormed) doc
    """
    
    return {'_id' : str(entry_doc['_id']),
            'head' : str(entry_doc['head'].id),
            'class' : entry_doc['class']}


   
rev_to_json = {'page' : page_rev_to_json,
               'text' : entry_text_rev_to_json }

