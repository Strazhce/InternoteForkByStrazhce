// Internote Extension
// Manager Dialog Controller
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

// The manager dialog allows users to see all notes and maintain them.
// It includes a search feature, the ability to export/print notes, and to edit, delete or reset
// the location of notes.

var internoteManager = {

searchMapping: [],
searchNotes: null,

isUpdating: false,
suppressSelectionChangeEvents: false,

noteBeingEdited: null,

editingFields: ["noteURL", "colorEntryBox", "textColorEntryBox", "ignoreAnchor", "ignoreParams",
                "deleteCurrentNote", "resetCurrentNote", "matchTypeEntryBox", "isMinimized"],

actions: ["deleteSelected", "resetSelected", "exportSelected",
          "printSelected", "expandSelected", "collapseSelected"],

init: function()
{
    //dump("internoteManager.init\n");
    
    this.utils   = internoteUtilities;
    this.prefs   = internotePreferences;
    this.consts  = internoteConstants;
    
    this.utils.init();
    this.prefs.init(this.utils, this.consts);
    
    try
    {
        InternoteEventDispatcher.prototype.incorporateED(InternoteStorage.prototype);
        InternoteEventDispatcher.prototype.incorporateED(InternoteStorageWatcher.prototype);
        
        this.storage = InternoteStorage.makeStorage();
        this.treeView.init(this.utils, this.storage);
        this.registerStorageListeners();
        
        var foreColorBox = document.getElementById("textColorEntryBox");
        var backColorBox = document.getElementById("colorEntryBox"    );
        var matchTypeBox = document.getElementById("matchTypeEntryBox");
        
        this.utils.addBoundDOMEventListener(foreColorBox, "ValueChange", this, "entryBoxChanges", false);
        this.utils.addBoundDOMEventListener(backColorBox, "ValueChange", this, "entryBoxChanges", false);
        this.utils.addBoundDOMEventListener(matchTypeBox, "ValueChange", this, "entryBoxChanges", false);
        
        this.tree = document.getElementById("noteList");
        this.tree.view = this.treeView;
        
        this.utils.disableMultiple(this.actions);
        this.clearNoteData();
        
        addEventListener("message", this.utils.bind(this, function(event) {
            // These events come from "view in manager" in a note's context menu.
            if (event.origin == "chrome://browser")
            {
                this.viewNote(this.storage.allNotes[parseInt(event.data)]);
            }
        }), true);
        
        this.tree.addEventListener("keypress", this.utils.bind(this, function(ev)
        {
            try
            {
                if (ev.keyCode == ev.DOM_VK_DELETE)
                {
                    this.userDeletesNotes(true);
                }
                else if (ev.ctrlKey && String.fromCharCode(ev.charCode).toUpperCase() == "A")
                {
                    this.userSelectsAll();
                }
            }
            catch (ex)
            {
                this.utils.handleException("Exception caught when key pressed.", ex);
            }
        }), false);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught while initializing manager.", ex);
    }
},

registerStorageListeners: function()
{
    this.storage.addBoundEventListener("noteAdded",           this, "onNoteAdded");
    this.storage.addBoundEventListener("noteRemoved",         this, "onNoteRemoved");
    this.storage.addBoundEventListener("noteEdited",          this, "onNoteEdited");
    this.storage.addBoundEventListener("noteRelocated",       this, "onNoteRelocated");
    this.storage.addBoundEventListener("noteForeRecolored",   this, "onNoteUpdateData");
    this.storage.addBoundEventListener("noteBackRecolored",   this, "onNoteUpdateData");
    this.storage.addBoundEventListener("noteReset",           this, "onNoteUpdateData");
    this.storage.addBoundEventListener("notesMinimized",      this, "onNoteUpdateData");
},

destroy: function()
{
    // XXX Does close destroy the XUL elements so no need to remove DOM listeners?
    this.storage.removeBoundEventListener("noteAdded",           this, "onNoteAdded"    );
    this.storage.removeBoundEventListener("noteRemoved",         this, "onNoteRemoved"  );
    this.storage.removeBoundEventListener("noteEdited",          this, "onNoteEdited"   );
    this.storage.removeBoundEventListener("noteRelocated",       this, "onNoteRelocated");
    this.storage.removeBoundEventListener("noteForeRecolored",   this, "onNoteUpdateData");
    this.storage.removeBoundEventListener("noteBackRecolored",   this, "onNoteUpdateData");
    this.storage.removeBoundEventListener("noteReset",           this, "onNoteUpdateData");
    this.storage.removeBoundEventListener("notesMinimized",      this, "onNoteUpdateData");
},

viewNote: function(note)
{
    var noteTreeIndex = this.getNoteTreeIndex(note.num);
    
    if (noteTreeIndex == -1)
    {
        var urlTreeIndex = this.getURLTreeIndex(this.treeView.getManagerURLData(note));
        this.utils.assertError(urlTreeIndex != -1, "Couldn't find URL when trying to view note.");
        
        this.treeView.toggleOpenState(urlTreeIndex);
        
        noteTreeIndex = this.getNoteTreeIndex(note.num);
        this.utils.assertError(noteTreeIndex != -1, "Couldn't find note when trying to view note.");
    }
    
    this.treeView.selection.select(noteTreeIndex);
    this.tree.treeBoxObject.ensureRowIsVisible(noteTreeIndex);
},

onNoteAdded: function(event)
{
    try
    {
        this.treeCreateNote(event.note);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to add note to tree.", ex);
    }
},

onNoteRemoved: function(event)
{
    try
    {
        this.treeRemoveNote(event.note, this.treeView.getManagerURLData(event.note));
        
        if (event.note == this.noteBeingEdited)
        {
            this.clearNoteData();
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to remove note from tree.", ex);
    }
},

onNoteEdited: function(event)
{
    try
    {
        var note = event.note;
        var treeIndex = this.getNoteTreeIndex(note.num);
        
        // Update the tree on the left.
        if (treeIndex != -1)
        {
            this.treeView.updateText(treeIndex, note);
        }
        
        // And maybe the data on the right ...
        this.onNoteUpdateData(event);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to edit text in tree.", ex);
    }
},

checkForLocationChange: function(event)
{
    // First check it's not just a change within URL canonicalization.
    // XXX This is a bit ridiculous, it would probably be a lot better to autoset
    // XXX URL to "" in this mode, but we really need to have undo first because
    // XXX the user has no way of getting back the URL when ALL is mischosen.
    
    var note = event.note;
    var noteIndex = this.getNoteTreeIndex(note.num);
    var urlIndex  = this.treeView.getParentIndex(noteIndex);
    var oldEffectiveURLData = this.treeView.treeData[urlIndex][this.treeView.COL_LOOKUP];
    
    var newEffectiveURLData = this.treeView.getManagerURLData(note);
    
    //dump("newURL = " + newEffectiveURL + "\n");
    //dump("oldURL = " + oldEffectiveURL + "\n");
    
    if (oldEffectiveURLData == newEffectiveURLData)
    {
        return;
    }
    
    this.suppressSelectionChangeEvents = true; // Prevent normal select events.
    
    // We pass the old URL to remove in case we must delete an old collapsed category.
    var [wasSelected, wasCategoryOpen] = this.treeRemoveNote(event.note, oldEffectiveURLData);
    var shouldForceCategoryOpen = wasCategoryOpen || wasSelected;
    var newIndex = this.treeCreateNote(event.note, shouldForceCategoryOpen);
    
    if (wasCategoryOpen && wasSelected)
    {
        this.treeView.selection.select(newIndex);
    }
    
    this.suppressSelectionChangeEvents = false;
},

onNoteRelocated: function(event)
{
    //dump("internoteManager.onNoteRelocated\n");
    
    try
    {
        this.checkForLocationChange(event);
        this.setNoteData(event.note);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting relocate note in tree.", ex);
    }
},

onNoteUpdateData: function(event)
{
    //dump("internoteManager.onNoteUpdateData\n");
    
    try
    {
        var isNoteBeingEdited = this.utils.isArray(event.note)
                              ? event.note.indexOf(this.noteBeingEdited) != -1
                              : event.note == this.noteBeingEdited;
        if (isNoteBeingEdited)
        {
            this.setNoteData(this.noteBeingEdited);
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting update note data in right panel.", ex);
    }
},

// This does a linear search.
getNoteTreeIndex: function(searchNoteNum, startPoint)
{
    this.utils.assertError(this.utils.isNonNegativeNumber(searchNoteNum), "SearchNoteNum not a number.", searchNoteNum);
    if (startPoint == null) startPoint = 0;
    
    for (var i = startPoint; i < this.treeView.treeData.length; i++)
    {
        var isContainer = this.treeView.treeData[i][this.treeView.COL_IS_CONTAINER];
        if (!isContainer)
        {
            var currentNoteNum = this.treeView.treeData[i][this.treeView.COL_LOOKUP];
            if (searchNoteNum == currentNoteNum)
            {
                return i;
            }
        }
    }
    return -1;
},

// This does a linear search.
getURLTreeIndex: function(searchURL)
{
    for (var i = 0; i < this.treeView.treeData.length; i++)
    {
        var isContainer = this.treeView.treeData[i][this.treeView.COL_IS_CONTAINER];
        if (isContainer)
        {
            var currentURL = this.treeView.treeData[i][this.treeView.COL_LOOKUP];
            if (searchURL == currentURL)
            {
                return i;
            }
        }
    }
    return -1;
},

getRowNote: function(treeIndex)
{
    var noteNum = this.treeView.treeData[treeIndex][this.treeView.COL_LOOKUP];
    return this.storage.allNotes[noteNum];
},

getNotesToActUpon: function(shouldActUponSelection)
{
    if (shouldActUponSelection)
    {
        return this.getAllSelectedNotes();
    }
    else
    {
        return this.storage.allNotes;
    }
},

clearNoteData : function ()
{
    //dump("internoteManager.clearNoteData\n");
    
    this.noteBeingEdited = null;
    
    this.isUpdating = true; // XXX Can you make this unnecessary?
    
    document.getElementById("goToLink").style.color = "gray";
    document.getElementById("goToLink").style.cursor = "";
    
    document.getElementById("splitter").setAttribute("state", "collapsed");
    
    document.getElementById("noteText")      .value = "";
    document.getElementById("noteCreateTime").value = "";
    document.getElementById("noteModfnTime") .value = "";
    document.getElementById("noteURL")       .value = "";
    
    document.getElementById("colorEntryBox"    ).value = 0;
    document.getElementById("textColorEntryBox").value = 0;
    document.getElementById("matchTypeEntryBox").value = 0;
    
    document.getElementById("isMinimized") .checked = "";
    document.getElementById("ignoreAnchor").checked = "";
    document.getElementById("ignoreParams").checked = "";
    
    this.utils.disableMultiple(this.editingFields);
    this.utils.disableMultiple(document.getElementsByClassName("editlabel"));
    document.getElementById("noteText").setAttribute("disabled", "true");
    
    this.isUpdating = false;
},

updateValue: function(id, value)
{
    var elt = document.getElementById(id);
    if (elt.value != value)
    {
        elt.value = value;
    }
},

updateCheck: function(id, isChecked)
{
    var elt = document.getElementById(id);
    if (elt.checked != isChecked)
    {
        elt.checked = isChecked;
    }
},

setNoteData: function(note)
{
    //dump("internoteManager.setNoteData\n");
    
    this.noteBeingEdited = note;
    
    this.utils.assertError(note != null, "Note is null", note);
    
    this.isUpdating = true;
    
    if (note != null)
    {
        var urlData = this.treeView.getManagerURLData(note);
        var [category, url] = this.utils.simpleSplit(urlData, ":");
        
        if (category == "regexp" || url == "")
        {
            document.getElementById("goToLink").style.color  = "gray";
            document.getElementById("goToLink").style.cursor = "";
        }
        else
        {
            document.getElementById("goToLink").style.color  = "blue";
            document.getElementById("goToLink").style.cursor = "pointer";
        }
        
        document.getElementById("splitter").setAttribute("state", "open");
        
        var backColor = this.consts.BACKGROUND_COLOR_SWABS.indexOf(note.backColor);
        var foreColor = this.consts.FOREGROUND_COLOR_SWABS.indexOf(note.foreColor);
        
        // Handle custom colour - full UI not supported yet.
        if (backColor == -1)
        {
            this.setMenuListToCustom("colorEntryBox");
        }
        else
        {
            this.uncustomizeMenuList("colorEntryBox");
        }
        
        if (foreColor == -1)
        {
            this.setMenuListToCustom("textColorEntryBox");
        }
        else
        {
            this.uncustomizeMenuList("textColorEntryBox");
        }
        
        var unknownTimeMessage = "--- " + this.utils.getLocaleString("UnknownTimeMessage") + " ---";
        var utils = this.utils;
        
        function convertTime(time)
        {
            if (time == null)
            {
                return unknownTimeMessage;
            }
            else
            {
                return utils.convertSecondsToDate(time).toLocaleString();
            }
        }
        
        this.updateValue("noteText",          note.text);
        this.updateValue("noteCreateTime",    convertTime(note.createTime));
        this.updateValue("noteModfnTime",     convertTime(note.modfnTime));
        this.updateValue("noteURL",           note.url);
        this.updateValue("matchTypeEntryBox", note.matchType);
        this.updateValue("colorEntryBox",     backColor);
        this.updateValue("textColorEntryBox", foreColor);
        
        this.updateCheck("isMinimized",       note.isMinimized );
        this.updateCheck("ignoreAnchor",      note.ignoreAnchor);
        this.updateCheck("ignoreParams",      note.ignoreParams);
        
        this.utils.enableMultiple(this.editingFields);
        this.utils.enableMultiple(document.getElementsByClassName("editlabel"));
        
        if (note.isHTML)
        {
            document.getElementById("noteText").setAttribute("disabled", "true");
        }
        else
        {
            document.getElementById("noteText").removeAttribute("disabled");
        }
    }
    else
    {
        this.clearNoteData();
    }
    
    this.configureURLSection(this.noteBeingEdited);
    
    this.isUpdating = false;
},

configureURLSection: function(note)
{
    var urlLabelDeck = document.getElementById("urlLabelDeck");
    var mainURLLabel = document.getElementById("mainURLLabel");
    var urlText      = document.getElementById("noteURL");
    var goToLink     = document.getElementById("goToLink");
    var ignoreAnchor = document.getElementById("ignoreAnchor");
    var ignoreParams = document.getElementById("ignoreParams");
    
    mainURLLabel.removeAttribute("disabled");
    urlText     .removeAttribute("disabled");
    goToLink    .removeAttribute("disabled");
    ignoreAnchor.removeAttribute("disabled");
    ignoreParams.removeAttribute("disabled");
    
    if (note.matchType == this.storage.URL_MATCH_URL)
    {
        urlLabelDeck.setAttribute("selectedIndex", "0");
    }
    else if (note.matchType == this.storage.URL_MATCH_ALL)
    {
        urlLabelDeck.setAttribute("selectedIndex", "0");
        
        mainURLLabel.setAttribute("disabled", "true");
        urlText     .setAttribute("disabled", "true");
        
        goToLink.style.color = "gray";
        goToLink.style.cursor = "";
    }
    else if (note.matchType == this.storage.URL_MATCH_PREFIX)
    {
        urlLabelDeck.setAttribute("selectedIndex", "1");
    }
    else if (note.matchType == this.storage.URL_MATCH_REGEXP)
    {
        urlLabelDeck.setAttribute("selectedIndex", "2");
    }
    else if (note.matchType == this.storage.URL_MATCH_SITE)
    {
        urlLabelDeck.setAttribute("selectedIndex", "3");
    }
    else if (note.matchType == this.storage.URL_MATCH_SUFFIX)
    {
        urlLabelDeck.setAttribute("selectedIndex", "4");
    }
    else
    {
        this.utils.assertWarnNotHere("Unknown match type when setting URL label deck.", note.matchType);
        urlLabelDeck.setAttribute("selectedIndex", "0");
    }
    
    if (!this.storage.areIgnoresApplicable(note.matchType))
    {
        ignoreAnchor.setAttribute("disabled", "true");
        ignoreParams.setAttribute("disabled", "true");
    }
    
    if (!this.isValidURLOrSite())
    {
        document.getElementById("goToLink").style.color  = "gray";
        document.getElementById("goToLink").style.cursor = "";
    }
},

isValidURLOrSite: function()
{
    var urlData = this.treeView.getManagerURLData(this.noteBeingEdited);
    var [category, url] = this.utils.simpleSplit(urlData, ":");
    
    if (category == "regexp")
    {
        return false;
    }
    else
    {
        var parsedURL = this.utils.parseURL(url);
        
        var isValidURL = (parsedURL != null && this.utils.isValidURLSite(parsedURL.site, parsedURL.protocol));
        
        return isValidURL ? true : this.utils.isValidSite(url);
    }
},

setMenuListToCustom: function(menuListID)
{
    var menuList = document.getElementById(menuListID);
    var customText = this.utils.getLocaleString("CustomColor");
    
    var customID = menuListID + "-custom";
    var existingElement = document.getElementById(customID);
    
    if (existingElement == null)
    {
        var item = menuList.appendItem(customText, "-1");
        item.setAttribute("id", customID);
        menuList.value = "-1";
    }
},

uncustomizeMenuList: function(menuListID)
{
    var item = document.getElementById(menuListID + "-custom");
    
    if (item != null)
    {
        item.parentNode.removeChild(item);
    }
},

entryBoxChanges: function()
{
    if (!this.isUpdating)
    {
        this.userEditsData();
    }
},

isValidTreeIndex: function(treeIndex)
{
    return (0 <= treeIndex && this.treeView.treeData[treeIndex] != null);
},

getSingleSelectedRow: function(selection)
{
    var treeIndex = {};
    var scratchVar = {};
    selection.getRangeAt(0, treeIndex, scratchVar);
    return treeIndex.value;
},

userSelectsElement: function(mainTree, otherTree, getNotesFunc)
{
    //dump("internoteManager.userSelectsTreeElement\n");
    
    try
    {
        if (this.suppressSelectionChangeEvents) return;
        
        var mainSelection = mainTree.selection;
        
        this.utils.setEnabled(this.actions, mainSelection.count > 0);
        
        // First deselect other tree.
        // XXX Should probably support Ctrl-Click not deselecting the other tree, so they work together.
        if (otherTree != null)
        {
            var otherSelection = otherTree.selection;
            // XXX Check first to prevent infinite recursion when selection changes.
            if (otherSelection.count > 0)
            {
                // Suppress reloads until when we are done.
                this.suppressSelectionChangeEvents = true;
                otherSelection.clearSelection();
                this.suppressSelectionChangeEvents = false;
            }
        }
        
        if (mainSelection.count == 1)
        {
            var treeIndex = this.getSingleSelectedRow(mainSelection);
            if (!mainTree.isContainer(treeIndex))
            {
                this.setNoteData(getNotesFunc(treeIndex)[0]);
            }
            else
            {
                this.clearNoteData();
            }
        }
        else
        {
            this.clearNoteData();
        }
    }
    catch (ex)
    {
        this.utils.handleException("Except caught when user selected element.", ex);
    }
},

userSelectsTreeElement: function()
{
    var resultsList = document.getElementById("resultsList");
    this.userSelectsElement(this.treeView, resultsList.view, this.utils.bind(this, this.getNotesFromTree));
},

userSelectsSearchElement: function()
{
    dump("C\n");
    var resultsList = document.getElementById("resultsList");
    this.userSelectsElement(resultsList.view, this.treeView, this.utils.bind(this, this.getNotesFromSearch));
},

userEditsData: function(event)
{
    //dump("internoteManager.userEditsData\n");
    
    try
    {
        if (this.noteBeingEdited != null)
        {
            //dump("  Committing data.\n");
            
            var noteURLVal   = document.getElementById("noteURL").value;
            var noteTextVal  = document.getElementById("noteText").value;
            var backColorVal = document.getElementById("colorEntryBox").value;
            var foreColorVal = document.getElementById("textColorEntryBox").value;
            
            var isMinimized  = document.getElementById("isMinimized") .checked;
            var ignoreAnchor = document.getElementById("ignoreAnchor").checked;
            var ignoreParams = document.getElementById("ignoreParams").checked;
            
            var matchType    = parseInt(document.getElementById("matchTypeEntryBox").value, 10);
            
            this.storage.setMatch           (this.noteBeingEdited,   noteURLVal, matchType);
            this.storage.setText            (this.noteBeingEdited,   noteTextVal);
            this.storage.setBackColor       (this.noteBeingEdited,   this.consts.BACKGROUND_COLOR_SWABS[backColorVal]);
            this.storage.setForeColor       (this.noteBeingEdited,   this.consts.FOREGROUND_COLOR_SWABS[foreColorVal]);
            this.storage.setIsMinimizedMulti([this.noteBeingEdited], isMinimized);
            this.storage.setIgnoreAnchor    (this.noteBeingEdited,   ignoreAnchor);
            this.storage.setIgnoreParams    (this.noteBeingEdited,   ignoreParams);
            
            this.configureURLSection(this.noteBeingEdited);
        }
    }
    catch (ex)
    {
        this.utils.handleException("Except caught when user edited data.", ex);
    }
},

userResetsNotes: function(shouldResetAllSelected)
{
    var notesToReset = shouldResetAllSelected ? this.getAllSelectedNotes() : [ this.noteBeingEdited ];
    
    for (var i = 0; i < notesToReset.length; i++)
    {
        var note = notesToReset[i];
        this.utils.assertError(note != null, "Note is null when trying to reset note in manager.");
        this.storage.resetNote(note);
        this.storage.raiseNote(note);
    }
},

getViewSelectedNotes: function(treeView, getNotesFunc)
{
    //dump("internoteManager.getViewSelectedNotes\n");
    
    // Convert a list of selected ranges of notes to a straight list of notes.
    var start = {};
    var end   = {};
    var selectedNotes = [];
    var selection = treeView.selection;
    var rangeCount = selection.getRangeCount();
    
    for (var t = 0; t < rangeCount; t++)
    {
        selection.getRangeAt(t, start, end);
        for (var v = start.value; v <= end.value; v++)
        {
            this.utils.pushArray(selectedNotes, getNotesFunc(v));
        }
    }
    
    //selectedNotes.sort(this.utils.numericSort);
    
    return selectedNotes;
},

getNotesFromTree: function(treeIndex)
{
    if (this.treeView.isContainer(treeIndex))
    {
        var url = this.treeView.treeData[treeIndex][this.treeView.COL_LOOKUP];
        return this.treeView.getNotesForManagerURL(url);
    }
    else
    {
        return [this.getRowNote(treeIndex)];
    }
},

getNotesFromSearch: function(treeIndex)
{
    var noteNum = this.searchMapping[treeIndex];
    return [this.storage.allNotes[noteNum]];
},

// XXX What a ridiculous kludge.
getAllSelectedNotes: function()
{
    var selectedNotes = this.getViewSelectedNotes(this.treeView, this.utils.bind(this, this.getNotesFromTree));
    
    if (selectedNotes.length == 0)
    {
        var resultsList = document.getElementById("resultsList");
        if (resultsList.view != null)
        {
            selectedNotes = this.getViewSelectedNotes(resultsList.view, this.utils.bind(this, this.getNotesFromSearch));
        }
    }
    
    return selectedNotes;
},

userDeletesNotes: function (shouldDeleteAllSelected)
{
    try
    {
        var notesToDelete = shouldDeleteAllSelected ? this.getAllSelectedNotes() : [ this.noteBeingEdited ];
        
        if (notesToDelete.length != 1)
        {
            // If there are multiple notes, we confirm regardless of the preference, due to the
            // danger.  This could be removed once there is undo.
            var confirmMessage = this.utils.getLocaleString("DeleteMultipleConfirm");
            var isConfirmed = confirm(confirmMessage);
        }
        else if (this.prefs.shouldAskBeforeDelete())
        {
            var confirmMessage = this.utils.getLocaleString("DeleteSingleConfirm");
            var isConfirmed = confirm(confirmMessage);
        }
        else
        {
            var isConfirmed = true;
        }
        
        if (isConfirmed)
        {
            var notesToDelete = shouldDeleteAllSelected ? this.getAllSelectedNotes() : [ this.noteBeingEdited ];
            
            for (var i = 0; i < notesToDelete.length; i++)
            {
                this.storage.removeNote(notesToDelete[i]);
            }
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when deleting notes.", ex);
    }
},

treeCreateNote: function(note, shouldForceCategoryOpen)
{
    //dump("internoteManager.treeCreateNote\n");
    
    var urlTreeIndex = this.getURLTreeIndex(this.treeView.getManagerURLData(note));
    
    if (urlTreeIndex != -1)
    {
        // URL category exists, if it's open add to it.
        if (shouldForceCategoryOpen && !this.treeView.isContainerOpen(urlTreeIndex))
        {
            //dump("  Forcing category open.\n");
            this.treeView.toggleOpenState(urlTreeIndex); // This will find the new note.
            return this.getNoteTreeIndex(note.num, urlTreeIndex + 1);
        }
        else if (this.treeView.isContainerOpen(urlTreeIndex))
        {
            //dump("  Category is already open.\n");
            var newIndex = urlTreeIndex + 1;
            this.treeView.insertNoteRow(newIndex, note);
            return newIndex; // XXX This assumption will be wrong when the tree becomes sorted.
        }
    }
    else
    {
        //dump("  Creating category.\n");
        
        // URL category doesn't exist, create it collapsed.
        var categoryURLData = this.treeView.getManagerURLData(note);
        var newTreeIndex = this.treeView.addURLRow(categoryURLData);
        
        if (shouldForceCategoryOpen)
        {
            //dump("  Forcing category open.\n");
            this.treeView.toggleOpenState(newTreeIndex);
        }
        
        return newTreeIndex + 1;
    }
},

treeRemoveNote: function(note, urlData)
{
    //dump("internoteManager.treeRemoveNote\n");
    
    // XXX Do something about when the note is open for editing.
    var treeIndex = this.getNoteTreeIndex(note.num);
    
    var isCategoryOpen = (treeIndex != -1);
    var isSelected = this.treeView.selection.isSelected(treeIndex);
    if (isCategoryOpen)
    {
        //dump("  Removing element.\n");
        var isNoteAfter = this.isValidTreeIndex(treeIndex + 1) && !this.treeView.isContainer(treeIndex + 1);
        var isContainerBefore = this.treeView.isContainer(treeIndex - 1);
        
        if (!isNoteAfter && isContainerBefore)
        {
            //dump("  Delete the category & note.\n");
            // Delete the category and the note.
            this.treeView.deleteRows(treeIndex - 1, 2);
        }
        else
        {
            //dump("  Delete just the note.\n");
            // Delete just the note.
            this.treeView.deleteRows(treeIndex, 1);
        }
    }
    else
    {
        // Even if we can't see the note, it may be collapsed, so search for its URL.
        // We take the URL from the tree, not the note, as this may be called
        // in response to a relocation, where the note URL will have changed.
        
        var urlTreeIndex = this.getURLTreeIndex(urlData);
        if (urlTreeIndex != -1 && !this.treeView.areNotesForManagerURLData(urlData))
        {
            //dump("  Removing.\n");
            // Delete the URL heading.
            this.treeView.deleteRows(urlTreeIndex, 1);
        }
        else
        {
            //dump("  Not removed.\n");
        }
    }
    
    return [isSelected, isCategoryOpen];
},

getSearchFilter: function(searchTerm)
{
    var searchTermLower = searchTerm.toLowerCase();
    return function(note)
    {
        return note.text.toLowerCase().match(searchTermLower);
    }
},

onSearchNoteAdded: function(event)
{
    try
    {
        var searchResultsPane = document.getElementById("searchResultChildren");
        var note = event.note;
        
        var ti = document.createElement("treeitem");
        var tr = document.createElement("treerow");
        var tc = document.createElement("treecell");
        
        var [desc, style] = this.getTextDescription(note);
        tc.setAttribute("label", desc);
        tr.appendChild(tc);
        ti.appendChild(tr);
        
        searchResultsPane.appendChild(ti);
        this.searchMapping.push(note.num);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to add note to search.", ex);
    }
},

onSearchNoteRemoved: function(event)
{
    try
    {
        var note = event.note;
        var treeIndex = this.searchMapping.indexOf(note.num);
        if (treeIndex != -1)
        {
            this.searchMapping.splice(treeIndex, 1);
            var searchResultsPane = document.getElementById("searchResultChildren");
            var rowNode = searchResultsPane.childNodes[treeIndex];
            searchResultsPane.removeChild(rowNode);
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to remove note from search.", ex);
    }
},

onSearchNoteEdited: function(event)
{
    try
    {
        var note = event.note;
        var treeIndex = this.searchMapping.indexOf(note.num);
        if (treeIndex != -1)
        {
            var searchResultsPane = document.getElementById("searchResultChildren");
            var rowNode = searchResultsPane.childNodes[treeIndex];
            var [desc, style] = this.getTextDescription(note)
            rowNode.firstChild.firstChild.setAttribute("label", desc);
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to edit note text in search.", ex);
    }
},

initSearchResults: function(searchTerm)
{
    this.searchMapping = [];
    
    var resultsList = document.getElementById("resultsList");
    resultsList.style.display = "";
    
    var extraReevaluateEvents = ["noteEdited"];
    this.searchNotes =
        new InternoteStorageWatcher(this.storage, null, extraReevaluateEvents, []);
    
    this.searchNotes.addBoundEventListener("noteAdded",   this, "onSearchNoteAdded");
    this.searchNotes.addBoundEventListener("noteRemoved", this, "onSearchNoteRemoved");
    this.searchNotes.addBoundEventListener("noteEdited",  this, "onSearchNoteEdited");
    
    this.searchNotes.updateFilter(this.getSearchFilter(searchTerm));
},

destroySearchResults: function()
{
    var resultsList = document.getElementById("resultsList");
    resultsList.style.display = "none";
    
    var searchResultsPane = document.getElementById("searchResultChildren");
    while (searchResultsPane.hasChildNodes())
    {
        searchResultsPane.removeChild(searchResultsPane.firstChild);
    }
    
    this.searchNotes.destroy();
    this.searchNotes = null;
},

updateSearchResults: function()
{
    var searchTerm = document.getElementById("searchFilter").value;
    if (searchTerm == "" && this.searchNotes != null)
    {
        this.destroySearchResults();
    }
    else if (searchTerm != "")
    {
        if (this.searchNotes != null)
        {
            this.searchNotes.updateFilter(this.getSearchFilter(searchTerm));
        }
        else
        {
            this.initSearchResults(searchTerm);
        }
    }
},

openURL : function ()
{
    if (this.noteBeingEdited != null && this.isValidURLOrSite())
    {
        var noteURL = document.getElementById("noteURL").value;
        
        if (noteURL != null)
        {
            if (this.noteBeingEdited.matchType == this.storage.URL_MATCH_REGEXP)
            {
                noteURL = noteURL.replace(/\.\*$/, "");
            }
            
            this.utils.openURL(noteURL);
            
            // Close the manager.
            document.getElementById("internoteManager").acceptDialog();
        }
    }
},

userImportsNotes: function(fileType, filter)
{
    try
    {
        var nsIFilePicker = this.utils.getCIInterface("nsIFilePicker");
        var picker = this.utils.getCCInstance("@mozilla.org/filepicker;1", "nsIFilePicker");
        
        var title = this.utils.getLocaleString("OpenTitle");
        var fileDesc = this.utils.getLocaleString("FileType" + fileType);
        title = title.replace("%1", fileDesc);
        
        picker.init(window, title, nsIFilePicker.modeOpen);
        picker.defaultExtension = "";
        if (filter != null) picker.appendFilters(filter);
        
        var result = picker.show();
        if (result == nsIFilePicker.returnOK || result == nsIFilePicker.returnReplace)
        {
            var fileName = picker.file.path;
            
            var text = this.utils.readStringFromFilename(fileName);
            var notes;
            
            if (fileType == "InternoteV2")
            {
                notes = this.storage.loadInternoteV2(text);
            }
            else if (fileType == "InternoteV3")
            {
                var storageDoc = this.utils.loadXMLFromString(text);
                notes = this.storage.loadInternoteV3(storageDoc, false);
            }
            else
            {
                this.utils.assertWarnNotHere("Unknown import mode.");
                return;
            }
            
            var [addedCount, foundCount] = this.storage.addImportedNotes(notes);
            
            var messageType;
            if (addedCount == 0 && foundCount == 0)
            {
                messageType = "NoNotesImportMessage";
            }
            else if (foundCount == 0)
            {
                messageType = "AllNotesImportMessage";
            }
            else
            {
                messageType = "SomeNotesImportMessage";
            }
            
            var message = this.utils.getLocaleString(messageType);
            message = message.replace("%1", addedCount).replace("%2", foundCount);
            
            var notificationBox = document.getElementById("notificationBox");
            notificationBox.appendNotification(message, "import_message", null, notificationBox.PRIORITY_INFO_MEDIUM);
        }
    }
    catch (ex)
    {
        var errorMessage = this.utils.getLocaleString("ImportFailedMessage");
        var fileDesc = this.utils.getLocaleString("FileType" + fileType);
        errorMessage = errorMessage.replace("%1", fileDesc);
        alert(errorMessage);
        this.utils.handleException("Exception caught when importing notes.", ex);
    }
},

userExportsNotes: function(text, fileType, filter, extension, defaultFileName)
{
    try
    {
        var nsIFilePicker = this.utils.getCIInterface("nsIFilePicker");
        var picker = this.utils.getCCInstance("@mozilla.org/filepicker;1", "nsIFilePicker");
        
        var title = this.utils.getLocaleString("SaveTitle");
        var fileDesc = this.utils.getLocaleString("FileType" + fileType);
        title = title.replace("%1", fileDesc);
        
        if (defaultFileName == null)
        {
            defaultFileName = this.utils.getLocaleString("ExportDefaultFileName");
        }
        
        picker.init(window, title, nsIFilePicker.modeSave);
        picker.defaultExtension = "";
        
        picker.defaultString = defaultFileName + ((extension != null) ? "." + extension : "");
        
        if (filter != null) picker.appendFilters(filter);
        
        var result = picker.show();
        if (result == nsIFilePicker.returnOK || result == nsIFilePicker.returnReplace)
        {
            var fileName = picker.file.path;
            
            if (extension != null)
            {
                var dotExtension = "." + extension;
                
                if (!this.utils.endsWith(fileName, dotExtension))
                {
                    fileName += dotExtension;
                }
            }
            
            this.utils.saveStringToFilename(text, fileName);
        }
    }
    catch (ex)
    {
        var errorMessage = this.utils.getLocaleString("ExportFailedMessage");
        alert(errorMessage);
        this.utils.handleException("Exception caught when exporting notes.", ex);
    }
},

userChangesExpandOnSelected: function(shouldBeExpanded)
{
    this.tree.focus();
    
    var start = {};
    var end   = {};
    var selectedRows = [];
    var selection = this.treeView.selection;
    var rangeCount = selection.getRangeCount();
    
    // We need to loop through ranges in reverse order, so that expanding changing the index of
    // later URLs is not a problem. There seems to be no guarantee getRangeAt is sorted, so we
    // must sort them.  Also, because we want convert notes to URLs to allow collapsing if the
    // user has just selected a note, this creates a similar problem if there are two selected
    // notes within a URL (the second note will have a bad index after collapse).  Thus we must
    // do the conversion before the sorting - the easiest solution is converting to individual
    // URL indexes before sorting.
    var selected = [];
    
    for (var i = 0; i < rangeCount; i++)
    {
        selection.getRangeAt(i, start, end);
        for (j = start.value; j <= end.value; j++)
        {
            var isContainer = this.treeView.treeData[j][this.treeView.COL_IS_CONTAINER];
            var urlRow = isContainer ? j : this.treeView.getParentIndex(j);
            selected.push(urlRow);
        }
    }
    
    selected.sort(this.utils.numericSort);
    
    // We loop through in reverse.  Dupes (due to multiple notes within a URL selected) are not
    // a problem since they will have the right state the 2nd time and we only toggle if wrong.
    for (var i = selected.length - 1; i >= 0; i--)
    {
        if (this.treeView.isContainerOpen(selected[i]) != shouldBeExpanded)
        {
            var changedCount = this.treeView.toggleOpenState(selected[i]);
            if (shouldBeExpanded)
            {
                selection.rangedSelect(selected[i] + 1, selected[i] + changedCount, true);
            }
        }
    }
},

userSelectsAll: function()
{
    this.treeView.selection.selectAll();
},

userImportsNotesInV3: function ()
{
    try
    {
        var filter = this.utils.getCIConstant("nsIFilePicker", "filterXML");
        this.userImportsNotes("InternoteV3", filter);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to import V3 notes.", ex);
    }
},

userImportsNotesInV2: function ()
{
    try
    {
        this.userImportsNotes("InternoteV2", null);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to import V2 notes.", ex);
    }
},

userExportsNotesInV3: function (shouldExportOnlySelected)
{
    try
    {
        var fileName = this.utils.getLocaleString("ExportDefaultFileName") + ".xml";
        var selection = this.getNotesToActUpon(shouldExportOnlySelected);
        this.userExportsNotes(this.storage.generateNotesInV3(selection), "InternoteV3", null, null, fileName);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to export V3 notes.", ex);
    }
},

userExportsNotesInV2: function (shouldExportOnlySelected)
{
    try
    {
        var selection = this.getNotesToActUpon(shouldExportOnlySelected);
        this.userExportsNotes(this.storage.generateNotesInV2(selection), "InternoteV2", null, null, this.storage.LEGACY_FILENAME);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to export V2 notes.", ex);
    }
},

userExportsNotesInHTML: function (shouldExportOnlySelected)
{
    try
    {
        var filter = this.utils.getCIConstant("nsIFilePicker", "filterHTML");
        var selection = this.getNotesToActUpon(shouldExportOnlySelected);
        
        var scratchDoc = this.utils.getScratchIFrame().contentDocument;
        this.storage.generateNotesInHTML(selection, scratchDoc);
        
        this.userExportsNotes(scratchDoc.documentElement.innerHTML, "HTML", filter, "html");
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to export notes to HTML.", ex);
    }
},

userExportsNotesInText: function (shouldExportOnlySelected)
{
    try
    {
        var filter = this.utils.getCIConstant("nsIFilePicker", "filterText");
        var selection = this.getNotesToActUpon(shouldExportOnlySelected);
        this.userExportsNotes(this.storage.generateNotesInText(selection), "Text", filter, "txt");
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to export notes to text.", ex);
    }
},

userExportsNotesInBookmarks: function(shouldExportOnlySelected)
{
    try
    {
        var filter = this.utils.getCIConstant("nsIFilePicker", "filterHTML");
        var selection = this.getNotesToActUpon(shouldExportOnlySelected);
        this.userExportsNotes(this.storage.generateNotesInBookmarks(selection), "Bookmarks", filter, "html", "bookmarks");
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to export notes to bookmarks.", ex);
    }
},

userPrintsNotes: function (shouldExportOnlySelected)
{
    try
    {
        var selection = this.getNotesToActUpon(shouldExportOnlySelected);
        
        var scratchFrame = this.utils.getScratchIFrame();
        
        this.storage.generateNotesInHTML(selection, scratchFrame.contentDocument);
        
        var requestor = scratchFrame.contentWindow.QueryInterface(this.utils.getCIInterface("nsIInterfaceRequestor"));
        var printer = requestor.getInterface(this.utils.getCIInterface("nsIWebBrowserPrint"));
        var settings = PrintUtils.getPrintSettings();
        
        // Kill the about:blank URL.
        settings.headerStrRight = "";
        
        try
        {
            printer.print(settings, null);
        }
        catch (ex)
        {
            // Abort goes here, so do nothing.
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to print notes.", ex);
    }
},

treeView : {
    COL_TEXT:         0,
    COL_IS_CONTAINER: 1,
    COL_IS_OPEN:      2,
    COL_LOOKUP:       3,
    COL_STYLE:        4,
    
    treeData: [],
    treeBox: null,
    selection: null,
    
    init: function(utils, storage)
    {
        this.utils   = utils;
        this.storage = storage;
        
        // Get all the URL data strings present.
        var urlDataStrings = this.storage.allNotes.map(this.getManagerURLData, this);
        // Sort & Remove Dupes
        var sortedURLDataStrings = this.utils.getSortedUniqueValues(urlDataStrings);
        // Create the rows.
        this.treeData = sortedURLDataStrings.map(this.makeURLRow, this);
    },
    
    get rowCount()                     { return this.treeData.length; },
    setTree: function(treeBox)         { this.treeBox = treeBox; },
    getCellText: function(idx, column) { return this.treeData[idx][this.COL_TEXT]; },
    
    isContainerEmpty: function(idx)    { return false; },
    isSeparator: function(idx)         { return false; },
    isSorted: function()               { return false; },
    isEditable: function(idx, column)  { return false; },
    
    isContainer: function(idx)
    {
        try
        {
            if (this.treeData[idx]) return this.treeData[idx][this.COL_IS_CONTAINER];
            else return false;
        }
        catch (ex)
        {
            return false;
        }
    },
    
    isContainerOpen: function(idx)
    {
        try
        {
            if (this.treeData[idx]) return this.treeData[idx][this.COL_IS_OPEN];
            else return false;
        }
        catch (ex)
        {
            return false;
        }
    },
    
    getParentIndex: function(idx)
    {
        if (this.isContainer(idx)) return -1;
        for (var t = idx - 1; t >= 0 ; t--)
        {
            if (this.isContainer(t)) return t;
        }
        return 0;
    },
    
    getLevel: function(idx)
    {
        if (this.isContainer(idx)) return 0;
        return 1;
    },
    
    hasNextSibling: function(idx, after)
    {
        var thisLevel = this.getLevel(idx);
        for (var t = idx + 1; t < this.treeData.length; t++)
        {
            var nextLevel = this.getLevel(t);
            if (nextLevel == thisLevel) return true;
            else if (nextLevel < thisLevel) return false;
        }
        return false;
    },
    
    toggleOpenState: function(idx)
    {
        try
        {
            var item = this.treeData[idx];
            
            if (!item[this.COL_IS_CONTAINER]) return;
            
            if (item[this.COL_IS_OPEN])
            {
                // Close an open URL, delete the notes from the tree.
                item[this.COL_IS_OPEN] = false;
                
                var thisLevel = this.getLevel(idx);
                var deleteCount = 0;
                for (var t = idx + 1; t < this.treeData.length; t++)
                {
                    if (!this.isContainer(t)) deleteCount++;
                    else break;
                }
                
                if (0 < deleteCount)
                {
                    this.deleteRows(idx + 1, deleteCount);
                }
                
                return deleteCount;
            }
            else
            {
                // Open a closed URL, add the notes to the tree.
                item[this.COL_IS_OPEN] = true;
                
                var urlData = this.treeData[idx][this.COL_LOOKUP];
                var notesToInsert = this.getNotesForManagerURLData(urlData);
                this.addNotes(idx + 1, notesToInsert);
                return notesToInsert.length;
            }
        }
        catch (ex)
        {
            this.utils.handleException("Exception caught when toggling state.", ex);
        }
    },
    
    getManagerURLData: function(note)
    {
        this.utils.assertClassError(note, "InternoteNote", "Not a note when getting manager URL data.");
        
        if (note.matchType == this.storage.URL_MATCH_REGEXP)
        {
            return "regexp:" + note.url;
        }
        else if (note.matchType == this.storage.URL_MATCH_SITE ||
                 note.matchType == this.storage.URL_MATCH_SUFFIX)
        {
            return "category:" + this.storage.getEffectiveSite(note);
        }
        else
        {
            var effectiveURL = this.storage.getEffectiveURL(note);
            if (effectiveURL == null)
            {
                if (this.utils.trim(note.url) == "")
                {
                    return "category:";
                }
                else
                {
                    return "invalidurl:";
                }
            }
            else
            {
                return "category:" + effectiveURL;
            }
        }
    },
    
    areNotesForManagerURLData: function(searchURLData)
    {
        return this.storage.allNotes.some(function(note)
        {
            return note != null && this.getManagerURLData(note) == searchURLData;
        }, this);
    },
    
    getNotesForManagerURLData: function(searchURLData)
    {
        this.utils.assertError(typeof(searchURLData) == "string", "Search URL data is not a string.", searchURLData);
        
        return this.storage.allNotes.filter(function(note)
        {
            return note != null && this.getManagerURLData(note) == searchURLData;
        }, this);
    },
    
    makeURLRow: function(urlData)
    {
        var [category, url] = this.utils.simpleSplit(urlData, ":");
        
        if (category == "regexp")
        {
            if (url == "")
            {
                var categoryStyle = "empty_data";
                var urlDesc = this.utils.getLocaleString("EmptyRegexpMessage");
            }
            else
            {
                var categoryStyle = "url_regexp";
                var regexpPrefix = this.utils.getLocaleString("RegexpAbbreviation") + ": ";
                var urlDesc = regexpPrefix + url;
            }
        }
        else if (category == "invalidurl")
        {
            var categoryStyle = "empty_data";
            var urlDesc = this.utils.getLocaleString("InvalidURLMessage");
        }
        else
        {
            if (url == "")
            {
                var categoryStyle = "empty_data";
                var urlDesc = this.utils.getLocaleString("EmptyURLMessage");
            }
            else
            {
                var categoryStyle = "url_category";
                
                if (this.utils.parseURL(url) == null)
                {
                    var urlDesc = url;
                }
                else
                {
                    var strippedURL = url.replace(/^[a-zA-Z]*:\/\/\//g, ""); // 3 slashes
                    strippedURL  = strippedURL.replace(/^[a-zA-Z]*:\/\//g,   ""); // 2 slashes
                    if (strippedURL == "") strippedURL = url;
                    var urlDesc = strippedURL;
                }
            }
        }
        
        return [urlDesc, true, false, urlData, categoryStyle];
    },
    
    makeNoteRow: function(note)
    {
        var [desc, style] = this.getTextDescription(note);
        return [desc, false, false, note.num, style];
    },
    
    addURLRow: function(urlData)
    {
        var newTreeIndex = this.treeData.length; // XXX This assumes adding to the end.
        this.treeData.push(this.makeURLRow(urlData));
        this.treeBox.rowCountChanged(newTreeIndex, 1);
        return newTreeIndex;
    },
    
    insertNoteRow: function(index, note)
    {
        this.treeData.splice        (index, 0, this.makeNoteRow(note));
        this.treeBox.rowCountChanged(index, 1);
    },
    
    addNotes: function(startIndex, notes)
    {
        var rowArray = notes.map(this.makeNoteRow, this);
        this.utils.pushArray(this.treeData, rowArray, startIndex);
        this.treeBox.rowCountChanged(startIndex, rowArray.length);
    },
    
    deleteRows: function(startIndex, count)
    {
        this.treeData.splice        (startIndex,  count);
        this.treeBox.rowCountChanged(startIndex, -count);
    },
    
    getTextDescription: function(note)
    {
        this.utils.assertError(note != null, "Note is null when trying to get description.");
        
        var text = this.utils.trim(note.text);
        if (text == "")
        {
            var emptyTextMessage = this.utils.getLocaleString("EmptyTextMessage");
            return [emptyTextMessage, "empty_data"];
        }
        else
        {
            return [this.utils.innerTrim(text.replace(/\n/g, " ")), "text_data"];
        }
    },
    
    updateText: function(treeIndex, note)
    {
        var [desc, style] = this.getTextDescription(note);
        this.treeData[treeIndex][this.COL_TEXT ] = desc;
        this.treeData[treeIndex][this.COL_STYLE] = style;
        this.treeBox.invalidateRow(treeIndex);
    },
    
    getCellProperties: function(row, col, props)
    {
        var atomService = this.utils.getCCService("@mozilla.org/atom-service;1", "nsIAtomService");
        var style = this.treeData[row][this.COL_STYLE];
        props.AppendElement(atomService.getAtom(style));
    },
    
    getImageSrc: function(idx, column) {},
    getProgressMode : function(idx, column) {},
    getCellValue: function(idx, column) {},
    cycleHeader: function(col, elem) {},
    selectionChanged: function () {},
    cycleCell: function(idx, column) {},
    getRowProperties: function(idx, column, prop) {},
    getColumnProperties: function(column, element, prop) {}
}

};
