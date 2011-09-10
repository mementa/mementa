

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
                  same(get_entry_config(element), {state: 'view', 
                                                    entryid : ent.entry}); 

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

             // $(entriesdiv).children()
             //     .each(function(index, element) {
             //               equal(get_state(element), 'view'); 
             //               // for each div, is the title text correct? 
             //               var eptr = entries[index]; 
             //               var entry_doc =  fakepage.docs[eptr.entry]; 
             //               var revdoc = fakepage.docs[entry_doc.head]; 
             //               var title = revdoc.title; 
             //               equal($("H2", element).html(), title); 

             //           }); 
             
             
             


             
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


}
