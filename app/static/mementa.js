

jQuery.event.props.push("dataTransfer");


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


function setup_avatars(server, context) {
    $("img.avatar", context).popover({live : true, 
                                      placement: 'below', 
                                      html : true, 
                                      delayIn : 500,
                                      delayOut: 500,
                                      content : function() {
                                          return "Loading..."
                                      }, 

                                      title : function() 
                                      { 
                                          var id = "popover" + generate_seq_uuid() 
                                          var user_id = $(this).attr("user_id"); 
                                          var res = server.getUserInfo(user_id); 
                                          res.done(function(doc) {
                                                       var po = $("#"+id).closest("div.popover"); 
                                                       $(".title", po).html(doc.name); 
                                                       $(".content", po).html("username: <b>" +  doc.username + "</b>") ; 
                                                   }
                                                   
                                                  );

                                          return "<span id='" + id +"'><img src='/static/ajax-loader.gif'></span>"


                                      }}); 
    
}


$(document).ready(
    function () {
        


}); 
