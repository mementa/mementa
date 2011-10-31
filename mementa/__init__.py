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

DEBUG = True

DB_SYSTEM_DATABASE = 'testsystemdb'
DB_HOST = "127.0.0.1"
DB_PORT = 27017
DB_URL = "mongodb://127.0.0.1:27017"

FIGURE_TEMP_DIR = "/tmp"

HTTP_ERROR_CLIENT_CONFLICT = 409
HTTP_ERROR_CLIENT_BADREQUEST = 400
HTTP_ERROR_FORBIDDEN = 403
VERSION_GIT_DESCRIBE = gitversion.describe()

app = Flask(__name__)
app.config.from_object(__name__)

@app.before_request
def before_request():
    
    mongoconn = pymongo.Connection(app.config['DB_URL'])
    g.dbconn = mongoconn
    g.sysdb = mongoconn[app.config['DB_SYSTEM_DATABASE']]

import api
import oauth
import views


