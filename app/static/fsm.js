

var render = {
    entry_rev_view : { 
        text: function(rev_doc) {

            return $($.mustache("<div> <h2>{{title}}</h2> <div class='body'> {{body}} </div> "
                                + "</div>", rev_doc)); 
        }
    }, 

    entry_rev_edit : { 
        text: function(rev_doc) {
            return $($.mustache("<div> <input name='title' value='{{title}}'/> <div> <textarea name='body'>{{body}}</textarea> </div> "
                                + "</div>", rev_doc)); 
        }
    }

    
}

function is_entry(entrydiv)
{
    // check if elt is div
    if(!$(entrydiv).hasClass("entry")) {
        console.log("ERROR", entrydiv, "is not an entry"); 
        return false; 
    }

    if(!$(entrydiv).attr("state")) {
        console.log("ERROR", entrydiv, "does not have state attribute") 
        return false; 
    }
    
    return true; 

}


function create_entry_div(entryid, hidden, pinnedrev)
{
    /*
     Create detached entry div, sets state to NONE
     
     */
    var entrydiv = $("<div>"); 
    $(entrydiv).addClass("entry"); 
    $(entrydiv).attr("entryid", entryid); 
    $(entrydiv).attr("state", "none"); 
    
    return entrydiv; 
    
}

function create_entrydiv_body(rev_doc) {
    var class_content = 
        render.entry_rev_view[rev_doc['class']](rev_doc); 
    
    // update author information
    var entrydiv_body = $("<div class='entry-body'><div class='class-content'></div><div class='control'> <a href='#' class='edit'>edit</a> </div> <div class='notices'/> </div>"); 
    
    $(".class-content", entrydiv_body).append(class_content); 
    
    return entrydiv_body; 


}

function create_entrydiv_body_edit(rev_doc) {
    var class_content = 
        render.entry_rev_edit[rev_doc['class']](rev_doc); 
    
    // update author information
    var entrydiv_body = $("<div class='entry-body'><div class='class-content'></div><a href='#' class='save'>save</a> <a href='#' class='cancel'>cancel </a></div>"); 
    
    $(".class-content", entrydiv_body).append(class_content); 
    
    return entrydiv_body; 


}

function opfuncs(docdb) {
    this.docdb = docdb; 

    this.add = function(entryptr) { 
        return create_entry_div(entryptr.entry, entryptr.hidden, 
                               entryptr.rev); 
    }; 

    this.remove = function(entrydiv, entryptr) {
        

    }; 
    
    this.hide = function(entrydiv, entryptr) { 
        if(entryptr.hidden) {
            $(entrydiv).addClass("hidden");              
        } else {
            $(entrydiv).removeClass("hidden");              

        }


    }; 

    this.pin = function(entrydiv, entryptr) { 
        /* 
         * This entry is undergoing a pinned transition -- either to a rev, 
         * or having the pinning removed. 
         * 
         */


        if(get_state(entrydiv) == 'none')
        {
            if(entryptr.rev) {
                
                $(entrydiv).attr("pinned", entryptr.rev); 
            }  else {
                $(entrydiv).removeAttr("pinned"); 
            }
            
        } else if (get_state(entrydiv) == "view") {
             
            if(entryptr.rev) {
                // Adding pinning
                var pinned_rev_id = entryptr.rev; 
                var result = this.docdb.getRev(pinned_rev_id); 
                result.done(function(revdoc) {
                                var body = create_entrydiv_body(revdoc); 
                                $(entrydiv).html(body);
                                $(entrydiv).attr("revid", revdoc._id); 
                            }); 
                
                $(entrydiv).addClass("pinned");              
                
            } else {
                console.log("FIXME: have not implemented unpinning"); 
                $(entrydiv).removeClass("pinned");              
                
                
            }
        } else {
            console.log("Pin updates not present for other states yet"); 
        }


    }; 
    
}; 


function state_none_to_view(entrydiv, docdb, hidden, pinned)
{

    /* transition: NONE->VIEW
     * 
     * Currently just blows away the contained div and does all the updates by
     * denovo creation. In the future, we may be smarter. 
     * 
     */
    
    is_entry(entrydiv); 
    assert_state(entrydiv, 'none'); 

    var entry_id = $(entrydiv).attr("entryid"); 

    
    var entry_doc = {}; 

    if (pinned) {
        console.log("holy crap. this is pinned, pinned=", pinned); 
        entry_doc['head'] = pinned; 
    } else {
        var entry_doc = docdb.getEntry(entry_id); 
    }
    
    $.when(entry_doc)
        .done(function(ed) {
                 var rev_id = ed.head; 
                           
                  $.when(docdb.getRev(rev_id))
                      .done(function(rev_doc) {

                                // update author information
                                var entrydiv_body = 
                                    create_entrydiv_body(rev_doc); 
                                $(entrydiv).attr("revid", rev_doc._id); 
                                $(entrydiv).append(entrydiv_body); 
                                
                                if(hidden) {
                                    $(entrydiv).attr("hidden", '1'); 
                                }
                                
                                if(pinned) { 
                                    $(entrydiv).attr("pinned", rev_id); 
                                }
                                
                                $(entrydiv).attr('state', 'view'); 
    
                            }); 
                  }); 
}



function add_entry_notice(entrydiv, notice)
{
    /* Append a notice to the entry 
     * notice : 
     * level : 'info', 'warning', 'success', 'error'
     * message : text
     */
    var elt = $($.mustache("<div class='notice' level='{{level}}'> {{message}} </div>", notice)); 
    $("div.notices", entrydiv).append(elt); 

}

function state_edit_to_view(entrydiv, docdb)
{
    /* transition: EDIT -> VIEW
     * 
     * A direct transition from edit to view generally means that someone
     * presumably canceled the edit. While in the edit state, it is possible 
     * that someone may have made an entry or page-level modification, and we
     * want to notify them of that. 
     * 
     */
    
    is_entry(entrydiv); 
    assert_state(entrydiv, 'edit'); 
    
    var entry_id = get_entry_config(entrydiv)['entryid']; 
    var current_config =  get_entry_config(entrydiv); 
    var saved_config = get_saved_entry_config(entrydiv); 
    
    if (config_page_delta(current_config, saved_config) ) {
        // FIXME check what happens when there are page-updates
        // in the middle of this

    } else {

        $.when(docdb.getEntry(entry_id)).done(
            function(doc) {
                var head_rev = doc.head; 
                $.when(docdb.getRev(head_rev)).done( 
                    function(rev_doc) {
                        
                        var entrydiv_body = create_entrydiv_body(rev_doc); 

                        $(entrydiv).html(entrydiv_body); 
                        $(entrydiv).attr("revid", rev_doc._id);
                        if (head_rev != saved_config['revid']) {
                            add_entry_notice(entrydiv, {level : 'info', 
                                                        message : "Since you began editing, this entry has been updated. This is the latest version."}); 
                            
                        }
                        $(entrydiv).attr('state', 'view'); 
                        
                    });}) 
    }
    
}

function state_view_to_pagepending(entrydiv, op, server)
{
    /* transition: VIEW->PAGEPENDING
     * 
     * op: 'remove', 'hide', 'pin'
     * 
     */

    is_entry(entrydiv);     

    // save current config
    var cur_config = get_entry_config(entrydiv); 

    // mutate state 
    $(entrydiv).attr('state', "pagepending"); 
    $(entrydiv).attr("pendingop", op); 
    $(entrydiv).data("oldconfig", cur_config); 

    $(".entry-body", entrydiv).hide(); 
    $(entrydiv).append($("<div class='pending'> PENDING </div>")); 

    // request op from server
    server.pageop_notify(); 

}

function state_pagepending_to_view(entrydiv, is_success, error_messages)
{
    /* transition : PAGEPENDING->VIEW
     *  
     * 
     */
    
    // get current op
    var pending_op = $(entrydiv).attr(pendingop); 
    
    // if success, we assume the op delta is correct
    
    // unblock UI
    
    // reflect new state, including possible remove

}


function state_view_to_edit(entrydiv, docdb)
{
    // FIXME: if pinned we can't do this transition, put up a message

    is_entry(entrydiv); 
    assert_state(entrydiv, 'view'); 
    
    var entry_id = get_entry_config(entrydiv)['entryid']; 
    var entry_doc = docdb.getEntry(entry_id); 
    save_entry_config(entrydiv); 

    $.when(entry_doc)
        .done(function(ed) {
                 var rev_id = ed.head; 
                           
                  $.when(docdb.getRev(rev_id))
                      .done(function(rev_doc) {
                                var body = create_entrydiv_body_edit(rev_doc); 
                                $(entrydiv).html(body); 
                                
                                $(entrydiv).attr('state', 'edit'); 
                               })}); 



}


function dom_view_edit_click(entrydom_link, docdb)
{
    var entrydom = $(entrydom_link).closest(".entry"); 
    state_view_to_edit(entrydom, docdb); 
    
}



function dom_edit_cancel_click(entrydom_link, docdb)
{
    var entrydom = $(entrydom_link).closest(".entry"); 
    state_edit_to_view(entrydom, docdb); 
} 


function setup_handlers(server, docdb, entrydom)
{
    
    $("a.edit", entrydom)
        .live("click", function(e) { 
                  
                  // transition this element to edit state

                  console.log($(this)); 



              }); 



}


function kill_handlers(entrydom)
{
    



}
