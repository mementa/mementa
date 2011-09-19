
/*
 * page_entries_canonical : always contains our understanding of the most up-to-date
 * page_entry : the latest page entry
 * 
 * 
 * 
 */

function is_hidden_visible()
{
    return $("#showhidden").is(':checked');
}


function on_tags_changed(server, add) { 
    return function (event, tag) {
        // fixme make this retry

        var curdocs = server.getPageState(); 
        var newdoc = $.extend(true, {}, curdocs.rev); 

        var tagtxt = $(".tagit-label", tag).html(); 
        
        if (add) {


            var curtags = $("#page_tags").tagit("assignedTags"); 
            if(newdoc.tags) {
                newdoc.tags.push(tagtxt); 
            } else {
                newdoc.tags = [tagtxt];                 
            }
        } else {

            var curdocs = server.getPageState(); 
            var curtags = $("#page_tags").tagit("assignedTags"); 
            var newtags = _.without(curtags, tagtxt);            
            newdoc.tags = newtags;  
        }
        
        
        newdoc.parent = newdoc._id; 
        
        var res = server.pageUpdate(curdocs.entry._id, 
                                    newdoc); 
        
}}

$(document).ready(
    function () {


        // create the docdb
        var entriesdiv = $("#entries"); 
        var server = new Server(entriesdiv); 
        var docdb = new DocumentDB(server); 
        
        docdb.update(init_page_entry); 
        docdb.update(init_page_rev); 

        var ofunc = new opfuncs(docdb); 


        $("#page_tags").tagit( { onTagAdded: on_tags_changed(server, true) , 
                                 onTagRemoved : on_tags_changed(server, false), 
                                 allowSpaces: true, 
                                 // tagSource : testfunc, 
                                 removeConfirmation: true }); 

        $(entriesdiv).bind('entry-to-state-none', function(entrydiv) {
                               

                           }); 
        $(entriesdiv).bind('entry-to-state-view', function(entrydiv) {
                               

                           }); 

        $(entriesdiv).bind('page-rev-update', function(event, doc) {
                               var oldpage_rev = $(this).data('old-page-rev'); 

                               if(!oldpage_rev) {
                                   oldpage_rev = {
                                       entries : {},
                                       tags : []
                                   }; 

                               }
                               
                               render_simple(oldpage_rev.entries, 
                                             doc.entries, $(entriesdiv), ofunc); 



                               $(this).data('old-page-rev', doc); 
                               $("#page_title_view").html(doc.title);

                               
                               var old_not_in_new = _.difference(oldpage_rev.tags, 
                                                                 doc.tags); 
                               var new_not_in_old = _.difference(doc.tags, 
                                                                 oldpage_rev.tags); 
                               _.map(old_not_in_new, function(t) {
                                         $("#page_tags").tagit("removeTag", t, true, true); 
                                     }); 

                               _.map(new_not_in_old, function(t) {
                                         $("#page_tags").tagit("createTag", t, true, true); 
                                     }); 

                               var datestring =
                                   doc.date.substr(0, doc.date.length - 7) + "Z"; 

                               $("#page_date").removeAttr("data-timestamp").html(datestring).cuteTime(); 
                               
                               if (doc.archived) {
                                   $("#archive_status").show(); 
                                   $("#page_archive_click").hide(); 
                                   $("#page_unarchive_click").show(); 
                               } else {
                                   $("#archive_status").hide(); 
                                   $("#page_archive_click").hide(); 
                                   $("#page_unarchive_click").show(); 

                               }
                           }); 

        // FIX ME : THERES NO WAY FOR US TO KNOW WHEN AN ELEMENT IS DONE WITH A STATE TRANSITION, SO CHAINING IS ALMOST IMPOSSIBLE
        $(entriesdiv)
            .bind("state-change", 
                  function(event, attr) {
                      var element = attr.dom; 
                      var oldstate = attr.oldstate; 
                      var state = attr.curstate; 

                      var config = get_entry_config(element); 

                      if(state == 'none') {
                          var res = state_none_to_view(element, docdb);                                                                                        
                      } else if (state == 'view') {
                          if(!is_hidden_visible()){
                              if($(element).attr("page-hidden")) {
                                  $(element).addClass("hidden");                                    
                              }
                              
                          }                                       

                          if(config.entryclass == 'text') {
                              var id = $(element).attr('id'); 
                              MathJax.Hub.Queue(["Typeset",MathJax.Hub, id]);                              
                          }

                      } else if (state == 'edit') {
                          if(config.entryclass == 'text') {
                              if(oldstate == 'view') {

                                  $("textarea", element).tinymce({mode: "none", 
                                                                  theme:"advanced",
                                                                  plugins : "autoresize",

                                                                  theme_advanced_buttons1 : "bold,italic,underline,|, formatselect, |, bullist,numlist,|,outdent,indent,|, link,unlink",
                                                                  theme_advanced_buttons2 : "",
                                                                  theme_advanced_buttons3 : "", 
                                                                  
                                                                  theme_advanced_toolbar_location : "top",
                                                                  theme_advanced_toolbar_align : "left",
                                                                  theme_advanced_resizing : false
                                                                  
                                                                 });  
                              }                                                       
                          }

                          
                      }
                      
                  }); 
        
        
    

        $(entriesdiv).bind('entry-rev-update', function(event, er) {
                               // fixme: this may in fact be resulting in a double
                               // trigger here for new entries

                               docdb.update(er.entry); 
                               docdb.update(er.rev); 
                               
                               
                               $(".entry[entryid='" + er.entry._id + "']", entriesdiv)
                                   .each(function(index, elt) { 
                                             if(!$(elt).attr("pinned")) {
                                                 if($(elt).attr('state') === 'view') { 
                                                     entrydiv_reload_view(elt, docdb, {}, {}); 
                                                 } else {
                                                     $(elt).attr("revid", er.rev._id); 
                                                 }
                                             }                                                                                               
                                         }); 
                           }); 
        
        server.setPageState(init_page_entry, init_page_rev); 

        // setup the handlers
        $(".entry a.edit").live('click', function(e) {
                                    dom_view_edit_click(this, docdb); 
                                }); 

        $(".entry a.remove").live('click', function(e) {
                                    dom_view_remove_click(this, server); 
                                }); 


        $(".entry a.hide").live('click', function(e) {
                                    dom_view_hide_click(this, server, docdb, true); 
                                }); 

        $(".entry a.unhide").live('click', function(e) {
                                    dom_view_hide_click(this, server, docdb, false); 
                                }); 

        
        $(".entry a.save").live('click', function(e) {
                                    var entrydiv = $(this).closest("entry"); 

                                    dom_edit_save_click(this, server, docdb); 
                                }); 

        $(".entry a.cancel").live('click', function(e) {
                                    dom_edit_cancel_click(this, docdb); 
                                }); 
        
        $("#pagetitle")
            .hoverIntent(
                function() {
                    $("#page_title_edit_click").addClass("hovertargetvisible");
                },
                function() {
                    $("#page_title_edit_click").removeClass("hovertargetvisible");
                    
                });
        $(".pagetitle div.edit").hide(); 

        
        $(".pagetitle a.edit")
            .click(function() {
                       $(".pagetitle div.view").hide(); 
                       $(".pagetitle div.edit").show(); 
                       $("#page_title_edit").html(server.getPageState().rev.title).focus(); 

                   }); 
        
        $("#page_title_cancel")
            .click(function() {
                       $(".pagetitle div.edit").hide(); 
                       $(".pagetitle div.view").show(); 
                   }); 

        
        $("#page_title_save")
            .click(function() {
                       // fixme consolidate this
                       var MAXTRIES = 5; 
                       function save_title(cur_try) {
                           if(cur_try == 0) {
                               return; 
                           }

                           var curdocs = server.getPageState(); 
                           var title = $("#page_title_edit").html(); 
                           var newdoc = $.extend(true, {}, curdocs.rev); 
                           newdoc.title = title;              
                           newdoc.parent = newdoc._id; 

                           var res = server.pageUpdate(curdocs.entry._id, 
                                                       newdoc); 
                           res.done(function(doc) {
                                        
                                        $(".pagetitle div.edit").hide(); 
                                        $(".pagetitle div.view").show(); 
                                        
                                    }); 
                           res.fail(function(doc) {
                                        save_title(cur_try - 1); 
                                    }); 

                               
                           }
                           
                       save_title(MAXTRIES); 

                   }); 

        // fixme consolidate this
        function save_page_archive(cur_try, is_archived) {
            if(cur_try == 0) {
                return; 
            }
            
            var curdocs = server.getPageState(); 
            if(curdocs.rev.archived == is_archived) {
                return; 
            }

            var newdoc = $.extend(true, {}, curdocs.rev); 
            newdoc.archived = is_archived; 
            newdoc.parent = newdoc._id; 

            var res = server.pageUpdate(curdocs.entry._id, 
                                        newdoc); 
            res.fail(function(doc) {
                         save_page_archive(cur_try - 1, is_archived); 
                     }); 
            
            }                           

        
        $("#page_archive_click")
            .click(function() {
                       save_page_archive(5, true); 
                   }); 
        
        $("#page_unarchive_click")
            .click(function() {
                       save_page_archive(5, false); 
                   }); 
        
        $("#showhidden")
            .click(function() {

                       if(is_hidden_visible()) {
                           $(".entry[state='view'][page-hidden]").removeClass("hidden");                                    
                       } else {
                           $(".entry[state='view'][page-hidden]").addClass("hidden");                                    
                           
                       }
            
        });

        $("#button_add_entry_text")
            .click(function() { 
                       var resp = dom_add_entry_click(
                           {
                               'class' : 'text', 
                               title : "dummy title", 
                               body: "Temp body"
                           }, server, docdb); 
                       // fixme : this is where we would wait for resp
                       // to finish and then set that entry editable or something

                       }); 
        
        $(".entry[state='view']")
            .live("dblclick", function(ent) {
                      dom_view_edit_click(this, docdb); 
                  }); 
        
        $(".alert-message a.close")
            .live("click", function(evenet) {
                      $(this).closest(".alert-message").remove(); 
                  }); 

        $(".entry")
            .hover(
                function() {
                    $(".control", this).addClass("hovertargetvisible");
                },
                function() {
                    $(".control", this).removeClass("hovertargetvisible");
                    
                });
        

        
    }); 


tinyMCE.init({
        // General options
        mode : "none",
        theme : "advanced"


}); 
