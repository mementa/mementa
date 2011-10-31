$(document).ready(
    function () {
        console.log("This is a test"); 
        jQuery.event.props.push("dataTransfer");
       
        var src = ".source-handle"; 

        $(src).attr("draggable", "true");
        
        var tgt = "div.target"; 

        $(src).live('dragstart', function (ev) {
                        var container = $(this).closest(".source")[0];

                        console.log("This is the drag start"); 
                        ev.dataTransfer.effectAllowed='move';
                        var x = $("h1", container).html() ;
                        console.log("setting data to", x); 
                        ev.dataTransfer.setData("Text", x); 
                        $(document).data("dragclass", "WOOO"); 
                        ev.dataTransfer.setDragImage(container,0,0);
                        return true;
                    });

        $(src).live('dragend', function(ev) {
                        console.log("unsetting global drag class"); 
                        $(document).data("dragclass", "");
                    }); 


        $(tgt)
            .live('dragenter', function(ev) {
                      ev.preventDefault();

                      var src = ev.dataTransfer.getData("Text");
                      console.log("drag enter, src=", src);

                      return true;
                  }); 

        $(tgt).live('dragover', function(ev) { 
                        if($(document).data("dragclass") == "WOOO") {
                            ev.dataTransfer.dropEffect = "move"; 

                            ev.preventDefault();
                            var src = ev.dataTransfer.getData("Text");
                            console.log("dragover", src); 
                        
                            return false;                             
                        }

                    }); 
        

        $(tgt).live('drop', function(ev)  {
                        var src = ev.dataTransfer.getData("Text");
                        console.log("dropped", src); 
                        console.log("dropped on", $("h1", this).html());
                        
                        ev.stopPropagation();
                        return false;
                    }); 

        
        function add_stuff(nums) { 
            var originals = $(".origin");
            _.map(nums, function(x) {
                      var s = $(originals).clone(); 
                      console.log("found", s);
                      $("h1.source", s).html("This is source " + x); 
                      $("h1.target", s).html("This is target " + x); 
                      $("body").append(s); 
                  }); 

        }

        $("#givememore").click(function(ev) {
        
                                   add_stuff([1, 2]); 
                                   ev.preventDefault(); 
                               }); 

});
    
