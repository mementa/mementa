
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

function render_page_header(page_entry_doc, page_revision_doc)
{
    


}

function save_page()
{
    var doc = construct_page_doc();

}

function create_entry_view_div(entptr)
{
    

    /* debug function to create the div */ 
    var newelt = $("<div/>"); 
    $(newelt).attr("entryid", entptr.entry); 
    
    if (entptr.hidden) {
        $(newelt).addClass("hidden"); 
    }
    
    if (entptr.rev) {
        $(newelt).attr("rev", entptr.rev); 
    }
    
    $.getJSON("/api/entry/" + entptr.entry, 
              function(data) { 
                  var div = render_entry(data.entry, data.revision);
                  $(newelt).append(div); 
              }); 
    return newelt; 
             
}

function get_current_page_docs()
{
 return { entry: $(document).data('page_doc_entry'),
          rev: $(document).data('page_doc_rev')}; 
     
 }

function update_page_docs(entry, rev)
{
    var original_rev = 
    $(document).data('page_doc_rev'); 
    var original_entry =    
        $(document).data('page_doc_entry');

    $(document).trigger('page-docs-update', [original_entry, original_rev, 
                                             entry, rev]); 

    $(document).data('page_doc_rev', rev); 
    $(document).data('page_doc_entry', entry);

}

function append_entry_to_page(page_rev_doc, entryid)
{
    
    // deep copy? 
    
    var newobj = $.extend(true, {}, page_rev_doc); 
    newobj.entries.push({entry : entryid, 
                        'hidden' : false}); 
    return newobj; 

}

$(document).ready(
    function () {

        $(document).bind('page-docs-update', 
                         function(event, old_entry, old_rev, 
                                  new_entry, new_rev)
                         {
                             var old_entries = []
                             if(old_rev) {
                              old_entries = old_rev.entries; 
                             }
                             render_simple(old_entries,
                                           new_rev.entries,
                                           $("#entries"), 
                                           create_entry_view_div); 
                             
                         }); 



        update_page_docs(init_page_entry, init_page_rev); 


        $('body').layout({ applyDefaultStyles: true });
        
        
        $("#debuglink").click(function() 
                              {
                                  console.log(page_entries_canonical); 
                                  return false; 
                              }); 

        $("#button_add_entry_text")
            .click(function() {

                       //create an empty doc and push it to the server
                       $.ajax({type: 'POST', 
                               url : "/api/entry/text/new", 
                               data : JSON.stringify({'title' : "Dummy title", 
                                                      'body' : "this is the body"}),
                               success : 
                               function(resp) {
                                 // FIXME : add retry-loop
                                 // fixme : abstract away page submission code
                                   
                                   console.log("successfully created new entry"); 
                                 
                                   var entry_id = resp.entry._id; 
                                   
                                   var current_page_docs = get_current_page_docs(); 
                                   
                                   var new_page_rev = 
                                       append_entry_to_page(current_page_docs.rev, entry_id); 
                                 
                                   
                                   console.log("NEXT POST");  
                                   $.ajax({'type' : "POST", 
                                           'url' : "/api/page/" + 
                                           current_page_docs.entry._id,

                                           data : JSON.stringify(
                                               {old_rev_id : current_page_docs.rev._id, 
                                                doc: new_page_rev}), 
                                           success: 
                                       function(resp) {
                                            var latest_page_revision_doc = 
                                               resp.latest_page_revision_doc; 
                                           var entry = get_current_page_docs().entry; 
                                           entry.head = latest_page_revision_doc._id; 

                                           update_page_docs(entry, 
                                                            latest_page_revision_doc); 

                                           //update_global_page_rev(latest_page_revision_doc); 
                                            // now we assume that the element we care about exists, has been created -- do something to it if you must
                                           console.log("Page update success"); 
                                           }, 
                                           contentType:"application/json",
                                           dataType : "json" }); 
                                   
        
                               }, 
                               contentType:"application/json",
                               dataType : "json" }); 
                       
                       return false; 
                   }); 
        
    });
