from functools import wraps
from flask import Flask, session, redirect, url_for, escape, request, g, render_template, jsonify, make_response, Response, flash
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
import oauth2 as oauth
import urlparse
import urllib
import httplib2


# most of these should change for real deployment

DEBUG = True
SECRET_KEY="Eat a bag of dicks"


app = Flask(__name__)
app.config.from_object(__name__)

@app.route("/oauth/login/<servicename>")
def oauth_login(servicename):

    oauth_config = app.config['OAUTHCONFIG']
    if servicename not in  oauth_config:
        raise Exception("Unknown oauth service")

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


    resp, content = client.request(request_token_url, "POST",
                                   body=urllib.urlencode({'oauth_callback': "http://localhost:5000/oauth/callback/%s" % servicename}))
    if resp['status'] != '200':
        raise Exception("Invalid response %s. %s" % (resp['status'], str(resp)))

    request_token = dict(urlparse.parse_qsl(content))

    url =  "%s?oauth_token=%s" % (authorize_url, request_token['oauth_token'], )
    if 'oauth_request_tokens' not in session:
        session['oauth_request_tokens'] = {}
        
    session['oauth_request_tokens'][servicename] = request_token

    return redirect(url)


@app.route("/oauth/callback/<servicename>")
def oauth_callback(servicename):
    oauth_config = app.config['OAUTHCONFIG']
    if servicename not in  oauth_config:
        raise Exception("Unknown oauth service")

    service_config = oauth_config[servicename]
    consumer_key = service_config['consumer_key']
    consumer_secret = service_config['consumer_secret']

    authorize_url = service_config['authorize_url']
    access_token_url = service_config['access_token_url']
        
    consumer = oauth.Consumer(consumer_key, consumer_secret)

    request_token = session['oauth_request_tokens'][servicename]
    
    token = oauth.Token(request_token['oauth_token'],
                        request_token['oauth_token_secret'])

    oauth_verifier = request.args['oauth_verifier']
    
    token.set_verifier(oauth_verifier)
    client = oauth.Client(consumer, token)
    
    resp, content = client.request(access_token_url, "POST")
    access_token = dict(urlparse.parse_qsl(content))

    return "SUCCESSFULLY LOGGED INTO %s : The access token is %s and the secret is %s" % (servicename,  access_token['oauth_token'], access_token['oauth_token_secret'])
    
@app.route("/github")
def github():
    h = httplib2.Http()
    servicename = 'github'

    oauth_config = app.config['OAUTHCONFIG']
    if servicename not in  oauth_config:
        raise Exception("Unknown oauth service")

    service_config = oauth_config[servicename]
    consumer_key = service_config['consumer_key']
    consumer_secret = service_config['consumer_secret']
    authorize_url = service_config['authorize_url']

    return redirect(authorize_url + "?" + 
             urllib.urlencode({'client_id' : consumer_key,
                               'redirect_uri' : 'http://localhost:5000/github_resp'}))

    
@app.route("/github_resp")
def github_resp():
    h = httplib2.Http()
    servicename = 'github'

    oauth_config = app.config['OAUTHCONFIG']
    if servicename not in  oauth_config:
        raise Exception("Unknown oauth service")

    service_config = oauth_config[servicename]
    consumer_key = service_config['consumer_key']
    consumer_secret = service_config['consumer_secret']
    access_token_url = service_config['access_token_url']

    code = request.args['code']
    body = {'client_id' : consumer_key,
            'client_secret' : consumer_secret,
            'code' : code}
    
    resp = h.request(access_token_url, 'POST', body = urllib.urlencode(body))

    access_token = resp['access_token']
    return str(resp)

if __name__ == '__main__':
    
    app.run()
    
