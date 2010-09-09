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

// Uses: internote-storage.js, internote-utilities.js

// InternoteStorageWatcher presents a subset of the available notes as determined by a
// filter function.  It does the job of automatically adding notes to and removing
// them from the subset and generating the relevant events, in response to underlying
// adds/removes, as well as changes to notes that mean there is a need reevaluate the
// filter function.

// You can specify which underlying events on notes get passed through to the client of
// SSW (add/remove is automatic), as well as which of these events will cause a need
// to reevaluate the filter function.

// For example, if you are filtering the notes for a specific URL, underlying adds/removes
// only need be reported for the relevant URL, whereas changing an underlying note's URL
// can result in the need to add or remove a note to this set.

// This class expects incorporation of the event dispatcher, this needs to be done
// by initialisation code elsewhere.

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
    
    for each (var note in storage.allNotes)
    {
        if (this.doesPassFilter(note))
        {
            this.noteMap[note.num] = note;
            this.count++;
        }
    }
    
    this.createEvent("noteAdded");
    this.createEvent("noteRemoved");
    
    storage.addBoundEventListener("noteAdded",     this, "onNoteAdded");
    storage.addBoundEventListener("noteRemoved",   this, "onNoteRemoved");
    
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
    
    //this.utils.dumpTraceData(this.noteMap);
};

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.StorageWatcher.prototype =
    new internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.EventDispatcher();
    
internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.StorageWatcher.prototype.incorporate("StorageWatcher", {

destroy: function(event)
{
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

getCount: function(event)
{
    return this.count;
},

addNote: function(event)
{
    //dump("InternoteStorageWatcher.addNote " + event.name + "\n");

    this.noteMap[event.note.num] = event.note;
    this.count++;
    this.dispatchEvent("noteAdded", event.clone()); // We clone to prevent overwriting the .name field.
},

removeNote: function(event)
{
    //dump("InternoteStorageWatcher.removeNote " + event.name + "\n");
    
    delete this.noteMap[event.note.num];
    this.count--;
    this.dispatchEvent("noteRemoved", event.clone());
},

passEvent: function(event)
{
    //dump("InternoteStorageWatcher.passEvent " + event.name + "\n");
    
    this.dispatchEvent(event.name, event);
},

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

onNoteAdded: function(event)
{
    //dump("InternoteStorageWatcher.onNoteAdded " + event.name + "\n");
    
    var isNowPresent = this.doesPassFilter(event.note);
    if (isNowPresent) this.addNote(event);
},

onNoteRemoved: function(event)
{
    //dump("InternoteStorageWatcher.onNoteRemoved " + event.name + "\n");
    
    var wasPreviouslyPresent = this.noteMap.hasOwnProperty(event.note.num);
    if (wasPreviouslyPresent) this.removeNote(event);
},

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
