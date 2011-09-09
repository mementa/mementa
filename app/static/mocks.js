function ISODateString(d){
    function pad(n){return n<10 ? '0'+n : n}
    return d.getUTCFullYear()+'-'
        + pad(d.getUTCMonth()+1)+'-'
        + pad(d.getUTCDate())+'T'
        + pad(d.getUTCHours())+':'
        + pad(d.getUTCMinutes())+':'
        + pad(d.getUTCSeconds())+'Z'}

var uuid_seq_pos = 0; 
function generate_seq_uuid()
{
    var x = uuid_seq_pos; 
    uuid_seq_pos ++; 
    return x.toString(); 
}


var datagen = {
   
    text_entry_revision_create:  function (title, body)
    {
        return {title : title, 
                boyd : body, 
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

        retdoc._id = "rev" + uuid_seq_pos(); 

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
            _id : "entry" + uuid_seq_pos(), 
            'head' : revdoc._id, 
            'class' : revdoc_['class'], 
            'revdoc' : $.extend({}, revdoc)
            
        }; 
    },
    
    // take an array of entries and create a page 'entries' field
    to_page_entries : function(ents) {
        return $_.map(ents, function(e) { 
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
                                       text_entry_revision_create("title" + id, 
                                                                  "This is the body for " + id); 
                                   var rtr = $.extends(tr, 
                                                       revision_create("eric")); 
                                   var e = entry_create(rtr); 
                                   docs[rtr._id] = rtr; 
                                   docs[e._id] = e; 
                                   return e; 
                                   }); 

        var etptrs = to_page_entries(entry_revs); 

        var pe  = page_entry_revision_create("test page", etptrs); 
        var rpe = $.extends(pe, revision_create("eric")); 
        docs[rpe._id] = rpe; 
        var page_entry = entry_create(rpe); 
        docs[page_entry._id] = page_entry; 
        return { page_entry : page_entry, 
                 docs : docs}; 


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
        
        console.log("entryid"); 
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
        console.log("HERE"); 
        if(success) { 
            console.log("resolving"); 
            d.resolve(doc); 
        } else {
            d.reject(); 
        }
        
    }; 
    
}; 


