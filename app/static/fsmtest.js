var testserver = {
    
    elt_container : null, 
    
    pageop_notify: function() {
        
        console.log("SERVER: pageop_notify"); 
        var pagependings =$("div.entry[state='pagepending']"); 
        console.log("There are", pagependings.length, " entries with page pending ops");

    }
     
}; 

var docdb = {
    entries :  {
        testid1 : { _id : "testid1", 
                    head : "rev1", 
                    'class': "text"}
    }, 
    
    revs :  {
        rev1 : {_id : 'rev1', 
                author: 'authorid0', 
                parent : null,
                date : "October 5, 1955", 
                archived: false, 
                title : "Test entry 0 ", 
                body: "test entry body 0"},
        
    }, 
    
    get_entry : function(id) {
        return this.entries[id]; 
    }, 

    get_rev : function(id) { 
        console.log("Looking up", id); 
        return this.revs[id]; 
    }

    
}; 


$(document).ready(
    function () {
        testserver.elt_container = $("#entries");
 
        $("#creatediv")
            .click(function() {
                       var ed = create_entry_div("testid1", false); 
                       $("#entries").append(ed); 
                   }); 

        $("#none_to_view")
            .click(function() {
                       state_none_to_view($("#entries").children().eq(0), 
                                          docdb, "rev1", false, 
                                          false); 
                   }); 
        

        $("#view_to_pagepending_hide")
            .click(function() {
                       state_view_to_pagepending(
                           $("#entries").children().eq(0), 
                           'hide', 
                           testserver); 
                   }); 
        
        $("#page_update_entry")
            .click(function() {
                       state_view_to_pagepending(
                           $("#entries").children().eq(0), 
                           'hide', 
                           testserver); 
                   }); 
        
        
        

}); 
