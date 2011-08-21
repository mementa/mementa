from functools import wraps
from flask import Flask, session, redirect, url_for, escape, request, g, render_template
import simplejson as json
import pymongo
import bson
import entry_divs
import datamodel as dm

DEBUG = True
SECRET_KEY = "Development key"
DATABASE = 'testdb'

app = Flask(__name__)
app.config.from_object(__name__)

@app.before_request
def before_request():
    
    mongoconn = pymongo.Connection()
    g.db = mongoconn[app.config['DATABASE']]
    


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
        session['user_id'] = "112233"
        
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

    
    return render_template("list_entries.html", entries=urls)
    
@app.route("/entries")
@login_required
def entries():
    entries = g.db['entries']
    docs = entries.find()
    ids = [str(d["_id"]) for d in docs]
    urls = [(id, url_for('entry', entryid=id)) for id in ids]

    
    return render_template("list_entries.html", entries=urls)
    
@app.route("/pages")
@login_required
def entries():
    entries = g.db['entries']
    docs = entries.find({u'class' : u'page'})
    print docs
    params = [(str(d["_id"]), "page") for d in docs]
        
    urls = [(id[0], id[1], url_for('page', entryid=id[0])) for id in params]

    
    return render_template("list_pages.html", pages=urls)
    
@app.route("/page/<entryid>")
@login_required
def page(entryid):
    col_entries = g.db['entries']
    col_revisions = g.db['revisions']
     
    doc = col_entries.find_one({"_id" : bson.objectid.ObjectId(entryid)})

    if not doc:
        return "COULD NOT FIND THAT DOCUMENT"

    head = doc['head']
    rev = g.db.dereference(head)

    entry_refs = rev['entries']

    entry_docs = [g.db.dereference(ref) for ref in entry_refs]
    entry_docs_ids = [str(ed['_id']) for ed in entry_docs]
    outdivs = []
    for e in entry_docs:
        erev = g.db.dereference(e['head'])
        doc_class = erev['class']

        div = entry_divs.create[doc_class](e,  erev)

        outdivs.append(div)
        
        
    return render_template("page.html",
                           page_docs_ids_json = json.dumps(entry_docs_ids),
                           page_entry = doc, 
                           page_head_revision = rev, 
                           entry_divs = outdivs)


@app.route("/entry/render/view/<entryid>")
@login_required
def entry_render_view(entryid):
    """
    Return the div element associated with the HEAD of this entry

    """
    
    entries = g.db['entries']
    entryrevisions = g.db['revisions']
     
    doc = entries.find_one({"_id" : bson.objectid.ObjectId(entryid)})

    if not doc:
        return "COULD NOT FIND THAT DOCUMENT"

    head = doc['head']
    rev = g.db.dereference(head)

    # THIS IS WHERE WE ADD THE EXTRA RENDERING STUFF

    doc_class = rev['class']

    div = entry_divs.create[doc_class](doc, rev)
        
    return div


def db_get_entry(id):
    entries = g.db['entries']
    doc = entries.find_one({"_id" : bson.objectid.ObjectId(entryid)})

    return doc


@app.route("/entry/render/edit/<entryid>")
@login_required
def entry_render_edit(entryid):
    """
    Return the div element associated with the HEAD of this entry,
    for editing
    
    """


    entryrevisions = g.db['revisions']
     
    doc = db_get_entry(entryid)

    if not doc:
        return "COULD NOT FIND THAT DOCUMENT"

    head = doc['head']
    rev = g.db.dereference(head)

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

        entry_class = request.form['entry_class']
        entry_id = request.form['entry_id']

        request_dict = {}
        # turn the multidict into a single dict
        
        for k in request.form:
            request_dict[k] = request.form[k]
                    
        vdoc = dm.revision_class_create[entry_class](**request_dict)
        author = bson.dbref.DBRef(session["user_id"], "users")
        entry_ver = dm.revision_create(author=author,
                                            parent = request.form["rev_id"])
        vdoc.update(entry_ver)
        
        # create the doc, now insert it into mongo
        col_entries = g.db['entries']
        col_revisions = g.db['revisions']

        oid = col_revisions.insert(vdoc, safe=True)

        
        tref = bson.dbref.DBRef("revisions", oid)

        # FIXME FIXME FIXME USE COMPARE AND SWAP HERE

        col_entries.save({'_id' : bson.objectid.ObjectId(entry_id),
                          'head' : tref}, safe=True)


        div = entry_divs.create[entry_class]({'_id' : entry_id,
                                              'head' : tref,
                                              'archived' : False}, vdoc) # FIXME archived
        print "Saved document!" 
        return div
    
    else:
        pass

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

    if 'title' not in request.form:
        return "'title' not present in request",  400
    if 'entries' not in request.form:
        return "'entries' not present in request", 400

    title = request.form['title']

    entries = []
    for e in request.form['entries']:
        if 'entry' not in e:
            return 'invalid entry', 400

        edict = {'entry' : bson.dbref.DBRef("entries", e['entry']), 
                 'hidden' : get(e, 'hidden', False)}
                 
        if 'rev' in e:
            edict['rev'] = bson.dbref.DBRef("revisions", e['rev'])

        entries.append(edict)

    page_rev = dm.page_entry_revision_create(title, entries)
    page_rev.update(dm.revision_create(bson.dbref.DBRef("users",
                                                        session["user_id"])))

    revid = revisions.insert(page_rev, safe=True)

    ent_dict = entry_create(bson.dbref.DBRef("revisions", revid))

    entid = entries.insert(ent_dict, safe=True)
    ent_dict["_id"] = entid

    page_rev["_id"] = revid

    
    return {'entry' : {'class' : 'page',
                       'head' : revid,
                       '_id' : entid},
            
            'revision' : dm.page_to_json(page_rev)}
    
    

@app.route('/api/page/<page_entryid>', methods=["POST"])
@login_required
def api_page_mutate(page_entryid):
    """
    Primary page mutation interface

    """

    COMMIT_ATTEMPTS = 30 # otherwise something is pretty wrong!
    
    
    action = request.form('action')
    page_ver_id = request.form('page_ver_id')

    for commit_attempt in range(COMMIT_ATTEMPTS):

        latest_page_entry_doc = db_get_entry_doc(page_entryid)

        if str(latest_page_entry_doc.head) != page_ver_id:
            print "Page has been updated since this edit"


        latest_page_rev_doc  = g.db.dereference(latest_page_entry_doc.head)

        if can_mutate_page(action, latest_page_rev_doc,
                      action_data) :
            new_doc = mutate_page(action, latest_page_rev_doc,
                                  action_data)
            author = bson.dbref.DBRef(session["user_id"], "users")

            new_doc.update(dm.revision_create(author,
                                              parent=latest_page_rev))
            
            new_doc_oid = revisions.insert(new_doc, safe=True)

            # create new, updated entry doc pointing to this doc

            new_entry_doc = d.entry_create(bson.dbref.DBRef(new_doc_oid,  'revisions'),
                                           latest_page_entry_doc['class'])

            # compare-and-swap
            res = entries.update(latest_page_entry_doc,
                                 new_entry_doc, safe=True)
            
            if res['updatedExisting'] == True:
                # success!
                return jsonify({"latest_page_revision_doc" : new_doc})
                              
            
            else:
                # failed to update, meaning someone else updated the entry ahead of us
                revisions.remove({'_id' : new_doc_oid})
                
                # then loop

        else:
            # couldn't actually perform mutation,
            # return latst doc along with status "Invalid mutation"
            
            return jsonify({"reason" : "invalid mutation" ,
                            "latest_page_revision_doc" : latest_page_rev_doc}), 400

        return jsonify({"reason" : "too much contention"}), 400

            
def can_mutate_page(action, latest_page_rev_doc, action_data):
    """
    Is this mutation possible? on this doc

    """

def mutate_page(action, latest_page_rev_doc, action_data):
    """
    Perform the mutation
    return the updated doc
    """
    

if __name__ == '__main__':
    app.run()
