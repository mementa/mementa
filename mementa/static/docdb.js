
function DocumentDB(server) {
    this.server = server; 
    this.cache = {}; 
    
    this.getEntry = function(entryid) {


        var cache = this.cache; 
        var result = $.Deferred();         
        if(this.cache[entryid]) {
            result.resolve(this.cache[entryid]); 
        } else {

            server.getEntry(entryid)
                .done(function(doc)  {
                          cache[entryid] = doc; 
                          result.resolve(doc); 
                      })
                .fail(function(doc) {
                          result.reject(); 
                      }); 
            
        }
        
        return result.promise(); 
        
        
    }; 
    

    this.getRev = function(revid) {

        var result = $.Deferred();         

        var cache = this.cache; 

        if(cache[revid]) {

            result.resolve(this.cache[revid]); 
            
        } else {
            
            server.getRev(revid)
                .done(function(doc)  {
                             cache[revid] = doc; 
                             result.resolve(doc); 
                         })
                .fail(function(doc) {
                          result.reject(); 
                      }); 
            
        }
        
        return result.promise(); 
        
        
    }; 

    this.update = function(doc) {
        this.cache[doc._id]  = doc; 
        
    }; 
    

}
