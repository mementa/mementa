This is our new attempt to substantially clean up the entry interface
and simultaneous-update code. it's become clear that we can no longer hide
our heads in the sand with respect to asynchronous updates. 

We also need to have significantly more complicated user-pending logic to
deal with laggy connections. 


Each page consists of zero or more entries. A page is a canonical
list of pointers to entries as follows:

entry { 
     head : [link to entry]
     hidden : [is this entry by default displayed on the page]
     rev: [link to specific rev, if this entry is pinned]
}

Note that whether or not an entry is hidden or is pinned is a property
of the page.

Each entry then has the following properties:
  archived: whether it shows up in a search
    
Multi-edit concerns: 
---------------------

The challenge here comes from the fact that other people can
simultaneously edit both the page and the individual entries within a
page. This leads to many possible edit conflicts, including:

1. two people are editing an entry within a page, and click
save. Which one wins?

2. You remove an entry from the page that I am currently editing

3. You hide an entry that I am attempting to unhide at the same time

4. You pin an entry I am currently editing. 

5. I save a change to an entry that occurs multiple times in a page,
and want the others to be updated.


Generic design
==========================

There is a div of class "entry" for each entry in the page. Note that
the Id of this entry cannot simply be the entrydoc's ID, as a
particular entry can exist multiple times in a page. 

Each of these divs has the following attributes, which we'll call the
"entry configuration"


entryid : the id of the entry in this div
entryclass : the class of the entry in this div
latestrevid: the revision of the current entry
archived: is the entry archived
state: the state the entry div is currently in 
pinned : is it pinned or not, and if so this equals the pinned id
removed : has it been removed from the page

Async updates:
All communication with the outside world will, in general, consist of telling
the server of a state change, setting the entry's state to some sort of pending, 
and then listening for the response. 

There are two possiblee sources of updates:
page-doc-update
entry-update

States
------

By far, the cleanest solution I've been able to come up with is a
state machine. Each entry is a state machine with the following
mutually exclusive states: 

NONE
VIEW
PAGEPENDING
ENTRYPENDING
EDIT
SAVEPENDING

There exist a canonical list of functions to transition these entries
from one state to another. If a function does not exist, than 
that state is not a valid transition. Some of these functions
have arguments. 

* NONE 
  
  The none state is the naked state that all entries are initialized
  to upon birth. There is no content in them at all, and only the
  entryid is set.

* VIEW

  This is the default entry state, where a user can view the
  entry. The content for the revision is rendered internally.


* PAGEPENDING
  
  This is the pending state for all manipulations at the page-level,
  such as removing the entry, hiding the entry, and pinning the entry

* ENTRYPENDING
  
  This is the pending state for all manipulations at the entry-level, 
  in particular "archive" 

* EDIT 

  This is the edit state, where a user edits the content of an entry. 

* SAVEPENDING

  This is the result of saving the entry, which is entered into nominally       
  from the EDIT state. 

Transitions:

none_to_view(entdoc, revdoc): populate an initially naked entry with
the viewable contents.

none_to_edit(entdoc, revdoc) : populate an initially naked entry
with the editable contents

view_to_view(entdoc, revdoc) : redraw view, generally triggered by an
out-of-band edit update

view_to_pagepending(op): generally block out the UI for the entry, and then
op is what the requested op is

pagepending_to_view(success_or_fail, reasons): back to the view from
the page pending, generally called once the requested operation has
either completed or failed
    

view_to_entrypending() : currently just "archive"

entrypending_to_view() : success or failure

view_to_edit() : click on edit

edit_to_view() : cancel operation

edit_to_savepending() : attempt to save 

savepending_to_edit() : save failed

savepending_to_view() : save succeeded

Saving things to the server
----------------------------

To enable retry-like logic, and handle out-of-band updates, all of the
*pending operations set data attributes for the div that contain the 
data necessary to retry the query. 

An example here is instructive. In the normal flow of operations,
clicking "hide" for an entry triggers the following operations:

Set's the state for that div to PAGE_PENDING
adds .data('op', {command : 'hide'}) to the div
says server.page_op_request()

server.page_op_request():

for each e in div.entry[state=pending]:
    construct updated doc
    ajax-push to server
    if not response:
        pagepending_to_view(fail, reasons)
    if response:
        add page doc to page dispatch for the relevant deltas


deltas that can be then broadcast:
for entry x:
    if state = view, simply update (view_to_view())
       
    if edit, and ok, notify
    if edit and not ok, fail

    if it's the requested page op (say, "hide-delta"), then 
       pagepending_to_view() -- thus the success
    

Similarly, for an entry modification, we have
server.entry_op_request()

and 
server.save_op_request()

basically we tell the server: hey, go to the list of entries, find one
that's currently waiting to be done, and try and do it!

Then all the updates are asynchronous, and trigger state transitions

and if the requested op did not then successfully modify the state, we
try again

Example problems and their codepath solutions
==============================================

Hide op: set entry state to pending, have next op be hide. Then server
uses that to construct an updated entry doc, attempts to save. It
succeeds, the updates mutate the entry to show it is now hidden, and we
are done. 

Remove op: set entry state to pending, ahve next op be remove. THen
server uses that to construct an updated entry doc, attempts to save. If
it succeeds, then the Renderer removes the entry and updates all
the divs, and we call it good

Add a doc: Create a doc of the right type, push it to the server, then
insert it into the div, and [FIXME WHAT?]

While hide-pending, the entry's rev updates: the update says "hey,
it's pending, i'm going to set "stale-entry" 

While editing, any of the following happen:

   Someone hides the entry : we want to say "hey, someone has hidden
   this entry! You can still edit it, but when you save it it will
   then be hidden."

   Someone pins the entry: "Hey, someone has pinned this entry. When
   you save it, your changes will be maintained, but if you want to
   see them you will have to unpin the entry."

   Someone removes the entry: "Hey, FOO has removed this entry from
   the page. When you save it, you will be given the opportunity to
   reinsert it into the page." 

   Someone edits the entry: "Hey, Foo has also edited this entry. You
   are saving over their changes -- you might want to talk to them."

Of course, any combination of all of these can happen while you're
editing -- the important part is YOUR CHANGES ARE NEVER LOST.


--------------------------------------------------------------

function create_entry_div()
{
  
}

If other changes happen during pending state, I'd love for there to be
messages that pop up.


State updates:
    anything rev-related 



Attributes, classes we're keeping track of: 
===========================================

An entry has "entry" class set, and as a function of the rendering
engine, has entry-pos attribute and a possible "page-active" attribute
if it is considered part of the current active page.
