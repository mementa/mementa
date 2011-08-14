$(document).ready(
    function(){
        
        $("p").click(function(){
                         $(this).hide();
                     });

        //$('a[href="entryedit"]').live('click', 
        $('a[href="entry.edit"]').live('click', 
                    function() {
                        var entry_id = $(this).parent().attr("entry"); 
                        var rev_id = $(this).parent().attr("rev"); 

                        $.get("/entry/render/edit/" + entry_id, 
                              function(data, textStatus, jqXHR) { 
                                  
                                  console.log("entry_id = " + entry_id); 
                                  console.log("rev_id = " + rev_id); 

                                  $("#" + entry_id).replaceWith(data); 
                              }
                              ); 

                              

                        return false; 
                    }); 
        
        $('a[href="entry.edit.cancel"]').live('click', 
                    function() {
                        var entry_id = $(this).parent().attr("entry"); 
                        var rev_id = $(this).parent().attr("rev"); 
                        $.get("/entry/render/view/" + entry_id, 
                              function(data, textStatus, jqXHR) { 
                                  
                                  console.log("entry_id = " + entry_id); 
                                  console.log("rev_id = " + rev_id); 
                                  $("#" + entry_id).replaceWith(data); 
                              }
                             ); 
                        

                        return false; 
                        

                    }); 


        
        $('a[href="entry.edit.save"]').live('click', 
                    function() {
                        var entry_id = $(this).parent().attr("entry"); 
                        var rev_id = $(this).parent().attr("rev"); 
                        
                        // show throbber
                        
                        // extract the data
                        
                        // post

                        $.get("/entry/render/edit/" + entry_id, 
                              function(data, textStatus, jqXHR) { 
                                  
                                  console.log("entry_id = " + entry_id); 
                                  console.log("rev_id = " + rev_id); 

                                  $("#" + entry_id).replaceWith(data); 
                              }
                              ); 

                              

                        return false; 
                    }); 
        
        

        
    });
