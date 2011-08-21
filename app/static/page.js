
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
        
        $("#debuglink").click(function() 
                              {
                                  console.log(page_docs_ids_json); 
                                  return false; 
                              }); 
        
    });
