

$(document).ready(
    function () {


      $('#editactivate')
            .click(function() {
                       var editor1 = new Proper($(".content"));                                

                       editor1.activate({
                                           placeholder: 'Enter Text',
                                           controlsTarget: $('#tools'),
                                           codeFontFamily: 'Monaco, Consolas, "Lucida Console", monospace'
                                       });
                       $(".content").data("editor", editor1); 
                       
                       
                   }); 

        $("#deactivate")
            .click(function() { 
                       var editor = $(".content").data("editor"); 
                       console.log(editor.content()); 
                       editor.deactivate();                    
                   });

      $('#editactivate2')
            .click(function() {
                       var editor2 = new Proper($(".content2"));        
                       
                       editor2.activate({
                                           placeholder: 'Enter Text',
                                           controlsTarget: $('#tools2'),
                                           codeFontFamily: 'Monaco, Consolas, "Lucida Console", monospace'
                                       });
                       
                       $(".content2").data("editor", editor2); 
                       
                       
                   }); 
        $("#deactivate2")
            .click(function() { 
                       var editor = $(".content2").data("editor"); 
                       console.log(editor.content()); 
                       editor.deactivate();                    
                   });
    });

