

function compute_entry_diff(old_entries, new_entries)
{
    /* take in two lists of entries and return semantically-meaningful
     * deltas
     * 
     * This is all positional, and the list of deltas MUST BE APPLIED IN ORDER
     * for the position values to make sense
     * 
     * add: insert a new entry (possibly pinned, etc)
     * remove: remove an entry
     * hide: the hidden state on an entry has changed
     * pin: the pinned status on an entry has changed
     * 
     * deltas look like: 
     * ('verb', position, new_entry)
     * 
     * position means "make this happen at this position", so for example, 
     * ('add', 0, blahblah) means "make this the first entry,
     *  and shift all others down"
     */
    
    // do this because difflib doesn't handle object equality correctly
    var old_entries_array = _.map(old_entries, function(d) { return [d.entry, d.hidden, d.rev];}); 

    var new_entries_array = _.map(new_entries, function(d) { return [d.entry, d.hidden, d.rev];}); 

    var sm  = new difflib.SequenceMatcher(old_entries_array, 
                                          new_entries_array); 
    var opcodes = sm.get_opcodes(); 
    // console.log("Opcodes are:"); 
    // console.log(opcodes); 
    // console.log("Old entries:"); 
    // console.log(old_entries); 
    // console.log("new entries:"); 
    // console.log(new_entries); 
    var results = []; 
    var length = opcodes.length; 
    for(i = 0; i < length; i++) {
        var opcode = opcodes[i]; 
        var tag = opcode[0]; 
        var i1 = opcode[1]; 
        var i2 = opcode[2]; 
        var j1 = opcode[3]; 
        var j2 = opcode[4]; 
        switch(tag) {
        case 'replace': 
            // a[i1:i2] should be replaced by b[j1:j2].
            var a_pos = i1; 
            for(b_pos = j1; b_pos < j2; b_pos++) {
                // This might possibly be a hide delta or a pin delta
                if(old_entries[a_pos].entry == new_entries[b_pos].entry) { 
                    if(old_entries[a_pos].hidden != new_entries[b_pos].hidden) { 
                        results.push(['hide', a_pos, new_entries[b_pos]])
                    }

                    if(old_entries[a_pos].rev != new_entries[b_pos].rev) { 
                        results.push(['pin', a_pos, new_entries[b_pos]])
                    }

                } else {
                    results.push(['remove', a_pos, old_entries[a_pos]]); 
                    results.push(['add', a_pos, new_entries[b_pos]]); 
                    
                }
                a_pos++; 
            }
            break; 

        case 'delete': 
            // a[i1:i2] should be deleted. Note that j1 == j2 in this case.
            for(a_pos = i1; a_pos < i2; a_pos++) {
                results.push(['remove', i1, old_entries[a_pos]]); 
            }
            break; 

        case 'insert': 
            //b[j1:j2] should be inserted at a[i1:i1]. 
            var a_pos = i1; 
            for(b_pos = j1; b_pos < j2; b_pos++) {
                results.push(['add', a_pos, new_entries[b_pos]]); 
                a_pos++; 
            }
            break; 

        case 'equal' : // don't do anything
            break; 
            
        }
    }
    return results; 
    

}

function render_simple(old_entries, new_entries, targetdiv)
{
    /* Render the entries into the target div collection
     * 
     * We assume that this function has been called previously with old_entries,
     * that is, that the target div is consistent with old_entries. We mutate
     * targetdiv to be up-to-speed with new entries. 
     * 
     * note that requests to get docs (etc) are via ajax, and thus it's possible
     * they will not complete before the next invocation of render_simple. 
     * 
     * Render_simple should respect entries that are in the edit state, and
     * should also always give visual indication of the mutations that are 
     * taking place. 
     * 
     * entries is the standard list-of-entries collection
     */

    var entry_diff = compute_entry_diff(old_entries, new_entries); 

    
    
}
