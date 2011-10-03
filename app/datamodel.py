import datetime
import bson

"""
Datamodel notes:

system database, with:
   users live in a collection named "users"
   notebooks living in a collection named "notebooks"
   
entries live in a collection named "entries"
revisions live in a collection named "revisions"



"""

def dbref(collection, oid, database=None):
    """
    Helper function, turns collection and oid strings into the correct
    objects
    

    """
    if not isinstance(oid, bson.objectid.ObjectId):
        oid = bson.objectid.ObjectId(oid)

    return bson.dbref.DBRef(collection, oid, database = database)


def notebook_create(name, dbname, title, users = None, admins = None, archived=False) :
    """

    """

    if users == None:
        raise Exception("must have at least one user")
    
    if admins == None:
        raise Exception("must have at least one admin")

    users_ref = [dbref('users', u) for u in users]
    admins_ref = [dbref('users', u) for u in admins]
    for a in admins_ref:
        if a not in users_ref:
            raise Exception("admin is not in user list")
        
    
    doc = {'name' : name,
           'dbname' : dbname,
           'title' : title,
           'users' :  users_ref,
           'admins' : admins_ref,
           'archived' : archived}
    
    return doc

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
            'email' : email,
            'twitter' : twitter,
            'avatar' : avatar}

    
def revision_create(author, systemdbname,
                    date= None, parent=None, archived=False,
                    tags = None):
    """
    do smart things with date, parent, author 

    """
    if date == None:
        date = datetime.datetime.utcnow()

    author = dbref('users', author, database=systemdbname)

    if parent != None and not isinstance(parent, bson.dbref.DBRef):
        if not isinstance(parent, bson.objectid.ObjectId):
            parent = bson.objectid.ObjectId(parent)
        parent = bson.dbref.DBRef("revisions", parent)

    rdoc =  {'author' : author,
             'parent' : parent,
             'date' : date,
             'archived' : archived}
    if tags:
        rdoc['tags'] = tags
    else:
        rdoc['tags'] = []
        
    return rdoc
    
    
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

def figure_entry_revision_create(title, caption, maxsize = None,
                                 gallery = False,
                                 images = None):
   """
   images are an ordered list of :
   {id : filename,
   caption : caption
   visible : true/false,
   maxsize : {height, width}
   }
   
   """
   if images == None:
      images = []
   
   return {'title' : title,
           'caption' : caption,
           'maxsize' : maxsize, 
           'gallery' : gallery,
           'images' : images, 
           'class' : "figure"}




def page_entry_revision_create(title, entries, **kargs) :
    """
    entries is a list of {'entry' : dbref to doc,
                          'hidden' : boolean,
                          'rev' : dbref to revision (only present if pinned)}

    this func upconverts entry from string to ref
    """
    newentries = []
    for entptr in entries:
        ent = entptr['entry']
        if not isinstance(ent, bson.dbref.DBRef):
            
            if not isinstance(ent, bson.objectid.ObjectId):
                ent = bson.objectid.ObjectId(ent)
            ent = bson.dbref.DBRef("entries", ent)

        r = {'entry' : ent,
             'hidden' : entptr['hidden']}
        if 'rev' in entptr:
            rev = entptr['rev']
            if not isinstance(rev, bson.dbref.DBRef):
            
                if not isinstance(rev, bson.objectid.ObjectId):
                    rev = bson.objectid.ObjectId(rev)
                rev = bson.dbref.DBRef("revisions", rev)
            p['rev'] = rev
        newentries.append(r);

    return {'title' : title,
            'entries' : newentries,
            'class' : 'page'}


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

def entry_figure_rev_to_json(text):
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
        elif k == 'images':
           imgs = []
           for i in v:
              newv = i
              newv['id'] = str(i['id'])
              imgs.append(newv)
           new_entry_json['images'] = imgs
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
               'text' : entry_text_rev_to_json,
               'figure' : entry_figure_rev_to_json}




def entry_text_json_to_rev(jsond) :
    
    title = jsond['title']
    body = jsond['body']

    rev = text_entry_revision_create(title, body)
    
    return rev
 
def entry_figure_json_to_rev(jsond) :
    print "entry_figure_json_to_rev", jsond
    title = jsond['title']
    caption = jsond['caption']
    maxsize = jsond.get("maxsize", None)
    gallery = jsond.get("gallery", False)

    images = []
    for i in jsond['images']:
       ent = i
       ent['id'] = bson.objectid.ObjectId(i['id'])
       images.append(ent)
       
    rev = figure_entry_revision_create(title, caption, maxsize, gallery,
                                      images)
                                      

    return rev

def page_json_to_rev(jsond):

    title = jsond['title']
    entries = jsond['entries']
    if entries == None:
        entries = []
        
    rev = page_entry_revision_create(title, entries)

    return rev

def notebook_to_json(nb):
    r = {'name' : nb['name'],
         'dbname' : nb['dbname'],
         'title' : nb['title']}

    for ut in ['users', 'admins']:
        r[ut] = []
        for u in nb[ut]:
            r[ut].append(str(u.id))
    return r
            
         

json_to_rev = {'text' : entry_text_json_to_rev,
               'figure' : entry_figure_json_to_rev,
               'page' : page_json_to_rev}
