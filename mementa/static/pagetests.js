
function page_tests() 
{
    
    module("Simple page tests"); 
    test("simple test 1", function() { 
             var db = {};

             var pageid = create_basic_page(db, "This is the title", 10); 

             var entries_div  = $("<div id='entries'/>"); 
             var server = server_setup(entries_div); 

             // figuring out the init situation is a little complex, oh well
             init_page(docdb, server, entries_div); 

             assert_all_state(view); 

             // now simulate updates
             
             db[pageid].updated_vals; 

             server.page_update(db[pageid]); 

             assert_all_state(view); 

             assert_is_hidden(4); 
             assert_length(entites, 4); 
             
             // Now add a new entry to the db, and to the page

             assert(server.queue.length > 0); 

             // process server queue length
             

         }); 
    



}
