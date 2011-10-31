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
from flaskext.oauth import OAuth

# most of these should change for real deployment

DEBUG = True
SECRET_KEY="Eat a bag of dicks"


app = Flask(__name__)
app.config.from_object(__name__)



oauth = OAuth()
twitter = oauth.remote_app('twitter',
    base_url='http://api.twitter.com/1/',
    request_token_url='http://api.twitter.com/oauth/request_token',
    access_token_url='http://api.twitter.com/oauth/access_token',
    authorize_url='http://api.twitter.com/oauth/authenticate',
    consumer_key='kjnY7MoytSQLbv1j8BuQ', 
    consumer_secret='FHL1W0YT8M5YSNP0ze8ykGnAEvf1SMgIBDiy8ftmnU'
)

github = oauth.remote_app('github',
    base_url='http://api.github.com/',
    request_token_url= None, 
    access_token_url='https://github.com/login/oauth/access_token',
    authorize_url='https://github.com/login/oauth/authorize', 
    consumer_key='e4e50371dc552d2dcf17', 
    consumer_secret='d83b907327d29c87d0ba48ff8baea6f82b066ac1',
)


@twitter.tokengetter
def get_twitter_token():
    return session.get('twitter_token')


@github.tokengetter
def get_github_token():
    return session.get('github_token')

@app.route('/login')
def login():
    return twitter.authorize(callback=url_for('twitter_oauth_authorized',
        next=request.args.get('next') or request.referrer or None))



@app.route('/twitter-oauth-authorized')
@twitter.authorized_handler
def twitter_oauth_authorized(resp):
    next_url = request.args.get('next') or url_for('index')
    if resp is None:
        flash(u'You denied the request to sign in.')
        return redirect(next_url)

    session['twitter_token'] = (
        resp['oauth_token'],
        resp['oauth_token_secret']
    )
    session['twitter_user'] = resp['screen_name']

    flash('You were signed in as %s' % resp['screen_name'])
    return redirect(next_url)


@app.route('/github')
def github_login():
    if 'github_token' in session:

        return "The github token is %s, %s" % session['github_token']
    else:
        url = url_for('github_oauth_authorized')
        print "callback url is", url

        return github.authorize(callback="http://localhost:5000" + url)
                                


@app.route('/github-oauth-authorized')
@github.authorized_handler
def github_oauth_authorized(resp):
    print "Resp =", resp
    if resp is None:
        flash(u'You denied the request to sign in.')
        return redirect(next_url)

    session['github_token'] = (
        resp['access_token'], ''

    )

    return redirect(url_for("github_login"))



@app.route('/')
def home():
    return "Hello World"

@app.route('/test')
def index():
    return "SOMEHOW WERE BACK AT THE INDEX"

@app.route("/twitter")
def twittertest():
    if 'twitter_user' not in session:
        return redirect(url_for('login'))

    else:
        return "You logged in as %s" % session['twitter_user']
    
    

if __name__ == '__main__':
    
    app.run()
    
