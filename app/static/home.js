$(document).ready(
    function () {
        
        
        $('#modal-new-notebook')
            .bind('hidden', 
                  function () {
                      $("#notebook-name-input").val("");                       
                  }); 
        
        function set_message(msg, isError) {
            
            $("#notebook-name-help").html(msg); 
            if(isError) {
                $("#notebook-name").addClass("error"); 
            } else {
                $("#notebook-name").removeClass("error"); 
            }
            
        }

        $("#notebook-name-input")
            .keydown(function(event) {
                         var name = $("#notebook-name-input").val(); 
                         if (name.length < 5) {
                             set_message("name length must be longer than 5 characters");
                             $("#create-new-notebook").addClass("disabled"); 
                             return; 

                         }
                         var notOnlyLetters = /\W/.test(name);
                         if(notOnlyLetters) {
                             set_message("name can only contain letters and numbers, and must start with a letter"); 
                                         
                             $("#create-new-notebook").addClass("disabled"); 
                             return; 
                             

                         }
                         set_message("");

                         $("#create-new-notebook").removeClass("disabled"); 


                     });
        
        $("#create-new-notebook img").hide(); 

        $("#create-new-notebook")
            .click(function() {
                       var name = $("#notebook-name-input").val(); 
                       var title = $("#notebook-title-input").val(); 
                       
                       $("#create-new-notebook img").show(); 

                       var resp = $.ajax({url : "/api/notebookadmin/new", 
                                          type : "POST", 
                                          contentType : "application/json", 
                                          dataType: "json", 
                                          data: JSON.stringify({name : name,
                                                               title: title})}); 
                       resp.done(function(arg) {


                                     $("#create-new-notebook img").hide(); 

                                     window.location.pathname = "/notebook/" + name + "/settings"; 
                                 }); 
                       
                       resp.fail(function(jqxhr, arg2, arg3) { 
                                     if (jqxhr.status == 409) {
                                         set_message("That notebook name is already in use", true); 

                                     }
                                     
                                     $("#create-new-notebook img").hide(); 
                                     
                                 }); 

                                            

        }); 
    }); 
