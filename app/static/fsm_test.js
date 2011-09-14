

function validate_entries(entriesdiv, page_rev_doc, db) 
{
    /* Somewhat crude hack for making sure that the 'entries' div
     * currently matesh the page rev doc. Also checks that the actual
     * content of the entries is correct, for text entries. This is our
     * generic 'we did some shit, is it all valid?' function
     * 
     * db contains all the docs that are implicated in the entires
     * 
     */

    equal($("div.page-active", entriesdiv).length, page_rev_doc.entries.length); 
    console.log("validate_entires: entiresdiv", entriesdiv); 
    console.log(page_rev_doc.entries); 
    $("div.page-active", entriesdiv)
        .each(function(index, element) {
                  var ent = page_rev_doc.entries[index]; 
                  same(get_entry_config(element)['state'], 'view')
                  same(get_entry_config(element)['entryid'], ent.entry); 

                  var entry_doc = db[ent.entry]; 
                  
                  var rev = entry_doc.head; 
                  if(ent.rev)  {
                      rev = ent.rev; 
                  }

                  var rev_doc = db[rev]; 
                  if(rev_doc['class'] == 'text') {
                      var title = rev_doc.title; 
                      same($("H2", element).html(), title); 

                  }
              }); 

}

function fsm_tests()
{
    

    module("FSM Render Test");
    test("create divs ", function() {
             var ENTRYN = 10; 
             var fakepage = datagen.create_fake_page(ENTRYN); 
             
             var entriesdiv = $("<div id='entries'/>"); 
             
             var server = new ServerMock(entriesdiv); 

             var docdb = new DocumentDB(server); 

             var ofunc = new opfuncs(docdb); 

             var entries = fakepage.page_entry.revdoc.entries; 
             render_simple([], entries, 
                          entriesdiv, ofunc); 

             equal($(entriesdiv).children().length, ENTRYN); 

             // transition them to view

             $(entriesdiv).children()
                 .each(function(index, element) {
                           state_none_to_view(element, docdb, 
                                              entries[index].hidden, 
                                              entries[index].rev); 
                           
                       }); 
             
             equal(server.queue.length, ENTRYN); 
             
             server.processAll(fakepage.docs); 
             equal(server.queue.length, 0); 
             
             validate_entries($(entriesdiv), fakepage.page_entry.revdoc, 
                             fakepage.docs) ;

         });     


    test("create divs and modify / bcast", function() {
             var ENTRYN = 10; 
             var fakepage = datagen.create_fake_page(ENTRYN); 
             
             var localdb = fakepage.docs; 

             
             var entriesdiv = $("<div id='entries'/>"); 

             var server = new ServerMock(entriesdiv); 

             var docdb = new DocumentDB(server); 

             var ofunc = new opfuncs(docdb); 
             var page_doc_rev = fakepage.page_entry.revdoc; 

             var entries = page_doc_rev.entries; 

             render_simple([], entries, 
                          entriesdiv, ofunc); 
             
             $(entriesdiv).data('page-rev', page_doc_rev); 

             // now the mutate callback
             $(entriesdiv).bind('page-rev-update', function(event, doc) {
                                    var oldpage = $(this).data('page-rev'); 
                                    render_simple(oldpage.entries, 
                                                  doc.entries, $(entriesdiv), ofunc); 
                                    

                                    $(this).data('page-rev', doc); 
                                    
                                    
                                }); 


             // transition them to view

             $(entriesdiv).children()
                 .each(function(index, element) {
                           state_none_to_view(element, docdb, 
                                              entries[index].hidden, 
                                              entries[index].rev); 
                           
                       }); 
             
             server.processAll(localdb); 
             

             // create a new rev of the doc
             var new_page_doc = datagen.refresh_rev(page_doc_rev); 
             
             // remove an entry
             new_page_doc.entries.splice(3, 2); 

             
             // append an entry

             var ne1 = $.extend(true, datagen.text_entry_revision_create("new appended title", "appended body"), datagen.revision_create("eric", {})); 
             localdb[ne1._id] = ne1; 
             
             var ne1entry = datagen.entry_create(ne1); 
             localdb[ne1entry._id] = ne1entry; 
             new_page_doc.entries.push({'entry' : ne1entry._id, 
                                        'hidden' : false}); 

             var ne2 = $.extend(true, datagen.text_entry_revision_create("new pinned title", "pinned body"), datagen.revision_create("eric", {})); 
             localdb[ne2._id] = ne2; 
             
             new_page_doc.entries[1].rev = ne2._id; 

             // hide an entry
             new_page_doc.entries[5].hidden = true; 
             
             // broadcast update

             localdb[new_page_doc._id] = new_page_doc; 
             
             server.outOfBandPageUpdate(new_page_doc); 


             $(entriesdiv).children()
                 .each(function(index, element) {
                           if(get_state(element) == 'none') {
                               state_none_to_view(element, docdb, 
                                                  entries[index].hidden, 
                                                  entries[index].rev);                                 
                           }
                       }); 

             server.processAll(localdb); 

             validate_entries(entriesdiv, new_page_doc, localdb); 

             
         });     
    

    module("Simple edit cycle", 
           {setup : function() { 
                var ENTRYN = 10; 
                var fakepage = datagen.create_fake_page(ENTRYN); 
                
                var localdb = fakepage.docs; 

                
                var entriesdiv = $("<div id='entries'/>"); 
                
                var server = new ServerMock(entriesdiv); 
                
                var docdb = new DocumentDB(server); 
                
                var ofunc = new opfuncs(docdb); 
                var page_doc_rev = fakepage.page_entry.revdoc; 
                
                var entries = page_doc_rev.entries; 
                
                render_simple([], entries, 
                              entriesdiv, ofunc); 
                
                $(entriesdiv).data('page-rev', page_doc_rev); 
                
                // now the mutate callback
                $(entriesdiv).bind('page-rev-update', function(event, doc) {
                                       var oldpage = $(this).data('page-rev'); 
                                       render_simple(oldpage.entries, 
                                                     doc.entries, $(entriesdiv), ofunc); 
                                       
                                       
                                       $(this).data('page-rev', doc); 
                                       
                                       
                                   }); 

                $(entriesdiv).bind('entry-rev-update', function(event, er) {
                                       
                                       docdb.update(er.entry); 
                                       docdb.update(er.rev); 
                                       
                                   })
                
                // transition them to view
                
                $(entriesdiv).children()
                    .each(function(index, element) {
                              state_none_to_view(element, docdb, 
                                                 entries[index].hidden, 
                                                 entries[index].rev); 
                              
                          }); 
                
                server.processAll(localdb); 
                
                this.server = server; 
                this.localdb = localdb; 
                this.fakepage = fakepage; 
                this.entriesdiv = entriesdiv; 
                this.docdb = docdb; 
                this.ofunc = ofunc; 

            
            }, 
            teardown : function() {

               
           }}); 
    
    test("click state transition", function() {

             setup_handlers(this.server, this.docdb, this.entriesdiv); 
             var tgtn = 2; 
             var tgtdiv = $(this.entriesdiv).children().eq(tgtn); 
             dom_view_edit_click($("a.edit", tgtdiv), this.docdb); 
             
             equals(get_state(tgtdiv), 'edit'); 
             
             
             }); 

    test("click state transition, cancel", 
         function() {
             setup_handlers(this.server, this.docdb, this.entriesdiv); 
             var tgtn = 2; 
             var tgtdiv = $(this.entriesdiv).children().eq(tgtn); 
             dom_view_edit_click($("a.edit", tgtdiv), this.docdb); 
             
             equals(get_state(tgtdiv), 'edit'); 
             
             dom_edit_cancel_click($("a.cancel", tgtdiv), this.docdb); 
             
             console.log("Checking"); 
             equals(get_state(tgtdiv), 'view'); 
             }); 

    test("click state transition, cancel, with new entry rev", 
         function() {
             /* this should result in a new notice in the div
              * 
              * 
              * 
              */

             setup_handlers(this.server, this.docdb, this.entriesdiv); 
             var tgtn = 2; 
             var tgtdiv = $(this.entriesdiv).children().eq(tgtn); 
             dom_view_edit_click($("a.edit", tgtdiv), this.docdb); 
             
             equals(get_state(tgtdiv), 'edit'); 
             
             /* update the entry */ 

             var ne1 = $.extend(true, datagen.text_entry_revision_create("new appended title", "appended body TestWord"), datagen.revision_create("eric", {})); 
             this.docdb[ne1._id] = ne1; 
             
             var entryid = get_entry_config(tgtdiv)['entryid']; 
             var entrydoc = this.localdb[entryid]; 

             entrydoc['head'] = ne1._id; 
             
             this.server.outOfBandEntryUpdate(entrydoc, ne1); 

             // now how do we tell the docdb of a new entry doc? 

             dom_edit_cancel_click($("a.cancel", tgtdiv), this.docdb); 
             
             equals(get_state(tgtdiv), 'view'); 

             check_notice(tgtdiv, 'info', "This is the latest version"); 

             ok($(".body", tgtdiv).html().search("TestWord"), 
                "Correctly rendered new revision text"); 

             }); 


    module("PAGEPENDING state mutations", 
           {setup : function() { 
                var ENTRYN = 10; 
                var fakepage = datagen.create_fake_page(ENTRYN); 
                
                var localdb = fakepage.docs; 

                
                var entriesdiv = $("<div id='entries'/>"); 
                
                var server = new ServerMock(entriesdiv); 
                
                var docdb = new DocumentDB(server); 
                
                var ofunc = new opfuncs(docdb); 
                var page_doc_rev = fakepage.page_entry.revdoc; 

                server.pageState.entry = fakepage.page_entry;
                server.pageState.rev = fakepage.page_entry.revdoc; 

                var entries = page_doc_rev.entries; 
                
                render_simple([], entries, 
                              entriesdiv, ofunc); 
                
                $(entriesdiv).data('page-rev', page_doc_rev); 
                
                // now the mutate callback
                $(entriesdiv).bind('page-rev-update', function(event, doc) {
                                       var oldpage = $(this).data('page-rev'); 
                                       
                                       console.log("updating with new page doc", doc, "where old page doc=", oldpage);

                                       
                                       render_simple(oldpage.entries, 
                                                     doc.entries, $(entriesdiv), ofunc); 
                                       
                                       
                                       $(this).data('page-rev', doc); 
                                       
                                       
                                   }); 

                $(entriesdiv).bind('entry-rev-update', function(event, er) {
                                       
                                       docdb.update(er.entry); 
                                       docdb.update(er.rev); 
                                       
                                   })
                
                // transition them to view
                
                $(entriesdiv).children()
                    .each(function(index, element) {
                              state_none_to_view(element, docdb, 
                                                 entries[index].hidden, 
                                                 entries[index].rev); 
                              
                          }); 
                
                server.processAll(localdb); 
                
                this.server = server; 
                this.localdb = localdb; 
                this.fakepage = fakepage; 
                this.entriesdiv = entriesdiv; 
                this.docdb = docdb; 
                this.ofunc = ofunc; 

            
            }, 
            teardown : function() {

               
            }}); 
    
    test("Simple remove test", function()
         {
             setup_handlers(this.server, this.docdb, this.entriesdiv); 
             var tgtn = 2; 
             var tgtdiv = $(this.entriesdiv).children().eq(tgtn); 

             dom_view_remove_click($("a.edit", tgtdiv), this.server); 
             
             var sop = this.server.queue.pop(); 
             equals(sop.op, 'page_update'); 
             equals(sop.pageid, this.server.pageState.entry._id); 

             equals(sop.doc.entries.length, 
                    this.server.pageState.rev.entries.length -1); 
             // assert properties of request
             var updated_rev = datagen.refresh_rev(sop.doc);
             var entry = this.localdb[sop.pageid]; 
             entry.rev = updated_rev._id; 

             this.localdb[updated_rev._id] = updated_rev; 
             
             /* update the entry */ 
             sop.deferred.resolve(updated_rev); 
             equal($(this.entriesdiv).children().length, 9); 
             
             
         }); 

    test("Simple pin test", function()
         {
             setup_handlers(this.server, this.docdb, this.entriesdiv); 
             var tgtn = 5; 
             var tgtdiv = $(this.entriesdiv).children().eq(tgtn); 
             
             // executing this requires us knowing what the pinned rev is
             
             var pinned_rev = $.extend(true, datagen.text_entry_revision_create("pinned version", "pinned body"), 
                                       datagen.revision_create("eric", {})); 
             
             this.localdb[pinned_rev._id] = pinned_rev; 
             dom_view_pin_click($("a.edit", tgtdiv), this.server, 
                                this.docdb, pinned_rev._id); 
             
             var sop = this.server.queue.pop(); 
             equals(sop.op, 'page_update'); 
             equals(sop.pageid, this.server.pageState.entry._id); 
             equals(sop.doc.entries[tgtn].rev, pinned_rev._id); 

             // assert properties of request
             var updated_rev = datagen.refresh_rev(sop.doc);
             var entry = this.localdb[sop.pageid]; 
             entry.rev = updated_rev._id; 

             this.localdb[updated_rev._id] = updated_rev; 
             
             /* update the entry */ 
             sop.deferred.resolve(updated_rev); 

             // now get the doc query
             this.server.processAll(this.localdb); 

             equal($(tgtdiv).attr("pinned"), pinned_rev._id); 
             equal($("H2", tgtdiv).html(), "pinned version"); 
             
             
         }); 

    test("Simple hide test, hide=true", function()
         {
             setup_handlers(this.server, this.docdb, this.entriesdiv); 
             var tgtn = 6; 
             var tgtdiv = $(this.entriesdiv).children().eq(tgtn); 
             
             // executing this requires us knowing what the pinned rev is
             dom_view_hide_click($("a.edit", tgtdiv), this.server, 
                                this.docdb); 
             
             var sop = this.server.queue.pop(); 
             equals(sop.op, 'page_update'); 
             equals(sop.pageid, this.server.pageState.entry._id); 
             equals(sop.doc.entries[tgtn].hidden, true); 

             // assert properties of request
             var updated_rev = datagen.refresh_rev(sop.doc);
             var entry = this.localdb[sop.pageid]; 
             entry.rev = updated_rev._id; 

             this.localdb[updated_rev._id] = updated_rev; 
             
             /* update the entry */ 
             sop.deferred.resolve(updated_rev); 

             // now get the doc query
             this.server.processAll(this.localdb); 

             ok($(tgtdiv).attr("hidden")); 
             
             
         }); 

}
