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

from mementa import app

def random_api_key():
    API_KEY_LENGTH = 32
    entropy = os.urandom(API_KEY_LENGTH)
    return base64.b16encode(entropy)
    
def jsonify_error(d, e) :
    x = jsonify(d)
    x.status_code = e

    return x


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

def check_api_auth(username, password):
    u = g.sysdb.users.find_one({'username' : username})
    

    successful = False
    if u:
        # check password
        sp = saltpassword(password, app.config['PASSWORDSALT'])
        
        if u['password'] == sp:
            # successful login
            successful = True
        if 'apikey' in u and u['apikey'] == password:
            successful = True

        if successful : 
            session['username'] = username
            session['user_id'] = u['_id']
            session['name'] = u['name']
            
            return True

    return False


def api_or_login_required(f):
    """
    Checks if logged in, first with basic auth, then with session, and if not
    returns 409 (does not redirect to login)

    Used for API calls. 

    """
    def authenticate():
        """Sends a 401 response that enables basic auth"""
        return Response(
        'Could not verify your access level for that URL.\n'
        'You have to login with proper credentials', 401,
        {'WWW-Authenticate': 'Basic realm="Login Required"'})
    

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'username' not in session or session['username'] is None:
            auth = request.authorization
            if not auth or not check_api_auth(auth.username, auth.password):
                return authenticate()
        return f(*args, **kwargs)
    
    return decorated_function

def get_notebook(name):

    d = g.sysdb.notebooks.find({'name' : name})
    return d[0]

def check_notebook_acl(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        notebook = kwargs['notebook']
        nbdb = g.dbconn[get_nb_dbname(notebook)]
        if not has_notebook_permission(session['user_id'], notebook):
            return "You don't have permission to access that notebook", HTTP_ERROR_FORBIDDEN            
        return f(*args, **kwargs)
    return decorated_function



def has_notebook_permission(userid, notebook_name):
    # FIXME linear search? 
    n = get_notebook(notebook_name)
    for u in n['users']:
        if u.id == userid:
            return True
    return False

def has_notebook_admin(userid, notebook_name):
    # FIXME lienar searcH? 
    n = get_notebook(notebook_name)
    for u in n['admins']:
        if u.id == userid:
            return True
    return False

def get_nb_dbname(notebookname):
    return "notebook:" + notebookname

def lookup_user(userid):
    """
    FIXME: cache this eventually

    Take in a userid and return doc
     
     """
    if isinstance(userid, bson.dbref.DBRef):
        ref = userid
    else:
        ref = dbref('users', userid)

    doc = g.sysdb.dereference(ref)
    

    return {'_id' : str(ref.id),
            'username' : doc['username'],
            'name' : doc.get('name', ""),
            'email' : doc.get('email', ""),
            'avatar' : doc.get('avatar', ""),
            'twitter' : doc.get('twitter', "")}
    

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
        elif req['class'] == 'markdown':
            query['class'] = "markdown"
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
    
