
function testfunc(search, showChoices) {
    
    console.log("testfunc", search, showChoices); 
    showChoices(["hello", "world", "its", "jesus"]); 
    console.log($("#page_tags").val()); 

}

$(document).ready(
    function () {
        
        $("#page_tags").tagit({
                                  allowSpaces: true, 
                                  tagSource : testfunc, 
                                  removeConfirmation: true
                             });
        $("#testlink")
            .click(function() { 
                       console.log("woo, forcing");
                       $("#page_tags").tagit("removeAll"); 
                       $("#page_tags").tagit("createTag", "SillyTest1"); 
                       $("#page_tags").tagit("createTag", "SillyTest2"); 
                       $("#page_tags").tagit("createTag", "SillyTest3"); 
                       $("#page_tags").tagit("createTag", "SillyTest4"); 
                   }); 
    });

