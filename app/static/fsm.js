

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
            $(entrydiv).attr("hidden", true); 
        } else {
            $(entrydiv).removeClass("hidden");              
            $(entrydiv).removeAttr("hidden"); 

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
                $(entrydiv).attr("pinned", revdoc._id); 
                
            } else {
                console.log("FIXME: have not implemented unpinning"); 
                $(entrydiv).removeClass("pinned");              
                
                
            }
        } else {
            var pinned_rev_id = entryptr.rev; 

            if(entryptr.rev) {

                $(entrydiv).addClass("pinned");
                $(entrydiv).attr("pinned", pinned_rev_id); 
                $(entrydiv).attr("revid", pinned_rev_id); 
            } else {
                $(entrydiv).removeClass("pinned");
                $(entrydiv).removeattr("pinned"); 
                // FIXME : We should update the revid for real 
                 
            }


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
    
    delete saved_config.state; 
    delete current_config.state; 
    console.log("current config:", current_config, 
                "saved config:", saved_config); 
    var delta = config_page_delta(current_config, saved_config); 
    if (delta === {}) {

        // FIXME check what happens when there are page-updates
        // in the middle of this

        // if removed, then don't transition back to edit, just transition to "none, have close of notification box remove the div from the list, 

        // if pinned, reload the pinned version, post message
        // if hidden, reload, post message

        // if hidden, keep showing with message that, when closed, hides

        

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

        var delta = config_page_delta(current_config, saved_config); 
        console.log("redrawing", delta);
        $.when(docdb.getEntry(entry_id)).done(
            function(doc) {
                var head_rev = doc.head; 
                if(current_config.pinned) {
                    head_rev = current_config.pinned; 
                }

                $.when(docdb.getRev(head_rev)).done( 
                    function(rev_doc) {

                        var entrydiv_body = create_entrydiv_body(rev_doc); 

                        $(entrydiv).html(entrydiv_body); 
                        $(entrydiv).attr("revid", rev_doc._id);

                        $(entrydiv).attr('state', 'view'); 
                    });
                }); 
        
    }
    

    // this is the loop
    function op_check() {
        var current_config = get_entry_config(entrydiv); 
        var old_config = get_saved_entry_config(entrydiv); 
        
        var config_delta = config_page_delta(current_config, old_config); 
        console.log("op_check", current_config, config_delta); 
        
        if('removed' in current_config) {
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
            
            $(entrydiv).remove(); 
            return; 
        } 

        if(pending_op.cmd == 'hide') {
            console.log("OP IS HIDE");
            if(pending_op.hidden == true && ('hidden' in current_config)) {
                // we wanted to hide and it's hidden! 
                // if it's now pinned or unpinned, we dont' care
                console.log("HIDING"); 
                redraw_transition_update(entrydiv, {hidden: true}); 
                
            } else if(pending_op.hidden == false && !('hidden' in current_config)) {
                // we wanted to unhide and have been successful! 
                // if it's now pinned or unpinned, we don't care
                console.log("UNHIDING"); 
                redraw_transition_update(entrydiv, {hidden: true}); 
            } else {
                // we're still waiting for this to come through
                
            }
        }
        
        if(pending_op.cmd == 'pin') {
            if(current_config.pinned && current_config.pinned == pending_op.pinned) 
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
