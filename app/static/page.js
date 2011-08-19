
/*
 * The page contains a 
 * 
 * 
 * 
 */

/* 
 * Right now, we interact with the server through three methods
 * 1. construct page doc: create a page doc (json object) from the current dom
 * 2. save the doc 
 * 3. update the page based on the doc. 
 * 
 */

function construct_page_doc()
{
    /* where does the page keep track of the canonical ordering?
     * 
     * 
     */
    console.log("Constructing page doc"); 
    _.map($("#entries").children(".entry"), 
          function(entry) {
              console.log(entry); 
          }
         ); 

}

function save_page()
{
    var doc = construct_page_doc();
    

}


$(document).ready(
    function () {
        $('body').layout({ applyDefaultStyles: true });
        
        $("#pagetitle").blur(function()
                             {
                                 if ($("#pagetitle").val() !== 
                                     $("#pagetitle").attr("initvalue")) {
                                     save_page(); 
                                     
                                 }
                                 
                             }); 
        
        
    });
