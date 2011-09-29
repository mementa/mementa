import app.dbutils
import app.datamodel
import app.mementa
import random
import pymongo




def create_system_db(dburl, systemdb):
    conn = pymongo.Connection(dburl)
    db = conn[systemdb]
    app.dbutils.create_system_indices(db)

def add_user(dburl, saltstr, systemdb, username):
    """
    Add a user to the database, setting the password to random,
    that we then print

    """
    conn = pymongo.Connection(dburl)
    db = conn[systemdb]
    
    pwstr = str(random.rand())
    pw_salted = app.mementa.saltpassword(pwstr, saltstr)

    user = app.datamodel.user_create(username, pw_salted)
    oid = db.users.insert(User)
    print "The user id =", user
             

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

    
