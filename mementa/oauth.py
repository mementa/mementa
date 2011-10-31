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
from utils import * 

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
    print "requesting", req_url
    resp, content = h.request(req_url)

    # now where to redirect to?
    
    user_info = json.loads(content)
    print str(access_token) + user_info['login']

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
    print "REQUESTING", URL
    
    resp, content = h.request(URL)

    # now where to redirect to?
    
    repo_list = json.loads(content)
    print "repo_list=", repo_list

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
    print "stored tokens", session['oauth_request_tokens']
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
    print "retireved tokens",     session['oauth_request_tokens']
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
    print doc_info
    
    
    return render_template("oauth_mendeley_test.html",
                           session = session,
                           docs = doc_info, 
                           notebook = None, 
                           version=app.config['VERSION_GIT_DESCRIBE'])


if __name__ == '__main__':
    app.config.from_pyfile(sys.argv[1])
    app.config['DEBUG'] = True
    
    app.run()
    
