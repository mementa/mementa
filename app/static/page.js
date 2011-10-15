
/*
 * page_entries_canonical : always contains our understanding of the most up-to-date
 * page_entry : the latest page entry
 * 
 * 
 * 
 */

function is_hidden_visible()
{
    return $("#showhidden").is(':checked');
}

function goto_entry(entryid, entrycontainerdiv)
{
 /* smooothly go to the indicated entry -- must be visible, etc. 
  * 
  * FIXME: say something if the entry is not visible
  * SAY something if the entry is no longer on the page
  * 
  * Yeah, lots of fixmes
  * 
  * 
  */
    
    var ents = $("div.entry[entryid='" + entryid + "']", entrycontainerdiv); 
    
    if(ents === []) {
        console.log("There is no instance of that entry on this page!"); 
    } else {
        // get first one
        var ent = ents[0]; 
        if(get_entry_config(ent)['page-hidden']) { 
            console.log("What should we do now, that entry is hidden!"); 
            
        } else {
             
            
            $('html, body').animate({
                                scrollTop: $(ent).offset().top - 40
                            }, 1000);

        }


    }


}

function parse_hash(hashpart) {
    /* assume the # has been removed */    
    // right now only support entryid
    
    if(hashpart.indexOf("entry") >= 0) { 
        return {entry : hashpart.substr(6)}; 
    }
    
    return {}; 
}

function on_tags_changed(server, add) { 
    return function (event, tag) {
        // fixme make this retry

        var curdocs = server.getPageState(); 
        var newdoc = $.extend(true, {}, curdocs.rev); 

        var tagtxt = $(".tagit-label", tag).html(); 
        
        if (add) {


            var curtags = $("#page_tags").tagit("assignedTags"); 
            if(newdoc.tags) {
                newdoc.tags.push(tagtxt); 
            } else {
                newdoc.tags = [tagtxt];                 
            }
        } else {

            var curdocs = server.getPageState(); 
            var curtags = $("#page_tags").tagit("assignedTags"); 
            var newtags = _.without(curtags, tagtxt);            
            newdoc.tags = newtags;  
        }
        
        
        newdoc.parent = newdoc._id; 
        
        var res = server.pageUpdate(curdocs.entry._id, 
                                    newdoc); 
        
}}


function existing_tag_click(event, arg) 
{
    $("#page_tags").tagit("createTag", arg.text()); 
    return true; 
}

function show_tag_suggestions(notebook)
{
    if($("#existing_tags").is(":visible")) {
        // if already shown, don't reshow
    } else {
        $("#existing_tags").tagit("removeAll"); 
        
        $("#tag_suggest").fadeIn(); 
        
        refresh_tag_suggestions(notebook);          
    }



}

function refresh_tag_suggestions(notebook, beginstr) {
    
    var url; 
    if(beginstr) {
        url = "/api/" + notebook + "/tags/subset/" + beginstr + "/10"; 
    } else {
        url = "/api/" + notebook + "/tags/all/10"; 
    }

    var resp = $.get(url); 
    $("#tag_suggest img.throbber").show(); 
    resp.done(function(res) {
                  $("#tag_suggest img.throbber").hide(); 
                  $("#existing_tags").tagit("removeAll"); 

                  _.map(res.tagcounts, function(tc) {
                            $("#existing_tags").tagit("createTag", tc[0], true, true); 
                        }); 
                  
              }); 
    
    
}

function hide_tag_suggestions()
{
    $("#tag_suggest").fadeOut(); 
    var loadprom = 
        $("#tag_suggest").data("pending_load"); 
    $("#existing_tags").tagit("removeAll"); 
}

$(document).ready(
    function () {
        $.fn.cuteTime.settings.refresh = 10000;

        var notebook = CURRENT_NOTEBOOK; 
        // create the docdb
        var entriesdiv = $("#entries"); 
        var server = new Server(entriesdiv, notebook); 
        var docdb = new DocumentDB(server); 
        
        docdb.update(init_page_entry); 
        docdb.update(init_page_rev); 

        var ofunc = new opfuncs(docdb); 

        $("#tag_suggest").hide(); 

        $("#page_tags").tagit( { onTagAdded: on_tags_changed(server, true) , 
                                 onTagRemoved : on_tags_changed(server, false), 
                                 allowSpaces: true, 
                                 allowInput : true, 
                                 // tagSource : testfunc, 
                                 removeConfirmation: true }); 
        
        $("#existing_tags").tagit( { allowInput: false, 
                                     onTagClicked: existing_tag_click, 
                                     removeConfirmation: true, 
                                     removeIcon: false}); 

        var x = 0; 

        $("#page_tags input")
            .focus($.debounce(250, function() {
                                  show_tag_suggestions(notebook); 

                              })); 

        $("#tags")
            .hover(undefined, function() {
                       if($("#page_tags input").is(":focus")){
                       } else {
                           hide_tag_suggestions(); 
                       }
                       
                   });
        $("#page_tags input")
            .blur(function() {
                      if($("#tags").is(":hover")){
                      } else {
                                 hide_tag_suggestions(); 
                      }
                      
                  });
        $("#page_tags input").typeWatch({callback: function(event) {
                                          refresh_tag_suggestions(notebook, 
                                                                  event);    
                                         }, 
                                        wait: 400, 
                                        captureLength: 2}); 
        


        $(entriesdiv).bind('entry-to-state-none', function(entrydiv) {
                               

                           }); 
        $(entriesdiv).bind('entry-to-state-view', function(entrydiv) {
                               

                           }); 

        $(entriesdiv).bind('page-rev-update', function(event, doc) {
                               var oldpage_rev = $(this).data('old-page-rev'); 

                               if(!oldpage_rev) {
                                   oldpage_rev = {
                                       entries : {},
                                       tags : []
                                   }; 

                               }
                               
                               render_simple(oldpage_rev.entries, 
                                             doc.entries, $(entriesdiv), ofunc); 



                               $(this).data('old-page-rev', doc); 
                               $("#page_title_view").html(doc.title);
                               document.title = doc.title + " - Mementa";
                               
                               var old_not_in_new = _.difference(oldpage_rev.tags, 
                                                                 doc.tags); 
                               var new_not_in_old = _.difference(doc.tags, 
                                                                 oldpage_rev.tags); 
                               _.map(old_not_in_new, function(t) {
                                         $("#page_tags").tagit("removeTag", t, true, true); 
                                     }); 

                               _.map(new_not_in_old, function(t) {
                                         $("#page_tags").tagit("createTag", t, true, true); 
                                     }); 

                               var datestring =
                                   doc.date.substr(0, doc.date.length - 7) + "Z"; 

                               $("#page_date").removeAttr("data-timestamp").html(datestring).cuteTime(); 
                               
                               if (doc.archived) {
                                   $("#archive_status").show(); 
                                   $("#page_archive_click").hide(); 
                                   $("#page_unarchive_click").show(); 
                               } else {
                                   $("#archive_status").hide(); 
                                   $("#page_archive_click").show(); 
                                   $("#page_unarchive_click").hide(); 

                               }
                           }); 

        // FIX ME : THERES NO WAY FOR US TO KNOW WHEN AN ELEMENT IS DONE WITH A STATE TRANSITION, SO CHAINING IS ALMOST IMPOSSIBLE
        $(entriesdiv)
            .bind("state-change", 
                  function(event, attr) {
                      var element = attr.dom; 
                      var oldstate = attr.oldstate; 
                      var state = attr.curstate; 

                      var config = get_entry_config(element); 

                      if(state == 'none') {
                          var res = state_none_to_view(element, docdb);                                                                                        
                      } else if (state == 'view') {
                          if(!is_hidden_visible()){
                              if($(element).attr("page-hidden")) {
                                  $(element).addClass("hidden");                                    
                              }
                              
                          }                                       

                          if((config.entryclass == 'text') || (config.entryclass == 'figure')) {
                              var id = $(element).attr('id'); 
                              if(MathJax) { // conditional because the CDN might fail to load
                                  MathJax.Hub.Queue(["Typeset",MathJax.Hub, id]);                                                                
                              }

                          }

                          if((config.entryclass == 'code')) {
                              var code = $("pre.code", element).data('code'); 
                              console.log("About to run on ", code); 
                              var node = $("pre.code", element); 
                              $(node).addClass("cm-s-default");
                              var language = $("input[name='language']", element).val(); 

                              CodeMirror.runMode(code, language, node[0]);

                          }

                      } else if (state == 'edit') {

                          /// for all entries! 

                          var curtags = $("ul.tags", element).tagit(
                              { onTagAdded: undefined, 
                                 onTagRemoved : undefined,
                                 allowSpaces: true, 
                                 allowInput : true, 
                                 // tagSource : testfunc, 
                                 removeConfirmation: true }); 



                          if(config.entryclass == 'text') {
                              if(oldstate == 'view') {
                                  $(".textbody", element )
                                      .ckeditor(function() { 
                                                    var editor = this; 

                                                    editor.on('paste', function(evt){
                                                                  // FIXME: Remove quotes, sanitize URL, etc. 


                                                                  var html = evt.data.html; 
                                                                  var text = evt.data.text; 
                                                                  if(html) {
                                                                      if(isValidURL(html)) {
                                                                          evt.editor.insertHtml('<a href="' + html + '">' + html + "</a>"); 
                                                                      } else {
                                                                          evt.editor.insertHtml(html); 
                                                                      }

                                                                  } else if (text) {
                                                                      if(isValidURL(text)) {
                                                                          evt.editor.insertHtml('<a href="' + text + '">' + text + "</a>"); 
                                                                      } else {
                                                                          evt.editor.insertText(text); 
                                                                      }
                                                                  }
                                                                  evt.cancel(); 

                                                              }); 


                                                    var pos = $(element).position(); 

                                                },
                                                {
                                                    toolbar_Custom : 
                                                    [
	                                                    ['Bold', 'Italic', '-', 'Format', '-', 'NumberedList', 'BulletedList', '-', 'Link', 'Unlink', '-', "button-pre"]
                                                    ], 
                                                    toolbar : 'Custom', 
		                                            // Remove the Resize plugin as it does not make sense to use it in conjunction with the AutoGrow plugin.
		                                            removePlugins : 'resize',
                                                    contentsCss : "/static/vendor/bootstrap/bootstrap.min.css",
                                                    forcePasteAsPlainText : true,
                                                    extraPlugins : "autogrow,button-pre"});
                       
                              }                                                       
                          }  else if (config.entryclass == 'figure') {
                              // var upload_button = $("button.upload", element)[0]; 
                              // console.log("upload button =", upload_button);
                              var uploader = 
                                  new qq.FileUploaderBasic({
//                                                               button: upload_button, 
                                                               debug: true,
                                                               // path to server-side upload script
                                                               action: '/api/' + CURRENT_NOTEBOOK + '/upload', 
                                                               onComplete : figure_edit_file_upload.complete,
                                                               onProgress : figure_edit_file_upload.progress,
                                                               onSubmit : figure_edit_file_upload.submit,
                                                               onCancel : figure_edit_file_upload.cancel,
                                                               entrydiv : element[0]
                          

                                                               
                                                           });
                              $("input[name='files']", element).data('uploader', uploader); 
                              $("input[name='files']", element)
                                  .change(function(x) { 
                                              //yeah, it's a private method -- bite me. '
                                              uploader._onInputChange(this); 
w
                                          }); 
                          } else if (config.entryclass == 'code') {
                              var myCodeMirror = CodeMirror.fromTextArea($("textarea", element)[0])
                              $(element).data("codemirror", myCodeMirror); 



                          }
                      }
                      
                  }); 
        
        
    

        $(entriesdiv).bind('entry-rev-update', function(event, er) {
                               // fixme: this may in fact be resulting in a double
                               // trigger here for new entries

                               docdb.update(er.entry); 
                               docdb.update(er.rev); 
                               
                               
                               $(".entry[entryid='" + er.entry._id + "']", entriesdiv)
                                   .each(function(index, elt) { 
                                             if(!$(elt).attr("pinned")) {
                                                 if($(elt).attr('state') === 'view') { 
                                                     entrydiv_reload_view(elt, docdb, {}, {}); 
                                                 } else {
                                                     $(elt).attr("revid", er.rev._id); 
                                                 }
                                             }                                                                                               
                                         }); 
                           }); 
        
        server.setPageState(init_page_entry, init_page_rev); 

        // setup the handlers
        $(".entry a.edit")
            .live('click', function(e) {
                                            
                      var resp = dom_view_edit_click(this, docdb); 
                      e.preventDefault(); 
                      
                  }); 

        $(".entry a.remove")
            .live('click', function(e) {
                      dom_view_remove_click(this, server); 
                      e.preventDefault(); 
                      
                  }); 


        $(".entry a.hide")
            .live('click', function(e) {
                      dom_view_hide_click(this, server, docdb, true); 
                      e.preventDefault(); 
                      
                  }); 

        $(".entry a.unhide")
            .live('click', function(e) {
                      dom_view_hide_click(this, server, docdb, false); 
                      e.preventDefault(); 
                      
                  }); 

        
        $(".entry a.save")
            .live('click', function(e) {
                      var entrydiv = $(this).closest("entry"); 
                      
                      dom_edit_save_click(this, server, docdb); 
                      e.preventDefault(); 

                  }); 

        $(".entry a.cancel")
            .live('click', function(e) {
                      dom_edit_cancel_click(this, docdb); 
                      e.preventDefault(); 
                      
                  }); 
        
        $("#pagetitle")
            .hoverIntent(
                function() {
                    $("#page_title_edit_click").addClass("hovertargetvisible");
                },
                function() {
                    $("#page_title_edit_click").removeClass("hovertargetvisible");
                    
                });
        $(".pagetitle div.edit").hide(); 

        
        $(".pagetitle a.edit")
            .click(function(e) {
                       $(".pagetitle div.view").hide(); 
                       $(".pagetitle div.edit").show(); 
                       $("#page_title_edit").html(server.getPageState().rev.title).focus(); 
                       e.preventDefault(); 
                   }); 
        
        $("#page_title_cancel")
            .click(function(e) {
                       $(".pagetitle div.edit").hide(); 
                       $(".pagetitle div.view").show(); 
                       e.preventDefault(); 

                   }); 

        
        $("#page_title_save")
            .click(function() {
                       // fixme consolidate this
                       var MAXTRIES = 5; 
                       function save_title(cur_try) {
                           if(cur_try == 0) {
                               return; 
                           }

                           var curdocs = server.getPageState(); 
                           var title = $("#page_title_edit").html(); 
                           var newdoc = $.extend(true, {}, curdocs.rev); 
                           newdoc.title = title;              
                           newdoc.parent = newdoc._id; 

                           var res = server.pageUpdate(curdocs.entry._id, 
                                                       newdoc); 
                           res.done(function(doc) {
                                        
                                        $(".pagetitle div.edit").hide(); 
                                        $(".pagetitle div.view").show(); 
                                        
                                    }); 
                           res.fail(function(doc) {
                                        save_title(cur_try - 1); 
                                    }); 

                               
                           }
                           
                       save_title(MAXTRIES); 

                   }); 

        // fixme consolidate this
        function save_page_archive(cur_try, is_archived) {
            if(cur_try == 0) {
                return; 
            }
            
            var curdocs = server.getPageState(); 
            if(curdocs.rev.archived == is_archived) {
                return; 
            }

            var newdoc = $.extend(true, {}, curdocs.rev); 
            newdoc.archived = is_archived; 
            newdoc.parent = newdoc._id; 

            var res = server.pageUpdate(curdocs.entry._id, 
                                        newdoc); 
            res.fail(function(doc) {
                         save_page_archive(cur_try - 1, is_archived); 
                     }); 
            
            }                           

        
        $("#page_archive_click")
            .click(function(e) {
                       save_page_archive(5, true); 
                       e.preventDefault(); 

                   }); 
        
        $("#page_unarchive_click")
            .click(function(e) {
                       save_page_archive(5, false); 
                       e.preventDefault(); 

                   }); 
        
        $("#showhidden")
            .click(function(e) {

                       if(is_hidden_visible()) {
                           $(".entry[state='view'][page-hidden]").removeClass("hidden");                                    
                       } else {
                           $(".entry[state='view'][page-hidden]").addClass("hidden");                                    
                           
                       }

                       e.preventDefault(); 

        });

        $("#button_add_entry_text")
            .click(function(e) { 
                       var resp = dom_add_entry_click(
                           {
                               'class' : 'text', 
                               title : "dummy title", 
                               body: "Temp body"
                           }, server, docdb); 
                       // fixme : this is where we would wait for resp
                       // to finish and then set that entry editable or something
                      e.preventDefault(); 

                       }); 

        $("#button_add_entry_code")
            .click(function(e) { 
                       var resp = dom_add_entry_click(
                           {
                               'class' : 'code', 
                               title : "dummy title", 
                               code: "Temp body;", 
                               caption: "", 
                               language: "python", 
                               source: "woowoo"
                           }, server, docdb); 
                       // fixme : this is where we would wait for resp
                       // to finish and then set that entry editable or something
                      e.preventDefault(); 

                       }); 

        $("#button_add_entry_figure")
            .click(function(e) { 
                       var resp = dom_add_entry_click(
                           {
                               'class' : 'figure', 
                               title : "",
                               caption: "",
                               images : []
                           }, server, docdb); 
                       // fixme : this is where we would wait for resp
                       // to finish and then set that entry editable or something
                       e.preventDefault(); 
                       
                       }); 

        
        $(".entry[state='view']")
            .live("dblclick", function(e) {
                      dom_view_edit_click(this, docdb); 
                      e.preventDefault(); 

                  }); 
        
        $(".alert-message a.close")
            .live("click", function(e) {
                      $(this).closest(".alert-message").remove(); 
                      e.preventDefault(); 
                      
                  }); 

        $(".entry")
            .live('mouseover mouseout', function(event) {
                      if(event.type == "mouseover") {
                          $(".control", this).addClass("hovertargetvisible");
                      } else {
                          
                          $(".control", this).removeClass("hovertargetvisible");
                          
                      }}); 
        
        $(".entry[state='edit'][entry-class='figure'] li span.remove")
            .live("click", function(e) {
                      $(this).closest("li").remove(); 
                      e.preventDefault(); 
                      
                  }); 

        $(".entry[state='edit'][entry-class='figure'] .imagecontainer input[name='visible']")
            .live("click", function(e) {
                      if($(this).is(":checked")) {
                          $(this).closest("li").addClass("visible"); 
                      } else {

                          $(this).closest("li").removeClass("visible"); 
                          

                      }

                      
                  }); 
        
        setup_page_dnd($("#entries"), server); 
        
        setup_avatars(server, $("body")); 

        // file drag and drop for images
        function noopHandler(evt) {
            evt.stopPropagation();
            evt.preventDefault();
        }

        var insel = $("div.entry[state='edit'][entry-class='figure'] .control"); 
        insel.live('dragenter', function(evt) {

                       $(".hover", this).show(); 
                       evt.stopPropagation();
                       evt.preventDefault();
                       
                   }); 

        insel.live('dragover', noopHandler);
        $(".hover", insel).live('dragleave', function(evt) {

                       $(this).hide(); 
                       evt.stopPropagation();
                       evt.preventDefault();
                       
                   }); 

        insel.live('drop', function(evt) { 
                       $(".hover", this).hide(); 
                       
                       var files = evt.dataTransfer.files; 

                       var entrydiv = $(this).closest(".entry"); 
                       var uploader = $("input[name='files']", entrydiv).data("uploader"); 

                       uploader._onInputChange(evt.dataTransfer); 

                       evt.stopPropagation();
                       evt.preventDefault();
                       
                   }); 
        

        

        $(window).bind('hashchange', function(evt) {
                           
                           var eid =  parse_hash(window.location.hash.substring(1)); 
                           
                           goto_entry(eid.entry, $("#entries")); 
                           
                           return true; 

                       }); 

        if(parse_hash(window.location.hash.substring(1)))  {
            // This is a horrible hack! Because it takes a bit to load, have
            // mathjax render things, etc. we wait a second
            $.doTimeout(1000, function() {
                            
                            var eid =  parse_hash(window.location.hash.substring(1)); 
                            if(eid.entry) {
                                goto_entry(eid.entry, $("#entries")); 
                            }
                        }); 

        }

        CodeMirror.defaults.lineNumbers = true; 


    }); 

