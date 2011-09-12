var uuid_pos = 0; 
function generate_uuid()
{
    var x = uuid_pos; 
    uuid_pos ++; 
    return x; 
}

function ISODateString(d){
    function pad(n){return n<10 ? '0'+n : n}
    return d.getUTCFullYear()+'-'
        + pad(d.getUTCMonth()+1)+'-'
        + pad(d.getUTCDate())+'T'
        + pad(d.getUTCHours())+':'
        + pad(d.getUTCMinutes())+':'
        + pad(d.getUTCSeconds())+'Z'}; 


var uuid_seq_pos = 0; 

function generate_seq_uuid()
{

    var x = uuid_seq_pos; 

    uuid_seq_pos++; 

    return x.toString(); 
}

function get_state(entrydiv)
{
    return get_entry_config(entrydiv)['state']; 
}

function get_entry_config(entrydiv) {
    is_entry(entrydiv); 

    var r = {'entryid' : $(entrydiv).attr("entryid"), 
             // other stuff should be extracted here
             state: $(entrydiv).attr("state") 
           }; 

    if($(entrydiv).attr("revid")) {
        r['revid'] = $(entrydiv).attr("revid"); 
    }
     
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
    // FIXME not impelmeented
    
    
    return false; 


}
