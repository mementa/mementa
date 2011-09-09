
var render = {

    
    
    entry_rev_view_for_class :  {
        'text' : function(rev_doc) { 
            return $($.mustache("<h3>{{{title}}}</h3> "
                              + "<div class='text-body'>{{{body}}}</div></div> ", rev_doc)); 
            
        }
    }
}

