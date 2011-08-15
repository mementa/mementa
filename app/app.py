from functools import wraps
from flask import Flask, session, redirect, url_for, escape, request, g, render_template
import pymongo
import bson
import entry_divs

DEBUG = True
SECRET_KEY = "Development key"


app = Flask(__name__)
app.config.from_object(__name__)
DATABASE = 'testdb'
mongoconn = pymongo.Connection()
db = mongoconn[DATABASE]



def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
    
        if 'username' not in session or session['username'] is None:
            return redirect(url_for('login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
@login_required
def index():
    return "Hello World"


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        session['username'] = request.form['username']
        return redirect(url_for('index'))
    return '''
        <form action="" method="post">
            <p><input type=text name=username>
            <o><input type=text name=password>
            <p><input type=submit value=Login>
        </form>
    '''

@app.route('/logout')
def logout():
    # remove the username from the session if its there
    session.pop('username', None)
    return redirect(url_for('index'))

@app.route('/users')
def listusers():
    ## allusers = db.User.find()
    ## users = [u['username'] for u in allusers]
    ## return str(users)
    pass


@app.route("/entries")
@login_required
def entries():
    entries = db['entries']
    docs = entries.find()
    ids = [str(d["_id"]) for d in docs]
    urls = [(id, url_for('entry', entryid=id)) for id in ids]

    
    return render_template("list_entries.html", entries=urls)
    
    
@app.route("/entry/debug/<entryid>")
@login_required
def entry(entryid):
    entries = db['entries']
    entryversions = db['entryversions']
     
    doc = entries.find_one({"_id" : bson.objectid.ObjectId(entryid)})

    if not doc:
        return "COULD NOT FIND THAT DOCUMENT"

    head = doc['head']
    rev = db.dereference(head)

    # THIS IS WHERE WE ADD THE EXTRA RENDERING STUFF

    doc_class = rev['class']

    div = entry_divs.create[doc_class](doc, rev)
        
    return render_template("entry_debug.html",
                           entry = doc, 
                           head_version = head,
                           entry_div = div)

@app.route("/entry/render/view/<entryid>")
@login_required
def entry_render_view(entryid):
    """
    Return the div element associated with the HEAD of this entry

    """
    
    entries = db['entries']
    entryversions = db['entryversions']
     
    doc = entries.find_one({"_id" : bson.objectid.ObjectId(entryid)})

    if not doc:
        return "COULD NOT FIND THAT DOCUMENT"

    head = doc['head']
    rev = db.dereference(head)

    # THIS IS WHERE WE ADD THE EXTRA RENDERING STUFF

    doc_class = rev['class']

    div = entry_divs.create[doc_class](doc, rev)
        
    return div
    
@app.route("/entry/render/edit/<entryid>")
@login_required
def entry_render_edit(entryid):
    """
    Return the div element associated with the HEAD of this entry,
    for editing
    
    """

    entries = db['entries']
    entryversions = db['entryversions']
     
    doc = entries.find_one({"_id" : bson.objectid.ObjectId(entryid)})

    if not doc:
        return "COULD NOT FIND THAT DOCUMENT"

    head = doc['head']
    rev = db.dereference(head)

    # THIS IS WHERE WE ADD THE EXTRA RENDERING STUFF

    doc_class = rev['class']

    div = entry_divs.edit[doc_class](doc, rev)
        
    return div

# set the secret key.  keep this really secret:
app.secret_key = 'A0Zr98j/3kdshfkdsajhfasdkj239r12nc-95h1pi34r1143yX R~XHH!jmN]LWX/,?RT'

@app.route('/entry/<entryid>', methods=['GET', 'POST'])
@login_required
def save_entry(entryid):
    
    if request.method == "POST":
        # extract the fields from post

        # add the fields 

        
        pass
    else:
        pass

    

if __name__ == '__main__':
    app.run()
