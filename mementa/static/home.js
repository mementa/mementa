$(document).ready(
    function () {
        
        
        $('#modal-new-notebook')
            .bind('hidden', 
                  function () {
                      $("#notebook-name-input").val("");                       
                  }); 
        
        $("#create-new-notebook img").hide(); 

        $("#create-new-notebook")
            .click(function() {
                       var title = $("#notebook-title-input").val(); 
                       
                       $("#create-new-notebook img").show(); 

                       var resp = $.ajax({url : "/api/notebookadmin/new", 
                                          type : "POST", 
                                          contentType : "application/json", 
                                          dataType: "json", 
                                          data: JSON.stringify({
                                                               title: title})}); 
                       resp.done(function(arg) {


                                     $("#create-new-notebook img").hide(); 

                                     window.location.pathname = "/notebook/" + arg.name + "/settings"; 
                                 }); 
                       
                       resp.fail(function(jqxhr, arg2, arg3) { 
                                     
                                     $("#create-new-notebook img").hide(); 
                                     
                                 }); 

                                            

        }); 
    }); 
