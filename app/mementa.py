from functools import wraps
from flask import Flask, session, redirect, url_for, escape, request, g, render_template, jsonify, make_response
import simplejson as json
import pymongo
import bson
import entry_divs
import datamodel as dm
import hashlib


DEBUG = True # FIXME SHOULD BE FALSE FOR REAL DEPLOYMENT
SECRET_KEY = "Development key" # fixme in general hide this


DB_DATABASE = 'testdb'
DB_HOST = "127.0.0.1"
DB_PORT = 27017
DB_URL = "mongodb://127.0.0.1:27017"


PASSWORDSALT = "3wSnElYBSaphFAB76f78"

app = Flask(__name__)
app.config.from_object(__name__)

@app.before_request
def before_request():
    
    mongoconn = pymongo.Connection(app.config['DB_URL'])
    
    g.db = mongoconn[app.config['DB_DATABASE']]


def dbref(collection, oid):
    """
    Helper function, turns collection and oid strings into the correct
    objects
    

    """
    if not isinstance(oid, bson.objectid.ObjectId):
        oid = bson.objectid.ObjectId(oid)

    return bson.dbref.DBRef(collection, oid)

def saltpassword(password, salt):
    m = hashlib.sha512()
    m.update(password)
    m.update(salt)
    return m.hexdigest()

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
    
        if 'username' not in session or session['username'] is None:
            return redirect(url_for('login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

def lookup_user(userid):
    """
    FIXME: cache this eventually

    Take in a userid and return
    {'username' : ,
     'name' :}
     
     """
    if isinstance(userid, bson.dbref.DBRef):
        ref = userid
    else:
        ref = dbref('users', userid)

    doc = g.db.dereference(ref)
    print "Looking up ", ref, "doc=", doc

    return {'_id' : str(ref.id),
            'username' : doc['username'],
            'name' : doc['name']}
    


@app.route('/')
@login_required
def home():
    return render_template("home.html",
                           session = session)


@app.route('/login', methods=['GET', 'POST'])
def login():
    nexturl = "/"
    loginfail = False
    if "next" in request.args:
        nexturl = request.args['next']
        
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        nexturl = request.form['nexturl']

        u = g.db.users.find_one({'username' : username})
        if u:
            # check password
            sp = saltpassword(password, app.config['PASSWORDSALT'])
            if u['password'] == sp:
                # successful login
                
                
                session['username'] = username
                session['user_id'] = u['_id']
                session['name'] = u['name']


                return redirect(nexturl)
            else:
                loginfail = True
        else:
            loginfail = True
            
    
    return render_template("login.html", nexturl=nexturl,
                           loginfail = loginfail)

@app.route('/logout')
def logout():
    # remove the username from the session if its there
    session.pop('username', None)
    return redirect(url_for('index'))

@app.route('/users')
def listusers():
    ## allusers = g.db.User.find()
    ## users = [u['username'] for u in allusers]
    ## return str(users)
    pass


@app.route("/entries")
@login_required
def entries():
    entries = g.db['entries']
    docs = entries.find()
    ids = [str(d["_id"]) for d in docs]
    urls = [(id, url_for('entry', entryid=id)) for id in ids]

    
    return render_template("list_entries.html", entries=urls,
                           session = session)
    

@app.route("/settings", methods=['GET', 'POST'])
@login_required
def settings():

    if request.method == "GET":
        userref = dbref("users", session["user_id"])
        user = g.db.dereference(userref)
        return render_template("usersettings.html", user=user,
                               session = session)

    elif request.method == "POST":
        # FIXME add password changing
        
        userref = dbref("users", session["user_id"])
        user = g.db.dereference(userref)
        
        if request.form['form'] == 'password' :
            return render_template("usersettings.html", user=user,
                                   session = session,
                                   action='password',
                                   success = True)
            
        elif request.form['form'] == 'settings' :

            user['name'] = request.form['name']
            user['email'] = request.form['email']
            user['twitter'] =  request.form['twitter']

            g.db.users.update({'_id' : user['_id'], },
                              user)
            session['name'] = user['name']
            
            return render_template("usersettings.html", user=user,
                                   session = session,
                                   action='settings',
                                   success = True)
        else:
            print "UNKNOWN FORM" # FIXME throw real error

        
        #user['name'] = request.form('username')
    else:
        raise "Invalid method"
    
        

    


        
@app.route("/pages")
@login_required
def entries():
    docs = g.db.entries.find({u'class' : u'page'})

    pages = [{'title' : d[u'revdoc']['title'],
              'date' : d[u'revdoc']['date'],
              '_id' : d['_id'],
              'author' : lookup_user(d[u'revdoc']['author'])} for d in docs]
    print pages
    return render_template("list_pages.html", pages=pages,
                           session = session)

@app.route("/page/<entryid>")
@login_required
def page(entryid):

    # fixme in denormalized land, we don't need to do the double-query
    
    col_entries = g.db['entries']
    col_revisions = g.db['revisions']

    doc = col_entries.find_one({"_id" : bson.objectid.ObjectId(entryid)})

    if not doc:
        return "COULD NOT FIND THAT DOCUMENT"

    head = doc['head']
    
    rev = g.db.dereference(head)
    s =  dm.page_rev_to_json(rev)
    return render_template("page.html",
                           page_entry_json = json.dumps(dm.entry_to_json(doc)), 
                           page_rev_json = json.dumps(s),
                           page_rev = s,
                           session = session)


def db_get_entry(id):
    entries = g.db['entries']
    doc = entries.find_one({"_id" : bson.objectid.ObjectId(entryid)})

    return doc


# set the secret key.  keep this really secret:
app.secret_key = 'A0Zr98j/3kdshfkdsajhfasdkj239r12nc-95h1pi34r1143yX R~XHH!jmN]LWX/,?RT'




# @app.route('/entry/<entryid>', methods=['GET', 'POST'])
# @login_required
# def save_entry(entryid):
    
#     if request.method == "POST":
#         # extract the fields from post

#         # add the fields 

#         entry_class = request.form['entry_class']
#         entry_id = request.form['entry_id']

#         request_dict = {}
#         # turn the multidict into a single dict
        
#         for k in request.form:
#             request_dict[k] = request.form[k]
                    
#         vdoc = dm.revision_class_create[entry_class](**request_dict)
#         author = bson.dbref.DBRef("users", bson.objectid.ObjectID(session["user_id"]))
#         Entry_ver = dm.revision_create(author=author,
#                                             parent = request.form["rev_id"])
#         vdoc.update(entry_ver)
        
#         # create the doc, now insert it into mongo
#         col_entries = g.db['entries']
#         col_revisions = g.db['revisions']

#         oid = col_revisions.insert(vdoc, safe=True)

        
#         tref = bson.dbref.DBRef("revisions", oid)

#         # FIXME FIXME FIXME USE COMPARE AND SWAP HERE

#         col_entries.save({'_id' : bson.objectid.ObjectId(entry_id),
#                           'head' : tref}, safe=True)


#         div = entry_divs.create[entry_class]({'_id' : entry_id,
#                                               'head' : tref,
#                                               'archived' : False}, vdoc) # FIXME archived
#         return div
    
#     else:
#         pass

@app.route("/api/page/new", methods=["POST"])
@login_required
def api_page_new():
    """
    You can POST a new page to this URL and get back the JSON-ified page,
    it's entry, the fully-spec'd ref, etc.

    input json:

    {'title' : title of the page,
     'entries' : [ {'entry' : text_string_of_entry_id,
                    'hidden' : boolean [default : False]
                    'rev' : text string of revision ID if pinned } ]}


    returns :
       {'entry' : standard entry doc,
        'revision' : standard revision doc
        }

    or 400 if an invalid request

    note does not check to see if IDs are valid
    
    """
 
    if request.mimetype != "application/json":
        return "Invalid request type, must be application/json", 400
    
    request_data = request.json
   
    if 'title' not in request_data:
        return "'title' not present in request",  400

    title = request_data['title']
    

    entries = []
    if 'entry' in request_data:
        for e in request_data['entries']:

            if 'entry' not in e:
                return 'invalid entry', 400

            edict = {'entry' : bson.dbref.DBRef("entries", e['entry']), 
                     'hidden' : get(e, 'hidden', False)}

            if 'rev' in e:
                edict['rev'] = bson.dbref.DBRef("revisions", e['rev'])

            entries.append(edict)

    page_rev = dm.page_entry_revision_create(title, entries)
    author = bson.dbref.DBRef("users", bson.objectid.ObjectId(session["user_id"]))
    page_rev.update(dm.revision_create(author))

    revid = g.db.revisions.insert(page_rev, safe=True)
    page_rev["_id"] = revid
    
    ent_dict = dm.entry_create(dbref("revisions", revid), 'page', page_rev)
    
    entid = g.db.entries.insert(ent_dict, safe=True)

    ent_dict["_id"] = entid

    page_rev_json = dm.page_rev_to_json(page_rev)

    
    return jsonify({'entry' : {'class' : 'page',
                       'head' : str(revid),
                       '_id' : str(entid)},
            
                    'revision' : page_rev_json})

    
@app.route("/api/entry/text/new", methods=["POST"])
@login_required
def api_entry_text_new():
    """
    Create a new entry 

    You can POST a new page to this URL and get back the JSON-ified page,
    it's entry, the fully-spec'd ref, etc.

    input json:

    {'title' : title of the page,
     'body' : body text }

    returns :
       {'entry' : standard entry doc,
        'revision' : standard revision doc
        }

    or 400 if an invalid request

    """
    
    if request.mimetype != "application/json":
        return "Invalid request type, must be application/json", 400

    request_data = request.json

    if 'title' not in request_data:
        return "'title' not present in request",  400
    if 'body' not in request_data:
        return "'body' not present in request", 400

    title = request_data['title']
    body = request_data['body']

    rev = dm.text_entry_revision_create(title, body)
    rev.update(dm.revision_create(dbref("users", session["user_id"])))

    revid = g.db.revisions.insert(rev, safe=True)
    rev["_id"] = revid
    
    ent_dict = dm.entry_create(dbref("revisions", revid),
                               'text', rev)

    entid = g.db.entries.insert(ent_dict, safe=True)
    ent_dict["_id"] = entid



    rev_json = dm.entry_text_rev_to_json(rev)
    return jsonify({'entry' : {'class' : 'text',
                               'head' : str(revid),
                               '_id' : str(entid)},
                    
                    'revision' : rev_json})


@app.route('/api/page/<page_entryid>', methods=["POST"])
@login_required
def api_page_mutate(page_entryid):
    """
    Primary page mutation interface

    Part of me is concerned that we're pushing a full-new entry doc
    every time, but that's a later optimization -- we could always send a diff

    input : { 'old_rev_id' : The old revision (that is, what the sender thinks as current',
              'doc' : { 'title' : ,
                        'archived' :,
                        'entries' : }}

    response:
       OK: Ok, with updated doc
       ERROR : no, you were wrong, the latest rev is XXX, here it is!

    thus the client must do the compare-and-swap

    """

    
    if request.mimetype != "application/json":
        return "Invalid request type, must be application/json", 400
    
    request_data = request.json

    old_rev_id = request_data['old_rev_id']

    submitted_doc = request_data['doc']

    entry_ref = bson.dbref.DBRef("entries", bson.objectid.ObjectId(page_entryid))
    latest_entry_doc = g.db.dereference(entry_ref)

    true_latest_page_ref = latest_entry_doc['head']

    if str(true_latest_page_ref.id) != old_rev_id:
        print "Incorrect latest"
        latest_page_rev_doc = g.db.dereference(true_latest_page_ref)
        resp = jsonify({'reason' : "Incorrect latest",
                        'doc' : dm.page_rev_to_json(latest_page_rev_doc)})
        resp.status = "400"
        return resp


    # otherwise, at least as of this moment, things are correct

    # convert entries:
    new_entries = []
    for e in submitted_doc['entries']:
        ne = {'entry' : bson.dbref.DBRef("entries",
                                         bson.objectid.ObjectId(e['entry'])),
              'hidden' : e['hidden']}
        if 'rev' in e:
            ne['rev'] = bson.dbref.DBRef("revisions",
                                         bson.objectid.ObjectId(e['rev']))
        new_entries.append(ne)

    # create the new doc:
    new_page_doc = dm.page_entry_revision_create(submitted_doc['title'],
                                                 new_entries)
    
    author = dbref("users", session["user_id"])

    new_page_doc.update(dm.revision_create(author,
                                           parent=old_rev_id))
            
    new_page_doc_oid = g.db.revisions.insert(new_page_doc, safe=True)

    new_page_doc['_id'] = new_page_doc_oid
    
    new_entry_doc = dm.entry_create(dbref('revisions', new_page_doc_oid), 
                                    'page', new_page_doc)

    res = g.db.entries.update({"_id" : latest_entry_doc['_id'],
                               "head" : latest_entry_doc['head']}, 
                              new_entry_doc, safe=True)

            
    if res['updatedExisting'] == True:
        # success!
        new_page_doc_json = dm.page_rev_to_json(new_page_doc)
        return jsonify({
                        "latest_page_revision_doc" : new_page_doc_json})
                              
            
    else:
        # failed to update, meaning someone else updated the entry ahead of us
        g.db.revisions.remove({'_id' : new_page_doc_oid})
                
        entry_ref = dbref("entries", page_entryid)
        latest_entry_doc = g.db.dereference(entry_ref)
        
        true_latest_page_ref = latest_entry_doc['head']
        latest_page_rev = g.db.dereference(true_latest_page_ref)
        latest_page_rev_json = dm.page_rev_to_json(latest_page_rev)
        
        resp =  jsonify({"reason" : "out of date", 
                         "latest_page_revision_doc" : latest_page_rev_json})
        resp.status = "400"
        return resp
    
@app.route('/api/entry/<entryid>',  methods = ['GET', 'POST'])
@login_required
def api_entry_get_post(entryid):
    """
    Get an entry and the associated doc, or update an existing entry
    
    """
    if request.method == 'POST':
        # update -- assume doc comes in pretty fully-formed, with the exception of the author field and the date field

    
        if request.mimetype != "application/json":
            return "Invalid request type, must be application/json", 400
        
        rd = request.json

        dclass = rd['class']
        parent = rd['parent']

        if dclass == 'text':
            rev = dm.text_entry_revision_create(rd['title'],
                                                     rd['body'])

        author = dbref("users", session["user_id"])

        pref = dbref("revisions", parent)
        
        rev.update(dm.revision_create(author, parent=pref))

        # save the revision
        new_rev_oid = g.db.revisions.insert(rev, safe=True)
        rev["_id"] = new_rev_oid

        new_entry_doc = dm.entry_create(dbref('revisions', new_rev_oid),
                                        dclass, rev)

        
        res = g.db.entries.update({'_id' : bson.objectid.ObjectId(entryid),
                                   'head' : dbref('revisions', parent), 
                                   'class' : dclass},
                                  new_entry_doc, safe=True)
        
        
    
        if res['updatedExisting'] == True:
            # success!
            new_rev_doc_json = dm.page_rev_to_json(rev)
            return jsonify({
                            "latest_revision_doc" : new_rev_doc_json})


        else:
            # failed to update, meaning someone else updated the entry ahead of us
            g.db.revisions.remove({'_id' : new_rev_oid})

            entry_ref = dbref("entries", entryid)
            latest_entry_doc = g.db.dereference(entry_ref)

            true_latest_rev_ref = latest_entry_doc['head']
            latest_rev_doc = g.db.dereference(true_latest_rev_ref)
            latest_rev_json = dm.page_rev_to_json(latest_rev_doc)

            resp =  jsonify({"reason" : "Incorrect latest", 
                             "latest_revision_doc" : latest_rev_json})
            resp.status = "400"
            return resp
        
        
    elif request.method == "GET":
        entry_ref = dbref("entries", entryid)
        entry_doc = g.db.dereference(entry_ref)
        
        latest_page_ref = entry_doc['head']

        latest_page_rev = g.db.dereference(latest_page_ref)


        return jsonify({"entry" : dm.entry_to_json(entry_doc),
                        "revision" : dm.rev_to_json[entry_doc['class']](latest_page_rev)})
    




@app.route("/api/entry/text/new", methods=["POST"])
@login_required
def api_entry_text_new():
    """
    Create a new entry 

    You can POST a new page to this URL and get back the JSON-ified page,
    it's entry, the fully-spec'd ref, etc.

    input json:

    {'title' : title of the page,
     'body' : body text }

    returns :
       {'entry' : standard entry doc,
        'revision' : standard revision doc
        }

    or 400 if an invalid request

    """
    
    if request.mimetype != "application/json":
        return "Invalid request type, must be application/json", 400

    request_data = request.json

    if 'title' not in request_data:
        return "'title' not present in request",  400
    if 'body' not in request_data:
        return "'body' not present in request", 400

    title = request_data['title']
    body = request_data['body']

    rev = dm.text_entry_revision_create(title, body)
    rev.update(dm.revision_create(bson.dbref.DBRef("users",
                                                   bson.objectid.ObjectId(session["user_id"]))))

    revid = g.db.revisions.insert(rev, safe=True)
    rev["_id"] = revid
    
    ent_dict = dm.entry_create(dbref("revisions", revid),
                               'text', rev)

    entid = g.db.entries.insert(ent_dict, safe=True)
    ent_dict["_id"] = entid

    rev["_id"] = revid

    rev_json = dm.entry_text_rev_to_json(rev)
    return jsonify({'entry' : {'class' : 'text',
                               'head' : str(revid),
                               '_id' : str(entid)},
                    
                    'revision' : rev_json})

if __name__ == '__main__':
    app.run()
