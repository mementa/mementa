
function get_state(entrydiv)
{
    return get_entry_config(entrydiv)['state']; 
}

function set_state(entrydiv, state)
{
    /* Call "set state" when you enter a state */ 
    
    var oldstate = $(entrydiv).attr("state"); 

    $(entrydiv).attr("state", state); 

    $(entrydiv).closest(".entrycontainer")
        .trigger('state-change', {dom: entrydiv, 
                                  oldstate : oldstate, 
                                  curstate : state}); 
}

function copy_attr(elt, attr, obj) {
 // if attr defined, copy to obj    
    if($(elt).attr(attr)) {
        obj[attr] = $(elt).attr(attr); 
    }

}

function get_entry_config(entrydiv) {
    is_entry(entrydiv); 

    var r = {'entryid' : $(entrydiv).attr("entryid"), 
             // other stuff should be extracted here
             state: $(entrydiv).attr("state"),
             entryclass : $(entrydiv).attr("entry-class")
           }; 
    
    copy_attr(entrydiv, 'revid', r); 
    copy_attr(entrydiv, 'page-removed', r); 
    copy_attr(entrydiv, 'page-pinned', r); 
    copy_attr(entrydiv, 'page-hidden', r); 
    copy_attr(entrydiv, 'page-active', r); 
     
    return r; 
}


function assert_state(entrydiv, state)
{
    if(get_state(entrydiv) != state) {
        console.log("Div", entrydiv, "is not in state", state);         
    }


}

function save_entry_config(entrydiv)
{
    $(entrydiv).data("saved-config", get_entry_config(entrydiv)); 
}

function get_saved_entry_config(entrydiv) {
    return $(entrydiv).data("saved-config"); 

}

function check_notice(tgtdiv, level, message) {
    /* check that this div has a notice of the appropriate level containing the text message
     * 
     * 
     */
    
    var notices = $('div.notices > .notice', tgtdiv); 
    ok(notices.length > 0, "At least one notice"); 
    var atleastone = false; 
    $(notices)
        .each(function(index, elt) {
                  atleastone |=  $(elt).html().search(message) && ($(elt).attr('level') === level); 
              });
    ok(atleastone, "notices contain string:" + message); 
    
}

function config_page_delta(newconf, oldconf) {
    /* 
     * return the fields where new and old objects differ
     * 
     */

    var outobj = {}; 
    for(var key in newconf) {
        if(newconf[key] !== oldconf[key]) {
            outobj[key] = true; 
        }
    }

    for(var key in oldconf) {
        if(newconf[key] !== oldconf[key]) {
            outobj[key] = true; 
        }
    }

    return outobj; 
    
    return false; 


}
