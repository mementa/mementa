


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

function get_state(entrydiv)
{
    is_entry(entrydiv); 
    return $(entrydiv).attr("state"); 
}

function get_entry_config(entrydiv) {
    
    return {'entryid' : $(entrydiv).attr("entryid"), 
            // other stuff should be extracted here
            
           }; 
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


function state_none_to_view(entrydiv, docdb, rev_id, hidden, pinned)
{
    /* transition: NONE->VIEW
     * 
     * Currently just blows away the contained div and does all the updates by
     * denovo creation. In the future, we may be smarter. 
     * 
     */
    
    is_entry(entrydiv); 

    var entry_id = $(entrydiv).attr("entryid"); 
    var entry_doc = docdb.get_entry(entry_id); 
    var rev_doc = docdb.get_rev(rev_id); 

    console.log("rev_doc=", rev_doc); 
    
    var class_content = 
        render.entry_rev_view_for_class[entry_doc['class']](rev_doc); 

    // update author information
    var entrydiv_body = $("<div class='entry-body'><div class='class-content'></div></div>"); 

    $(".class-content", entrydiv_body).append(class_content); 
    
    $(entrydiv).append(entrydiv_body); 
    
    if(hidden) {
        $(entrydiv).attr("hidden", '1'); 
    }
    
    if(pinned) { 
        $(entrydiv).attr("pinned", rev_id); 
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


