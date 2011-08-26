
/*
 * page_entries_canonical : always contains our understanding of the most up-to-date
 * page_entry : the latest page entry
 * 
 * 
 * 
 */

function compute_deltas(old_list, new_list)
{
    /*
     * 
     */
    

}

var render_entry_rev_view =  {
    'text' : function(doc) { 
        return $.mustache("<div ><div>{{title}} </div> "
                          + "<div>{{body}}</div></div> ", doc); 
        
    }
}

function render_entry(entry_doc, revision_doc)
{
    /* return a div for this entry and revision */ 
    var entry_div  = $.mustache("<div entry_id='{{_id}}' entry_class='{{class}}' rev_id='{{head}}' class='entry'/>", entry_doc); 

    
    return $(entry_div).append(render_entry_rev_view[entry_doc['class']](revision_doc)); 
    console.log(entry_div); 
    return entry_div; 
}

function save_page()
{
    var doc = construct_page_doc();

}

function initial_render_entries(entry_list)
{
    
    
    // create the divs
    _.map(entry_list, function(entry) {
              $("#entries").append($.mustache("<div debugid={{_id}} class='entryslot'/>", entry)); 
          }); 
    // then do the fetch-render step for each of these
    _.each(entry_list, function(entry, index) { 
              $.getJSON("/api/entry/" + entry._id, 
                        function(data) { 
                            if(!entry.hidden) {
                                var div = render_entry(data.entry, data.revision);
  
                                $("#entries").children("div").eq(index).append(div); 
                            }

                            
                        })}); 

          
    
}

$(document).ready(
    function () {
        
        initial_render_entries(page_entries_canonical); 


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
                                  console.log(page_entries_canonical); 
                                  return false; 
                              }); 

        $("#button_add_entry_text")
            .click(function() {
                       //create an empty doc and push it to the server
                       $.post("/api/entry/text/new", {'title' : "Dummy title", 
                                                      'body' : "this is the body"}, 
                             function(resp) {
                                 var entry_id = resp.entry._id; 
                                 

                             }); 
                       // when you get the response, insert it at the bottom 
                           
                       // make the state editable
                       
                       // temp grey out until the page update comes through

                       // 
                       
                       
                   }); 
        
    });
