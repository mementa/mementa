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


if __name__ == '__main__':
    app.config.from_pyfile(sys.argv[1])
    app.config['DEBUG'] = True
    
    app.run()
    
