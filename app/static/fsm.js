

var render = {
    entry_rev_view : { 
        text: function(rev_doc) {

            return $($.mustache("<div> <h2>{{{title}}}</h2> <div class='body'> {{{body}}} </div> "
                                + "</div>", rev_doc)); 
        }, 

        figure: function(rev_doc) {
            /* figures are more complex than text ! */ 

            var view = $($.mustache("<div> <h2>{{{title}}}</h2> "
                                    + "<ul class='images'></ul> "
                                    + " <div class='caption'>{{{caption}}}</div> "
                                + "</div>", rev_doc)); 
            var imglist = $("ul", view); 
            _.each(rev_doc.images, function( elt, index) { 
                       figure_view_render_image(imglist, elt); 
                   }); 
            return view; 
        }

    }, 

    entry_rev_edit : { 
        text: function(rev_doc) {
            return $($.mustache("<div> <input name='title' value='{{{title}}}' class='xlarge' size='70' placeholder='optional title for figure'/> <div class='toolbar'> </div> <textarea class='textbody'> {{{body}}} </textarea> "
                                + "</div>", rev_doc)); 
        },

        figure: function(rev_doc) {
            var view = $($.mustache("<div>"
                                + " <div> <input name='title' value='{{{title}}}' placeholder='title for figure' class='xlarge' size='70'/> </div> "
                                + "<ul class='images'> </ul> "
                                + "<hr><div class='control' > <div class='hover'>Drop Files Here </div>"
                                + "<div class='files'><input type='file' name='files' multiple='true'></input></div>"
                                + "<div class='caption'><textarea class='caption' placeholder='Caption for entire figure' name='caption'>{{{caption}}}</textarea> </div> "


                                + "</div></div>", rev_doc)); 
            var imglist = $("ul.images", view);
            _.each(rev_doc.images, function(imgconfig) { 
                       var li = figure_edit_create_li(); 
                       imglist.append(li); 
                       figure_edit_render_image(li, imgconfig); 
                   }); 

            return view; 
        }


    },

    entry_rev_get : { 
        text: function(entrydiv) {
            var title = $("input[name='title']", entrydiv).val(); 
            // this is for testing only -- in reality, we want to get
            // the content from the editor. We should really architect this better

            var body; 

            body = $( '.textbody', entrydiv ).val( ); 

            return {
                title : title, 
                body : body}; 
        }, 

        figure :  function(entrydiv) {
            var title = $("input[name='title']", entrydiv).val(); 
            var caption = $("textarea[name='caption']", entrydiv).val(); 
            
            var imglist = $("ul.images", entrydiv); 
            var images = []; 
            $("li", imglist)
                .each(function(index, elt) {
                          var id = $("div.imagecontainer", elt).attr("fileid"); 

                          var visible = $("input[name='visible']", elt).is(":checked"); 
                          var max = {
                              height : parseFloat($("input[name='max-height']", elt).val()) ,
                              width : parseFloat($("input[name='max-width']", elt).val()) 
          
                          }; 

                          var minicaption = 
                              $("textarea[name='caption']", elt).val(); 
                          
                          
                          
                          images.push({
                                          id : id, 
                                          visible : visible, 
                                          maxsize : max, 
                                          caption : minicaption
                                      }); 
                      }); 
            return {
                title : title, 
                caption : caption, 
                images : images, 
                gallery : false
            }; 

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

function entrydiv_set_pending(entrydiv, ispending) {
    /* Add the "pending" throbber to an entry
     * 
     */
    if(ispending) {
        $(entrydiv).addClass("pending"); 


    } else {
        // remove the pending status
        $(entrydiv).removeClass("pending"); 

        
    }

    

}


function create_entry_div(entryid, hidden, pinnedrev)
{
    /*
     Create detached entry div, sets state to NONE
     
     */
    var entrydiv = $("<div>"); 
    $(entrydiv).addClass("entry"); 
    $(entrydiv).attr("entryid", entryid); 
    $(entrydiv).attr("id", "entry"+generate_seq_uuid()); 

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
    var entrydiv_body = $("<div class='entry-body'><div class='meta'><img class='avatar' src='http://www.gravatar.com/avatar/205e460b479e2e5b48aec07710c08d50?s=50'/></div><div class='right-body'> <div class='class-content'></div><div class='control hovertarget'> <span class='timestamp'/>  &nbsp; &nbsp;"
                          + "<a href='#' class='edit'>edit</a> &nbsp; &nbsp; "
                          + "<a href='#' class='hide'>hide</a> &nbsp; &nbsp;"
                          + "<a href='#' class='unhide'>unhide</a> &nbsp; &nbsp;"
                          + "<a href='#' class='remove'>remove</a> &nbsp; &nbsp;"
                          + "<span class='move' draggable='true'>reorder/move</span> &nbsp; &nbsp;"
                          + "</div> <div class='notices'/> </div> </div>"); 
    
    var datestring = rev_doc.date.substr(0, rev_doc.date.length - 7) + "Z"; 

    $(".timestamp", entrydiv_body).html(datestring).cuteTime(); 
    $(".class-content", entrydiv_body).append(class_content); 
    $("img.avatar", entrydiv_body)
        .attr("src", "/api/user/" + rev_doc['author'] + "/avatar/48")
        .attr("user_id", rev_doc['author']); 
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
    var done_deferred = $.Deferred(); 

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

                                if(current_config['page-hidden'] &&
                                   !expected_config['page-hidden']) {
                                    messages.hidden && post_entry_message(entrydiv, messages.hidden); 
                                }

                                if(current_config.revid != 
                                   expected_config.revid) {
                                    messages.revid && add_entry_notice(entrydiv, messages.revid); 
                                    
                                }   
                                entrydiv_set_pending(entrydiv, false); 
                                set_state(entrydiv, "view"); 
                                
                                done_deferred.resolve(); 

                            }); 
              }); 
    return done_deferred.promise(); 
}

function create_entrydiv_body_edit(rev_doc) {
    var class_content = 
        render.entry_rev_edit[rev_doc['class']](rev_doc); 
    
    // update author information
    var entrydiv_body = $("<div class='entry-body'>"
                          + "<div class='meta'>"
                          + "<img class='avatar'/>"
                          + "</div>"
                          + "<div class='right-body'>"
                          + "    <div class='class-content'/>"
                          + "    <div class='control'><a href='#' class='btn save primary'>save</a> <a href='#' class='btn cancel'>cancel </a></div> "
                          + "<div class='notices'/> </div></div>"); 
    
    $(".class-content", entrydiv_body).append(class_content); 
    $("img.avatar", entrydiv_body)
        .attr("src", "/api/user/" + rev_doc['author'] + "/avatar/48"); 

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
            $(entrydiv).attr("page-hidden", true); 
        } else {
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
    return entrydiv_reload_view(entrydiv, docdb, config, {}); 


}



function add_entry_notice(entrydiv, notice)
{
    /* Append a notice to the entry 
     * notice : 
     * level : 'info', 'warning', 'success', 'error'
     * message : text
     */
    var elt = $($.mustache("<div class='notice alert-message {{level}}' level='{{level}}'> <a class='close' href='#'>&times;</a>  {{message}} </div>", notice)); 

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
    set_state(entrydiv, "pagepending"); 
    entrydiv_set_pending(entrydiv, true); 

    $(entrydiv).data("pendingop", op); 
    save_entry_config(entrydiv); 

    
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

            $(entrydiv).remove(); 
            return; 
        } 

        if(pending_op.cmd == 'hide') {

            if(pending_op.hidden == true && ('page-hidden' in current_config)) {
                // we wanted to hide and it's hidden! 
                // if it's now pinned or unpinned, we dont' care

                redraw_transition_update(entrydiv, {hidden: true}); 
                
            } else if(pending_op.hidden == false && !('page-hidden' in current_config)) {
                // we wanted to unhide and have been successful! 
                // if it's now pinned or unpinned, we don't care

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
        var page_rev = $.extend(true, {}, current_docs.rev)
        


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
        
        page_rev.parent = page_rev._id; 

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

    var resp = $.Deferred(); 

    $.when(entry_doc)
        .done(function(ed) {
                 var rev_id = ed.head; 
                           
                  $.when(docdb.getRev(rev_id))
                      .done(function(rev_doc) {
                                var body = create_entrydiv_body_edit(rev_doc); 
                                $(entrydiv).html(body); 
                                set_state(entrydiv, 'edit'); 
                                resp.resolve(entrydiv); 
                               })}); 

    return resp.promise(); 

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
    
    set_state(entrydiv, "savepending"); 
    entrydiv_set_pending(entrydiv, true); 
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
    
    var CONFLICT_MAXTRIES = 4; 

    function attempt_save(tryiter) {
        
        if (tryiter == 0) {
            // failed out too many times! // FIXME prettys ure this isn't the right invocati
            state_savepending_to_edit(entrydiv); 
        } else { 
            var resp = server.entryUpdate(saved_config.entryid, doccontent); 

            resp.done(function(update) {
                          // the save was successful, transition out
                          state_savepending_to_view(entrydiv, server, docdb, 
                                                    tryiter, update.new_rev) ; 
                          
                          
                      });

            resp.fail(function(update) {
                          if(update.reason == 'conflict' ) {
                          
                              // because the server already received the response, 
                              // the update has propagated. So we attempt to save again
                              attempt_save(tryiter -1);                               
                              
                          } else if (update.reason == 'timeout') {

                              state_savepending_to_edit(entrydiv, docdb, 
                                                       [{level : 'error', 
                                                        message : "Timeout when contacting the server."}]); 
                              

                          } else {
                              state_savepending_to_edit(entrydiv, docdb, 
                                                       [{level : 'error', 
                                                        message : "Unknown error when contacting the server"}]); 

                          }

                       }); 


        }
    }

    attempt_save(CONFLICT_MAXTRIES); 
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
                  
                  var messages = {
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

function state_savepending_to_edit(entrydiv, docdb, messages)
{
    /* transition : SAVEPENDING -> EDIT
     *  
     *  If save attempts fail, this is where we go! 
     */

    is_entry(entrydiv); 
    assert_state(entrydiv, 'savepending'); 

    // remove pending view
    entrydiv_set_pending(entrydiv, false); 

    // add notices
    _.map(messages, function(m) {

              add_entry_notice(entrydiv, m); 
              
          }); 

    set_state(entrydiv, 'edit'); 

}

function move_entry(server, entrycontainer, pos_from, pos_to) {
    /* Attempt to move the entry from position to position. 
     * 
     * 
     */
    
    // get info about the two entries that we're trying to work with, just to confirm
    var ent  = $("div.entry.page-active", entrycontainer).eq(pos_from);

    var conf = get_entry_config(ent); 

    // we do the add first
    var hidden = conf['page-hidden'] || false; 
    var pinned = conf['page-pinned'] || false; 
    
    var d = insert_entry_retry(server, pos_to, conf.entryid, hidden,  
                               conf['page-pinned'], 5); 
    
    d.done(function(args) { 
               // now remove the original 
               state_view_to_pagepending(ent, {cmd: 'remove'}, server); 
           }); 
}

function insert_entry_retry(server, pos, entryid, hidden, pinned, RETRYN) 
{
    var d = $.Deferred(); 
    
    function attempt(tryattempt) {
        if(tryattempt == 0) {
            d.reject(); 
            return; 
        } 
        
        var ps = server.getPageState(); 
        var page_rev = $.extend(true, {}, ps.rev)
        var ent = {
            entry: entryid, 
            hidden : hidden
        }; 
        if(pinned) {
            ent.pinned = pinned; 
        }

        page_rev.entries.splice(pos, 0, ent); 
        page_rev.parent = page_rev._id; 

        var submit = server.pageUpdate(ps.entry._id, 
                                       page_rev); 
        
        submit.done(
            function(foo) { 
                d.resolve(); 
        });
        
        submit.fail(
            function(foo) {
                // retry
                attempt(tryattempt -1); 
                
            }) ; 
        
        
    }
    attempt(RETRYN); 

    return d.promise(); 

}

function dom_add_entry_click(doc, server, docdb) {
    /* When this op is completed, we fire the deferred so that we can (say) 
     * switch it to edit and set focus. 
     * 
     * 
     */
    var d = $.Deferred(); 
    
    var entdef = server.entryNew(doc['class'], doc ); 
    entdef.done(function(docs) {

                    var hidden = false; 
                    var pinned = undefined; 
                    // when done
                    var RETRYN = 5; 
                    var pos = 10000; // very end

                    var entryid = docs.entry._id; 

                    var insertdone = 
                        insert_entry_retry(server, pos, 
                                           entryid, hidden, pinned, RETRYN); 
                    
                    insertdone.done(function() {
                                        d.resolve(); 
                                    });
                    
                    insertdone.fail(function() { 
                                        d.reject(); 
                                    }); 
                    }); 
    return d.promise(); 

}

function dom_view_edit_click(entrydom_link, docdb)
{
    var entrydom = $(entrydom_link).closest(".entry"); 
    return state_view_to_edit(entrydom, docdb); 
    
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

function dom_view_hide_click(entrydom_link, server, docdb, hidden)
{
    var entrydom = $(entrydom_link).closest(".entry"); 
    state_view_to_pagepending(entrydom, {cmd: 'hide', hidden: hidden},
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



/* Figures */

function figure_image_downloader(tgtdiv, url)
{
    // Repeatedly try and download the image URL until success or error
    // show throbber on error
    
    var RETRIES = 6; 


    function retry_function(count) {
        if (count == 0) {
            $(tgtdiv).html("<img src='/static/figure-fail.gif'>"); 
            // give up
            return; 

        }
        $(tgtdiv).html("<img src='/static/ajax-loader.gif'>"); 
        
        var resp = $.get(url); 
        resp.done(function(res, textstatus, jqxhr) { 
                      if(jqxhr.status == 202) {
                          $.doTimeout(1500, function() {
                                          console.log("RETRYING FUNCTION", url); 
                                          retry_function(count -1); 
                                      });
                      } else if (jqxhr.status == 200) {
                          $(tgtdiv).html("<img src='" + url + "'>");                          
                      }
                      
                      
                  }); 
        resp.fail(function(jqxhr, txt) {
                          // FIXME file couldn't be converted
                      
                  }); 

    }

    retry_function(RETRIES); 

}

function figure_edit_create_li() {
     
    var outli = $("<li><div class='imagecontainer'>"
                  + "</div></li>"); 
    return outli; 

}
function figure_edit_render_image(outli, image)
{
    /* Create the div / etc for a single image
     * populate the caption, the visible checkbox
     * append to div
     * start the downloader 
     */
    console.log("figure_edit_render_image", outli, image); 
    $(".imagecontainer", outli).empty(); 
    
    $(".imagecontainer", outli).append("<div class='image'> </div>   "
                                       + "<B>max</b> height : <input type='number' min='50' max='1000' step='50' value='100' name='max-width' >"
                                       + "width : <input type='number' min='50' max='1000' step='50' value='100' name='max-height'>"
                                       + "<div> <textarea placeholder='Caption for this subfigure' name='caption'></textarea></div>  "
                                       + "visible : <input type='checkbox' name='visible' value='option'  /> <a><span class='remove' > &times;  </span></a>"); 
    

    console.log("image = ", image, "outli=", outli);
    var id = image.id; 
    var caption = image.caption; 
    var visible = image.visible; 
    $("div.imagecontainer", outli).attr("fileid", id);
    if(visible) { 

        $( outli).addClass("visible"); 
    }

    $("textarea[name='caption']", outli).html(caption); 

    // create the URL 
    var url = "/api/" + CURRENT_NOTEBOOK + "/files/" + id + ".png"; 
    var max = image.maxsize; 
    if (max) {
        url += "?" 
        if(max.height) { 
            url += "max_height=" + max.height + "&"; 
            $("input[name='max-height']", outli).attr("value", max.height); 
        }
        if(max.width) { 
            url += "max_width=" + max.width; 
            $("input[name='max-width']", outli).attr("value",  max.width); 
        }
    }

    $("input[name='visible']", outli).prop("checked", visible);

    figure_image_downloader($(".image", outli), url); 

    
}

function figure_view_render_image(containerdiv, image)
{
    /* Create the div / etc for a single image
     * populate the caption, 
     */
    
    var outli = $("<li><div class='imagecontainer'><a href='' target='_blank'><div class='image'> </div></a>"
                   + "<div class='caption'></div>"
                   + "</div></li>")
    
    var id = image.id; 
    var caption = image.caption; 


    var visible = image.visible; 
    if (!visible) {
        return;         

    }
    $("div.imagecontainer", outli).attr("fileid", id); 
    $("div.caption", outli).html(caption); 
    var original_url = "/api/" + CURRENT_NOTEBOOK + "/files/" + id ; 

    $("a", outli).attr("href", original_url); 
    // create the URL 
    var url = "/api/" + CURRENT_NOTEBOOK + "/files/" + id + ".png"; 
    var maxsize = image.maxsize; 

    if (maxsize) {
        url += "?" 
        if(maxsize.height) { 
            url += "max_height=" + maxsize.height + "&"; 
        }
        if(maxsize.width) { 
            url += "max_width=" + maxsize.width; 
        }
    }

    $(containerdiv).append(outli); 

    figure_image_downloader($(".image", outli), url); 

    
}


var figure_edit_file_upload = {

    complete : function(upload_id, fileName, responseJSON) {
        var max = { // defaults 
            height : 300, 
            width : 300
        }; 
        
        
        var entrydiv = this.entrydiv; 


        var imgli = $("ul.images li[upload_id='" + upload_id + "']", entrydiv);  
        figure_edit_render_image(imgli, {'id' : responseJSON.id, 
                                         'visible' : true, 
                                         'caption' : "", 
                                         'maxsize' : max}); 
        
        
    },
    
    progress : function(upload_id, fileName, loaded, total) {
        var entrydiv = this.entrydiv; 
        var imgli = $("ul.images li[upload_id='" + upload_id + "']", entrydiv);  

        var pbar = $("progress", imgli); 
        $(pbar).attr("value", loaded); 
        $(pbar).attr("max", total); 
        $("div.filename", imgli).html(fileName); 
        $("div.filesize", imgli).html("" + loaded + " of " + total); 
        
        
    }, 
    
    submit : function(upload_id, fileName) {
        var entrydiv = this.entrydiv; 
        //var entrydiv = $(this.button).closest(".entry"); 

        var imglist = $("ul.images", entrydiv); 

        var li = figure_edit_create_li(); 

        imglist.append(li); 
        
        $(li).attr("upload_id", upload_id); 
        // I HATE THE FACT that we have to combine content and presentation
        // here, but there were strange chrome css bugs that made it
        // hard for me to do what I want. 
        $(".imagecontainer", li).append("<div> <progress> </progress></div>"); 
        $(".imagecontainer", li).append("<div class='filename'></div>");
        $(".imagecontainer", li).append("<div class='filesize'></div>"); 
    },

    cancel : function(upload_id, fileName)  {

    }

    
}; 
