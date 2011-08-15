import datetime


def create_user(username, password, name=None, email=None):
    return {'username' : username,
            'password' : password,
            'name' : name,
            'password' : password}

    
def entry_version_create(author, date= None, parent=None):
    """
    do smart things with date, parent, author 

    """
    if date == None:
        date = datetime.datetime.utcnow()
    
    return {'author' : author,
            'parent' : parent,
            'date' : date}



def create_entry(head, archived=False):
    
    return {'head' : head,
            'archived' : archived}


def text_entry_version_create(title, body, **kargs) :
    print "THE BODY IS", body
    return {'title' : title,
            'body' : body,
            'class' : "text"}


version_class_create = {'text' : text_entry_version_create}
