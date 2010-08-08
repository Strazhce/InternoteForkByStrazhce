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
isRelocating: false,

noteBeingEdited: null,

editingFields: ["noteURL", "colorEntryBox", "textColorEntryBox", "ignoreAnchor", "ignoreParams",
                "deleteCurrentNote", "resetCurrentNote", "matchTypeEntryBox", "isMinimized"],

actions: ["deleteSelected", "resetSelected", "exportSelected", "printSelected"],

init: function()
{
    //dump("internoteManager.init\n");
    
    this.utils   = internoteUtilities;
    this.prefs   = internotePreferences;
    this.consts  = internoteConstants;
    
    this.utils.init();
    this.prefs.init(this.utils);
    
    try
    {
        InternoteEventDispatcher.prototype.incorporateED(InternoteStorage.prototype);
        InternoteEventDispatcher.prototype.incorporateED(InternoteStorageWatcher.prototype);
        
        this.storage = InternoteStorage.makeStorage();
        
        this.initTreeView();
        
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
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught while initializing manager.", ex);
    }
},

initTreeView: function()
{
    var urls = {};
    
    for (var i = 0; i < this.storage.allNotes.length; i++)
    {
        var note = this.storage.allNotes[i];
        if (note != null)
        {
            var url = this.utils.canonicalizeURL(this.storage.getEffectiveURL(note));
            urls[url] = 1;
        }
    }
    
    var sortedURLs = this.utils.getSortedKeys(urls);
    
    this.treeView.treeData = [];
    
    for (var i = 0; i < sortedURLs.length; i++)
    {
        var urls = sortedURLs[i];
        this.treeView.treeData.push(this.makeURLRow(sortedURLs[i]));
    }
    
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
        var urlTreeIndex = this.getURLTreeIndex(this.storage.getEffectiveURL(note));
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
        this.treeRemoveNote(event.note, this.storage.getEffectiveURL(event.note));
        
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
            var description = this.getDescription(note);
            this.treeView.treeData[treeIndex][this.treeView.COL_TEXT] = description;
            this.treeView.treeBox.invalidateRow(treeIndex);
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
    var oldEffectiveURL = this.treeView.treeData[urlIndex][this.treeView.COL_LOOKUP];
    
    var newEffectiveURL = this.storage.getEffectiveURL(note);
    
    //dump("newURL = " + newEffectiveURL + "\n");
    //dump("oldURL = " + oldEffectiveURL + "\n");
    
    if (this.utils.canonicalizeURL(oldEffectiveURL) == this.utils.canonicalizeURL(newEffectiveURL))
    {
        return;
    }
    
    this.isRelocating = true; // Prevent normal select events.
    
    // We pass the old URL to remove in case we must delete an old collapsed category.
    var [wasSelected, wasCategoryOpen] = this.treeRemoveNote(event.note, event.data2[1]);
    var shouldForceCategoryOpen = wasCategoryOpen || wasSelected;
    var newIndex = this.treeCreateNote(event.note, shouldForceCategoryOpen);
    
    if (wasCategoryOpen && wasSelected)
    {
        this.treeView.selection.select(newIndex);
    }
    
    this.isRelocating = false;
},

onNoteRelocated: function(event)
{
    //dump("internoteManager.onNoteRelocated\n");
    
    try
    {
        this.checkForLocationChange(event);
        this.setNoteData(event.note.num);
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
            this.setNoteData(this.noteBeingEdited.num);
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting update note data in right panel.", ex);
    }
},

makeURLRow: function(url)
{
    var description = this.getURLDescription(url);
    return [description, true, false, url];
},

makeNoteRow: function(note)
{
    var description = this.getDescription(note);
    return [description, false, false, note.num];
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
    var searchURL2 = this.utils.canonicalizeURL(searchURL);
    for (var i = 0; i < this.treeView.treeData.length; i++)
    {
        var isContainer = this.treeView.treeData[i][this.treeView.COL_IS_CONTAINER];
        if (isContainer)
        {
            var currentURL = this.utils.canonicalizeURL(this.treeView.treeData[i][this.treeView.COL_LOOKUP]);
            if (searchURL2 == currentURL)
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

setNoteData: function(noteNum)
{
    //dump("internoteManager.setNoteData\n");
    
    var note = this.noteBeingEdited = this.storage.allNotes[noteNum];
    
    this.isUpdating = true;
    
    if (note != null)
    {
        if (this.storage.getEffectiveURL(note) == "") // XXX Should be a valid URL check.
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
    
    if (!this.storage.areIgnoresApplicable(note))
    {
        ignoreAnchor.setAttribute("disabled", "true");
        ignoreParams.setAttribute("disabled", "true");        
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

userSelectsTreeElement: function()
{
    //dump("internoteManager.userSelectsTreeElement\n");
    
    try
    {
    
        if (this.isRelocating) return;
        
        var currentTreeIndex = this.tree.currentIndex;
        var isContainer = this.treeView.isContainer(currentTreeIndex);
        
        // Load the data into the editing panel.
        // XXX Should probably disable for multiple.
        if (!isContainer && this.isValidTreeIndex(currentTreeIndex))
        {
            var noteNum = this.treeView.treeData[currentTreeIndex][this.treeView.COL_LOOKUP];
            this.setNoteData(noteNum);
            this.utils.enableMultiple(this.actions);
        }
        else
        {
            this.utils.disableMultiple(this.actions);
            this.clearNoteData();
        }
        
        // Deselect search tree.  Check first to prevent infinite recursion when selection changes.
        // XXX Should probably support Ctrl-Click not deselecting the other tree, so they work together.
        var resultsList = document.getElementById("resultsList");
        if (resultsList.view != null)
        {
            var selection = resultsList.view.selection;
            if (selection.getRangeCount() != 0)
            {
                selection.clearSelection();
            }
        }
    }
    catch (ex)
    {
        this.utils.handleException("Except caught when user selected tree element.", ex);
    }
},

userSelectsSearchElement: function()
{
    try
    {
        var currentTreeIndex = document.getElementById("resultsList").currentIndex;
        var noteNum = this.searchMapping[currentTreeIndex];

        // Load the data into the editing panel.
        // XXX Should probably disable for multiple.
        this.setNoteData(noteNum);
        this.utils.enableMultiple(this.actions);

        // Deselect main tree.  Check first to prevent infinite recursion when selection changes.
        var selection = this.treeView.selection;
        if (selection.getRangeCount() != 0)
        {
            selection.clearSelection();
        }
    }
    catch (ex)
    {
        this.utils.handleException("Except caught when user selected search element.", ex);
    }
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

getViewSelectedNotes: function(treeView, getNoteFunc)
{
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
            var note = getNoteFunc(v);
            if (note != null) selectedNotes.push(note);
        }
    }
    
    //selectedNotes.sort(this.utils.numericSort);
    
    return selectedNotes;
},

getAllSelectedNotes: function()
{
    // XXX What a ridiculous kludge.
    function getNoteFromTree(treeIndex)
    {
        if (this.treeView.isContainer(treeIndex))
        {
            return null;
        }
        else
        {
            return this.getRowNote(treeIndex);
        }
    }
    
    var selectedNotes = this.getViewSelectedNotes(this.treeView, this.utils.bind(this, getNoteFromTree));
    
    if (selectedNotes.length == 0)
    {
        var resultsList = document.getElementById("resultsList");
        if (resultsList.view != null)
        {
            function getNoteFromSearch(treeIndex)
            {
                var noteNum = this.searchMapping[treeIndex];
                return this.storage.allNotes[noteNum];
            }
            selectedNotes = this.getViewSelectedNotes(resultsList.view, this.utils.bind(this, getNoteFromSearch));
        }
    }
    
    return selectedNotes;
},

userDeletesNotes: function (shouldDeleteAllSelected)
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
            var note = notesToDelete[i];
            this.storage.removeNote(note);
        }
    }
},

getURLDescription: function(url)
{
    if (url == "")
    {
        var emptyURLMessage = this.utils.getLocaleString("EmptyURLMessage");
        return "--- " + emptyURLMessage + " ---";
    }
    else
    {
        var strippedURL = url.replace(/^[a-zA-Z]*:\/\/\//g, ""); // 3 slashes
        strippedURL  = strippedURL.replace(/^[a-zA-Z]*:\/\//g,   ""); // 2 slashes
        if (strippedURL == "") strippedURL = url;
        return strippedURL;
    }
},

getDescription: function(note)
{
    //var note = this.storage.allNotes[noteNum];
    this.utils.assertError(note != null, "Note is null when trying to update in manager.");
    
    var text = this.utils.trim(note.text);
    if (text == "")
    {
        var emptyTextMessage = this.utils.getLocaleString("EmptyTextMessage");
        return "--- " + emptyTextMessage + " ---";
    }
    else
    {
        return this.utils.innerTrim(text.replace(/\n/g, " "));
    }
},

treeCreateNote: function(note, shouldForceCategoryOpen)
{
    //dump("internoteManager.treeCreateNote\n");
    
    var urlTreeIndex = this.getURLTreeIndex(this.storage.getEffectiveURL(note));
    
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
            this.treeView.treeData.splice        (urlTreeIndex + 1, 0, this.makeNoteRow(note));
            this.treeView.treeBox.rowCountChanged(urlTreeIndex + 1, 1);
            return urlTreeIndex + 1; // XXX This assumption will be wrong when the tree becomes sorted.
        }
    }
    else
    {
        //dump("  Creating category.\n");
        
        // URL category doesn't exist, create it collapsed.
        var newTreeIndex = this.treeView.treeData.length; // XXX This assumes adding to the end.
        var url = this.utils.canonicalizeURL(this.storage.getEffectiveURL(note));
        this.treeView.treeData.push(this.makeURLRow(url));
        this.treeView.treeBox.rowCountChanged(newTreeIndex, 1);
        
        if (shouldForceCategoryOpen)
        {
            //dump("  Forcing category open.\n");
            this.treeView.toggleOpenState(newTreeIndex);
        }
        
        return newTreeIndex + 1;
    }
},

treeRemoveNote: function(note, url)
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
            this.treeView.treeData.splice        (treeIndex - 1,  2);
            this.treeView.treeBox.rowCountChanged(treeIndex - 1, -2);
        }
        else
        {
            //dump("  Delete just the note.\n");
            // Delete just the note.
            this.treeView.treeData.splice        (treeIndex,  1);
            this.treeView.treeBox.rowCountChanged(treeIndex, -1);
        }
    }
    else
    {
        // Even if we can't see the note, it may be collapsed, so search for its URL.
        // We take the URL from the tree, not the note, as this may be called
        // in response to a relocation, where the note URL will have changed.
        
        var urlTreeIndex = this.getURLTreeIndex(url);
        if (urlTreeIndex != -1 && !this.storage.isURLPresent(url))
        {
            //dump("  Removing.\n");
            // Delete the URL heading.
            this.treeView.treeData.splice        (urlTreeIndex,  1);
            this.treeView.treeBox.rowCountChanged(urlTreeIndex, -1);
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
        
        tc.setAttribute("label", this.getDescription(note));
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
            rowNode.firstChild.firstChild.setAttribute("label", this.getDescription(note));
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
    if (this.noteBeingEdited != null && this.storage.getEffectiveURL(this.noteBeingEdited) != "")
    {
        var noteURL = document.getElementById("noteURL").value;
        
        var prefService = this.utils.getCCService("@mozilla.org/preferences-service;1", "nsIPrefService");
        var prefs = prefService.getBranch("browser.link.");
        if (prefs.getPrefType("open_external") != 0)
        {
            var bloe = prefs.getIntPref("open_external");
            if (bloe == 1) openInNewWindow = false;
            else if (bloe == 2) openInNewWindow = true;
            else if (bloe == 3) openInNewWindow = false;
            else this.utils.assertErrorShouldNotBeHere("Unknown open_external value.");
        }
        
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
            
            alert(message);
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
            this.treeView.toggleOpenState(selected[i]);
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
        this.utils.handleException("Exception caught when attempting to export V2 notes.", ex);
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
    
    treeData: null,
    treeBox: null,
    selection: null,
    
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
        try {
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
            var nextLevel = this.getLevel(t)
            if (nextLevel == thisLevel) return true;
            else if (nextLevel < thisLevel) return false;
        }
        return false;
    },
    
    toggleOpenState: function(idx)
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
                this.treeData.splice        (idx + 1, deleteCount);
                this.treeBox.rowCountChanged(idx + 1, -deleteCount);
            }
        }
        else {
            // Open a closed URL, add the notes to the tree.
            item[this.COL_IS_OPEN] = true;
            
            var url = this.treeData[idx][this.COL_LOOKUP];
            var notesToInsert = internoteManager.storage.getNotesForEffectiveURL(url);
            //var newData = notesToInsert.map(this.makeNoteRow);
            
            var data = [];
            for (var i = 0; i < notesToInsert.length; i++)
            {
                data.push(internoteManager.makeNoteRow(notesToInsert[i]));
            }
            
            // We need to apply because we have an array and need to pass multi-args to splice.
            // It will be quicker to splice them all at once rather than several inserts in the middle.
            this.treeData.splice.apply(this.treeData, [idx + 1, 0].concat(data));
            this.treeBox.rowCountChanged(idx + 1, notesToInsert.length);
        }
        //this.treeBox.invalidate();
    },
    
    getImageSrc: function(idx, column) {},
    getProgressMode : function(idx, column) {},
    getCellValue: function(idx, column) {},
    cycleHeader: function(col, elem) {},
    selectionChanged: function () {},
    cycleCell: function(idx, column) {},
    
    performAction: function(action)
    {
        // This doesn't seem to work, it looks like FF doesn't support it properly.
        if (action == "delete")
        {
            internoteManager.deleteNote();
        }
        else
        {
            internoteUtilities.assertNotHere("Unknown action " + action);
        }
    },
    
    performActionOnCell: function(action, index, column) {},
    getRowProperties: function(idx, column, prop) {},
    getCellProperties: function(idx, column, prop) {},
    getColumnProperties: function(column, element, prop) {}
}

};
