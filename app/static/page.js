
/*
 * page_entries_canonical : always contains our understanding of the most up-to-date
 * page_entry : the latest page entry
 * 
 * 
 * 
 */

function render_entry_view(entry_doc, revision_doc)
{
    /* return a div for this entry and revision */ 
    var entry_div  = $($.mustache("<div entry_id='{{_id}}' entry_class='{{class}}' rev_id='{{head}}' class='entrydiv'/>", entry_doc)); 
    $(entry_div).data('entry_doc', entry_doc);
    $(entry_div).data('rev_doc', revision_doc);
    $(entry_div).append(render_entry_rev_view[entry_doc['class']](revision_doc)); 
    return entry_div;
}



var render_entry_rev_view =  {
    'text' : function(doc) { 
        return $.mustache("<div ><div class='text-title'>{{title}} </div> "
                          + "<div class='text-body'>{{{body}}}</div></div> ", doc); 
        
    }
}


function render_entry_edit(entry_doc, revision_doc)
{
    /* return a div for this entry and revision */ 
    var entry_div  = $.mustache("<div entry_id='{{_id}}' entry_class='{{class}}' rev_id='{{head}}' class='entrydiv'/>", entry_doc); 

    return $(entry_div).append(render_entry_rev_edit[entry_doc['class']](revision_doc)); 

}



var render_entry_rev_edit =  {
    'text' : function(doc) { 

        var retdiv = $($.mustache("<div><input  class='title' value='{{title}}'> </input><p> <textarea style='width:100%'>{{{body}}}</textarea></div>", doc)); 
        $("textarea", retdiv ).attr('id', "TESTTEXTAREA"); 
        $("textarea", retdiv).addClass("tinymce");


        return retdiv; 
    }
}


function save_page()
{
    var doc = construct_page_doc();

}

var post_edit_dom_insert = {
    'text' : function(entry_div) {
        $("textarea", entry_div).tinymce({mode: "none", 
                                          theme:"simple",
                                          plugins : "autoresize",
                                         });         
        
    }
    
}; 

var save_entry_revision = {
    'text' : function(entrydom) {

        var entry_id = $("div.entrydiv", entrydom).attr("entry_id"); 
        var prev_rev_id =  $("div.entrydiv", entrydom).attr("rev_id");  
        // extract out the data 
        var title = $("input.title", entrydom).val(); 
        var body = $("textarea", entrydom).html(); 

        var original_entry_doc = $("div.entrydiv", entrydom).data("entry_doc"); 

        // construct updated rev
        var doc = { 'class' : 'text', 
                    parent : prev_rev_id, 
                    title : title, 
                    body : body
            
        }; 
        
        // FIXME set save button as pending

        
        $.ajax({'type' : "POST", 
                'url' : "/api/entry/" + entry_id,
                contentType:"application/json",
                dataType : "json" , 
                data : JSON.stringify(doc), 
                success : function(resp) {

                    var rev_doc = resp['latest_revision_doc']; 
                    var updated_rev_id = rev_doc._id; 
                    original_entry_doc['head'] = updated_rev_id; 
                    
                    $("div.entrydiv", entrydom).data('entry_doc', original_entry_doc); 
                    $("div.entrydiv", entrydom).data('rev_doc', rev_doc); 
                    // FIXME : why are we transferring the entire doc back we already know what's in it? 

                    set_entry_state(entrydom, 'view'); 
                    
                    
                }}); 



    }
    

}
function set_entry_state(entrydom, editstate)
{
    /*
     * Call assuming the doc is already in the other state
     * 
     */
    
    if(editstate === 'view') {
        $(".state-view", entrydom).show();
        $(".state-edit", entrydom).hide(); 
        $(entrydom).attr("state", "view"); 

        var entry_div = $(".entrydiv", entrydom); 
        var entry_doc = $(entry_div).data('entry_doc'); 
        var rev_doc = $(entry_div).data('rev_doc'); 
        
        // 
        var entry_div = render_entry_view(entry_doc, rev_doc); 
        $(".entrydiv", entrydom).replaceWith(entry_div); 
        
        
    } else if (editstate === 'edit') {
        $(".state-view", entrydom).hide();
        $(".state-edit", entrydom).show(); 
        $(entrydom).attr("state", "edit"); 

        var entry_div = $(".entrydiv", entrydom); 

        var entry_doc = $(entry_div).data('entry_doc'); 
        var rev_doc = $(entry_div).data('rev_doc'); 

        var entry_div = render_entry_edit(entry_doc, rev_doc); 
        $(".entrydiv", entrydom).replaceWith(entry_div); 

        // FIXME this is such a dumb way of passing this state around:
        $(entry_div).data('entry_doc', entry_doc); 
        $(entry_div).data('rev_doc', rev_doc); 


        // this is just a hack because you can only tinymce
        // on an elementa already inserted into the dom
        post_edit_dom_insert[entry_doc['class']]()
        
        
    } else {
        console.log("invalid state"); 

    }

}

function create_entry_view_div(entptr)
{
    

    /* debug function to create the div */ 
    var newelt = $("<div class='entry'><table>"
                   + "<tr><td class='meta'><div class='meta'>"
                   + "<img src='http://www.gravatar.com/avatar/205e460b479e2e5b48aec07710c08d50?s=50'/><br>"
                    + "<span class='state-view'> [<a href='#' class='entry-edit-click'>edit</a>]<br>" 
                   + " [<a href='#' class='entry-remove-click'>remove</a>] </span>"
                   + " <span class='state-edit'><button class='entry-save-click state-edit'>Save </button>"
                   + " <button class='entry-cancel-click state-edit'>Cancel </button> </span>"
                   + "</div></td>"
                   + "<td class='contents'><div class='container'/></td>"
                   // + "<div class='control'>"
                   // + "</div>" 

                   + "</tr></table><br></div>"); 

    $(newelt).attr("entryid", entptr.entry); 
    $(".state-edit", newelt).hide(); 

    if (entptr.hidden) {
        $(newelt).addClass("hidden"); 
    }
    
    if (entptr.rev) {
        $(newelt).attr("rev", entptr.rev); 
    }
    
    $.getJSON("/api/entry/" + entptr.entry, 
              function(data) { 
                  var div = render_entry_view(data.entry, data.revision);


                  $(".container", newelt).append(div); 
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

function remove_entry_from_page(page_rev_doc, position)
{
    
    // deep copy? 
    
    var newobj = $.extend(true, {}, page_rev_doc);
    newobj.entries.splice(position, 1); 

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

        // http://blog.mirthlab.com/2008/11/13/dynamically-adding-and-removing-tinymce-instances-to-a-page/
        $("a.entry-edit-click")
            .live('click', function() {
                       
                       var editobj = 
                           $(this).closest("div.entry"); 

                       set_entry_state(editobj, 'edit'); 
                       
                       
                       return false;                       
                   }); 

        $("div.entry button.entry-save-click")
            .live('click', function() {
                      var entry_div = $(this).closest("div.entry"); 
                      var entry_class = $("div[entry_class]", entry_div ).attr("entry_class"); 
                      save_entry_revision[entry_class](entry_div); 
                  }); 

        $("#new_page").click(function() {
                               // FIXME : check if edit state and possibly abort
                      $.ajax({'type' : "POST", 
                              'url' : "/api/page/new",
                              contentType:"application/json",
                              dataType : "json" , 
                              data : JSON.stringify(
                                  {  title : "New Page", 
                                     entries: []
                                      
                                  }), 
                              success : function(resp) {
                                  window.location.replace("/page/" + resp.entry._id); 

                              }})}); 

        $("a.entry-remove-click")
            .live('click', function() {
                      var spos = $(this).closest("div.entry").attr("entry-pos");
                      var pos = parseFloat(spos); 

                      var current_page_docs = get_current_page_docs(); 
                      
                      var new_page_rev = 
                          remove_entry_from_page(current_page_docs.rev, pos); 
                      


                      $.ajax({'type' : "POST", 
                              'url' : "/api/page/" + 
                              current_page_docs.entry._id,
                              contentType:"application/json",
                              dataType : "json", 
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
                                  
                                  
                              }, 
                              }); 
                      
                      
                      return false; 
                  }
                  
                 );

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
                                   
                                   
                                   var entry_id = resp.entry._id; 
                                   
                                   var current_page_docs = get_current_page_docs(); 
                                   
                                   var new_page_rev = 
                                       append_entry_to_page(current_page_docs.rev, entry_id); 
                                 
                                   

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

                                           }, 
                                           contentType:"application/json",
                                           dataType : "json" }); 
                                   
        
                               }, 
                               contentType:"application/json",
                               dataType : "json" }); 
                       
                       return false; 
                   }); 
        
    });


tinyMCE.init({
        // General options
        mode : "none",
        theme : "simple"}); 
