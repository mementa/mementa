

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
    },

    entry_rev_get : { 
        text: function(entrydiv) {
            var title = $("input[name='title']", entrydiv).val(); 
            var body = $("textarea", entrydiv).val(); 
            return {
                title : title, 
                body : body}; 
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
    if(hidden) {
        $(entrydiv).attr('page-hidden', true);         
    }
    
    if(pinnedrev) {
        $(entrydiv).attr('page-pinned', pinnedrev); 
    }

    
    return entrydiv; 
    
}

function create_entrydiv_body_view(rev_doc) {
    var class_content = 
        render.entry_rev_view[rev_doc['class']](rev_doc); 
    
    // update author information
    var entrydiv_body = $("<div class='entry-body'><div class='class-content'></div><div class='control'> <a href='#' class='edit'>edit</a> </div> <div class='notices'/> </div>"); 
    
    $(".class-content", entrydiv_body).append(class_content); 
    
    return entrydiv_body; 


}

function update_entrydiv_view(entrydiv, revdoc) {
    $(entrydiv).attr("revid", revdoc._id); 
    $(entrydiv).attr("entry-class", revdoc['class']); 
    // other outer-properties
}

function entrydiv_reload_view(entrydiv, docdb, expected_config,
                              messages) {
    /* complete reload and regeneration of a view. 
     * 1. assumes the page-config is correct (hidden, pinned, etc)
     * 2. makes the async call to get the latest docs
     * 3. creates the body div
     * 4. updates the outer entrydiv
     * 5. sets state to view
     * 
     * WARNING THIS FUNC IS ASYNC
     * 
     */
    
    var current_config = get_entry_config(entrydiv); 

    var entry_doc = {}; 

    if (current_config['page-pinned']) {
        entry_doc['head'] = current_config['page-pinned'];
    } else {
        var entry_doc = docdb.getEntry(current_config.entryid);
    }
    
    $.when(entry_doc)
        .done(function(entdoc) {
                 var rev_id = entdoc.head; 
                  $.when(docdb.getRev(rev_id))
                      .done(function(revdoc) {
                                // fixme : should really make sure this is
                                // still the right rev, or retry
                                
                                var current_config  = get_entry_config(entrydiv); 

                                if('page-removed' in current_config) {
                                    messages.remove &&
                                        post_entry_message(entrydiv, messages.remove); 
                                    $(entrydiv).remove();                 
                                    return; 
                                        
                                }
                                                                
                                var body = create_entrydiv_body_view(revdoc);     
                                $(entrydiv).html(body);
                                update_entrydiv_view(entrydiv, revdoc); 
                                $(entrydiv).attr('state', 'view'); 

                                if(current_config['page-hidden'] &&
                                   expected_config['page-hidden']) {
                                    messages.hidden && post_entry_message(entrydiv, messages.hidden); 
                                }

                                if(current_config.revid != 
                                   expected_config.revid) {
                                    messages.revid && add_entry_notice(entrydiv, messages.revid); 
                                    
                                }   
                                
                            
                           }); 
              }); 
    
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
    // FIXME it's not clear how much updating actually happens here
    // THIS IS MUDDLED, WHY ARE WE CREATING DIVS? 
    this.add = function(entryptr) { 
        return create_entry_div(entryptr.entry, entryptr.hidden, 
                               entryptr.rev); 
    }; 

    this.remove = function(entrydiv, entryptr) {

        $(entrydiv).attr("removed", true); 

    }; 
    
    this.hide = function(entrydiv, entryptr) { 
        if(entryptr.hidden) {
            $(entrydiv).addClass("hidden");              
            $(entrydiv).attr("page-hidden", true); 
        } else {
            $(entrydiv).removeClass("hidden");              
            $(entrydiv).removeAttr("page-hidden"); 

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
                
                $(entrydiv).attr("page-pinned", entryptr.rev); 
            }  else {
                $(entrydiv).removeAttr("page-pinned"); 
            }
            
        } else if (get_state(entrydiv) == "view") {
             
            if(entryptr.rev) {
                // Adding pinning
                var pinned_rev_id = entryptr.rev; 
                $(entrydiv).addClass("pinned");
                $(entrydiv).attr("page-pinned", pinned_rev_id); 
                var current_config = get_entry_config(entrydiv);
                entrydiv_reload_view(entrydiv, docdb, current_config); 
                
                
            } else {
                console.log("FIXME: have not implemented unpinning"); 
                $(entrydiv).removeClass("pinned");              
                
                
            }
        } else {
            var pinned_rev_id = entryptr.rev; 

            if(pinned_rev_id) {

                $(entrydiv).addClass("pinned");
                $(entrydiv).attr("page-pinned", pinned_rev_id); 
                $(entrydiv).attr("revid", pinned_rev_id); 
            } else {
                $(entrydiv).removeClass("pinned");
                $(entrydiv).removeattr("page-pinned"); 
                // FIXME : We should update the revid for real 
                 
            }

        }


    }; 
    
}; 


function state_none_to_view(entrydiv, docdb)
{

    /* transition: NONE->VIEW
     * 
     * Currently just blows away the contained div and does all the updates by
     * denovo creation. In the future, we may be smarter. 
     * 
     */
    
    is_entry(entrydiv); 
    assert_state(entrydiv, 'none'); 
    var config = get_entry_config(entrydiv); 
    console.log("state_none_to_view, config=", config); 
    entrydiv_reload_view(entrydiv, docdb, config, {}); 


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
    
    console.log("EDIT->VIEW"); 
    entrydiv_reload_view(entrydiv, docdb, saved_config, 
                         {revid : {level : "info", 
                                   message : "This entry has been updated since you clicked edit"},
                          pinned: { level : "info", 
                                    message : "This entry has been pinned since you clicked edit"}, 
                          hidden : { level : "info", 
                                    message: "This entry has been hidden"}}); 
 
                                     
}
 
function state_view_to_pagepending(entrydiv, op, server, docdb)
{
    /* transition: VIEW->PAGEPENDING
     * 
     * op: 
     * {cmd : remove}
     * {cmd : hidden, hidden: t/f}
     * {cmd : pinned, pinned: rev (or undefined to unpin)}
     */

    is_entry(entrydiv);     
    

    // save current config
    var cur_config = get_entry_config(entrydiv); 

    // mutate state 
    $(entrydiv).attr('state', "pagepending"); 
    $(entrydiv).data("pendingop", op); 
    save_entry_config(entrydiv); 

    $(".entry-body", entrydiv).hide(); 
    $(entrydiv).append($("<div class='pending'> PENDING </div>")); 
    
    // now we should actually execute the op
    state_pagepending_to_view(entrydiv, server, docdb); 
    
}

function post_entry_message(entrydiv, level, message)
{
    var msg = $("<div class='alert-message'>" + message + "</div>");
    $(msg).addClass(level); 
    $(entrydiv).after(msg); 
}

function state_pagepending_to_view(entrydiv, server, docdb)
{
    /* transition : PAGEPENDING->VIEW
     *  
     * 
     */
    
    
    var pending_op = $(entrydiv).data("pendingop"); 
    
    function redraw_transition_update(div, knowndeltas) {
        var entry_id = get_entry_config(entrydiv)['entryid']; 
        var current_config =  get_entry_config(entrydiv); 
        var saved_config = get_saved_entry_config(entrydiv); 
        
        
        delete saved_config.state; 
        delete current_config.state; 
        entrydiv_reload_view(div, docdb, saved_config, {}); 
    }
    


    function op_check() {
        var current_config = get_entry_config(entrydiv); 
        var old_config = get_saved_entry_config(entrydiv); 
        
        var config_delta = config_page_delta(current_config, old_config); 
        console.log("op_check", current_config, config_delta); 
        
        if('page-removed' in current_config) {
            // don't even need to check the delta, because hell, we're never going
            // from removed to unremoved
            if (pending_op.cmd == 'remove') {
                // ok
            } else {
                // bugger, someone removed this on us! 
                if(pending_op.cmd == 'pin') {
                    post_entry_message(entrydiv, 'error', "Your attempt to pin was aborted by someone removing this entry from the page"); 
                } else {
                    post_entry_message(entrydiv, 'error', "Your attempt to hide was aborted by someone removing this entry from the page"); 
                }
            }
            console.log("REMOVING"); 
            $(entrydiv).remove(); 
            return; 
        } 

        if(pending_op.cmd == 'hide') {
            console.log("OP IS HIDE");
            if(pending_op.hidden == true && ('page-hidden' in current_config)) {
                // we wanted to hide and it's hidden! 
                // if it's now pinned or unpinned, we dont' care
                console.log("HIDING"); 
                redraw_transition_update(entrydiv, {hidden: true}); 
                
            } else if(pending_op.hidden == false && !('page-hidden' in current_config)) {
                // we wanted to unhide and have been successful! 
                // if it's now pinned or unpinned, we don't care
                console.log("UNHIDING"); 
                redraw_transition_update(entrydiv, {hidden: true}); 
            } else {
                // we're still waiting for this to come through
                
            }
        }
        
        if(pending_op.cmd == 'pin') {
            if(current_config['page-pinned'] && current_config['page-pinned'] == pending_op.pinned) 
            {
                // FIXME make sure unpinning works
                // success!
                redraw_transition_update(entrydiv, {pinned: true}); 
            }
        }
        
    }

    var RETRIES = 5; 
    function try_command(attempts_left) {
        

        if (attempts_left === 0) {
            console.log("HOLY CRAP, IT DIDNT WORK AFTER 5 TRIES?"); 

            return; 
        }

        // SYNC BLOCK STARTS HERE
        
        op_check(entrydiv); 
        // if we get here, the op has not been successful yet, but it's
        // also not been aborted by some other out-of-band transaction

        var current_docs = server.getPageState(); 
        console.log("Current_page_state = ", current_docs);
        var page_rev = $.extend(true, {}, current_docs.rev)
        
        console.log("entry-pos =", $(entrydiv).attr('entry-pos')); 

        var entry_pos = parseFloat($(entrydiv).attr("entry-pos")); 
        
        if(pending_op.cmd == 'remove') {
            page_rev.entries.splice(entry_pos, 1); 
        } else if (pending_op.cmd == 'pin') {
            if(pending_op.pinned) {
                page_rev.entries[entry_pos]['rev'] = 
                    pending_op.pinned; 
            } else {
                delete page_rev.entries[entry_pos].pinned;                 
            }

        } else if (pending_op.cmd == 'hide') {
            page_rev.entries[entry_pos].hidden = pending_op.hidden; 
        }
        

        var submit = server.pageUpdate(current_docs.entry._id, 
                                       page_rev); 
        
        submit.done(
            function(foo) { 
                op_check(entrydiv);  
        });

        submit.fail(
            function(foo) {
                // retry
                
                try_command(attempts_left -1 ); 
                
            }) ; 
        
        
        
    }
    
    try_command(RETRIES); 
    
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

function state_edit_to_savepending(entrydiv, server, docdb)
{
    /* transition : EDIT -> SAVEPENDING
     *  
     * extract contents, modify gui to show progress
     * attempt save, if successful, go to view
     * if fails, go back to edit
     */

    // FIXME : this is where we would ideally put some validation code
    // if that were necessary


    is_entry(entrydiv); 
    assert_state(entrydiv, 'edit'); 

    $(entrydiv).attr("state", "savepending"); 
    
    
    // from the entrydiv, attempt to construct the new doc, 
    // with properly set parent
    var entryclass = get_entry_config(entrydiv).entryclass; 
    var doccontent = render.entry_rev_get[entryclass](entrydiv);
    doccontent['class'] = entryclass; 
    
    var saved_config = get_saved_entry_config(entrydiv); 

    // note this is from the last time we were in view; this is the one
    // we think we are editing, even if rev might have been updated in the meantime. 
    var edited_revid = saved_config.revid; 
    doccontent['parent'] = edited_revid; 
    
    var MAXTRIES = 4; 

    function attempt_save(tryiter) {
        if (tryiter == 0) {
            // failed out too many times!
            
            
            
        } else { 
            var resp = server.entryUpdate(saved_config.entryid, doccontent); 

            resp.done(function(update) {
                          // the save was successful, transition out
                          state_savepending_to_view(entrydiv, server, docdb, 
                                                    tryiter, update.new_rev) ; 
                          
                          
                      });

            resp.fail(function(update) {

                           // because the server already received the response, 
                           // the update has propagated. So we attempt to save again
 
                           attempt_save(tryiter -1); 
                       }); 


        }
    }

    attempt_save(MAXTRIES); 
    // attempt save 
    // success : done, trigger transition to view
        
}

function state_savepending_to_view(entrydiv, server, docdb, retries, new_rev)
{
    /* transition : SAVEPENDING -> VIEW
     *  
     * retries; did we have to retry at all, 
     */
    
    is_entry(entrydiv); 
    assert_state(entrydiv, 'savepending'); 

    // This is the standard "render this entry at its current div", 
    var saved_config = get_saved_entry_config(entrydiv); 
    var entryid = saved_config.entryid; 

    var resp = docdb.getEntry(entryid); 
    resp.done(function(entrydoc) {
                  //var current_config = get_entry_config(entrydiv); 
                  //var config_delta = config_page_delta(current_config, saved_config); 

                  messages = {
                      removed : {level : 'info', 
                                 message : "Your changes were saved but in the meantime this entry was removed from the page"}, 
                      pinned : {level : "info", 
                                message : "Your changes were saved but in the meantime someone pinned this entry, so this is not your saved version"},
                      hidden : {level : "info", 
                                message : "Your changes were saved, but in the meantime someone hid this entry"}
                  }

                  entrydiv_reload_view(entrydiv, docdb, 
                                       saved_config, messages); 
                                    
              });

}

function state_savepending_to_edit(entrydiv, docdb)
{
    /* transition : SAVEPENDING -> EDIT
     *  
     *  If save attempts fail, this is where we go! 
     */

    is_entry(entrydiv); 
    assert_state(entrydiv, 'savepending'); 

}



function dom_view_edit_click(entrydom_link, docdb)
{
    var entrydom = $(entrydom_link).closest(".entry"); 
    state_view_to_edit(entrydom, docdb); 
    
}

function dom_view_remove_click(entrydom_link,server)
{
    var entrydom = $(entrydom_link).closest(".entry"); 
    state_view_to_pagepending(entrydom, {cmd: 'remove'}, server); 
    
}
function dom_view_pin_click(entrydom_link,server, docdb, pinned_rev)
{
    var entrydom = $(entrydom_link).closest(".entry"); 
    state_view_to_pagepending(entrydom, {cmd: 'pin', pinned:pinned_rev}, server, docdb); 
    
}

function dom_view_hide_click(entrydom_link, server, docdb)
{
    var entrydom = $(entrydom_link).closest(".entry"); 
    state_view_to_pagepending(entrydom, {cmd: 'hide', hidden:true},
                              server, docdb); 
    
}

function dom_edit_cancel_click(entrydom_link, docdb)
{
    var entrydom = $(entrydom_link).closest(".entry"); 
    state_edit_to_view(entrydom, docdb); 
} 

function dom_edit_save_click(entrydom_link, server, docdb)
{
    var entrydom = $(entrydom_link).closest(".entry"); 
    state_edit_to_savepending(entrydom, server, docdb); 
} 


function setup_handlers(server, docdb, entrydom)
{
    
    $("a.edit", entrydom)
        .live("click", function(e) { 
                  
                  // transition this element to edit state

                  console.log($(this)); 



              }); 

    $("a.hide", entrydom)
        .live("click", function(e) {

              }); 
    

}


function kill_handlers(entrydom)
{
    



}
