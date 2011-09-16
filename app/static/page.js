
/*
 * page_entries_canonical : always contains our understanding of the most up-to-date
 * page_entry : the latest page entry
 * 
 * 
 * 
 */


$(document).ready(
    function () {


        // create the docdb
        var entriesdiv = $("#entries"); 
        var server = new Server(entriesdiv); 
        var docdb = new DocumentDB(server); 
        
        docdb.update(init_page_entry); 
        docdb.update(init_page_rev); 

        var ofunc = new opfuncs(docdb); 



        $(entriesdiv).bind('page-rev-update', function(event, doc) {
                               var oldpage_rev = $(this).data('old-page-rev'); 
                               var first_page_load = false;  // hack
                               if(!oldpage_rev) {
                                   oldpage_rev = {
                                       entries : {}
                                   }; 
                                   first_page_load = true; 
                               }
                               
                               render_simple(oldpage_rev.entries, 
                                             doc.entries, $(entriesdiv), ofunc); 
                               
                               if(first_page_load) {
                                   $(".entry", entriesdiv)
                                       .each(function(index, element) {
                                                 state_none_to_view(element, docdb);                                                  
                                             });                                                                 }


                               $(this).data('old-page-rev', doc); 
                               $("#page_title_view").html(doc.title);

                               var datestring = doc.date.substr(0, doc.date.length - 7) + "Z"; 

                               $("#page_date").removeAttr("data-timestamp").html(datestring).cuteTime(); 
                               
                               
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
                                    dom_view_hide_click(this, server, docdb); 
                                }); 

        
        $(".entry a.save").live('click', function(e) {
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
                           console.log("Submitting", newdoc); 
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
        
        // $(document).bind('page-docs-update', 
        //                  function(event, old_entry, old_rev, 
        //                           new_entry, new_rev)
        //                  {

        //                      $("#page_title_view").html(new_rev.title);
        //                      var date = new Date(new_rev.date + "Z"); 

        //                      $("#page_date").removeAttr("data-timestamp").html(new_rev.date).cuteTime(); 


        //                      var old_entries = []
        //                      if(old_rev) {
        //                       old_entries = old_rev.entries; 
        //                      }

        //                      render_simple(old_entries,
        //                                    new_rev.entries,
        //                                    $("#entries"), 
        //                                    create_entry_view_div); 
                             
        //                  }); 


        
        // update_page_docs(init_page_entry, init_page_rev); 
        
        
    }); 


