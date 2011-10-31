$(document).ready(
    function () {
        console.log("This is a test"); 
        
        var a = [[1], [2], [3]]
        var b = [[1], [7], [3]]



        var sm = new difflib.SequenceMatcher(a, b); 

        console.log(sm.get_opcodes()); 
        console.log({b : 2} === {b: 2}); 
        console.log(_.union(a, b)); 
    });
    
