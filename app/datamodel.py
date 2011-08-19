import datetime


def user_create(username, password, name=None, email=None):
    return {'username' : username,
            'password' : password,
            'name' : name,
            'password' : password}

    
def revision_create(author, date= None, parent=None):
    """
    do smart things with date, parent, author 

    """
    if date == None:
        date = datetime.datetime.utcnow()
    
    return {'author' : author,
            'parent' : parent,
            'date' : date}



def entry_create(head, dclass, archived=False, ):
    
    return {'head' : head,
            'class' : dclass, 
            'archived' : archived}


def text_entry_revision_create(title, body, **kargs) :

    return {'title' : title,
            'body' : body,
            'class' : "text"}

def page_entry_revision_create(title, entries, tags, **kargs) :
    return {'title' : title,
            'entries' : entries,
            'class' : "page"}


revision_class_create = {'text' : text_entry_revision_create,
                         'page' : page_entry_revision_create}
