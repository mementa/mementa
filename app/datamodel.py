import datetime
import bson

"""
Datamodel notes:

users live in a collection named "users"
entries live in a collection named "entries"
revisions live in a collection named "revisions"



"""


def user_create(username, password, name=None, email=None):
    return {'username' : username,
            'password' : password,
            'name' : name,
            'password' : password}

    
def revision_create(author, date= None, parent=None):
    """
    do smart things with date, parent, author 

    """
    if date == None:
        date = datetime.datetime.utcnow()

    if not isinstance(author, bson.dbref.DBRef):
        author = bson.dbref.DBRef("users", author)

    if parent != None and not isinstance(parent, bson.dbref.DBRef):
        parent = bson.dbref.DBRef("revisions", parent)
        
    return {'author' : author,
            'parent' : parent,
            'date' : date}

def entry_create(head, dclass):
    if not isinstance(head, bson.dbref.DBRef):
        head = bson.dbref.DBRef("revisions", head)
        
    return {'head' : head,
            'class' : dclass}


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
                for ke, kv in e:
                    if ke == 'entry':
                        ed[ke] = kv.id
                    else:
                        ed[ke] = kv
                entries.append(ed)
            new_page_json['entries'] =  entries
        elif k == "author":
            new_page_json['author'] = v.id
        elif k == "parent":
            if v:
                new_page_json['parent'] = v.id
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
            new_entry_json['author'] = v.id
        elif k == "parent":
            if v:
                new_entry_json['parent'] = v.id
        elif k == "_id":
            new_entry_json['_id'] = str(v)
        elif k == "date":
            new_entry_json['date'] = v.isoformat()
        else:
            new_entry_json[k] = v
            
    return new_entry_json    
    
revision_class_create = {'text' : text_entry_revision_create,
                         'page' : page_entry_revision_create}
