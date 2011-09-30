
function setup_page_dnd(entry_container, server)
{
    
    $("div.entry").live('dragstart', function(evt)  {
                            
                            $(this).addClass("dragging"); 
                            $("div.entry", entry_container)
                                .each(function(index, elt) {
                                          var floater = $("<div class='entrydroptarget'></div>").attr("pos", index+1); 
                                          $(elt).after(floater); 
                                          $(floater).hide(); 
                                          
                                      }); 
                            var topfloater = $("<div class='entrydroptarget'></div>").attr("pos", 0); 
                            $(entry_container).prepend(topfloater);
                            $(topfloater).hide(); 
                            
                            var dt = evt.originalEvent.dataTransfer;
                            
                            dt.setData("Text", $(this).attr("entry-pos")); 
                            
                            return true; 
                        }); 
    
    $("div.entrydroptarget", entry_container)
        .live("dragover", function(evt) {
                  
                  return false; 
              });
    
    $("div.entrydroptarget", entry_container)
        .live("dragenter", function(evt) {
                  return false; 
              });
    
    $("div.entrydroptarget", entry_container)
        .live("drop", function(evt) {
                  evt.preventDefault(); 
                  
                  var dt = evt.originalEvent.dataTransfer;
                  var source_pos = parseFloat(dt.getData("Text")); 
                  var dest_pos = parseFloat($(this).attr("pos")); 
                      
                  
                  
                  move_entry(server, $(entry_container), source_pos, 
                             dest_pos); 
                  

                  $(".entrydroptarget", entry_container)
                      .each(function(x) {$(this).remove();}); 
                  
                  return false; 
              }); 
    
    $("div.entry", entry_container)
        .live("drop", function(evt) {
                  var dt = evt.originalEvent.dataTransfer;
                  var source_pos = parseFloat(dt.getData("Text")); 
                  var dest_pos = parseFloat($(this).attr("entry-pos")); 
                  
                  
                  
                  move_entry(server, $("#entries"), source_pos, 
                             dest_pos); 
                  
                  
                  $("+ div.entrydroptarget", this).remove(); 
                  $(".entrydroptarget").each(function(x) {$(this).remove();}); 
                  
                  evt.preventDefault(); 
                  return false; 
              }) ;
    
    $("div.entry", entry_container)
        .live("dragenter", function(evt) {
                  
                  evt.preventDefault(); 
                  return false; 
                  
              });
    
    
    function show_drop_target(pos) {
        $(".entrydroptarget", entry_container)
            .each(function() {$(this).hide();}); ; 
        $(".entrydroptarget", entry_container).eq(pos).show();
    }
    
    $("div.entry", entry_container)
        .live("dragover", function(evt) {
                  
                  var pos = parseFloat($(this).attr("entry-pos")); 
                  var relpos = evt.offsetY / $(this).height(); 
                  
                  if (relpos < 0.5) {
                      show_drop_target(pos);
                  } else {
                      show_drop_target(pos+1);
                  }
                  
                  evt.preventDefault(); 
                  return false; 
                  
              });
    
    $("div.entry", entry_container)
        .live("dragleave", function(elt) {
                  return true; 
                  
              });
    
    
    $("div.entry", entry_container)
        .live('dragend', function(evt)  {
                  $(this).removeClass("dragging"); 
                  $(".entrydroptarget", entry_container)
                      .each(function(x) {$(this).remove();}); 
                  
              }); 
    
    
}
