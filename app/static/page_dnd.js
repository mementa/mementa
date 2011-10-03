
function setup_page_dnd(entry_container, server)
{
    PAGE_KEY = "page-dnd-entry-active"; 
    
    
    $("span.move", entry_container)
        .live('dragstart', function(evt)  {

                  var dt = evt.dataTransfer;
                  var entrydom = $(this).closest(".entry")[0];
                  $(entrydom).addClass("dragging"); 
                  // getData only works in chrome on start and drop events
                  // meaning we can't use it to filter types on drop targets
                  // 
                  // thus we have a global setting, horrible hack'
                  dt.setData("Text", $(entrydom).attr("entry-pos")); 
                  dt.setDragImage(entrydom, 0, 0); 

                  dt.effectAllowed = "move"; 
                  $(document).data(PAGE_KEY, true); 

                  $("div.entry", entry_container)
                      .each(function(index, elt) {
                                var floater = $("<div class='entrydroptarget'></div>")
                                    .attr("pos", index+1); 
                                $(elt).after(floater); 
                                $(floater).hide(); 
                                
                            }); 
                  var topfloater = $("<div class='entrydroptarget'></div>").attr("pos", 0); 
                  $(entry_container).prepend(topfloater);
                  $(topfloater).hide(); 
                  

                  return true;
              }); 
    
    $("div.entrydroptarget", entry_container)
        .live("dragover", function(evt) {
                  evt.dataTransfer.dropEffect = "move"; 

                  return !$(document).data(PAGE_KEY); 
              });
    
    $("div.entrydroptarget", entry_container)
        .live("dragenter", function(evt) {
                  return !$(document).data(PAGE_KEY); 

              });
    
    $("div.entrydroptarget", entry_container)
        .live("drop", function(evt) {
                  if(!$(document).data(PAGE_KEY)) {
                      return true; 
                  }

                  evt.preventDefault(); 
                  
                  var dt = evt.dataTransfer;

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
                  if(!$(document).data(PAGE_KEY)) {
                      return true; 
                  }

                  var dt = evt.dataTransfer;
                  if(dt.getData("Type") !== "entry") {
                      return; 
                  }
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
                  if(!$(document).data(PAGE_KEY)) {
                      return true; 
                  }
                  
              });
    
    
    function show_drop_target(pos, relpos, height) {

        $(".entrydroptarget", entry_container)
            .each(function() {$(this).hide();}); ; 
        $(".entrydroptarget", entry_container).eq(pos).show();
    }
    
    $("div.entry", entry_container)
        .live("dragover", function(evt) {
                  evt.dataTransfer.dropEffect = "move"; 

                  if(!$(document).data(PAGE_KEY)) {
                      return true; 
                  }

                  var pos = parseFloat($(this).attr("entry-pos")); 

                  // it's shockingly hard to get relative-position-inside-elemement
                  // in a cross-browser way
                  var PAGE_OFFSET_VERTICAL = 40; 
                  var offset = $(this).position(); 
                  var relY = evt.pageY - offset.top - PAGE_OFFSET_VERTICAL; 
                  var relpos = relY - $(this).height(); 

                  if (relpos < 0.5) {
                      show_drop_target(pos, relpos, $(this).height());
                  } else {
                      show_drop_target(pos+1, relpos, $(this).height());
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

                  // hack for bug in chrome; see above
                  $(document).data(PAGE_KEY, false); 
                  
              }); 
    
    
}
