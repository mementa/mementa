import app.dbutils
import app.datamodel
import app.mementa
import random
import pymongo




def create_system_db(dburl, systemdb):
    if dburl == "":
        conn = pymongo.Connection()

    else:
        
        conn = pymongo.Connection(dburl)

    db = conn[systemdb]

    app.dbutils.create_system_indices(db)

def add_user(dburl, saltstr, systemdb, username):
    """
    Add a user to the database, setting the password to random,
    that we then print

    """
    if dburl == "":
        conn = pymongo.Connection()

    else:
        
        conn = pymongo.Connection(dburl)

    db = conn[systemdb]
    
    pwstr = str(random.random())
    pw_salted = app.mementa.saltpassword(pwstr, saltstr)

    user = app.datamodel.user_create(username, pw_salted)
    oid = db.users.insert(user)
    print "The user id =", oid
    print "The password is:", pwstr
             

def set_password(dburl, saltstr, systemdb, username, newpassword):
    """
    Set the password
    
    """
    if dburl == "":
        conn = pymongo.Connection()

    else:
        
        conn = pymongo.Connection(dburl)
    db = conn[systemdb]
    
    res = db.users.find_one({'username' : username})
    
    saltedpw = app.mementa.saltpassword(newpassword, saltstr)
    res['password'] = saltedpw
    db.users.update({'_id' : res['_id']}, res, safe=True)

    
def add_indices(mongoconn, sysdbname):

    sysdb = mongoconn[sysdbname]

    for r in sysdb.notebooks.find():
        name = r['name']

        db = mongoconn['notebook:' + name]

        print db.tags.count()
                       
        app.dbutils.create_notebook_indices(db)
    
