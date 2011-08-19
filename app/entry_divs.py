from flask import render_template

def text_view(entry, rev):
    
    return render_template("entry_div_text.html",
                           entry=entry, rev=rev)
    
def text_edit(entry, rev):
    
    return render_template("entry_div_edit_text.html",
                           entry=entry, rev=rev)

create = {'text' : text_view}


edit = {'text' : text_edit}

