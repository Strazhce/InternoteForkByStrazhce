// Internote Extension
// Back-End Storage Watcher
// Copyright (C) 2010 Matthew Tuck
// Copyright (C) 2006 Tim Horton
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

// StorageWatcher presents a subset of the available notes as determined by a
// filter function.  It does the job of automatically adding notes to and removing
// them from the subset and generating the relevant events, in response to underlying
// adds/removes, as well as changes to notes that mean there is a need to reevaluate
// the filter function.

// You can specify which underlying events on notes get passed through to the client of
// the watcher (add/remove is automatic), as well as which of these events will cause a need
// to reevaluate the filter function. Failure to specify all the correct reevaluate events
// can lead to the subset being out-of-date.

// For example, if you are filtering the notes for a specific URL, underlying adds/removes
// only need be reported for the relevant URL, whereas changing an underlying note's URL
// can result in the need to add or remove a note to this set.

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.StorageWatcher =
function InternoteStorageWatcher(storage, filterFn, extraReevaluateEvents, extraPassthruEvents)
{
    this.storage                  = storage;
    this.utils                    = storage.utils;
    
    this.filterFn                 = filterFn;
    this.extraPassthruEvents      = extraPassthruEvents;
    this.extraReevaluateEvents    = extraReevaluateEvents;
    this.noteMap                  = {};
    this.count                    = 0;
    this.random                   = Math.random();
    
    this.initEventDispatcher();
    
    // Initialize the note subset.
    for each (var note in storage.allNotes)
    {
        if (this.doesPassFilter(note))
        {
            this.noteMap[note.num] = note;
            this.count++;
        }
    }
    
    // Initialize the events for callers to use.
    this.createEvent("noteAdded");
    this.createEvent("noteRemoved");
    
    // Watch for underlying changes.    
    storage.addBoundEventListener("noteAdded",     this, "onNoteAdded");
    storage.addBoundEventListener("noteRemoved",   this, "onNoteRemoved");
    
    // Set up the passthru and reevaluate events.
    for each (var eventName in extraReevaluateEvents)
    {
        this.createEvent(eventName);
        storage.addBoundEventListener(eventName, this, "onNeedingReevaluate");
    }
    
    for each (var eventName in extraPassthruEvents)
    {
        this.createEvent(eventName);
        storage.addBoundEventListener(eventName, this, "onNeedingPassthru");
    }
};

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.StorageWatcher.prototype =
    new internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.EventDispatcher();
    
internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.StorageWatcher.prototype.incorporate("StorageWatcher", {

destroy: function(event)
{
    // The watcher's events can be safely garbage collected, but we must
    // detach from the underlying storage so the callbacks don't leak.
    
    this.storage.removeBoundEventListener("noteAdded",   this, "onNoteAdded"  );
    this.storage.removeBoundEventListener("noteRemoved", this, "onNoteRemoved");
    
    for each (var eventName in this.extraReevaluateEvents)
    {
        this.storage.removeBoundEventListener(eventName, this, "onNeedingReevaluate");
    }
    
    for each (var eventName in this.extraPassthruEvents)
    {
        this.storage.removeBoundEventListener(eventName, this, "onNeedingPassthru");
    }
},

// PUBLIC: The number of notes in the subset.
getCount: function(event)
{
    return this.count;
},

// PRIVATE: Used by storage callbacks to add a note to the subset.
addNote: function(event)
{
    //dump("InternoteStorageWatcher.addNote " + event.name + "\n");

    this.noteMap[event.note.num] = event.note;
    this.count++;
    
    // We clone to prevent dispatchEvent overwriting the event.name field.
    this.dispatchEvent("noteAdded", event.clone()); 
},

// PRIVATE: Used by storage callbacks to remove a note from the subset.
removeNote: function(event)
{
    //dump("InternoteStorageWatcher.removeNote " + event.name + "\n");
    
    delete this.noteMap[event.note.num];
    this.count--;
    this.dispatchEvent("noteRemoved", event.clone());
},

// PRIVATE: Used by storage callbacks to pass a storage event up as a watcher event.
passEvent: function(event)
{
    //dump("InternoteStorageWatcher.passEvent " + event.name + "\n");
    
    this.dispatchEvent(event.name, event);
},

// PRIVATE: Whether the note should be in the subset according to the filter.
doesPassFilter: function(note)
{
    //dump("InternoteStorageWatcher.doesPassFilter\n");
    
    if (this.filterFn == null)
    {
        return false;
    }
    else
    {
        try
        {
            return this.filterFn(note);
        }
        catch (ex)
        {
            this.utils.handleException("Exception caught when evaluating filter function.", ex);
            return false;
        }
    }
},

// PRIVATE: Callback for when note added to storage.
onNoteAdded: function(event)
{
    //dump("InternoteStorageWatcher.onNoteAdded " + event.name + "\n");
    
    var isNowPresent = this.doesPassFilter(event.note);
    if (isNowPresent) this.addNote(event);
},

// PRIVATE: Callback for when note removed from storage.
onNoteRemoved: function(event)
{
    //dump("InternoteStorageWatcher.onNoteRemoved " + event.name + "\n");
    
    var wasPreviouslyPresent = this.noteMap.hasOwnProperty(event.note.num);
    if (wasPreviouslyPresent) this.removeNote(event);
},

// PRIVATE: Callback for when note change in storage needs reevaluation.
onNeedingReevaluate: function(event)
{
    //dump("InternoteStorageWatcher.onNeedingReevaluate " + event.name + "\n");

    var isNowPresent = this.doesPassFilter(event.note);
    var wasPreviouslyPresent = this.noteMap.hasOwnProperty(event.note.num);
    
    //dump("  " + wasPreviouslyPresent + "->" + isNowPresent + "\n");
    
    if      (isNowPresent && !wasPreviouslyPresent) this.addNote   (event);
    else if (!isNowPresent && wasPreviouslyPresent) this.removeNote(event);
    else                                            this.passEvent (event);
},

// PRIVATE: Callback for when note change in storage needs to be passed thru.
onNeedingPassthru: function(event)
{
    //dump("InternoteStorageWatcher.onNeedingPassthru " + event.name + "\n");
    
    if (this.utils.isArray(event.note))
    {
        // Normally all notes modified in a multi-event (ie minimize) would still be on the same page,
        // so it would be all or none, but URL regexes could modify the situation.
        var notes = event.note;
        
        var noteMap = this.noteMap;
        
        var presentNotes = notes.filter(function(note) { return noteMap.hasOwnProperty(note.num); });
        
        if (presentNotes.length > 0)
        {
            var newEvent = new this.storage.StorageEvent(presentNotes, event.data1, event.data2);
            this.dispatchEvent(event.name, newEvent);
        }
    }
    else
    {
        var note = event.note;
        var isPresent = this.noteMap.hasOwnProperty(note.num);
        if (isPresent) this.passEvent(event);
    }
},

// PUBLIC: Let the caller change the filter function, updating the subset and generating events.
updateFilter: function(filterFn)
{
    this.filterFn = filterFn;
    
    for (var num in this.noteMap)
    {
        var note = this.noteMap[num];
        var isNowPresent = this.doesPassFilter(note);
        if (!isNowPresent)
        {
            this.removeNote(new this.storage.StorageEvent(note));
        }
    }
    
    for (var num in this.storage.allNotes)
    {
        var note = this.storage.allNotes[num];
        var isNowPresent = this.doesPassFilter(note);
        var wasPreviouslyPresent = this.noteMap.hasOwnProperty(note.num);
        if (isNowPresent && !wasPreviouslyPresent) this.addNote(new this.storage.StorageEvent(note));
    }
},

});
