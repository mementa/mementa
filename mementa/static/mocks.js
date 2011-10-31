
var datagen = {
   
    text_entry_revision_create:  function (title, body)
    {
        return {title : title, 
                body : body, 
                'class' : 'text'};
    }, 
    
    revision_create : function(author, opt)
    {
        var retdoc = {author : author}; 
        if('date' in opt) {
            retdoc.date = opt.date;    
        } else { 
            retdoc.date = ISODateString(new Date()); 
        }

        if('archived' in opt) {
            retdoc.archived = opt.archived; 
        } else { 
            retdoc.archived = false; 
        }
        
        if('parent' in opt) {
            retdoc.parent = opt.parent; 
        } else {
            retdoc.parent = null; 
        }

        retdoc._id = "rev" + generate_seq_uuid(); 

        return retdoc; 
    },

    page_entry_revision_create : function(title, entries)
    {
        return {
            title: title, 
            entries : entries,
            'class' : 'page'
        }; 

    }, 
    
    
    entry_create: function(revdoc) 
    {
        return {
            _id : "entry" + generate_seq_uuid(), 
            'head' : revdoc._id, 
            'class' : revdoc['class'], 
            'revdoc' : $.extend(true, {}, revdoc)
            
        }; 
    },
    
    // take an array of entries and create a page 'entries' field
    to_page_entries : function(ents) {
        return _.map(ents, function(e) { 
                          return {'entry' : e._id, 
                                  'hidden' : false};}); 
        
    },
    
    create_fake_page : function(entrycount) {
        /* 
         * Return a dB of revisions, entries, and the like, 
         * 
         */
        var docs = {}; 

        var entry_revs = _.map(_.range(entrycount), 
                               function(id) { 
                                   var tr = 
                                       datagen.text_entry_revision_create("title" + id, 
                                                                  "This is the body for " + id); 
                                   var rtr = $.extend(true, tr, 
                                                       datagen.revision_create("eric", {})); 
                                   var e = datagen.entry_create(rtr); 
                                   docs[rtr._id] = rtr; 
                                   docs[e._id] = e; 
                                   return e; 
                                   }); 

        var etptrs = datagen.to_page_entries(entry_revs); 

        var pe  = datagen.page_entry_revision_create("test page", etptrs); 
        var rpe = $.extend(true, pe, datagen.revision_create("eric", {})); 
        docs[rpe._id] = rpe; 
        var page_entry = datagen.entry_create(rpe); 
        docs[page_entry._id] = page_entry; 
        return { page_entry : page_entry, 
                 docs : docs}; 


    }, 

    refresh_rev : function(orig) {
        var newrev = $.extend(true, {}, orig); 
        newrev._id = generate_seq_uuid(); 
        newrev.date = ISODateString(new Date()); 
        newrev.parent = orig._id; 
        return newrev; 
    }
    
    
}; 

function ServerMock(associatedDOM) {
    this.dom = associatedDOM; 
    this.queue = []; 
    this.pageState = {entry: null, rev : null};
    

    this.entryNew = function(dclass, info)
    {
        /* 
         * returns {entry, revision}
         * 
         */
        var d = $.Deferred(); 
        
        this.queue.push({op : 'entry_new', 
                         dclass: dclass, 
                         info: info, 
                         deferred : d}); 
        
        return d.promise(); 

    };

    
    this.pageNew = function(title, entries)
    {
        /*
         * returns {entry:, revision:}
         * 
         */
        var d = $.Deferred(); 
        
        this.queue.push({op: 'page_new', 
                         title : title, 
                         entries : entries, 
                         deferred : d}); 
        
        return d.promise(); 
        
        
    };
    
    
    this.entryUpdate = function(entryid, doc)
    {
        /* 
         * successful : {entry : new_entry, rev: new_rev}
         * fail : type, optional docs
         * 
         */
        var d = $.Deferred(); 
        
        this.queue.push({op: 'entry_update', 
                         entryid : entryid, 
                         doc : doc, 
                         deferred : d}); 
        
        var dom = this.dom; 

        d.done(function(nd) {
                   $(dom).trigger('entry-rev-update', nd); 
                   
               }); 
        
        d.fail(function(nd) {
                   if(nd.reason == 'conflict') {
                       $(dom).trigger('entry-rev-update', nd.docs);                         
                   }
                   
                   
               }); 
        
        return d.promise(); 
                   
        
    };

    this.pageUpdate = function(page_entryid, new_revdoc)
    {
        /*
         * successful resolution: new page rev
         * 
         * failed resolution: latest page rev
         * 
         */
        var d = $.Deferred(); 
        
        this.queue.push({op: 'page_update', 
                         pageid : page_entryid,
                         doc : new_revdoc, 
                         deferred : d}); 
        
        // fixme when this is a success, it should trigger a page update
        // when it is a failure, it should trigger a page update
        // basiclaly it should always trigger a page update
        var ps = this.pageState; 
        var dom = this.dom; 
        d.done(function(newrev) {
                   ps.entry.head = newrev._id; 
                   ps.revdoc = newrev; 
                   $(dom).trigger('page-rev-update', newrev); 
                   
               }); 
        
        d.fail(function(resp) {
                   if(resp.reason == 'conflict') {
                       ps.entry.head = resp.docs._id; 
                       ps.revdoc = resp.docs; 
                       
                       $(dom).trigger('page-rev-update', resp.docs); 
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
        
        var d = $.Deferred(); 
        
        this.queue.push({op: 'getEntry', 
                         entryid : entryid, 
                         deferred : d}); 
        
        return d.promise(); 

    }; 

    this.getRev = function(revid)
    {
        var d = $.Deferred(); 
        
        this.queue.push({op: 'getRev', 
                         revid : revid, 
                         deferred : d}); 
        
        return d.promise(); 

    }; 
    
    this.getEntryRespond = function(doc, success) {
        // call when  the head of the queue is an entry
        var cmd = this.queue.shift(); 
        var id = cmd['entryid']; 
        var d= cmd['deferred']; 

        if(success) { 
            d.resolve(doc); 
        } else {
            d.reject(); 
        }
        
    }; 

    this.processAll  = function(db) { 
        // just successfully return all, straight from the dict 'db'

        while(this.queue.length > 0) {
            var cmd = this.queue.shift(); 
            var op = cmd.op; 
            switch(op) {
            case 'getRev':
                var id = cmd.revid; 
                cmd.deferred.resolve(db[id]); 
                break; 

            case 'getEntry':
                var id = cmd.entryid; 
                cmd.deferred.resolve(db[id]); 
                break; 
                
            default: 
                console.log("WHAT THE HELL ARE WE DOING HERE"); 
                
            }
        }
    }; 

    this.outOfBandPageUpdate  = function(newrev) { 
        $(this.dom).trigger('page-rev-update', newrev); 
        
    }; 

    this.outOfBandEntryUpdate  = function(entry, newrev) { 

        $(this.dom).trigger('entry-rev-update', {'entry' : entry, 
                                                 'rev' : newrev}); 
        
    }; 
   
    this.queueOp = function(div) {
        this.queuedOps.push(div); 
        
    };
    
    this.processQueue = function() { 
        // 


    };
    
}; 


