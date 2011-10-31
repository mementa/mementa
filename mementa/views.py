from functools import wraps
from flask import Flask, session, redirect, url_for, escape, request, g, render_template, jsonify, make_response, Response
import simplejson as json
import pymongo
import gridfs
import bson
import string
import entry_divs
import datamodel as dm
from datamodel import dbref
import hashlib
import time
import tags as tagutils
import dbutils
import figure
import sys
import gitversion
import base64
import os
import httplib2
import urllib
import urlparse
import oauth2 as oauth


# most of these should change for real deployment
from mementa import app
from utils import *
    

@app.route('/')
@login_required
def home():
    notebooks = g.sysdb.notebooks.find({'users':  dbref('users', session['user_id']),
                                        'archived' : { "$ne" :  True}})
    nblist = []
    for n in notebooks:
        nblist.append({'name' : n['name'],
                       'title' : n['title']})
    
    return render_template("home.html", nblist = nblist,
                           notebook = None, 
                           session = session,
                           version = app.config['VERSION_GIT_DESCRIBE'])

@app.route('/notebook/<notebook>')
@login_required
def notebook_home(notebook):
    
    LIMIT = 7
    nbdb = g.dbconn[get_nb_dbname(notebook)]
    my_pages = list_entries_query(nbdb,
                                  {'class' : 'page',
                                   'author' : session['user_id'],
                                   'limit' : LIMIT})
    
    for p in my_pages:
        p['author'] = lookup_user(p['author'])
        

    all_pages = list_entries_query(nbdb,
                                   {'class' : 'page',
                                   'limit' : LIMIT})
    
    
    for p in all_pages:
        p['author'] = lookup_user(p['author'])

    notebook = get_notebook(notebook)
    notebook_users = [lookup_user(u) for u in notebook['users']]
    
    
    return render_template("notebook.html",
                           my_pages = my_pages,
                           all_pages = all_pages,
                           notebook = notebook,
                           notebook_users = notebook_users, 
                           session = session,
                           version = app.config['VERSION_GIT_DESCRIBE'])



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

        
        u = g.sysdb.users.find_one({'username' : username})
        
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
                           loginfail = loginfail,
                           version = app.config['VERSION_GIT_DESCRIBE'])


 
@app.route('/test')
@login_required
def logintest():
    return "login successful"


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



@app.route("/notebook/<notebook>/settings", methods=['GET', 'POST'])
@login_required
@check_notebook_acl
def notebook_settings(notebook):

    isadmin = has_notebook_admin(session['user_id'], notebook)

    nb = get_notebook(notebook)

    if request.method == "GET" : 
        # look up user records
        users = [g.sysdb.dereference(u) for u in nb['users']]
        users = [{'name' : u['name'],
                  'username' : u['username']} for u in users]
        
        return render_template("notebooksettings.html",
                               notebook =nb,
                               users = users, 
                               session = session,
                               version = app.config['VERSION_GIT_DESCRIBE'])


    
@app.route("/settings", methods=['GET', 'POST'])
@login_required
def settings():

    if request.method == "GET":
        userref = dbref("users", session["user_id"])
        user = g.sysdb.dereference(userref)
        return render_template("usersettings.html", user=user,
                               session = session,
                               version = app.config['VERSION_GIT_DESCRIBE'])

    
    elif request.method == "POST":
        # FIXME add password changing
        
        userref = dbref("users", session["user_id"])
        user = g.sysdb.dereference(userref)
        
        if request.form['form'] == 'password' :
            pw1 = request.form['password']
            pw2 = request.form['password2']
            if pw1 != pw2 :
                return render_template("usersettings.html", user=user,
                                       session = session,
                                       action='password',
                                       success = False,
                                       version = app.config['VERSION_GIT_DESCRIBE'])

            else:
                saltpw = saltpassword(pw1, app.config['PASSWORDSALT'])
                user['password'] = saltpw
                user['apikey'] = random_api_key()

                g.sysdb.users.update({'_id' : user['_id'], },
                                  user)
                
                return render_template("usersettings.html", user=user,
                                       session = session,
                                       action='password',
                                       success = True,
                                       version = app.config['VERSION_GIT_DESCRIBE'])
            
            
        elif request.form['form'] == 'settings' :

            user['name'] = request.form['name']
            user['email'] = request.form['email']
            user['twitter'] =  request.form['twitter']

            g.sysdb.users.update({'_id' : user['_id'], },
                              user)
            session['name'] = user['name']
            
            return render_template("usersettings.html", user=user,
                                   session = session,
                                   action='settings',
                                   success = True,
                                   version = app.config['VERSION_GIT_DESCRIBE'])


        else:
            print "UNKNOWN FORM" # FIXME throw real error

        
        #user['name'] = request.form('username')
    else:
        raise "Invalid method"
    
        
        
@app.route("/notebook/<notebook>/pages")
@login_required
@check_notebook_acl
def pages(notebook):
    nbdb = g.dbconn[get_nb_dbname(notebook)]
    nb = get_notebook(notebook)
    pages = list_entries_query(nbdb, {'class' : 'page'})
    for p in pages:
        p['author'] = lookup_user(p['author'])
        
    return render_template("list_pages.html", pages=pages,
                           notebook = nb, 
                           session = session,
                           version = app.config['VERSION_GIT_DESCRIBE'])


@app.route("/notebook/<notebook>/entries")
@login_required
@check_notebook_acl
def entries(notebook):

    nbdb = g.dbconn[get_nb_dbname(notebook)]

    entries = list_entries_query(nbdb, {'class' : 'notpage'})
    for e in entries:
        e['author'] = lookup_user(e['author'])
        
    return render_template("list_entries.html", entries=entries,
                           notebook = get_notebook(notebook), 
                           session = session,
                           version = app.config['VERSION_GIT_DESCRIBE'])


@app.route("/notebook/<notebook>/page/<entryid>")
@login_required
@check_notebook_acl
def page(notebook, entryid):

    nbdb = g.dbconn[get_nb_dbname(notebook)]

    # fixme in denormalized land, we don't need to do the double-query
    
    col_entries = nbdb['entries']
    col_revisions = nbdb['revisions']

    doc = col_entries.find_one({"_id" : bson.objectid.ObjectId(entryid)})

    if not doc:
        return "COULD NOT FIND THAT DOCUMENT"

    head = doc['head']
    
    rev = nbdb.dereference(head)
    s =  dm.page_rev_to_json(rev)
    return render_template("page.html",
                           notebook = get_notebook(notebook), 
                           page_entry_json = json.dumps(dm.entry_to_json(doc)), 
                           page_rev_json = json.dumps(s),
                           page_rev = s,
                           session = session,
                           version = app.config['VERSION_GIT_DESCRIBE'])




@app.route("/api/<notebook>/entry/new", methods=["POST"])
@api_or_login_required
@check_notebook_acl
def api_entry_new(notebook):
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

    figure:
        title
        caption
        images
        
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
        return "'class' not present in request", HTTP_ERROR_CLIENT_BADREQUEST
    
    dclass = request_data['class']

    if dclass not in dm.json_to_rev:
        return "Unknown class",  HTTP_ERROR_CLIENT_BADREQUEST

    rev =  dm.json_to_rev[dclass](request_data)

    archived = request_data.get("archived", False)
    tags  = request_data.get("tags", [])

    rev.update(dm.revision_create(session["user_id"],
                                  app.config['DB_SYSTEM_DATABASE'], 
                                  archived=archived,
                                  tags = tags))
    nbdb = g.dbconn[get_nb_dbname(notebook)]

    revid = nbdb.revisions.insert(rev, safe=True)
    rev["_id"] = revid

    
    ent_dict = dm.entry_create(dbref("revisions", revid),
                               dclass, rev)

    entid = nbdb.entries.insert(ent_dict, safe=True)
    ent_dict["_id"] = entid

    # tag cleanup
    [tagutils.inc_tag(nbdb, t) for t in tags]
    

    rev_json = dm.rev_to_json[dclass](rev)
    
    return jsonify({'entry' : {'class' : dclass,
                               'head' : str(revid),
                               '_id' : str(entid)},
                    
                    'revision' : rev_json})

@app.route('/api/<notebook>/entry/<entryid>',  methods = ['GET', 'POST'])
@api_or_login_required
@check_notebook_acl
def api_entry_get_post(notebook, entryid):
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

    nbdb = g.dbconn[get_nb_dbname(notebook)]

    if request.method == 'POST':
        """
        Perform an update, assuming that the doc is pretty well-formed

        """

    
        if request.mimetype != "application/json":
            return "Invalid request type, must be application/json", HTTP_ERROR_CLIENT_BADREQUEST
        
        rd = request.json

        dclass = rd['class']
        parent = rd['parent']


        if dclass == 'text':
            rev = dm.text_entry_revision_create(rd['title'],
                                                rd['body'])
        elif dclass == 'figure':
            rev = dm.figure_entry_revision_create(rd['title'],
                                                  rd['caption'],
                                                  rd.get('maxsize', None),
                                                  gallery = rd.get("gallery", False),
                                                  images = rd['images'])

        elif dclass == 'code' :
            rev = dm.code_entry_revision_create(rd['title'],
                                                rd['code'],
                                                rd['source'],
                                                rd['language'],
                                                rd['caption'])
        
        elif dclass == 'page':
            rev = dm.page_entry_revision_create(rd['title'],
                                                rd['entries'])
        else:
            raise Exception("Unknown entry class")
        
        author = dbref("users", session["user_id"])
        tags = rd.get("tags", [])
        
        pref = dbref("revisions", parent)
        
        rev.update(dm.revision_create(session["user_id"], 
                                      app.config['DB_SYSTEM_DATABASE'], 
                                      parent=pref,
                                      archived=rd.get('archived', False),
                                      tags = tags))

        # save the revision
        new_rev_oid = nbdb.revisions.insert(rev, safe=True)
        rev["_id"] = new_rev_oid

        new_entry_doc = dm.entry_create(dbref('revisions', new_rev_oid),
                                        dclass, rev)

        
        res = nbdb.entries.update({'_id' : bson.objectid.ObjectId(entryid),
                                   'head' : dbref('revisions', parent), 
                                   'class' : dclass},
                                  new_entry_doc, safe=True)

        
        new_entry_doc["_id"] = bson.objectid.ObjectId(entryid)
        
    
        if res['updatedExisting'] == True:
            # success!

            # get the old revisions tags, compute the diff
            olddoc = nbdb.dereference(dbref('revisions', parent))
            tagdeltas = tagutils.tagdelta(olddoc.get('tags', []),
                                          tags)

            [tagutils.inc_tag(nbdb, t) for t in tagdeltas[0]]
            [tagutils.dec_tag(nbdb, t) for t in tagdeltas[1]]

            new_rev_doc_json = dm.rev_to_json[dclass](rev)

            entry_doc_json = dm.entry_to_json(new_entry_doc)
            
            return jsonify({"latest_entry_doc" : entry_doc_json, 
                            "latest_revision_doc" : new_rev_doc_json})


        else:
            # failed to update, meaning someone else updated the entry ahead of us

            nbdb.revisions.remove({'_id' : new_rev_oid})

            entry_ref = dbref("entries", entryid)
            latest_entry_doc = nbdb.dereference(entry_ref)

            true_latest_rev_ref = latest_entry_doc['head']
            latest_rev_doc = nbdb.dereference(true_latest_rev_ref)
            latest_rev_json = dm.page_rev_to_json(latest_rev_doc)

            entry_doc_json = dm.entry_to_json(latest_entry_doc)

            return jsonify_error({"reason" : "Incorrect latest",
                                  "latest_entry_doc": entry_doc_json, 
                                  "latest_revision_doc" : latest_rev_json},
                                 HTTP_ERROR_CLIENT_CONFLICT)
        
        
    elif request.method == "GET":
        # fixme update this to use denormalized stuff
        
        entry_ref = dbref("entries", entryid)
        entry_doc = nbdb.dereference(entry_ref)
        
        latest_page_ref = entry_doc['head']

        latest_page_rev = nbdb.dereference(latest_page_ref)


        return jsonify({"entry" : dm.entry_to_json(entry_doc),
                        "revision" : dm.rev_to_json[entry_doc['class']](latest_page_rev)})
    
@app.route('/api/notebookadmin/new', methods=['POST'])
@api_or_login_required
def api_notebookadmin_new():
    """
    Create a new notebook, with this user as the admin
    
    """

    if request.mimetype != "application/json":
        return "Invalid request type, must be application/json", HTTP_ERROR_CLIENT_BADREQUEST

    rd = request.json
    users = [session['user_id']]
    admins = [session['user_id']]
    NBNAME_PREFIX = "nb"
    
    nbns = g.sysdb.notebooks.find({'name' : {'$regex': "^" + NBNAME_PREFIX}}, sort = [("name", pymongo.DESCENDING)], limit=1)
    startpos = 0
    for nbn in nbns:

        existing_name = nbn['name']
        existing_num_str = existing_name[2:]
        existing_num = int(existing_num_str)
        
        startpos = existing_num
        
    while True:
        startpos += 1

        name = NBNAME_PREFIX + ("%04d" % startpos)
    
        if 'title' in rd:
            title = rd['title'].strip()
        else:
            title = name

        doc = dm.notebook_create(name, 
                                 get_nb_dbname(name), 
                                 title, 
                                 users=users,
                                 admins = admins)

        try:

            g.sysdb.notebooks.insert(doc, safe=True)

            dbutils.create_notebook_indices(g.dbconn[get_nb_dbname(name)])

            return jsonify({'name' :name})

        except pymongo.errors.DuplicateKeyError, e:
            return 'name already exists', HTTP_ERROR_CLIENT_CONFLICT


@app.route('/api/notebookadmin/', methods=['GET'])
@api_or_login_required
def api_notebookadmin_list():
    """
    List all the notebooks available to this user
    
    """

    if request.mimetype != "application/json":
        return "Invalid request type, must be application/json", HTTP_ERROR_CLIENT_BADREQUEST

    notebooks = g.sysdb.notebooks.find({'users' :  dbref('users', session['user_id']),
                                        'archived' : { "$ne" :  True}})
    nblist = []
    for n in notebooks:
        nblist.append({'name' : n['name'],
                       'title' : n['title']})

    return jsonify({"notebooks" : nblist})


@app.route('/api/<notebook>/config', methods=['GET', 'POST'])
@api_or_login_required
@check_notebook_acl
def api_notebookadmin_config(notebook):
    """
    Configure notebook settings, updates the indicated fields

    # fields :
    title:
    admin
    users
    archived
    
    Always returns full doc

    """

    if request.mimetype != "application/json":
        return "Invalid request type, must be application/json", HTTP_ERROR_CLIENT_BADREQUEST

    def denorm_users(ul):
        users = {}
        for u in ul:
            ud = g.sysdb.dereference(u)
            users[str(ud["_id"])] = lookup_user(ud['_id'])
            
        return users; 
            
    if request.method == 'POST':
        # check if user is on admin list, otherwise this can't pass
        if not has_notebook_admin(session['user_id'], notebook):
            return "Don't have access", HTTP_ERROR_FORBIDDEN

        
        rd = request.json

        d = g.sysdb.notebooks.find({'name' : notebook})
        n = d[0]

        raw_nb_doc =  d[0]

        if 'title' in rd:
            raw_nb_doc['title'] = rd['title']

        if 'archived' in rd:
            if rd['archived']:
                raw_nb_doc['archived'] = True
            else:
                raw_nb_doc['archived'] = False
                

        # check unique
        
        if 'users' in rd:
            if len(set(rd['users']) ) != len(rd['users']):
                return "Duplicate in user list, error!", HTT_ERROR_CLIENT_BADREQUEST
            
            raw_nb_doc['users'] = []
            for u in rd['users'] :
                raw_nb_doc['users'].append(dbref('users', u))

        if 'admins' in rd:
            if len(set(rd['admins']) ) != len(rd['admins']):
                return "Duplicate in user list, error!", HTT_ERROR_CLIENT_BADREQUEST

            raw_nb_doc['admins'] = []
            for u in rd['admins'] :
                if dbref('users', u) not in raw_nb_doc['users']:
                    return "Admin must also be user", HTTP_ERROR_CLIENT_BADREQUEST
                
                raw_nb_doc['admins'].append(dbref('users', u))


        r = g.sysdb.notebooks.update({'_id' : raw_nb_doc['_id']},
                                     raw_nb_doc, safe=True)

        d = g.sysdb.notebooks.find({'name' : notebook})
        users = denorm_users(d[0]['users'])

        
        return jsonify({'notebook' : dm.notebook_to_json(d[0]),
                        'users' : users});
    
    

    elif request.method == "GET":

        d = g.sysdb.notebooks.find({'name' : notebook})
        # this is a hack, but whatever -- get the user info
        users = denorm_users(d[0]['users'])
        return jsonify({'notebook' : dm.notebook_to_json(d[0]),
                        'users' : users})


@app.route('/api/<notebook>/rev/<revid>')
@api_or_login_required
@check_notebook_acl
def api_rev_get(notebook, revid):
    """
    get rev
    
    """
    db = g.dbconn[get_nb_dbname(notebook)]

    rev = db.dereference(dbref('revisions', revid))

    
    return jsonify(dm.rev_to_json[rev['class']](rev))


def list_entries_query(db, req):
    """
    Reusable function
    """
    
    query = {}
    
    if 'author' in req:
        #FIXME debug
        r = dbref('users', req['author'], database=app.config['DB_SYSTEM_DATABASE'])
        query['revdoc.author'] = r
    
    if 'class' in req:
        if req['class'] == 'page':
            query['class'] = "page"
        elif req['class'] == 'notpage':
            query['class'] = {"$ne" : "page"}
        elif req['class'] == 'text':
            query['class'] = "text"
        elif req['class'] == 'code':
            query['class'] = "code"
        elif req['class'] == 'figure':
            query['class'] = "figure"

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
                  'revdoc.date' : 1,
                  'revdoc.tags' : 1}
    if query == {}:
        results = db.entries.find(fields=tgt_fields).sort('revdoc.date', -1).limit(limit)
    else:
        results = db.entries.find(query, fields=tgt_fields).sort('revdoc.date', -1).limit(limit)
        
    results_data = []
    for r in results:
        # fixme add date
        rd = {'_id' : str(r['_id']),
              'class' : r['class'],
              'head' : str(r['head'].id),
              'title' : str(r['revdoc']['title']),
              'author' : str(r['revdoc']['author'].id),
              'date' : str(r['revdoc']['date'].isoformat()),
              'tags' : r['revdoc']['tags']}
        
        results_data.append(rd)
    return results_data
    

@app.route('/api/<notebook>/list/entries')
@api_or_login_required
@check_notebook_acl
def list_entries(notebook):
    """
    Generic listing interface for entries, always returns the latest.

    query string:
    class: [page, notpage, text, figure]
    author: specific author (none returns all)
    # right now we always sort by date
    limit: number to show

    # fixme implement offset
    
    """
    nbdb = g.dbconn[get_nb_dbname(notebook)]

    results_data = list_entries_query(nbdb, request.args)
    
    return jsonify({'results' : results_data})

@app.route('/api/user/<userid>/avatar/<size>')
@api_or_login_required
def user_get_avatar(userid, size=80):
    """
    Currently a proxy method, because eventually we might want to support
    other avatars (twitter, google, etc.)
    """

    size = int(size)
    
    u =  lookup_user(userid)
    email = u['email']
    m = hashlib.md5()
    m.update(email)
    url = "http://www.gravatar.com/avatar/%s.jpg?s=%d" % (m.hexdigest(), size)
    
        
    return redirect(url)

@app.route('/api/user/<userid>')
@api_or_login_required
def user_get_info(userid):
    """
    """
    u =  lookup_user(userid)

    res = {'username' : u['username'],
           'name' : u['name'],
           'twitter' : u['twitter']}
    
    return jsonify(res);



@app.route("/api/<notebook>/tags/all/<N>")
@api_or_login_required
@check_notebook_acl
def get_top_n_tags(notebook, N):
    nbdb = g.dbconn[get_nb_dbname(notebook)]

    r = tagutils.top_n(nbdb, int(N))
    js = [(t['tag'], t['count']) for t in r]

    return jsonify({'tagcounts': js})

@app.route("/api/<notebook>/tags/count/<tag>")
@api_or_login_required
@check_notebook_acl
def get_tag_count(notebook, tag):
    
    nbdb = g.dbconn[get_nb_dbname(notebook)]

    c = tagutils.count(nbdb, tag)
    return jsonify({'tag' : tag,
                    'count' : c})

@app.route("/api/<notebook>/tags/subset/<beginstr>/<N>")
@api_or_login_required
@check_notebook_acl
def get_top_n_tags_str(notebook, beginstr, N):
    
    nbdb = g.dbconn[get_nb_dbname(notebook)]

    r = tagutils.top_n_str(nbdb, beginstr, int(N))
    js = [(t['tag'], t['count']) for t in r]

    return jsonify({'tagcounts' : js})


@app.route("/api/users/search/<searchstring>")
@api_or_login_required
def user_search_string(searchstring):
    """
    Search through the users and return any records that contain this string
    in either name or other

    """
    
    db = g.sysdb
    s = searchstring 
    users = db.users.find({"$or" : [{"username" : {"$regex" : ".*%s.*" % s,
                                                   "$options" : "i"}},
                                    {"name" : {"$regex" : ".*%s.*" % s,
                                                  "$options" : "i"}},
                                    {"email" : {"$regex" : ".*%s.*" % s,
                                               "$options" : "i"}},
                                    {"twitter" : {"$regex" : ".*%s.*" % s,
                                                 "$options" : "i"}}]})

    res = []
    for u in users:
        res.append({'username' : u['username'],
                    'name' : u['name'],
                    '_id' : str(u['_id'])})

    return jsonify({'usersuggestions' : res})

@app.route("/notebook/<notebook>/page/new")
@login_required
@check_notebook_acl
def page_new(notebook):
    """
    
    """


    nbdb = g.dbconn[get_nb_dbname(notebook)]
    
    title = "New Page"
    entries = []

    page_rev = dm.page_entry_revision_create(title, entries)
    author =  session["user_id"]
    
    page_rev.update(dm.revision_create(author, app.config['DB_SYSTEM_DATABASE']))

    revid = nbdb.revisions.insert(page_rev, safe=True)
    page_rev["_id"] = revid
    
    ent_dict = dm.entry_create(dbref("revisions", revid), 'page', page_rev)
    
    entid = nbdb.entries.insert(ent_dict, safe=True)
    
    return redirect("/notebook/%s/page/%s" % (notebook, entid))

@app.route("/api/<notebook>/upload", methods=['GET', 'POST'])
@api_or_login_required
@check_notebook_acl
def upload(notebook):
    """
    File upload interface

    """

    nb = get_notebook(notebook)
    
    if request.method == 'POST':
        gf = gridfs.GridFS(g.dbconn[get_nb_dbname(notebook)])

        
        filename = request.headers["X-File-Name"]
        import mimetypes
        mimetype = mimetypes.guess_type(filename)

        f = gf.new_file(content_type=mimetype[0])
        

        f.write(request.data)
        f.close()
        
        return jsonify({"success":True,
                        "id" : str(f._id)})

    elif request.method == "GET":
        
        return render_template("upload.html",
                               notebook = nb,
                               session = session)
        
@app.route("/api/<notebook>/files/<fileid>", methods=['GET'])
@api_or_login_required
@check_notebook_acl
def files(notebook, fileid):
    if "." in fileid:
        fileid, ext = fileid.split(".")
    else:
        ext = None
        
    nbdb = g.dbconn[get_nb_dbname(notebook)]
    gfs = gridfs.GridFS(nbdb)
    fid = gfs.get(bson.objectid.ObjectId(fileid))
    # we do this lookup to make sure that the FID is valid
    
    content_type = fid.content_type
    # construct convert request
    conv_req = None
    if len(request.args) > 0:
        conv_req = {}
        conv_req['outputformat'] = ext
        if "max_height" or "max_width" in request.args:
            conv_req["max"] = {}
            if "max_height" in request.args:
                conv_req['max']['height'] = int(request.args['max_height'])
            if "max_width" in request.args:
                conv_req['max']['width'] = int(request.args['max_width'])
    else:
            
        if ext == None or \
        (content_type == "image/jpeg" and ext == "jpeg") or \
        (content_type == "image/jpeg" and ext == "jpg") or \
        (content_type == "image/png" and ext == "png") or \
        (content_type == "application/pdf" and ext == "pdf"):
               r =  make_response(fid.read())
               r.mimetype = content_type
               r.content_type = content_type
               return r


        conv_req = {'outputformat' :  ext}
    


    ext_to_mime = {'jpeg' : "image/jpeg",
                   'jpg' : "image/jpeg",
                   'png' : "image/png",
                   'pdf' : "application/pdf"}
    
    
    conv_res  = figure.convert_request(nbdb.fs, fid._id, conv_req,
                                       app.config["FIGURE_TEMP_DIR"])
    if conv_res['state'] == "pending":
        return "PENDING", 202

    if conv_res['state'] == "done":
        # fixme include error handling
        of = gfs.get(conv_res['output'])
        r = make_response(of.read())
        
        r.mimetype = ext_to_mime[ext]
        r.content_type = ext_to_mime[ext]
        m = hashlib.md5()
        m.update(json.dumps(conv_req))

        r.headers['ETag'] = of.md5 + m.hexdigest()
        r.headers['Cache-Control'] = "max-age=3218319841"
        r.headers['Expires'] = "Expires: 19 Jun 2012 11:30:24 GMT"

        return r
    
        

@app.route("/api/cachetest/<resource>")
def cachetest(resource):
    s = "THis is the resource : " + resource
    r =  make_response(s)
    m = hashlib.md5()
    time.sleep(0.10)
    m.update(s)
    r.headers['ETag'] = m.hexdigest()
    r.headers['Cache-Control'] = "max-age=3218319841"
    r.headers['Expires'] = "Expires: 19 Jun 2030 11:30:24 GMT"
    
    return r


@app.route("/oauth/github/authorize")
@login_required
def oauth_github_authorize():
    """
    Github uses oauth2, which in many ways is much simpler.
    

    """
    
    h = httplib2.Http()
    servicename = 'github'

    oauth_config = app.config['OAUTHCONFIG']
    if servicename not in  oauth_config:
        raise Exception("Github not configured for oauth")

    service_config = oauth_config[servicename]
    consumer_key = service_config['consumer_key']
    consumer_secret = service_config['consumer_secret']
    authorize_url = service_config['authorize_url']

    callback_url = url_for("oauth_github_callback", _external=True)

    callback_url = callback_url + "?" + urllib.urlencode({'next' :  request.referrer})
    
    redirect_resp =  redirect(authorize_url + "?" + 
                              urllib.urlencode({'client_id' : consumer_key,
                                                'redirect_uri' : callback_url,
                                                'scope' : 'user,repo'}))

    return redirect_resp


@app.route("/oauth/github/unauthorize")
@login_required
def oauth_github_unauthorize():
    """
    Not actually possible with the API? Wtf?
    
    """
    g.sysdb.users.update({"_id" : session["user_id"]},
                      {"$unset" : {"oauth.github": 1}})
    return redirect(request.referrer)

@app.route("/oauth/github/callback")
@login_required
def oauth_github_callback():

    h = httplib2.Http()
    servicename = 'github'

    oauth_config = app.config['OAUTHCONFIG']
    if servicename not in  oauth_config:
        raise Exception("Github not configured for oauth")
    

    service_config = oauth_config[servicename]
    consumer_key = service_config['consumer_key']
    consumer_secret = service_config['consumer_secret']
    access_token_url = service_config['access_token_url']

    code = request.args['code']

    body = {'client_id' : consumer_key,
            'client_secret' : consumer_secret,
            'code' : code}
    
    resp, content = h.request(access_token_url, 'POST',
                     body = urllib.urlencode(body))

    code = urlparse.parse_qs(content)
    access_token = code['access_token'][0]

    
    req_url = "https://api.github.com/user?access_token=%s" % access_token

    resp, content = h.request(req_url)

    # now where to redirect to?
    
    user_info = json.loads(content)

    g.sysdb.users.update({"_id" : session["user_id"]},
                      {"$set" : {"oauth.github":  {'login' : user_info['login'],
                                                  'access_token' : access_token}}})
    
    
    return redirect(request.args['next'])

@app.route("/oauth/github/test")
@login_required
def oauth_github_test():

    h = httplib2.Http()
    servicename = 'github'

    oauth_config = app.config['OAUTHCONFIG']
    if servicename not in  oauth_config:
        raise Exception("Github not configured for oauth")
    
    ut = g.sysdb.users.find_one({'_id': session["user_id"]},
                                {'oauth.github' : 1})
    
    service_config = oauth_config[servicename]


    ot = ut['oauth']['github']
    URL = "https://api.github.com/user/repos"

    URL = URL + "?" + urllib.urlencode({'access_token' : ot['access_token']})
    
    resp, content = h.request(URL)

    # now where to redirect to?
    
    repo_list = json.loads(content)

    return render_template("oauth_github_test.html",
                           session = session,
                           repos = repo_list, 
                           notebook = None, 
                           version=app.config['VERSION_GIT_DESCRIBE'])


@app.route("/oauth/twitter/authorize")
@login_required
def oauth_twitter_authorize():
    """
    Twitter uses oauth2, which in many ways is much simpler.
    

    """

    servicename = 'twitter'
    
    oauth_config = app.config['OAUTHCONFIG']
    if servicename not in  oauth_config:
        raise Exception("Unknown oauth service %s" % servicename)

    service_config = oauth_config[servicename]
    consumer_key = service_config['consumer_key']
    consumer_secret = service_config['consumer_secret']
    request_token_url = service_config['request_token_url']
    authorize_url = service_config['authorize_url']
    
    
    consumer = oauth.Consumer(consumer_key, consumer_secret)
    client = oauth.Client(consumer)

    # Step 1: Get a request token. This is a temporary token that is used
    # for 
    # having the user authorize an access token and to sign the
    # request to obtain said access token.


    callback_url = url_for("oauth_twitter_callback", _external=True)

    callback_url = callback_url + "?" + urllib.urlencode({'next' :  request.referrer})


    resp, content = client.request(request_token_url, "POST",
                                   body=urllib.urlencode({'oauth_callback': callback_url }))
    if resp['status'] != '200':
        raise Exception("Invalid response %s. %s" % (resp['status'], str(resp)))

    request_token = dict(urlparse.parse_qsl(content))

    url =  "%s?oauth_token=%s" % (authorize_url, request_token['oauth_token'], )
    #if 'oauth_request_tokens' not in session:
    if 'oauth_request_tokens' not in session:
        session['oauth_request_tokens'] = {}
        
    session['oauth_request_tokens'] = request_token

    return redirect(url)



@app.route("/oauth/twitter/unauthorize")
@login_required
def oauth_twitter_unauthorize():
    """
    Not actually possible with the API? Wtf?
    
    """
    g.sysdb.users.update({"_id" : session["user_id"]},
                      {"$unset" : {"oauth.twitter": 1}})
    return redirect(request.referrer)

@app.route("/oauth/twitter/callback")
@login_required
def oauth_twitter_callback():

    servicename = 'twitter'

    oauth_config = app.config['OAUTHCONFIG']
    if servicename not in  oauth_config:
        raise Exception("Twitter not configured for oauth")
    
    service_config = oauth_config[servicename]
    consumer_key = service_config['consumer_key']
    consumer_secret = service_config['consumer_secret']

    authorize_url = service_config['authorize_url']
    access_token_url = service_config['access_token_url']
        
    consumer = oauth.Consumer(consumer_key, consumer_secret)

    request_token = session['oauth_request_tokens']

    del session['oauth_request_tokens']
    
    token = oauth.Token(request_token['oauth_token'],
                        request_token['oauth_token_secret'])

    oauth_verifier = request.args['oauth_verifier']
    
    token.set_verifier(oauth_verifier)
    client = oauth.Client(consumer, token)
    
    resp, content = client.request(access_token_url, "POST")
    access_token = dict(urlparse.parse_qsl(content))

    oauth_token = access_token['oauth_token']
    oauth_token_secret = access_token['oauth_token_secret']
    screen_name = access_token['screen_name']
    
    
    g.sysdb.users.update({"_id" : session["user_id"]},
                      {"$set" : {"oauth.twitter":  {'screen_name' : screen_name,
                                                    'oauth_token' : oauth_token,
                                                    'oauth_token_secret' : oauth_token_secret}}})
        
    
    return redirect(request.args['next'])

@app.route("/oauth/twitter/test")
@login_required
def oauth_twitter_test():
    """Test the twitter interface by making a profile API call

    
    """
    servicename = 'twitter'

    oauth_config = app.config['OAUTHCONFIG']
    if servicename not in  oauth_config:
        raise Exception("Twitter not configured for oauth")


    ut = g.sysdb.users.find_one({'_id': session["user_id"]},
                                {'oauth.twitter' : 1})
    
    service_config = oauth_config[servicename]
    consumer_key = service_config['consumer_key']
    consumer_secret = service_config['consumer_secret']
    consumer = oauth.Consumer(consumer_key, consumer_secret)

    ot = ut['oauth']['twitter']
    token = oauth.Token(ot['oauth_token'],
                        ot['oauth_token_secret'])

    client = oauth.Client(consumer, token)

    RESOURCE_URL = "http://api.twitter.com/1/statuses/home_timeline.json"

    resp = client.request(RESOURCE_URL)
    tweets = json.loads(resp[1])
    return render_template("oauth_twitter_test.html",
                           session = session,
                           tr = tweets, 
                           notebook = None, 
                           version=app.config['VERSION_GIT_DESCRIBE'])
       

@app.route("/oauth/mendeley/authorize")
@login_required
def oauth_mendeley_authorize():
    """
    Mendeley uses oauth2, which in many ways is much simpler.
    

    """

    servicename = 'mendeley'
    
    oauth_config = app.config['OAUTHCONFIG']
    if servicename not in  oauth_config:
        raise Exception("Unknown oauth service %s" % servicename)

    service_config = oauth_config[servicename]
    consumer_key = service_config['consumer_key']
    consumer_secret = service_config['consumer_secret']
    request_token_url = service_config['request_token_url']
    authorize_url = service_config['authorize_url']
    
    
    consumer = oauth.Consumer(consumer_key, consumer_secret)
    client = oauth.Client(consumer)

    # Step 1: Get a request token. This is a temporary token that is used
    # for 
    # having the user authorize an access token and to sign the
    # request to obtain said access token.


    callback_url = url_for("oauth_mendeley_callback", _external=True)

    callback_url = callback_url # + "?" + urllib.urlencode({'next' :  request.referrer})



    resp, content = client.request(request_token_url, "GET")
    
    
    
    if resp['status'] != '200':
        raise Exception("Invalid response %s. %s" % (resp['status'], str(resp)))

    request_token = dict(urlparse.parse_qsl(content))

    url = authorize_url + "?" + urllib.urlencode({'oauth_token' : request_token['oauth_token'],
                                                  'oauth_callback': callback_url})
    
    #if 'oauth_request_tokens' not in session:

    session['oauth_request_tokens'] = request_token
    return redirect(url)



@app.route("/oauth/mendeley/unauthorize")
@login_required
def oauth_mendeley_unauthorize():
    """
    Not actually possible with the API? Wtf?
    
    """
    g.sysdb.users.update({"_id" : session["user_id"]},
                      {"$unset" : {"oauth.mendeley": 1}})
    return redirect(request.referrer)

@app.route("/oauth/mendeley/callback")
@login_required
def oauth_mendeley_callback():

    servicename = 'mendeley'

    oauth_config = app.config['OAUTHCONFIG']
    if servicename not in  oauth_config:
        raise Exception("Mendeley not configured for oauth")
    
    service_config = oauth_config[servicename]
    consumer_key = service_config['consumer_key']
    consumer_secret = service_config['consumer_secret']

    authorize_url = service_config['authorize_url']
    access_token_url = service_config['access_token_url']
        
    consumer = oauth.Consumer(consumer_key, consumer_secret)

    request_token = session['oauth_request_tokens']
    del session['oauth_request_tokens']
    
    token = oauth.Token(request_token['oauth_token'],
                        request_token['oauth_token_secret'])

    oauth_verifier = request.args['oauth_verifier']
    
    token.set_verifier(oauth_verifier)
    client = oauth.Client(consumer, token)
    
    resp, content = client.request(access_token_url, "GET")
    if resp['status'] != "200":
        raise Exception("Invalid response %s. %s" % (resp['status'], str(resp)))

    
    access_token = dict(urlparse.parse_qsl(content))

    
    oauth_token = access_token['oauth_token']
    oauth_token_secret = access_token['oauth_token_secret']
    
    
    g.sysdb.users.update({"_id" : session["user_id"]},
                      {"$set" : {"oauth.mendeley":  {
                                                    'oauth_token' : oauth_token,
                                                    'oauth_token_secret' : oauth_token_secret}}})
        

    # fixme 
    return redirect(url_for('settings', _external=True))

@app.route("/oauth/mendeley/test")
@login_required
def oauth_mendeley_test():
    """
    Test the mendeley interface
    
    """
    servicename = 'mendeley'

    oauth_config = app.config['OAUTHCONFIG']
    if servicename not in  oauth_config:
        raise Exception("Mendeley not configured for oauth")


    ut = g.sysdb.users.find_one({'_id': session["user_id"]},
                                {'oauth.mendeley' : 1})
    
    service_config = oauth_config[servicename]
    consumer_key = service_config['consumer_key']
    consumer_secret = service_config['consumer_secret']
    consumer = oauth.Consumer(consumer_key, consumer_secret)

    ot = ut['oauth']['mendeley']
    token = oauth.Token(ot['oauth_token'],
                        ot['oauth_token_secret'])

    client = oauth.Client(consumer, token)

    RESOURCE_URL = "http://api.mendeley.com/oapi/library/"

    resp = client.request(RESOURCE_URL)
    library = json.loads(resp[1])

    # now get ids of first 5
    doc_info =[]
    for doc_id in library['document_ids'][:5]:
        URL = "http://api.mendeley.com/oapi/library/documents/%s/" % doc_id
        resp = client.request(URL)
        data = json.loads(resp[1])

        doc_info.append(data)
    
    return render_template("oauth_mendeley_test.html",
                           session = session,
                           docs = doc_info, 
                           notebook = None, 
                           version=app.config['VERSION_GIT_DESCRIBE'])


if __name__ == '__main__':
    app.config.from_pyfile(sys.argv[1])
    app.config['DEBUG'] = True
    
    app.run()
    
