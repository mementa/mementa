function Server(associatedDOM, notebook) {
    /* 
     * For the server, almost all queries are async, returning promises
     * 
     * .entryNew(dclass, info)
     * .pageNew()
     * .entryUpdate()
     * .pageUpdate()
     * .getEntry(entryid)
     * .getRev(revid)
     * 
     * .getPageState : returns {entry: , rev: }
     * 
     * There are two events that this will trigger via the dom node: 
     * page-rev-update
     * entry-rev-update : with {entry :, rev:}
     * 
     */
    this.dom = associatedDOM; 
    this.notebook = notebook; 

    this.pageState = {entry: null, rev : null};
    this.setPageState = function(entry, rev)  {
        this.pageState = {
            entry: entry, 
            rev: rev
        };

        $(this.dom).trigger('page-rev-update', rev); 
        
    };
    
    this.entryNew = function(dclass, info)
    {
        var d = $.Deferred(); 

        var doc = $.extend(true, { 'class' : dclass}, info); 
        
        var resp = $.ajax({'type' : "POST", 
                           'url' : "/api/" + this.notebook + "/entry/new",
                           contentType:"application/json",
                           dataType : "json" , 
                           data : JSON.stringify(doc)}); 

        var dom = this.dom; 
        resp.done(function(arg) {
                      $(dom).trigger('entry-rev-update', 
                                     {entry: arg.entry, 
                                      rev: arg.revision}); 

                      d.resolve(arg); 
                  }); 
        resp.fail(function(arg) {
                      d.reject(arg); 
                  }); 
                  
        return d.promise(); 

    };

    
    this.pageNew = function(title, entries)
    {

        return this.entryNew('page', 
                             {
                               title : title, 
                               entries: entries
                             })
        
    };
    
    
    this.entryUpdate = function(entryid, doc)
    {
        /* 
         * successful : {entry : new_entry, rev: new_rev}
         * fail : {reason : 'conflict' or 'timeout' or 'other', 
         if conflict, we also have "docs" consisting of the above docs
         * 
         */
        var d = $.Deferred(); 
        
        
        var resp = $.ajax({'type' : "POST", 
                           'url' : "/api/" + this.notebook + "/entry/" + entryid,
                           contentType:"application/json",
                           dataType : "json" , 
                           data : JSON.stringify(doc)}); 
        var dom = this.dom; 
        resp.done(function(resp) {
                      var rev_doc = resp['latest_revision_doc']; 
                      var entry = resp['latest_entry_doc']; 

                      $(dom).trigger('entry-rev-update', 
                                          {entry: entry, 
                                           rev: rev_doc}); 
                      d.resolve({entry : entry, 
                                 rev: rev_doc}); 

                      }); 
        resp.fail(function(jqxhr, textStatus, errorThrown) {
                      console.log("server.entryUpdate fail", jqxhr, textStatus, errorThrown); 
                      // FIXME this should return the out-of-date versions
                      if(textStatus == 'timeout') {
                          d.reject({reason: 'timeout'});
                      } else if(textStatus == 'error') {
                          d.reject({reason: 'error'});                           
                      } else if (jqxhr.status == 409){
                          d.reject({reason: 'conflict',} )
                      } else {
                          d.reject({reason : "unknown"}); 
                      }
                  }); 

        return d.promise(); 

    };

    this.pageUpdate = function(entryid, doc)
    {
        /*
         * successful resolution: new page rev
         * 
         * failed resolution: latest page rev
         * 
         */
        var d = $.Deferred(); 
        
        var resp = $.ajax({'type' : "POST", 
                           'url' : "/api/" + this.notebook + "/entry/" + entryid,
                           contentType:"application/json",
                           dataType : "json" , 
                           data : JSON.stringify(doc)}); 
        var dom = this.dom; 
        var server = this; 
        resp.done(function(resp) {
                      var rev_doc = resp['latest_revision_doc']; 
                      var entry = resp['latest_entry_doc']; 

                      server.setPageState(entry, rev_doc); 

                      d.resolve(rev_doc); 

                      }); 

        resp.fail(function(jqxhr, textStatus, errorThrown) {

                      // FIXME this should return the out-of-date versions
                      if(textStatus == 'timeout') {
                          d.reject({reason: 'timeout'});                           
                      } else if (jqxhr.status == 409){
                          // conflict
                          var resp = $.parseJSON(jqxhr.responseText); 
                          d.reject({reason: 'conflict',} )
                          var rev_doc = resp['latest_revision_doc']; 
                          var entry = resp['latest_entry_doc']; 
                          
                          server.setPageState(entry, rev_doc); 

                      } else {
                          d.reject({reason : "unknown"}); 
                      }

                      
                  }); 
        return d.promise(); 

        
        
    }; 

    this.getPageState = function() 
    {

        return this.pageState; 
        
    };

    
    this.getEntry = function(entryid)
    {
        /* Return the requested entry: 
         *  deferred resolves to the entrydoc
         * 
         */   

        var d = $.Deferred(); 
        var ajaxresp = $.getJSON("/api/" + this.notebook + "/entry/" + entryid); 
        ajaxresp.done(function(data) { 
                      
                      $(this.dom).trigger('entry-rev-update', 
                                          {entry: data.entry, 
                                           rev: data.revision}); 
                      
                      d.resolve(data.entry); 
                  }); 
        ajaxresp.fail(function(reason) {
                          // FIXME need better semantics here? 
                          d.reject(reason); 
                      }); 
        return d.promise(); 
    }; 

    this.getRev = function(revid)
    {
        /*
         * returns the revdoc
         * 
         */
        
        var d = $.Deferred(); 
        var ajaxresp = $.getJSON("/api/" + this.notebook + "/rev/" + revid); 
        ajaxresp.done(function(data) { 
                          d.resolve(data); 
                      }); 
        ajaxresp.fail(function(reason) {
                            // FIXME need better semantics here? 
                            d.reject(reason); 
                        }); 
        return d.promise(); 

    }; 

    this.getUserInfo = function(userid) { 
        var d = $.Deferred(); 
        

        var ajaxresp = $.getJSON("/api/user/" + userid); 

        ajaxresp.done(function(data) { 
                          d.resolve(data); 
                      }); 
        ajaxresp.fail(function(reason) {
                            // FIXME need better semantics here? 
                            d.reject(reason); 
                        }); 
        return d.promise(); 
        
    }; 
    
    
}; 


