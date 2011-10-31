
function save_entry_text(domobj, callback) {
    // extract data
    var title = $("input[name='title']", domobj).val(); 
    var body = $("textarea[name='body']", domobj).val(); 

    var entry_id = $(domobj).attr("entry"); 
    var rev_id = $(domobj).attr("rev"); 
    var entry_class = $(domobj).attr("entry_class"); 


    var  doc = {'entry_id' : entry_id, 
                'rev_id' : rev_id, 
                'entry_class' : entry_class, 
                'title' : title, 
                'body' : body};
    
    var url = "/entry/" + entry_id; 
    $.post(url, doc, callback); 

    
    
    
}

var savers = {
    'text' : save_entry_text
}; 


$(document).ready(
    function(){

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
                        var entry_class = $(this).parent().attr("entry_class"); 
                        console.log("Entry class is" + entry_class); 
                        // show throbber
                        
                        // extract the data
                        savers[entry_class]($(this).parent(), 
                                            function(data, textStatus, jqXHR)
                                            {
                                                console.log("HOLY CRAP DID THAT WORK?");
                                                
                                                $("#" + entry_id).replaceWith(data); 
                                            }
                                            
                                           ); 
                        console.log("Invoked savers"); 
                        return false; 
                    }); 
        
        

        
    });
