function Server(associatedDOM) {
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
        // var d = $.Deferred(); 
        
        // this.queue.push({op : 'entry_new', 
        //                  dclass: dclass, 
        //                  info: info, 
        //                  deferred : d}); 
        
        // return d; 

    };

    
    this.pageNew = function(title, entries)
    {
        // var d = $.Deferred(); 
        
        // this.queue.push({op: 'page_new', 
        //                  title : title, 
        //                  entries : entries, 
        //                  deferred : d}); 
        
        // return d; 
        
        
    };
    
    
    this.entryUpdate = function(entryid, doc)
    {
        /* 
         * successful : {entry : new_entry, rev: new_rev}
         * fail : same thing
         * 
         */
        var d = $.Deferred(); 
        
        
        var resp = $.ajax({'type' : "POST", 
                           'url' : "/api/entry/" + entryid,
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
        resp.fail(function(resp) {
                      // FIXME this should return the out-of-date versions
                      d.reject(); 
                      
                  }); 
        return d; 

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
        
        console.log("posting doc", doc); 
        var resp = $.ajax({'type' : "POST", 
                           'url' : "/api/entry/" + entryid,
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

        resp.fail(function(resp) {
                      // FIXME this should return the out-of-date versions
                      d.reject(); 
                      
                  }); 
        return d; 

        
        
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
        var ajaxresp = $.getJSON("/api/entry/" + entryid); 
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
        return d; 
    }; 

    this.getRev = function(revid)
    {
        /*
         * returns the revdoc
         * 
         */
        
        var d = $.Deferred(); 
        var ajaxresp = $.getJSON("/api/rev/" + revid); 
        ajaxresp.done(function(data) { 
                          d.resolve(data); 
                      }); 
        ajaxresp.fail(function(reason) {
                            // FIXME need better semantics here? 
                            d.reject(reason); 
                        }); 
        return d; 

    }; 
    
    
}; 


