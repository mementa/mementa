
function create_user_html(u)
{
    
    //return $.mustache("<li> <img src='/api/user/{{{_id}}}/avatar/32'></img> {{name}} ({{username}}) <a href='#' class='btn small' >add </a> </li>", u) 
    return $.mustache("<li user_id='{{{_id}}}' class='user'> <img src='/api/user/{{{_id}}}/avatar/32'></img> {{name}} ({{username}}) </li>", u) 
    
}

function render_user_list(ul, al)
{
    
    var dom = $("<ul></ul>"); 
    
    _.map(ul, function(u) {
              var h = $(create_user_html(u)); 
              $(h).append("<a href='#' class='close'>&times;</a>"); 
              $(dom).append(h); 

          }); 

    _.map(al, function(a) {
              $("li[user_id='" + a + "']", dom).attr("admin", true); 
          }); 

    return dom; 

}

function render_suggested_user_list(ul)
{
    
    var dom = $("<ul></ul>"); 
    
    _.map(ul, function(u) {
              var h = $(create_user_html(u)); 
              $(h).append("<a href='#' class='btn small useradd'>add</a>"); 
              $(dom).append(h); 
          }); 

    return dom; 

}


function refresh_user_suggestions(elt, searchstr)
{
    // fixme add in abort language
    if($(elt).data("pending_user_refresh")) {
        var prom = $(elt).data("pending_user_refresh"); 
        prom.abort(); 
    }
    
    var resp = $.get("/api/users/search/" + searchstr); 
    console.log("elt=", elt); 
    resp.done(function(res) { 
                  $("#suggested_users").html(render_suggested_user_list(res.usersuggestions)); 

              }); 
}

function get_user_config(userlist_ul) {
    var userlist = [];
    var adminlist = [];
    $("li", userlist_ul).each(function(index, elt) { 
                         var userid = $(elt).attr("user_id"); 
                         console.log("found userid"); 
                         userlist.push(userid); 
                         if($(elt).attr("admin")) {
                             adminlist.push(userid); 
                         }
                         
                     }); 
    return {users : userlist, 
            admins : adminlist}; 
        

}


$(document).ready(
    function () {
        
        var configurl = "/api/" + CURRENT_NOTEBOOK + "/config"; 
        var obj = $("input[name='usersearch']"); 
        $(obj)
            .typeWatch({callback: function(event) {
                            refresh_user_suggestions(obj, event); 
                        }, 
                        wait: 400, 
                        captureLength: 1}); 
        

        $("#suggested_users a.useradd")
            .live('click', function(elt) { 
                      var id = $(this).closest("li.user").attr("user_id"); 

                      var current_users = get_user_config("#userlist"); 
                      if (id in current_users.users) {
                          console.log("Can't add an existing user! FIXME make user visible"); 
                          
                      } else { 
                          var new_users = current_users.users; 
                          new_users.push(id); 
                          var resp = $.ajax({url : configurl, 
                                         type : "POST", 
                                             contentType : "application/json", 
                                             dataType: "json", 
                                             data: JSON.stringify({'users' : new_users})}); 
                          resp.done(function(data) {

                                        render_page(data.notebook, data.users); 
                                    }); 
                      }
                   }); 

        $("#userlist a.close")
            .live("click", function(elt) {
                      var id = $(this).closest("li.user").attr("user_id"); 
                      var current_users = get_user_config("#userlist"); 

                      var new_users = _.without(current_users.users, id); 
                      var new_admins = _.without(current_users.admins, id); 


                      
                      var resp = $.ajax({url : configurl, 
                                         type : "POST", 
                                         contentType : "application/json", 
                                         dataType: "json", 
                                         data: JSON.stringify({'users' : new_users, 
                                                              'admins' : new_admins})}); 
                      
                      resp.done(function(data) {
                                    render_page(data.notebook, data.users); 
                                }); 
                      
                      
                  }); 
        
        console.log("Config url = ", configurl); 

        function render_page(notebook, users) {
            var ul = _.map(notebook.users, 
                           function(uid) {return users[uid];}); 
            
            var ul_rendered = render_user_list(ul, notebook.admins); 
            $("#userlist").html(ul_rendered); 
            $("#title").val(notebook.title); 
            

        }
        var resp = $.ajax({url : configurl, 
                           contentType:"application/json", 
                           dataType : "json"}); 
        resp.done(function(data)  {
                      render_page(data.notebook, data.users); 
                      
                  }); 

        $("#save_changes")
            .click(function(elt) {
                       var form = $(this).closest("form"); 
                       var title = $("input[name='title']", form).val(); 
                       var archived = false;
                       console.log($("input[name='optionsArchived']:checked").val()); 
                       if($("input[name='optionsArchived']:checked").val() == 'true') {
                           console.log("setting archived to true"); 
                           archived = true; 

                       }
                       var resp = $.ajax({url : configurl, 
                                          type : "POST", 
                                          contentType : "application/json", 
                                          dataType: "json", 
                                          data: JSON.stringify({'title' : title, 
                                                                'archived' : archived})}); 
                       
                      
                      resp.done(function(data) {
                                    render_page(data.notebook, data.users); 
                                }); 
                       return false; 
                       
                   }); 
        
        
    }); 
