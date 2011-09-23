from functools import wraps
from flask import Flask, session, redirect, url_for, escape, request, g, render_template, jsonify, make_response
import simplejson as json
import pymongo
import bson
import entry_divs
import datamodel as dm
import hashlib
import time
import tags as tagutils


DEBUG = True # FIXME SHOULD BE FALSE FOR REAL DEPLOYMENT
SECRET_KEY = "Development key" # fixme in general hide this


DB_DATABASE = 'testdb'
DB_HOST = "127.0.0.1"
DB_PORT = 27017
DB_URL = "mongodb://127.0.0.1:27017"

HTTP_ERROR_CLIENT_CONFLICT = "409"
HTTP_ERROR_CLIENT_BADREQUEST = "400"

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


    return {'_id' : str(ref.id),
            'username' : doc['username'],
            'name' : doc['name'],
            'email' : doc['email']}
    

@app.route('/test')
@login_required
def logintest():
    return "login successful"


@app.route('/')
@login_required
def home():
    LIMIT = 7
    
    my_pages = list_entries_query({'class' : 'page',
                                   'author' : session['user_id'],
                                   'limit' : LIMIT})
    
    for p in my_pages:
        p['author'] = lookup_user(p['author'])


    all_pages = list_entries_query({'class' : 'page',
                                   'limit' : LIMIT})
    
    for p in all_pages:
        p['author'] = lookup_user(p['author'])


    
    return render_template("home.html", my_pages = my_pages,
                           all_pages = all_pages, 
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
        if 'nextur' in request.form:
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
    session.pop('user_id', None)
    return redirect(url_for('login'))

@app.route('/users')
def listusers():
    ## allusers = g.db.User.find()
    ## users = [u['username'] for u in allusers]
    ## return str(users)
    pass



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
            pw1 = request.form['password']
            pw2 = request.form['password2']
            if pw1 != pw2 :
                return render_template("usersettings.html", user=user,
                                       session = session,
                                       action='password',
                                       success = False)
            else:
                saltpw = saltpassword(pw1, PASSWORDSALT)
                user['password'] = saltpw

                g.db.users.update({'_id' : user['_id'], },
                                  user)
                
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
    
        
@app.route("/edittest")
@login_required
def edittest():
    return render_template("jqueryedittest.html", 
                           session = session)

    


        
@app.route("/pages")
@login_required
def pages():

    pages = list_entries_query({'class' : 'page'})
    for p in pages:
        p['author'] = lookup_user(p['author'])
        
    return render_template("list_pages.html", pages=pages,
                           session = session)

@app.route("/entries")
@login_required
def entries():

    pages = list_entries_query({'class' : 'notpage'})
    for p in pages:
        p['author'] = lookup_user(p['author'])
        
    return render_template("list_entries.html", pages=pages,
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

    
@app.route("/api/entry/new", methods=["POST"])
@login_required
def api_entry_new():
    """
    Create a new revision and entry.
    
    You can POST a new json object to this URL and get back the JSON-ified page,
    it's entry, the fully-spec'd rev. 

    Note the input json must contain class
    and then any of the requirements for this class, for example:

    all:
       archived:
       tags: 
       
    text:
        title
        body

    page:
        title
        entries : [ {entry:, hidden:, rev:},]
        
    returns :
       {'entry' : standard entry doc,
        'revision' : standard revision doc
        }

    or 400 if an invalid request

    """
    
    if request.mimetype != "application/json":
        return "Invalid request type, must be application/json", HTTP_ERROR_CLIENT_BADREQUEST

    request_data = request.json

    if 'class' not in request_data:
        return "'class' not present in request",HTTP_ERROR_CLIENT_BADREQUEST
    
    dclass = request_data['class']

    if dclass not in dm.json_to_rev:
        return "Unknown class", HTTP_ERROR_CLIENT_BADREQUEST

    rev =  dm.json_to_rev[dclass](request_data)

    archived = request_data.get("archived", False)
    tags  = request_data.get("tags", [])

    rev.update(dm.revision_create(dbref("users", session["user_id"]),
                                  archived=archived,
                                  tags = tags))

    revid = g.db.revisions.insert(rev, safe=True)
    rev["_id"] = revid

    
    ent_dict = dm.entry_create(dbref("revisions", revid),
                               dclass, rev)

    entid = g.db.entries.insert(ent_dict, safe=True)
    ent_dict["_id"] = entid

    # tag cleanup
    [tagutils.inc_tag(g.db, t) for t in tags]
    

    rev_json = dm.rev_to_json[dclass](rev)
    
    return jsonify({'entry' : {'class' : dclass,
                               'head' : str(revid),
                               '_id' : str(entid)},
                    
                    'revision' : rev_json})

@app.route('/api/entry/<entryid>',  methods = ['GET', 'POST'])
@login_required
def api_entry_get_post(entryid):
    """
    GET the latest entry and rev for an entry

    POST an updated rev. Note that we extract out the relevant fields
    from the submitted doc, and overwrite other relevant ones. Things
    that must be present include:

    class
    parent: Parent points to the old entry; this is also what we think the entry currently points to 
    doc-specific entries

    we rewrite :
    author (current logged in author)
    date
    _id : with the new updated revid

    and update the entry

    If the entry is out of date, we reject, and instead
    return the latest entry/rev, with error 409
    
    
    """
    if request.method == 'POST':
        """
        Perform an update, assuming that the doc is pretty well-formed

        """

    
        if request.mimetype != "application/json":
            return "Invalid request type, must be application/json", HTTP_ERROR_CLIENT_BAD_REQUEST
        
        rd = request.json

        dclass = rd['class']
        parent = rd['parent']


        if dclass == 'text':
            rev = dm.text_entry_revision_create(rd['title'],
                                                     rd['body'])
        elif dclass == 'page':
            rev = dm.page_entry_revision_create(rd['title'],
                                                rd['entries'])
        else:
            raise Exception("Unknown entry class")
        
        author = dbref("users", session["user_id"])
        tags = rd.get("tags", [])
        
        pref = dbref("revisions", parent)
        
        rev.update(dm.revision_create(author, parent=pref,
                                      archived=rd.get('archived', False),
                                      tags = tags))


        # save the revision
        new_rev_oid = g.db.revisions.insert(rev, safe=True)
        rev["_id"] = new_rev_oid

        new_entry_doc = dm.entry_create(dbref('revisions', new_rev_oid),
                                        dclass, rev)

        
        res = g.db.entries.update({'_id' : bson.objectid.ObjectId(entryid),
                                   'head' : dbref('revisions', parent), 
                                   'class' : dclass},
                                  new_entry_doc, safe=True)

        
        new_entry_doc["_id"] = bson.objectid.ObjectId(entryid)
        
    
        if res['updatedExisting'] == True:
            # success!

            # get the old revisions tags, compute the diff
            olddoc = g.db.dereference(dbref('revisions', parent))
            tagdeltas = tagutils.tagdelta(olddoc.get('tags', []),
                                          tags)

            [tagutils.inc_tag(g.db, t) for t in tagdeltas[0]]
            [tagutils.dec_tag(g.db, t) for t in tagdeltas[1]]

            new_rev_doc_json = dm.rev_to_json[dclass](rev)

            entry_doc_json = dm.entry_to_json(new_entry_doc)
            
            return jsonify({"latest_entry_doc" : entry_doc_json, 
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
            resp.status = HTTP_ERROR_CLIENT_CONFLICT
            return resp
        
        
    elif request.method == "GET":
        # fixme update this to use denormalized stuff
        
        entry_ref = dbref("entries", entryid)
        entry_doc = g.db.dereference(entry_ref)
        
        latest_page_ref = entry_doc['head']

        latest_page_rev = g.db.dereference(latest_page_ref)


        return jsonify({"entry" : dm.entry_to_json(entry_doc),
                        "revision" : dm.rev_to_json[entry_doc['class']](latest_page_rev)})
    


@app.route('/api/rev/<revid>')
@login_required
def api_rev_get(revid):
    """
    get rev
    
    """
    
    rev = g.db.dereference(dbref('revisions', revid))

    
    return jsonify(dm.rev_to_json[rev['class']](rev))


def list_entries_query(req):
    """
    Reusable function
    """
    
    query = {}
    
    if 'author' in req:
        #FIXME debug
        r = dbref('users', req['author'])
        query['revdoc.author'] = r
    
    if 'class' in req:
        if req['class'] == 'page':
            query['class'] = "page"
        elif req['class'] == 'notpage':
            query['class'] = {"$ne" : "page"}
        elif req['class'] == 'text':
            query['class'] = "text"

    if 'archived' in req:
        # three values: yes, no, all
        if req['archived'] == 'all':
            pass
        elif req['archived'] == 'yes':
            query['revdoc.archived'] = True
        elif req['archived'] == 'no':
            query['revdoc.archived'] = False
    else:
        query['revdoc.archived'] = False
        
    
    limit = 100
    if 'limit' in req:
        limit = int(req['limit'])


    tgt_fields = {'class' : 1,
                  'head' : 1,
                  'revdoc.title' : 1,
                  'revdoc.author' : 1,
                  'revdoc.date' : 1}
    
    if query == {}:
        results = g.db.entries.find(fields=tgt_fields).sort('revdoc.date', -1).limit(limit)
    else:
        results = g.db.entries.find(query, fields=tgt_fields).sort('revdoc.date', -1).limit(limit)
        
    results_data = []
    for r in results:
        # fixme add date
        rd = {'_id' : str(r['_id']),
              'class' : r['class'],
              'head' : str(r['head'].id),
              'title' : str(r['revdoc']['title']),
              'author' : str(r['revdoc']['author'].id),
              'date' : str(r['revdoc']['date'].isoformat())}
        
        results_data.append(rd)
    return results_data
    

@app.route('/api/list/entries')
@login_required
def list_entries():
    """
    Generic listing interface for entries, always returns the latest.

    query string:
    class: [page, notpage, text]
    author: specific author (none returns all)
    # right now we always sort by date
    limit: number to show

    # fixme implement offset
    
    """
    results_data = list_entries_query(request.args)
    
    return jsonify({'results' : results_data})

@app.route('/api/user/<userid>/avatar/<size>')
@login_required
def user_get_avatar(userid, size=80):
    """
    """
    size = int(size)
    
    u =  lookup_user(userid)
    email = u['email']
    m = hashlib.md5()
    m.update(email)
    url = "http://www.gravatar.com/avatar/%s.jpg?s=%d" % (m.hexdigest(), size)
    
        
    return redirect(url)

@app.route("/api/tags/all/<N>")
@login_required
def get_top_n_tags(N):
    r = tagutils.top_n(g.db, int(N))
    js = [(t['tag'], t['count']) for t in r]

    return jsonify({'tagcounts': js})

@app.route("/api/tags/count/<tag>")
@login_required
def get_tag_count(tag):
    c = tagutils.count(g.db, tag)
    return jsonify({'tag' : tag,
                    'count' : c})

@app.route("/api/tags/subset/<beginstr>/<N>")
@login_required
def get_top_n_tags_str(beginstr, N):
    r = tagutils.top_n_str(g.db, beginstr, int(N))
    js = [(t['tag'], t['count']) for t in r]

    return jsonify({'tagcounts' : js})


@app.route("/page/new")
@login_required
def page_new():
    """
    
    """
 
    title = "New Page"
    entries = []

    page_rev = dm.page_entry_revision_create(title, entries)
    author = dbref("users", session["user_id"])
    
    page_rev.update(dm.revision_create(author))

    revid = g.db.revisions.insert(page_rev, safe=True)
    page_rev["_id"] = revid
    
    ent_dict = dm.entry_create(dbref("revisions", revid), 'page', page_rev)
    
    entid = g.db.entries.insert(ent_dict, safe=True)
    
    return redirect("/page/%s" % entid)



@app.route('/fsmtest')
@login_required
def fsmtest():
    return render_template("fsmtest.html",
                           session = session)


if __name__ == '__main__':
    app.run()
