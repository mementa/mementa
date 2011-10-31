
function docdb_tests()
{
    
    module("DocDB simple tests", {
               setup: function() {

                   this.serverdom = $("<div/>"); 
                   this.server = new ServerMock(this.serverdom); 
                   this.docdb = new DocumentDB(this.server); 
                   
               }
               
           }
           
          );

    
    test("simple entry lookup ", 
         function() {
             var entry1_body = {hello : "World", rev : 1}; 

             var result = this.docdb.getEntry("Entry1"); 

             result.done(function(doc) {

                             same(doc, entry1_body); 
                         }); 

             result.fail(function() {
                             same(0, 1, "failed request"); 
                         }); 
             
             
             equal(this.server.queue.length, 1); 
             
             this.server.getEntryRespond(entry1_body, true); 

             equal(this.server.queue.length, 0); 

             // check cached lookup
             var result = this.docdb.getEntry("Entry1"); 

             result.done(function(doc) {
                             same(doc, entry1_body, 'cached query'); 
                         }); 


             equal(this.server.queue.length, 0); 

             
             
         }); 

    test("failed lookup", 
         function() {
             var entry1_body = {hello : "World", rev : 1}; 

             var result = this.docdb.getEntry("Entry1"); 

             result.done(function(doc) {
                             ok(false, "Should not all done"); 
                         }); 

             result.fail(function() {
                             ok(true, "did, in fact, call error"); 
                         }); 
             
             
             equal(this.server.queue.length, 1); 
             
             this.server.getEntryRespond(entry1_body, false); 

             equal(this.server.queue.length, 0); 

             
         }); 

}
