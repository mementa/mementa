
function do_autosave(notebookname, entrydiv, editsession_starttime) {
    var config = get_entry_config(entrydiv); 

    var entryclass = config.entryclass; 

    var entryid = config.entryid; 
    var revid = config.revid; 

    // now get the data! 
    var data = render.entry_rev_get[entryclass](entrydiv); 
    
    // save as notebook, entryid, revid, date, user
    
    console.log("I wish I was saving", entryid, revid, data); 
    
}

function get_autosaves(notebookname, entrydiv) {

    var config = get_entry_config(entrydiv); 

    var entryclass = config.entryclass; 

    var entryid = config.entryid; 
    var revid = config.revid; 

}


