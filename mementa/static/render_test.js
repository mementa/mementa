
function render_tests () {

    function generate_fake_entries(len) {
        
        return _.map(_.range(len), function(val) {
                         return {'entry' : "entryid" + val, 
                                 'hidden' : false};
                     });
    }
    
    function generate_fake_entries_char(s) {
        
        return _.map(s.split(""), function(val) {
                         return {'entry' : "entryid" + val, 
                                 'hidden' : false};
                 });
    }
    
    
    
    test("a basic test example", function() {
             ok( true, "this test is fine" );
             var value = "hello";
             equal( value, "hello", "We expect value to be hello" );
         });
    
    module("Render entry diff tests");
    test("compute entry diff test ", function() {
             var entries = generate_fake_entries(10); 
             
             var delta = compute_entry_diff(entries, entries); 
             
             same(delta, [], "Empty diff"); 
             
             var entries2 = generate_fake_entries(4); 
             
             var delta = compute_entry_diff([], entries2); 
             
             same(delta, [['add', 0, {entry: "entryid0", 
                                      hidden: false}], 
                          ['add', 1, {entry: "entryid1", 
                                      hidden: false}], 
                          ['add', 2, {entry: "entryid2", 
                                      hidden: false}], 
                          ['add', 3, {entry: "entryid3", 
                                      hidden: false}], 
                         ]); 
             
             

             
             var entries2 = $.extend(true, [], entries); 
             entries2[4].hidden = true; 
             
             delta = compute_entry_diff(entries, entries2); 
             same(delta, [['hide', 4, {'entry' : "entryid4", 
                                       'hidden' : true}]], 
                         'hidden change'); 
             
             
             var entries2 = $.extend(true, [], entries); 
             entries2[2].rev = "AABBCC";
             
             delta = compute_entry_diff(entries, entries2); 
             same(delta, [['pin', 2, {'entry' : "entryid2",
                                      'hidden' : false, 
                                      'rev' : "AABBCC"}]], 
                         'pin delta check'); 
             
             
             var entries2 = $.extend(true, [], entries); 
             entries2.push({'entry' : 'entryid10', 
                            'hidden' : false}); 
             
             delta = compute_entry_diff(entries, entries2); 
             same(delta, [['add', 10, {'entry' : "entryid10",
                                       'hidden' : false }]], 
                  'append entry to end test'); 
             

             var entries2 = $.extend(true, [], entries); 
             entries2.splice(4, 1, {'entry' : 'entryid10', 
                                    'hidden' : false}); 
             
             delta = compute_entry_diff(entries, entries2); 
             same(delta, 
                  [
                      ['remove', 4, {'entry' : "entryid4",
                                     'hidden' : false }], 
                      ['add', 4, {'entry' : "entryid10",
                                  'hidden' : false }], 
                      
                  ], 
                  'replace in middle of array'); 

             var entries2 = $.extend(true, [], entries); 
             entries2.splice(4, 0, {'entry' : 'entryid10', 
                                    'hidden' : false}); 
             delta = compute_entry_diff(entries, entries2); 
             same(delta, 
                  [
                      ['add', 4, {'entry' : "entryid10",
                                  'hidden' : false }], 
                      
                  ], 
                  'insert in middle of array'); 
             
         }); 
    
    test("compute entry diff test with pos1", function() {
             var entries = 
                 generate_fake_entries_char("ABCDEFGHIJK"); 
             
             
             var entries2 = 
                 generate_fake_entries_char("0A1BCDE2FG3H45IJK67"); 
             
             
             var delta = compute_entry_diff(entries, entries2); 
             
             same(delta, [
                      ['add', 0, {entry: "entryid0", 
                                  hidden: false}], 
                      ['add', 2, {entry: "entryid1", 
                                  hidden: false}], 
                      ['add', 7, {entry: "entryid2", 
                                  hidden: false}], 
                      ['add', 10, {entry: "entryid3", 
                                   hidden: false}], 
                      ['add', 12, {entry: "entryid4", 
                                          hidden: false}], 
                      ['add', 13, {entry: "entryid5", 
                                   hidden: false}], 
                      ['add', 17, {entry: "entryid6", 
                                   hidden: false}], 
                      ['add', 18, {entry: "entryid7", 
                                   hidden: false}], 
                      
                  ]); 
             
         }); 
    
    test("compute entry diff test with pos 2", function() {
             
             var entries = generate_fake_entries(5); 
             var entries2 = $.extend(true, [], entries); 
             entries2.push({'entry' : 'entryidTAIL', 
                            'hidden' : false}); 
             entries2.push({'entry' : 'entryidTAIL2', 
                            'hidden' : false}); 
             
             entries2.splice(0, 0, {'entry' : 'entryidHEAD', 
                                    'hidden' : false}); 
             
             entries2.splice(2, 0, {'entry' : 'entryidWUT', 
                                    'hidden' : false}); 

             var delta = compute_entry_diff(entries, entries2); 
             
             same(delta, [
                      ['add', 0, {entry: "entryidHEAD", 
                                          hidden: false}], 
                      ['add', 2, {entry: "entryidWUT", 
                                  hidden: false}], 
                      ['add', 7, {entry: "entryidTAIL", 
                                  hidden: false}], 
                      ['add', 8, {entry: "entryidTAIL2", 
                                  hidden: false}], 
                  ]); 
             
         }); 
    
    test("compute entry diff test with pos 3", function() {
             
             var entries = generate_fake_entries_char("ABCDE"); 
                     
             var entries2 = generate_fake_entries_char("XAYBCDEFG"); 
             
             
             var delta = compute_entry_diff(entries, entries2); 
             same(delta, [
                      ['add', 0, {entry: "entryidX", 
                                  hidden: false}], 
                      ['add', 2, {entry: "entryidY", 
                                          hidden: false}], 
                      ['add', 7, {entry: "entryidF", 
                                  hidden: false}], 
                      ['add', 8, {entry: "entryidG",
                                          hidden: false}], 
                  ]); 
             
         }); 
    

    test("compute entry diff test removes", function() {
             
             var entries = generate_fake_entries_char("A0B12CD3E4FG56"); 
             
             var entries2 = generate_fake_entries_char("ABCDEFG"); 
             var delta = compute_entry_diff(entries, entries2); 
             
             same(delta, [
                      ['remove', 1, {entry: "entryid0", 
                                     hidden: false}], 
                      ['remove', 2, {entry: "entryid1", 
                                     hidden: false}], 
                      ['remove', 2, {entry: "entryid2", 
                                     hidden: false}], 
                      ['remove', 4, {entry: "entryid3", 
                                     hidden: false}], 
                      ['remove', 5, {entry: "entryid4", 
                                     hidden: false}], 
                      ['remove', 7, {entry: "entryid5", 
                                     hidden: false}], 
                      ['remove', 7, {entry: "entryid6", 
                                     hidden: false}], 
                      
                  ]); 
             
         }); 
    
    module("Render entry diff tests");
    

    function create_entry_view_div_debug(entptr)
    {
        /* debug function to create the div */ 
        var newelt = $("<div/>"); 
        $(newelt).attr("entryid", entptr.entry)
        
        if (entptr.hidden) {
            $(newelt).addClass("hidden"); 
        }
        
        if (entptr.rev) {
            $(newelt).attr("rev", entptr.rev); 
        }
        
        return newelt; 
    }

    var opfuncs = {
        add: create_entry_view_div_debug, 
        remove: function(elt, entry) {}, 
        hide : function(elt, entry) {}, 
        pin : function(elt, entry) {}
    }; 
    
    test("add a few entries", function() {
             var entries = generate_fake_entries(5); 
             var entrydiv = $("<div/>"); 
             render_simple([], entries, entrydiv, 
                           opfuncs); 
             
             same($(entrydiv).children().length, 5); 
             $("div.active", entrydiv)
                 .each(function(index, elt) {
                           same($(elt).attr('entryid'), 
                                entries[index].entry); 
                       }); 
         }); 
    
    test("add a few entries, and then add a few inbetween", 
         function() { 
             var entries = generate_fake_entries(5); 
             var entrydiv = $("<div/>"); 
             render_simple([], entries, entrydiv, 
                           opfuncs); 
             
             same($(entrydiv).children().length, 5); 
             
             var entries2 = $.extend(true, [], entries); 
             entries2.push({'entry' : 'entryidTAIL', 
                            'hidden' : false}); 
             entries2.push({'entry' : 'entryidTAIL2', 
                            'hidden' : false}); 
             
             entries2.splice(0, 0, {'entry' : 'entryidHEAD', 
                                    'hidden' : false}); 
             
             entries2.splice(2, 0, {'entry' : 'entryidWUT', 
                                    'hidden' : false}); 
             
             render_simple(entries, entries2,  entrydiv, 
                           opfuncs); 
             
             $("div.active", entrydiv)
                 .each(function(index, elt) {
                           same($(elt).attr('entryid'), 
                                entries2[index].entry); 
                       }); 
             
         }); 
    
    function char_delta_test(start, end) {
        /*  starting with the entry string, see if we 
         * arrive at the correct endpoint
         */
        
        var entries = generate_fake_entries_char(start); 
        var entrydiv = $("<div/>"); 
        render_simple([], entries, entrydiv, 
                      opfuncs); 
        
        same($(entrydiv).children().length, entries.length); 
        
        var entries2 = generate_fake_entries_char(end)
        
        render_simple(entries, entries2,  entrydiv, 
                      opfuncs); 

        
        $("div.active", entrydiv)
            .each(function(index, elt) {
                      same($(elt).attr('entryid'), 
                           entries2[index].entry); 
                  }); 
    }
    test("simple_char_delta_test", 
         function() { 
             char_delta_test("ABCDE", "A1B2C3D4E5"); 
             char_delta_test("0A1B2C3D4E5", "ABCDE");                      
         }); 
    
    test("char_delta_test", 
                 function() { 
                     // now combined add and remove
                     char_delta_test("0A1B2C", "AXYBC"); 
                     
                     char_delta_test("0A1B2C3D4E5", "AXYBCDPQER"); 
                     
                     char_delta_test("012345", "ABCDEF"); 
                     char_delta_test("ABCDEF", "ABCDEF"); 
                     char_delta_test("ABC", "ABCABCABC"); 
                     
                 }); 
    
    test("do not remove nodes with state = edit", function()
         {
             var entries = generate_fake_entries_char("ABCDEF"); 
             var entrydiv = $("<div/>"); 
             render_simple([], entries, entrydiv, 
                           opfuncs); 
             
             same($(entrydiv).children().length, entries.length); 
             
             var entries2 = generate_fake_entries_char("ABDEF"); 
             
             
             $("div[entryid='entryidC']", entrydiv).attr("state", "edit");
             
             render_simple(entries, entries2,  entrydiv, 
                           opfuncs); 

             $("div.active", entrydiv)
                 .each(function(index, elt) {
                           same($(elt).attr('entryid'), 
                                      entries2[index].entry); 
                       }); 
             
             same(6, $("div", entrydiv).length); 
             
                   
             
         }); 
    
}
