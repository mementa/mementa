
/*
 * page_entries_canonical : always contains our understanding of the most up-to-date
 * page_entry : the latest page entry
 * 
 * 
 * 
 */

var uuid_pos = 0; 
function generate_uuid()
{
    var x = uuid_pos; 
    uuid_pos ++; 
    return x; 
}

function render_entry_view(entry_doc, revision_doc)
{
    /* return a div for this entry and revision */ 
    var entry_div  = $($.mustache("<div entry_id='{{_id}}' entry_class='{{class}}' rev_id='{{head}}' class='entrydiv'/>", entry_doc)); 
    $(entry_div).data('entry_doc', entry_doc);
    $(entry_div).data('rev_doc', revision_doc);
    $(entry_div).append(render_entry_rev_view[entry_doc['class']](revision_doc)); 
    return entry_div;
}



function render_entry_edit(entry_doc, revision_doc)
{
    /* return a div for this entry and revision */ 
    var entry_div  = $.mustache("<div entry_id='{{_id}}' entry_class='{{class}}' rev_id='{{head}}' class='entrydiv'/>", entry_doc); 

    return $(entry_div).append(render_entry_rev_edit[entry_doc['class']](revision_doc)); 

}



var render_entry_rev_edit =  {
    'text' : function(doc) { 

        var retdiv = $($.mustache("<div><input  class='title' value='{{{title}}}' style='width:100%'> </input><p> <textarea style='width:100%'>{{{body}}}</textarea></div>", doc)); 
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

var post_view_dom_insert = {
    text : function(entry_div) {
        var uuid =  "uuid" + generate_uuid(); 
        $(entry_div).attr('id', uuid)
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, uuid]);
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
        
        post_view_dom_insert[entry_doc['class']](entry_div); 
        update_outer_entry(entry_doc, rev_doc, entrydom); 

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
        post_edit_dom_insert[entry_doc['class']](entry_div);
        
        
    } else {
        console.log("invalid state"); 
    }

}

function create_entry_view_div(entptr)
{
    

    var entry_template = 
        "<div class='entry'>"
        + "<div class='meta'>"
        + "<img src='' class='avatar'/>"
        + "</div>"
        + "<div class='entrybody'>" 
        + "<div class='entrycontainer'/>"
    
        + "<div class='entrycontrol hovertarget'>"
        + "<span class='lasteditdate'> 42 minutes ago </span> <span class='status'/> &nbsp;&nbsp;&nbsp; "
        + "<span class='state-view'> <a href='#' class='entry-edit-click'>edit</a>" 
        + " &nbsp; &nbsp; &nbsp; <a href='#' class='entry-remove-click'>remove</a> &nbsp; &nbsp; &nbsp; <a href='#' class='entry-archive-click'>archive</a> &nbsp; &nbsp; &nbsp; <a href='#' class='entry-hide-click'>hide</a>    </span>"
        + " <span class='state-edit'><button class='entry-save-click state-edit btn'>Save </button>"
        + " <button class='entry-cancel-click state-edit btn'>Cancel </button> </span>"
        + "</div>"
        + "</div>"
        + "</div>"; 
    
    var newelt = $(entry_template); 

    $(newelt).attr("entryid", entptr.entry); 
    $(".state-edit", newelt).hide(); 
    if (entptr.hidden) {
        $(".entry-hide-click", newelt).html("unhide"); 
        $(".status", newelt).html("hidden"); 
        $(newelt).attr("page-hidden", true); 

        if($(document).data("show_hidden_entries")) {
        } else {

            $(newelt).addClass("entry-hidden");
        }

    } else {
        $(".entry-hide-click", newelt).html("hide"); 
        

    }
    

    if (entptr.rev) {
        $(newelt).attr("rev", entptr.rev); 
    }

    // this is here instead of simply being a live selector on .entry
    // because hoverintent doesn't support live

    $(newelt)
        .hoverIntent(function(e) {
                         $(".entrycontrol", this)
                             .hide().css({visibility: "visible"})
                             .fadeIn("fast");                             

                         
                     }, 
                     function(e) { 
                         $(".entrycontrol", this)
                             .fadeOut("fast", 
                                      function() {
                                          $(this).show()
                                              .css({visibility: "hidden"});
                                      });
                     }); 
    

    
    $.getJSON("/api/entry/" + entptr.entry, 
              function(data) { 
                  var div = render_entry_view(data.entry, data.revision);

                  $(".entrycontainer", newelt).append(div); 
                  update_outer_entry(data.entry, data.revision, newelt); 
              }); 

    return newelt; 
             
}

function update_outer_entry(entrydoc, revdoc, newelt)
{
    /* Crude hack to modify the _outer_ entry element after it's been created
     * to set things like user icon, etc. 
     */
    var date = new Date(revdoc.date + "Z"); 

    $("span.lasteditdate", newelt).removeAttr("data-timestamp").html(date.toLocaleString()).cuteTime(); 
    $("img.avatar", newelt).attr("src", "/api/user/" + revdoc.author + "/avatar/48"); 
    
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

function toggle_hide_entry_on_page(page_rev_doc, position)
{
    
    // deep copy? 
    
    var newobj = $.extend(true, {}, page_rev_doc);
    console.log("Setting doc pos=" + position + " to " + !newobj.entries[position].hidden);

    if( newobj.entries[position].hidden) {
        newobj.entries[position].hidden = false;         
    } else {
        newobj.entries[position].hidden = true;         

    }


    return newobj; 

}

function change_page_title(page_rev_doc, newtitle)
{
    
    // deep copy? 
    
    var newobj = $.extend(true, {}, page_rev_doc);
    newobj.title = newtitle; 

    return newobj; 

}

function change_page_archive(page_rev_doc, archive)
{
    
    // deep copy? 
    
    var newobj = $.extend(true, {}, page_rev_doc);
    newobj.archived = archive; 

    return newobj; 

}

$(document).ready(
    function () {



        var op_response = {
            create: function(entryptr) {
                var entry_id = entryptr.entry; 
                var hidden = entryptr.hidden; 
                var pinnedrev = entryptr.rev; 
                
                return create_entry_div(entry_id, hidden, pinnedrev); 
                
            }, 
            
            remove: function(elt, entryptr) {
                
            },
            
            hide: function(elt, entryptr) {

            }, 
            
            pin : function(elt, entryptr) { 


            }
            
        }; 


        
        $(document).bind('page-docs-update', 
                         function(event, old_entry, old_rev, 
                                  new_entry, new_rev)
                         {

                             $("#page_title_view").html(new_rev.title);
                             var date = new Date(new_rev.date + "Z"); 

                             $("#page_date").removeAttr("data-timestamp").html(new_rev.date).cuteTime(); 


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
        

}


