
function generate_fake_entries(len) {

    return _.map(_.range(len), function(val) {
                  return {'entry' : "entryid" + val, 
                          'hidden' : false};
                 });
}
                 
                


$(document)
    .ready(
        function () {


            test("a basic test example", function() {
                     ok( true, "this test is fine" );
                     var value = "hello";
                     equal( value, "hello", "We expect value to be hello" );
                 });
            
            module("Render Tests");
            test("compute entry diff test ", function() {
                     var entries = generate_fake_entries(10); 

                     var delta = compute_entry_diff(entries, entries); 
                     
                     same(delta, [], "Empty diff"); 


                     var entries2 = $.extend(true, [], entries); 
                     entries2[4].hidden = true; 

                     delta = compute_entry_diff(entries, entries2); 
                     same(delta, [['hide', 4, {'entry' : "entryid4", 
                                                'hidden' : true}]]); 


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
                     console.log(entries); 
                     console.log(entries2); 

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
                     console.log(entries); 
                     console.log(entries2); 

                     delta = compute_entry_diff(entries, entries2); 
                     same(delta, 
                          [
                              ['add', 4, {'entry' : "entryid10",
                                          'hidden' : false }], 
                              
                          ], 
                         'insert in middle of array'); 

                 }); 

        }
    ); 
