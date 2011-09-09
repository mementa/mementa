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
        + pad(d.getUTCSeconds())+'Z'}

var uuid_seq_pos = 0; 
function generate_seq_uuid()
{
    var x = uuid_seq_pos; 
    uuid_seq_pos ++; 
    return x.toString(); 
}

function get_state(elt)
{
    return $(elt).attr("state"); 

}
