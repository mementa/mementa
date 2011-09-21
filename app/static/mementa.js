
$(document).ready(
    function () {
      
        $("body").live("click", function (e) {
                           $('a.menu').parent("li").removeClass("open");
                       });
        
        $("a.menu").live('click', function (e) {
                             console.log("woooo");
                             var $li = $(this).parent("li").toggleClass('open');
                             return false;
                         });

}); 
