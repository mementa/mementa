$(document).ready(
    function () {

        var notebook = CURRENT_NOTEBOOK; 
        // create the docdb
        var entriesdiv = $("#entries"); 
        var server = new Server(entriesdiv, notebook); 

        setup_avatars(server, $("body")); 
        $.fn.cuteTime.settings.refresh = 10000;

        $('.date').cuteTime();

    }); 
