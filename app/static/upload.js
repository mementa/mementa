$(document).ready(
    function () {
        
        $("#files").change(function(evt) {
                               console.log(evt.target.files); 
                               console.log(this); 

                           });

        var uploader = 
            new qq.FileUploader({
                                    element: $("#dropzone")[0], 
                                    debug: true,
                                    // path to server-side upload script
                                    action: '/api/' + CURRENT_NOTEBOOK + '/upload'
                                }); 

        var uploader = 
            new qq.FileUploader({
                                    element: $("#dropzone1")[0], 
                                    debug: true,
                                    // path to server-side upload script
                                    action: '/api/' + CURRENT_NOTEBOOK + '/upload'
                                }); 

}); 
