
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
            entries : entries
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

    this.entryNew = function(dclass, info)
    {
        var d = $.Deferred(); 
        
        this.queue.push({op : 'entry_new', 
                         dclass: dclass, 
                         info: info, 
                         deferred : d}); 
        
        return d; 

    };

    
    this.pageNew = function(title, entries)
    {
        var d = $.Deferred(); 
        
        this.queue.push({op: 'page_new', 
                         title : title, 
                         entries : entries, 
                         deferred : d}); 
        
        return d; 
        
        
    };
    
    
    this.entryUpdate = function(entryid, doc)
    {
        var d = $.Deferred(); 
        
        this.queue.push({op: 'entry_update', 
                         entryid : entryid, 
                         doc : doc, 
                         deferred : d}); 
        
        return d; 
        
        
    };

    this.pageUpdate = function(pageid, doc)
    {
        
        var d = $.Deferred(); 
        
        this.queue.push({op: 'page_update', 
                         pageid : pageid,
                         doc : doc, 
                         deferred : d}); 
        
        return d; 
        
        
    }; 

    this.getEntry = function(entryid)
    {
        
        var d = $.Deferred(); 
        
        this.queue.push({op: 'getEntry', 
                         entryid : entryid, 
                         deferred : d}); 
        
        return d; 

    }; 

    this.getRev = function(revid)
    {
        var d = $.Deferred(); 
        
        this.queue.push({op: 'getRev', 
                         revid : revid, 
                         deferred : d}); 
        
        return d; 

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
    
}; 


