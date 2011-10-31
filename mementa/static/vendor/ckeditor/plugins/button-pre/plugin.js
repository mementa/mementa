

(function(){
     var a= {
         exec:function(editor){
             var format = {
                 element : "pre"
             };
             var style = new CKEDITOR.style(format);
             style.apply(editor.document);
         }
     },
     
     b="button-pre";
     CKEDITOR.plugins
         .add(b,{
                  init:function(editor){
                      editor.addCommand(b,a);
                      editor.ui.addButton("button-pre",{
                                              label:"Button PRE",
                                              icon: this.path + "button-pre.png",
                                              command:b
                                          });
                  }
              });
 })();
