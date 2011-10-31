

function create_entry_div(entryid, revid, hidden)
{
    /*
     Create detached entry div, sets state to NONE
     
     */
    
}


function state_none_to_view(entrydiv, docdb, entrydoc_id, revdoc_id)
{
   /* transition: NONE->VIEW
    * 
    * Currently just blows away the contained div and does all the updates by
    * denovo creation. In the future, we may be smarter. 
    * 
    */
    

}

function state_view_to_pagepending(entrydiv, op)
{
    /* transition: VIEW->PAGEPENDING
     * 
     */

}

function state_pagepending_to_view(entrydiv, is_success, error_messages)
{
    


}
