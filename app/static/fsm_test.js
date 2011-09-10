

function fsm_tests()
{
    

    module("FSM Render Test");
    test("create divs ", function() {
             var ENTRYN = 10; 
             var fakepage = datagen.create_fake_page(ENTRYN); 

             var entriesdiv = $("<div id='entries'/>"); 

             var server = new ServerMock(entriesdiv); 

             var docdb = new DocumentDB(server); 

             var ofunc = new opfuncs(); 

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
             
             $(entriesdiv).children()
                 .each(function(index, element) {
                           equal(get_state(element), 'view'); 
                           // for each div, is the title text correct? 
                           var eptr = entries[index]; 
                           var entry_doc =  fakepage.docs[eptr.entry]; 
                           var revdoc = fakepage.docs[entry_doc.head]; 
                           var title = revdoc.title; 
                           equal($("H2", element).html(), title); 

                       }); 
             
             
             


             
         });     

}
