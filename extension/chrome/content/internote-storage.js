// Internote Extension
// Note Storage Facility
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

// This is where are the notes are stored in memory.

// This class expects incorporatation of the event dispatcher, this needs to be done
// by initialisation code.

// XXX Use constants
// XXX Should modify so that it won't save for (say) 10 secs if events continue to come in.
// XXX io.js ???
// XXX Async loading?

Components.utils.import("resource://internotejs/internote-shared-global.jsm");

if (internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.Storage == null)
{

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.Storage =
    function() {};

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.Storage.prototype =
    new internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.EventDispatcher();

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.Storage.prototype.incorporate("Storage", {

StorageEvent: function StorageEvent(note, data1, data2)
{
    this.note  = note;
    this.data1 = data1;
    this.data2 = data2;
},

InternoteNote: function InternoteNote(url, matchType, ignoreAnchor, ignoreParams, text, left, top, width, height, backColor, foreColor, createTime, modfnTime, zIndex, isMinimized, isHTML)
{
    if (arguments.length >= 1)
    {
        this.url          = url;
        this.matchType    = matchType;
        this.ignoreAnchor = ignoreAnchor;
        this.ignoreParams = ignoreParams;
        
        this.text         = text;
        this.left         = left;
        this.top          = top;
        this.width        = width;
        this.height       = height;
        this.backColor    = backColor;
        this.foreColor    = foreColor;
        this.createTime   = createTime;
        this.modfnTime    = modfnTime;
        this.zIndex       = zIndex;
        this.isMinimized  = isMinimized;
        this.isHTML       = isHTML;
    }
},

NOTE_WIDTHS:  [150, 150, 200, 350],
NOTE_HEIGHTS: [100, 150, 250, 350],

BACKGROUND_COLOR_SWABS: ["#FFFF99", "#FF9956", "#57BCD9", "#B0FF56", "#CB98FF", "#ECE5FC"],
FOREGROUND_COLOR_SWABS: ["#000000", "#7F5300", "#00FF00", "#FF0000", "#ADADAD", "#FFFFFF"],

STORAGE_FILENAME: "internote-storage.xml",
BACKUP_FILENAME:  "internote-storage-old.xml",
LEGACY_FILENAME:  "stickies",
CORRUPTED_FILENAME: "internote-storage-corrupted.xml",

MIN_NOTE_WIDTH:  150,
MIN_NOTE_HEIGHT: 100,
MAX_NOTE_WIDTH:  400,
MAX_NOTE_HEIGHT: 400,

// A short save delay to allow multiple events to build up.
SAVE_DELAY: 2000,

saveTimeout: null,

loadStatus: 0,

LOAD_DIR_DOESNT_EXIST: -2,
LOAD_LEGACY_FAILED: -1,
LOAD_FAILED: 0,

LOAD_SUCCESS: 1,
LOADED_FROM_SCRATCH: 2,
LOADED_FROM_LEGACY: 3,
LOADED_FROM_BACKUP: 4,

URL_MATCH_URL:    0,
URL_MATCH_REGEXP: 1,
URL_MATCH_PREFIX: 2,
URL_MATCH_SITE:   3,
URL_MATCH_SUFFIX: 4,
URL_MATCH_ALL:    5,

areNotesDisplaying: true,

init: function(anyMainWindowDoc)
{
    //dump("InternoteStorage\n");
    
    this.isInitialising  = true;
    
    this.utils      = internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils;
    this.prefs      = internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.prefs;
    this.serializer = XMLSerializer;
    this.xml        = XML;
    
    // Get these now, in case they're not there later due to design (not sure) or bugs (probably occur from what I've seen).
    this.domImpl     = anyMainWindowDoc.implementation;
    this.welcomeText = this.utils.getLocaleString(anyMainWindowDoc, "WelcomeNote").replace(/\\n/g, "\n");
    this.emptyText   = "--- " + this.utils.getLocaleString(anyMainWindowDoc, "EmptyTextDescription") +  " ---";
    
    // We deliberately store the same storage location for the entire session.
    // This makes handling change of location preference much easier - next run.

    this.storageLoc = this.prefs.getModifiedSaveLocation();
    
    if (this.storageLoc == null)
    {
        this.storageLoc = this.utils.getProfileDir();
    }
    
    this.allNotes     = [];
    
    this.initEventDispatcher();
    this.observePrefsChanges();
    
    this.loadStorage();
    
    this.createEvent("noteDisplayToggled");
    this.createEvent("storageFailed");
    
    this.createEvent("translucencyChanged");
    this.createEvent("fontSizeChanged");
    this.createEvent("scrollbarChanged");
    this.createEvent("statusbarChanged");
    
    this.createEvent("noteAdded");
    this.createEvent("noteRemoved");
    this.createEvent("noteRaised");
    this.createEvent("noteEdited");
    this.createEvent("noteRelocated");
    this.createEvent("noteMoved");
    this.createEvent("noteResized");
    this.createEvent("noteForeRecolored");
    this.createEvent("noteBackRecolored");
    this.createEvent("noteReset");
    this.createEvent("notesMinimized");
    
    this.isInitialising = false;
    
    this.usageCount = 1;
    
    if (this.prefs.detectFirstRun())
    {
        this.addWelcomeNote();
    }
    
    this.InternoteNote.prototype.getDims = function() { return [this.width, this.height]; };
    this.InternoteNote.prototype.getPos  = function() { return [this.left,  this.top   ]; };
    
    var myStorageEventClass = this.StorageEvent;
    
    this.StorageEvent.prototype.clone = function()
    {
        // Importantly this won't clone .name which the event dispatcher adds.
        return new myStorageEventClass(this.note, this.data1, this.data2);
    };
},

destroy: function()
{
    this.utils.assertError(this.usageCount == 0, "Tried to destroy used storage.", this.usageCount);
    
    //dump("InternoteStorage.destroy\n")
    if (this.saveTimeout != null)
    {
        //dump("  Saving ...\n")
        
        this.utils.cancelTimer(this.saveTimeout);
        this.saveXMLNow();
    }
},

observePrefsChanges: function()
{
    var utils = this.utils;
    
    var observeFunc = this.utils.bind(this, function(subject, topic, data)
    {
        try
        {
            if (topic == "nsPref:changed")
            {
                if (data == "transparency")
                {
                    this.dispatchEvent("translucencyChanged", new this.StorageEvent());
                }
                else if (data == "fontsize")
                {
                    this.dispatchEvent("fontSizeChanged", new this.StorageEvent());
                }
                else if (data == "usenativescroll")
                {
                    this.dispatchEvent("scrollbarChanged", new this.StorageEvent());
                }
                else if (data == "usestatusbar")
                {
                    this.dispatchEvent("statusbarChanged", new this.StorageEvent());
                }
            }
        }
        catch (ex)
        {
            utils.handleException("Exception caught when attempting to observe a prefs change.", ex);
        }
    });
    
    this.prefs.addPrefsObserver(observeFunc);
},

toggleNoteDisplay: function()
{
    this.areNotesDisplaying = !this.areNotesDisplaying;
    this.dispatchEvent("noteDisplayToggled", new this.StorageEvent());
},

// Only for simple events, eg statusBarDisplayToggled.
dispatchGlobalEvent: function(ev)
{
    this.dispatchEvent(ev, new this.StorageEvent());
},

checkInvariant: function(note, shouldCheckNum)
{
    try
    {
        //dump("InternoteStorage.checkInvariant\n");
        
        if (shouldCheckNum)
        {
            this.utils.assertError(this.utils.isNonNegativeNumber(note.num   ),  "Note.num is invalid");
        }
        this.utils.assertError(typeof(note.url   ) == "string",                "Note.url is invalid",          note.url);
        this.utils.assertError(this.utils.isNonNegativeNumber(note.matchType), "Note.matchType is invalid",    note.matchType);
        this.utils.assertError(this.utils.isBoolean(note.ignoreAnchor),        "Note.ignoreAnchor is invalid", note.ignoreAnchor);
        this.utils.assertError(this.utils.isBoolean(note.ignoreParams),        "Note.ignoreParams is invalid", note.ignoreParams);
        
        this.utils.assertError(typeof(note.text  ) == "string",             "Note.text is invalid",        note.text);
        this.utils.assertError(this.utils.isNonNegativeNumber(note.left  ), "Note.left is invalid",        note.left);
        this.utils.assertError(this.utils.isNonNegativeNumber(note.top   ), "Note.top is invalid",         note.top);
        this.utils.assertError(this.utils.isNonNegativeNumber(note.width ), "Note.width is invalid",       note.width);
        this.utils.assertError(this.utils.isNonNegativeNumber(note.height), "Note.height is invalid",      note.height);
        this.utils.assertError(this.utils.isHexColor(note.backColor),       "Note.backColor is invalid",   note.backColor);
        this.utils.assertError(this.utils.isHexColor(note.foreColor),       "Note.foreColor is invalid",   note.foreColor);
        this.utils.assertError(this.utils.isOptionalDate(note.createTime),  "Note.createTime is invalid",  note.createTime);
        this.utils.assertError(this.utils.isOptionalDate(note.modfnTime),   "Note.modfnTime is invalid",   note.modfnTime);
        this.utils.assertError(this.utils.isNonNegativeNumber(note.zIndex), "Note.zIndex is invalid",      note.zIndex);
        this.utils.assertError(this.utils.isBoolean(note.isMinimized),      "Note.isMinimized is invalid", note.isMinimized);
    }
    catch (ex)
    {
        dump("Invariant failed on this note:\n");
        this.utils.dumpTraceData(note);
        throw ex;
    }
},

getXMLTextNode: function(xmlNode)
{
    var textNode = null;
    
    // Don't assume there's one and only one child node that is text,
    // for reasons of forward compatibility.
    for (var i = 0; i < xmlNode.childNodes.length; i++)
    {
        var node = xmlNode.childNodes[i];
        if (node.nodeType == 3)
        {
            return node;
        }
    }
    
    return null;
},

indicateDataChanged: function(note)
{
    note.modfnTime = new Date().getTime();
    
    note.xml.setAttribute("url",          note.url        );
    note.xml.setAttribute("matchType",    note.matchType  );
    note.xml.setAttribute("ignoreAnchor", note.ignoreAnchor);
    note.xml.setAttribute("ignoreParams", note.ignoreParams);
    
    note.xml.setAttribute("left",         note.left       );
    note.xml.setAttribute("top",          note.top        );
    note.xml.setAttribute("width",        note.width      );
    note.xml.setAttribute("height",       note.height     );
    note.xml.setAttribute("backColor",    note.backColor  );
    note.xml.setAttribute("foreColor",    note.foreColor  );
    note.xml.setAttribute("modfnTime",    note.modfnTime  );
    note.xml.setAttribute("zIndex",       note.zIndex     );
    note.xml.setAttribute("isMinimized",  note.isMinimized);
    note.xml.setAttribute("isHTML",       note.isHTML     );
    
    // XXX Delete next version - for downgrade compatibility
    note.xml.setAttribute("isURLRegexp",  note.matchType == this.URL_MATCH_REGEXP);
    
    var textNode = this.getXMLTextNode(note.xml);
    if (textNode == null)
    {
        textNode = this.doc.createTextNode(note.text);
        note.xml.appendChild(textNode);
    }
    else
    {
        textNode.nodeValue = note.text;
    }
    
    this.scheduleXMLSave();
},

scheduleXMLSave: function()
{
    //dump("InternoteStorage.scheduleXMLSave\n");
    
    if (this.saveTimeout == null)
    {
        //dump("  Save scheduled.\n");
        
        // We don't save the changes immediately to prevent continual resaving.
        try
        {
            this.saveTimeout = this.utils.createTimeout(this.utils.bind(this, function() {
                this.saveXMLNow();
            }), this.SAVE_DELAY);
        }
        catch (ex)
        {
            // Workaround firefox bug #580570.
            this.utils.handleException("Failure to schedule save, falling back to immediate.", ex);
            try
            {
                this.saveXMLNow();
            }
            catch (ex2)
            {
                this.utils.handleException("Exception caught when doing fallback save.", ex2);
            }
        }
    }
    else
    {
        //dump("  Save pending.\n");
    }
},

saveXMLNow: function()
{
    //dump("InternoteStorage.saveXMLNow\n");
    
    this.saveTimeout = null; // do this first just in case things fail temporarily
    
    try
    {
        // First let's make a backup in case we crash in the middle of writing.
        // We skip this if we loaded from the backup because the main was corrupted.
        if (this.loadStatus != this.LOADED_FROM_BACKUP)
        {
            var storageFile = this.storageLoc.clone();
            storageFile.append(this.STORAGE_FILENAME);
            
            if (storageFile.exists())
            {
                storageFile.moveTo(null, this.BACKUP_FILENAME);
            }
        }
        
        storageFile = this.storageLoc.clone();
        storageFile.append(this.STORAGE_FILENAME);
        
        var stream = this.utils.getCCInstance("@mozilla.org/network/file-output-stream;1", "nsIFileOutputStream");
        stream.init(storageFile, 0x02 | 0x08 | 0x20, 0664, 0);
        
        var serializer = new this.serializer();
        
        var prettyString = this.xml(serializer.serializeToString(this.doc)).toXMLString();
        
        var converter = this.utils.getCCInstance("@mozilla.org/intl/converter-output-stream;1", "nsIConverterOutputStream");
        converter.init(stream, "UTF-8", 0, 0);
        converter.writeString(prettyString);
        converter.close(); // this closes foStream
        
        this.loadStatus = this.LOAD_SUCCESS; // Everything is fine again.
    }
    catch (ex)
    {
        this.utils.handleException("Failed to save internotes.", ex);
        this.dispatchEvent("storageFailed", new this.StorageEvent());
    }
},

// This tries to load from the primary storage, backup storage, legacy storage,
// and if none exist just creates a new storage.
loadStorage: function()
{
    var primaryFailed = false;
    
    if (!this.storageLoc.exists())
    {
        this.loadStatus = this.LOAD_DIR_DOESNT_EXIST;
        return;
    }
    
    // First try to open the primary storage file.
    var primaryStorage = this.storageLoc.clone();
    primaryStorage.append(this.STORAGE_FILENAME);
    
    if (primaryStorage.exists())
    {
        try
        {
            this.loadStorageFile(primaryStorage);
            this.loadStatus = this.LOAD_SUCCESS;
            return;
        }
        catch (ex)
        {
            primaryFailed = true;
            
            this.utils.handleException("Failed to load storage file.", ex);
            
            try
            {
                primaryStorage.copyTo(null, this.CORRUPTED_FILENAME);
            }
            catch (ex2) {
                this.utils.handleException("Failed to move corrupted storage file.", ex2);
            }
        }
    }
    
    // Next try to open the backup storage file.
    // This might indicate we crashed in the middle of writing the primary file.
    var backupStorage = this.storageLoc.clone();
    backupStorage.append(this.BACKUP_FILENAME);
    
    if (backupStorage.exists())
    {
        foundStorage = true;
        try
        {
            this.loadStorageFile(backupStorage);
            this.loadStatus = this.LOADED_FROM_BACKUP;
            return;
        }
        catch (ex)
        {
            this.loadStatus = this.LOAD_FAILED;
            this.utils.handleException("Failed to load backup storage file.", ex);
            return;
        }
    }
    
    // Now if we found storage but we couldn't open it, we're in trouble, so fail.
    if (primaryFailed)
    {
        this.loadStatus = this.LOAD_FAILED;
        return;
    }
    
    // No storage is available, so create something from scratch.
    this.createEmptyStorage();
    
    // But first we look for legacy storage.
    var legacyStorage = this.prefs.shouldUseOtherSaveLoc()
                      ? this.storageLoc.clone()
                      : this.utils.getCCInstance("@mozilla.org/file/directory_service;1", "nsIProperties")
                                  .get("UChrm", this.utils.getCIInterface("nsIFile"));
    legacyStorage.append(this.LEGACY_FILENAME);
    
    if (legacyStorage.exists())
    {
        try
        {
            var text = this.utils.readStringFromFilename(legacyStorage.path);
            var notes = this.loadInternoteV2(text);
            
            for (var i = 0; i < notes.length; i++)
            {
                this.addNote(notes[i]);
            }
            
            this.loadStatus = this.LOADED_FROM_LEGACY;
        }
        catch (ex)
        {
            this.loadStatus = this.LOAD_LEGACY_FAILED;
        }
    }
    else
    {
        this.loadStatus = this.LOADED_FROM_SCRATCH;
    }
},

// Attempt to load storage from the specified file.  On failure, return null.
loadStorageFile: function(storageFile)
{
    this.doc = this.utils.loadXML(storageFile);
    this.notesNode = this.doc.getElementsByTagName("notes")[0];
    var notes = this.loadInternoteV3(this.doc, true);
    
    for (var i = 0; i < notes.length; i++)
    {
        this.addNoteToList(notes[i]);
        
        if (!notes[i].xml.hasAttribute("guid"))
        {
            notes[i].xml.setAttribute("guid", this.utils.generateIdentifier());
        }
    }
},

createEmptyStorage: function()
{
    this.doc = this.domImpl.createDocument("", "", null);
    //var decl = doc.createXMLDeclaration("1.0", "utf-8", null);
    
    var root = this.doc.createElement("internote");
    this.doc.appendChild(root);
    
    this.notesNode = this.doc.createElement("notes");
    root.appendChild(this.notesNode);
},

loadInternoteV3: function(storageDoc, includeXML)
{
    var notes = [];
    
    var noteElts = storageDoc.getElementsByTagName("note");
    for (var i = 0; i < noteElts.length; i++)
    {
        var element = noteElts[i];
        
        var textNode = this.getXMLTextNode(element);
        var text     = (textNode == null) ? "" : textNode.nodeValue;
        
        if (element.hasAttribute("matchType"))
        {
            var matchType = parseInt(element.getAttribute("matchType"));
        }
        else
        {
            // Handle old alpha1 isURLRegexp field, remove this eventually.
            var matchType = this.utils.getXMLBoolean(element, "isURLRegexp", false)
                          ? this.URL_MATCH_REGEXP
                          : this.URL_MATCH_URL;
        }
        
        var url         = element.getAttribute("url");
        var ignoreAnchor= this.utils.getXMLBoolean(element, "ignoreAnchor", false);
        var ignoreParams= this.utils.getXMLBoolean(element, "ignoreParams", false);
        
        var left        = this.utils.getXMLInt(element, "left", 0);
        var top         = this.utils.getXMLInt(element, "top", 0);
        var noteWidth   = this.utils.getXMLInt(element, "width", 200);
        var noteHeight  = this.utils.getXMLInt(element, "height", 200);
        var backColor   = element.getAttribute("backColor");
        var foreColor   = element.getAttribute("foreColor");
        var createTime  = this.utils.parseOptionalDate(element.getAttribute("createTime"));
        var modfnTime   = this.utils.parseOptionalDate(element.getAttribute("modfnTime"));
        var zIndex      = this.utils.getXMLInt(element, "zIndex", 0);
        var isMinimized = this.utils.getXMLBoolean(element, "isMinimized", false);
        var isHTML      = this.utils.getXMLBoolean(element, "isHTML",      false);
        
        var note = new this.InternoteNote(url, matchType, ignoreAnchor, ignoreParams, text,
                                          left, top, noteWidth, noteHeight, backColor, foreColor,
                                          createTime, modfnTime, zIndex, isMinimized, isHTML);
        if (includeXML)
        {
            note.xml = element;
        }
        
        notes.push(note);
    }
    
    return notes;
},

addWelcomeNote: function()
{
    var welcomeText  = this.welcomeText;
    var sizeType     = parseInt(this.prefs.getDefaultSize()); // XXX Why parse here?
    
    var currTime     = new Date().getTime();
    var backColor    = this.BACKGROUND_COLOR_SWABS[this.prefs.getDefaultNoteColor()];
    var foreColor    = this.FOREGROUND_COLOR_SWABS[this.prefs.getDefaultTextColor()];
    var zIndex       = this.getMaxZIndex()[0] + 1;
    var noteWidth    = 280;
    var noteHeight   = 300;
    var isMinimized  = false;
    var matchType    = this.URL_MATCH_ALL;
    var isHTML       = false;
    var url          = "";
    var ignoreAnchor = false;
    var ignoreParams = false;
    
    var left = 10;
    var top  = 10;
    
    return this.addNote(new this.InternoteNote(url, matchType, ignoreAnchor, ignoreParams, welcomeText, left, top, noteWidth, noteHeight,
                                               backColor, foreColor, currTime, currTime, zIndex, isMinimized, isHTML));
},

getDefaultDims: function()
{
    var sizeType = this.prefs.getDefaultSize();
    
    var noteWidth  = this.NOTE_WIDTHS [sizeType];
    var noteHeight = this.NOTE_HEIGHTS[sizeType];
    
    return [noteWidth, noteHeight];
},

addSimpleNote: function(url, text, noteTopLeft, noteDims)
{
    //dump("InternoteStorage.addSimpleNote\n");
    
    this.utils.assertError(this.utils.isNonNegCoordPair(noteTopLeft), "NoteTopLeft not a coordinate.", noteTopLeft);
    this.utils.assertError(this.utils.isPositiveCoordPair(noteDims),  "NoteDims not dimensions.", noteDims);
    
    var noteCount = this.allNotes.length;
    
    var currTime     = new Date().getTime();
    var backColor    = this.BACKGROUND_COLOR_SWABS[this.prefs.getDefaultNoteColor()];
    var foreColor    = this.FOREGROUND_COLOR_SWABS[this.prefs.getDefaultTextColor()];
    var zIndex       = this.getMaxZIndex()[0] + 1;
    var isMinimized  = false;
    var isHTML       = false;
    var matchType    = this.URL_MATCH_URL;
    var ignoreAnchor = true;
    var ignoreParams = true;
    
    return this.addNote(new this.InternoteNote(url, matchType, ignoreAnchor, ignoreParams, text,
                                               noteTopLeft[0], noteTopLeft[1], noteDims[0], noteDims[1],
                                               backColor, foreColor,
                                               currTime, currTime, zIndex, isMinimized, isHTML));
},

// This doesn't do any XML/saving stuff.
addNoteToList: function(note)
{
    // We don't push so that we maintain the index/noteNum relationship.
    var num = this.allNotes.length;
    note.num = num;
    
    this.checkInvariant(note);
    
    this.allNotes[num] = note;
},

// This is for adding new notes - when loading, we shouldn't come this way, except for
// legacy conversion.
addNote: function(note)
{
    //dump("InternoteStorage.addNote\n");
    
    this.utils.assertError(note.xml == null,     "Tried to add note with XML existing.");
    
    this.addNoteToList(note);
    
    note.xml = this.doc.createElement("note");
    this.notesNode.appendChild(note.xml);
    
    // XXX Delete ID
    note.xml.setAttribute("id",           0);
    note.xml.setAttribute("guid",         this.utils.generateIdentifier());
    
    note.xml.setAttribute("url",          note.url         );
    note.xml.setAttribute("matchType",    note.matchType   );
    note.xml.setAttribute("ignoreAnchor", note.ignoreAnchor);
    note.xml.setAttribute("ignoreParams", note.ignoreParams);
    
    note.xml.setAttribute("left",         note.left        );
    note.xml.setAttribute("top",          note.top         );
    note.xml.setAttribute("width",        note.width       );
    note.xml.setAttribute("height",       note.height      );
    note.xml.setAttribute("backColor",    note.backColor   );
    note.xml.setAttribute("foreColor",    note.foreColor   );
    note.xml.setAttribute("createTime",   note.createTime  );
    note.xml.setAttribute("modfnTime",    note.modfnTime   );
    note.xml.setAttribute("zIndex",       note.zIndex      );
    note.xml.setAttribute("isMinimized",  note.isMinimized );
    note.xml.setAttribute("isHTML",       note.isHTML      );
    
    // XXX Delete next version - for downgrade compatibility
    note.xml.setAttribute("isURLRegexp",  note.matchType == this.URL_MATCH_REGEXP);
    
    var textNode = this.doc.createTextNode(note.text);
    note.xml.appendChild(textNode);
    textNode.nodeValue = note.text;
    
    //dump("Before\n");
    if (!this.isInitialising)
    {
        this.scheduleXMLSave();
        //dump("Dispatch\n");
        this.dispatchEvent("noteAdded", new this.StorageEvent(note, null));
    }
    
    return note;
},

removeNote: function(note)
{
    //dump("InternoteStorage.removeNote\n");
    
    this.utils.assertError(note != null, "Can't remove null note.");
    
    // Remove the note from the XML store.
    // Because we're using custom XML we can't use getElementById, so a note.xml field
    // has been created for this purpose.  A DTD should probably be defined so that it can.
    var xmlNote = note.xml;
    this.utils.assertError(xmlNote != null, "Could not find XML note to delete.");

    xmlNote.parentNode.removeChild(xmlNote);
    
    // Remove the note from the num lookup.
    // We don't splice so that we maintain the index/noteNum relationship.
    delete this.allNotes[note.num];
    
    this.scheduleXMLSave();
    
    this.dispatchEvent("noteRemoved", new this.StorageEvent(note, null));
},

raiseNote: function(note)
{
    var [maxZIndex, maxZIndexCount] = this.getMaxZIndex();
    
    if (note.zIndex < maxZIndex || maxZIndexCount != 1)
    {
        var newZIndex = maxZIndex + 1;
        var oldZIndex = note.zIndex;
        note.zIndex = newZIndex;
        
        this.indicateDataChanged(note);
        this.scheduleXMLSave();
        
        this.dispatchEvent("noteRaised", new this.StorageEvent(note, newZIndex, oldZIndex));
    }
},

clipDims: function(dims)
{
    return [this.utils.clipToRange(dims[0], this.MIN_NOTE_WIDTH,  this.MAX_NOTE_WIDTH),
            this.utils.clipToRange(dims[1], this.MIN_NOTE_HEIGHT, this.MAX_NOTE_HEIGHT)];
},

isURLPresent: function(searchURL)
{
    for each (var note in this.allNotes)
    {
        if (note.url == searchURL)
        {
            return true;
        }
    }
    return false;
},

getEffectiveURL: function(note)
{
    if (note.effectiveURL == null)
    {
        // Store it to save time because we have to process each note whenever we load a page.
        var noteURL = this.utils.trim(note.url);
        note.effectiveURL = this.processEffectiveURL(noteURL, note.matchType, note.ignoreAnchor, note.ignoreParams);
    }
    return note.effectiveURL;
},

getEffectiveSite: function(note)
{
    if (note.matchType == this.URL_MATCH_SITE || note.matchType == this.URL_MATCH_SUFFIX)
    {
        var noteURL = this.utils.trim(note.url);
        var parsedNoteURL = this.utils.parseURL(noteURL);
        return (parsedNoteURL != null) ? parsedNoteURL.site : noteURL;
    }
    else
    {
        return null;
    }
},

processEffectiveURL: function(url, matchType, ignoreAnchor, ignoreParams)
{
    //dump("internoteStorage.processEffectiveURL " + url + "\n");
    
    if (matchType == this.URL_MATCH_ALL  || matchType == this.URL_MATCH_REGEXP ||
        matchType == this.URL_MATCH_SITE || matchType == this.URL_MATCH_SUFFIX)
    {
        return null;
    }
    else
    {
        var parsedURL = this.utils.parseURL(url);
        if (parsedURL == null)
        {
            return null;
        }
        else
        {
            if (this.areIgnoresApplicable(matchType))
            {
                if (ignoreAnchor)
                {
                    parsedURL.anchor = null;
                }
                
                if (ignoreParams)
                {
                    parsedURL.params = null;
                }
            }
            
            this.utils.canonicalizeParsedURL(parsedURL);
            
            return this.utils.formatURL(parsedURL);
        }
    }
},

matchesURL: function(note, pageURL)
{
    try
    {
        //dump("InternoteStorage.matchesURL\n");
        
        var noteURL = this.utils.trim(note.url);
        var noteURLCanon = this.getEffectiveURL(note);
        var pageURLCanon = this.processEffectiveURL(pageURL, this.URL_MATCH_URL, note.ignoreAnchor, note.ignoreParams);
        
        if (pageURLCanon == null)
        {
            pageURLCanon = pageURL;
        }
        
        if (note.matchType == this.URL_MATCH_ALL)
        {
            return true;
        }
        else if (noteURL == "")
        {
            // Except for all mode, missing data should never match, even for url prefix, regexp, etc.
            return false;
        }
        else if (note.matchType == this.URL_MATCH_URL)
        {
            return pageURLCanon == noteURLCanon;
        }
        else if (note.matchType == this.URL_MATCH_REGEXP)
        {
            try
            {
                return pageURL.match(noteURL) ||
                       (pageURL != null && pageURLCanon.match(noteURL));
            }
            catch (ex2)
            {
                if (ex2.name == "SyntaxError")
                {
                    return false;
                }
                else
                {
                    throw ex2;
                }
            }
        }
        else if (note.matchType == this.URL_MATCH_PREFIX)
        {
            return pageURLCanon == noteURL      ||
                   pageURLCanon == noteURLCanon ||
                   this.utils.startsWith(pageURLCanon, noteURL     ) ||
                   this.utils.startsWith(pageURLCanon, noteURLCanon);
        }
        else if (note.matchType == this.URL_MATCH_SITE)
        {
            var noteSite = this.getEffectiveSite(note);
            var pageSite = this.utils.getURLSite(pageURL);
            return pageSite == noteSite;
        }
        else if (note.matchType == this.URL_MATCH_SUFFIX)
        {
            var noteSite = this.getEffectiveSite(note);
            var pageSite = this.utils.getURLSite(pageURL);
            return this.utils.isSiteSuffix(pageSite, noteSite);
        }
        else
        {
            this.utils.assertWarnNotHere("Unknown match type in InternoteStorage.matchesURL", note.matchType);
            return false;
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when testing whether note matches URL", ex);
    }
},

setText: function(note, newText)
{
    //dump("InternoteStorage.setText\n");
    
    this.utils.assertError(typeof(newText) == "string", "Trying to set note text to non-text.");
    if (note.text != newText) // We need this restriction or the UI/Storage will infinitely recurse?
    {
        //dump("  Updated to \"" + newText + "\".\n");
        
        var oldText = note.text;
        note.text = newText;
        this.indicateDataChanged(note);
        
        this.dispatchEvent("noteEdited", new this.StorageEvent(note, newText, oldText));
    }
},

setMatch: function(note, newURL, newMatchType)
{
    //dump("InternoteStorage.setMatch\n");

    this.utils.assertError(typeof(newURL) == "string", "Trying to set note URL to non-text.");
    this.utils.assertError(this.utils.isNonNegativeNumber(newMatchType), "Trying to set matchType to a non-number.", newMatchType);
    
    if (note.url != newURL || note.matchType != newMatchType)
    {
        //dump("  Match changed.\n");
        
        var oldURL       = note.url;
        var oldMatchType = note.matchType;
        note.url       = newURL;
        note.matchType = newMatchType;
        note.effectiveURL = null;
        this.indicateDataChanged(note);
        
        var event = new this.StorageEvent(note, [newMatchType, newURL, note.ignoreAnchor, note.ignoreParams],
                                                [oldMatchType, oldURL, note.ignoreAnchor, note.ignoreParams]);
        this.dispatchEvent("noteRelocated", event);
    }
},

setIgnoreAnchor: function(note, newIgnoreAnchor)
{
    this.utils.assertError(this.utils.isBoolean(newIgnoreAnchor), "Trying to set ignore anchor to a non-boolean.");
    if (note.ignoreAnchor != newIgnoreAnchor)
    {
        var oldIgnoreAnchor = note.ignoreAnchor;
        note.ignoreAnchor = newIgnoreAnchor;
        note.effectiveURL = null;
        this.indicateDataChanged(note);
        
        var event = new this.StorageEvent(note, [note.matchType, note.url, newIgnoreAnchor, note.ignoreParams],
                                                [note.matchType, note.url, oldIgnoreAnchor, note.ignoreParams]);
        this.dispatchEvent("noteRelocated", event);
    }
},

setIgnoreParams: function(note, newIgnoreParams)
{
    this.utils.assertError(this.utils.isBoolean(newIgnoreParams), "Trying to set ignore params to a non-boolean.");
    if (note.ignoreParams != newIgnoreParams)
    {
        var oldIgnoreParams = note.ignoreParams;
        note.ignoreParams = newIgnoreParams;
        note.effectiveURL = null;
        this.indicateDataChanged(note);
        
        var event = new this.StorageEvent(note, [note.matchType, note.url, note.ignoreAnchor, newIgnoreParams],
                                                [note.matchType, note.url, note.ignoreAnchor, oldIgnoreParams]);
        this.dispatchEvent("noteRelocated", event);
    }
},

setPosition: function(note, newPos)
{
    this.utils.assertError(this.utils.isNonNegCoordPair(newPos), "Trying to set note position to invalid coordinate.");
    
    var [newLeft, newTop] = newPos;
    
    if (newLeft < 0) newLeft = 0;
    if (newTop  < 0) newTop  = 0;
    
    if (note.left != newLeft || note.top != newTop) {
        var oldLeft  = note.left;
        var oldTop   = note.top;
        
        note.left = newLeft;
        note.top  = newTop;

        this.indicateDataChanged(note);
    
        this.dispatchEvent("noteMoved", new this.StorageEvent(note, newPos, [oldLeft, oldTop]));
    }
    
},

setDimensions: function(note, newDims)
{
    this.utils.assertError(this.utils.isPositiveCoordPair(newDims), "Trying to set note dimensions to invalid coordinate.");
    
    newDims = this.clipDims(newDims);
    
    var [newWidth, newHeight] = newDims;
    
    if (newWidth != note.width || newHeight != note.height)
    {
        var oldWidth  = note.width;
        var oldHeight = note.height;
        
        note.width  = newWidth;
        note.height = newHeight;
        this.indicateDataChanged(note);
        
        this.dispatchEvent("noteResized", new this.StorageEvent(note, newDims, [oldWidth, oldHeight]));
    }
},

setForeColor: function(note, newForeColor)
{
    this.utils.assertError(this.utils.isHexColor(newForeColor), "Trying to set note fore color to a non-hex-color.");
    if (note.foreColor != newForeColor)
    {
        var oldForeColor = note.foreColor;
        note.foreColor = newForeColor;
        this.indicateDataChanged(note);
        
        this.dispatchEvent("noteForeRecolored", new this.StorageEvent(note, newForeColor, oldForeColor));
    }
},

setBackColor: function(note, newBackColor)
{
    this.utils.assertError(this.utils.isHexColor(newBackColor), "Trying to set note back color to a non-hex-color.");
    if (note.backColor != newBackColor)
    {
        var oldBackColor = note.backColor;
        note.backColor = newBackColor;
        this.indicateDataChanged(note);
        
        this.dispatchEvent("noteBackRecolored", new this.StorageEvent(note, newBackColor, oldBackColor));
    }
},

// Multiple minimizes get dispatched as one event to make animating easy.
setIsMinimizedMulti: function(notes, newIsMinimized)
{
    this.utils.assertError(this.utils.isBoolean(newIsMinimized), "Trying to set isMinimized to a non-boolean.", newIsMinimized);
    var changedNotes = [];
    
    for (var i = 0; i < notes.length; i++)
    {
        var note = notes[i];
        if (note != null && note.isMinimized != newIsMinimized)
        {
            note.isMinimized = newIsMinimized;
            changedNotes.push(note);
            this.indicateDataChanged(note);
        }
    }
    
    if (changedNotes.length > 0)
    {
        this.dispatchEvent("notesMinimized", new this.StorageEvent(changedNotes, newIsMinimized, !newIsMinimized));
    }
},

resetNote: function(note)
{
    var newIsMinimized = false;
    var newPos = [10, 10];
    
    if (note.left != newPos[0] || note.top != newPos[1] || note.isMinimized != newIsMinimized)
    {
        var oldPos      = this.getPos(note);
        var oldIsMinimized = note.isMinimized;
        
        note.left     = newPos[0]
        note.top      = newPos[1];
        note.isMinimized = newIsMinimized;
        
        this.indicateDataChanged(note);
        
        this.dispatchEvent("noteReset", new this.StorageEvent(note, oldPos, oldIsMinimized));
    }
},

areIgnoresApplicable: function(matchType)
{
    return matchType == this.URL_MATCH_URL ||
           matchType == this.URL_MATCH_PREFIX ||
           matchType == this.URL_MATCH_REGEXP;
},

getPos: function(note)
{
    return [note.left, note.top];
},

getDims: function(note)
{
    return [note.width, note.height];
},

getMaxZIndex: function()
{
    // XXX What's wrong with reduce?
    var arr = this.allNotes.filter(function(note){return note != null;})
                              .map(function(note){return note.zIndex;});
                              //.reduce(Math.max, -1);
    
    var maxZ = -1;
    var maxCount = 0;
    
    for (var i = 0; i < arr.length; i++)
    {
        if (maxZ < arr[i])
        {
            maxZ = arr[i];
            maxCount = 1;
        }
        else if (maxZ == arr[i])
        {
            maxCount++;
        }
    }
    
    return [maxZ, maxCount];
},

formatTextForOutput: function(text)
{
    text = this.utils.trim(text);
    
    if (text == "")
    {
        text = this.emptyText;
    }
    
    return text;
},

generateNotesInV3: function(notes)
{
    var storageDoc = this.domImpl.createDocument("", "", null);
    
    var root = storageDoc.createElement("internote");
    storageDoc.appendChild(root);
    
    var notesNode = storageDoc.createElement("notes");
    root.appendChild(notesNode);
    
    for (var i = 0; i < notes.length; i++)
    {
        var note = notes[i];
        
        if (note != null)
        {
            notesNode.appendChild(storageDoc.importNode(note.xml, true));
        }
    }
    
    var serializer = new this.serializer();
    var prettyString = this.xml(serializer.serializeToString(storageDoc)).toXMLString();
    return prettyString;
},

generateNotesInHTML: function(notes, scratchDoc)
{
    // HTML, HEAD, BODY already set up in scratchDoc.
    
    var noteDiv     = this.utils.createHTMLElement("div",  scratchDoc);
    var noteCharset = this.utils.createHTMLElement("meta", scratchDoc);
    
    noteCharset.setAttribute("http-equiv", "Content-Type");
    noteCharset.setAttribute("content",    "text/html; charset=utf-8");
    
    scratchDoc.body.appendChild(noteDiv);
    scratchDoc.getElementsByTagName("head")[0].appendChild(noteCharset);
    
    scratchDoc.title = "Internote Export";
    
    noteDiv.setAttribute("style", "width: 100%; font-family: sans-serif;");
    
    var urlLookup = {};
    
    for (var i = 0; i < notes.length; i++)
    {
        var note = notes[i];
        
        if (note != null)
        {
            if (!urlLookup.hasOwnProperty(note.url))
            {
                urlLookup[note.url] = [];
            }
            
            urlLookup[note.url].push(note);
        }
    }
    
    for (var url in urlLookup)
    {
        var urlNotes = urlLookup[url];
        
        var bigTable = scratchDoc.createElement("div");
        bigTable.setAttribute("style", "border: 1px solid gray; padding: 15px; margin: 5px;");
        bigTable.setAttribute("width", "100%");
        
        var wholeTR = scratchDoc.createElement("div");
        wholeTR.setAttribute("style", "color: gray; margin-bottom: 10px; border-bottom: 1px dashed lightgray; font-size: 12px;");
        wholeTR.appendChild(scratchDoc.createTextNode(url));
        wholeTR.appendChild(scratchDoc.createElement("br"));
        
        bigTable.appendChild(wholeTR);
        
        for each (var note in urlNotes)
        {
            var myNoteText = scratchDoc.createElement("pre");
            myNoteText.setAttribute("style", "border-left: 3px solid " + note.backColor +
                                    "; padding: 5px 0px 5px 10px; margin-left: 10px; font-family: sans-serif sans;");
            myNoteText.appendChild(scratchDoc.createTextNode(this.formatTextForOutput(note.text)));
            bigTable.appendChild(myNoteText);
        }
        
        noteDiv.appendChild(bigTable);
    }
},

generateNotesInBookmarks: function(notes)
{
    var notesString = "<!DOCTYPE NETSCAPE-Bookmark-file-1>\n\t<HTML>\n\t<META HTTP-EQUIV='Content-Type' CONTENT='text/html; charset=utf-8'>\n\t<Title>Bookmarks</Title>\n\t<H1>Bookmarks</H1>\n\t<DT><H3 FOLDED>Bookmarks</H3>\n\t<DL><p>\n";
    
    for (var i = 0; i < notes.length; i++)
    {
        var note = notes[i];
        if (note != null)
        {
            var text = this.formatTextForOutput(note.text).replace(/\n/g, "<br>");
            notesString += "\t\t<DT><A HREF=\"" + note.url + "\">" + text + "</A>\n";
        }
    }
    
    notesString += "\t</DL><p>\n</HTML>";
    
    return notesString;
},

generateNotesInText: function (notes)
{
    var notesString = "";
    
    for (var i = 0; i < notes.length; i++)
    {
        var note = notes[i];
        if (note != null)
        {
            var text = this.formatTextForOutput(note.text);
            if (text.indexOf("\n") != -1)
            {
                notesString += note.url + ":\n" + text + "\n";
            }
            else
            {
                notesString += note.url + ": " + text + "\n";
            }
        }
    }
    
    return notesString.replace(/\n/g, "\r\n");
},

generateNotesInV2: function(notes)
{
    var zIndexSortFunc = function(note1, note2) {
        return note2.zIndex - note1.zIndex;
    };
    
    var notesClone = notes.concat();
    notesClone.sort(zIndexSortFunc);
    
    var linesArray = [];
    for (var i = 0; i < notes.length; i++)
    {
        var note = notes[i];
        if (note != null)
        {
            this.checkInvariant(note);
            linesArray.push(this.formatLineForV2(note));
        }
    }
    
    return linesArray.join("\n");
},

formatLineForV2: function(note)
{
    var url        = note.url;
    var text       = note.text.replace(/`/g, "'").replace(/\n/g, "<br>");
    var left       = note.left   + "px";
    var top        = note.top    + "px";
    var width      = note.width  + "px";
    var height     = note.height + "px";
    var backColor  = note.backColor;
    var foreColor  = this.utils.convertHexToRGB(note.foreColor);
    var tags       = "";
    var createTime = note.createTime;
    
    var fields = [url, text, left, top, width, height, backColor, foreColor, tags, createTime];
    
    return fields.join("`");
},

notesEqual: function(note1, note2)
{
    return note1.url == note2.url && note1.text == note2.text && note1.createTime == note2.createTime;
},

// Quadratic complexity - ouch!
addImportedNotes: function(notes)
{
    var addedCount = 0;
    var foundCount = 0;
    
    for (var i = 0; i < notes.length; i++)
    {
        var importedNote = notes[i];
        
        var isFound = false;
        for (var j = 0; j < this.allNotes.length; j++)
        {
            var existingNote = this.allNotes[j];
            if (existingNote != null && this.notesEqual(importedNote, existingNote))
            {
                isFound = true;
                break;
            }
        }
        
        if (!isFound)
        {
            this.addNote(importedNote);
            addedCount++;
        }
        else
        {
            foundCount++;
        }
    }
    
    return [addedCount, foundCount];
},

makeNoteFromV2Line: function(line)
{
    var attributeArray = line.split("`");
    
    this.utils.assertError(attributeArray.length == 10,
                          "Malformed note line when loading from storage, bad length.");
    
    // Internote V2 coordinate's were funny, compensate for this.
    var COMPENSATION_FACTOR = 90;
    
    var url          = this.utils.canonicalizeURL(attributeArray[0]);
    var text         = attributeArray[1].replace(/<br>/g, "\n");
    var left         = Math.max(0, this.utils.removePx(attributeArray[2]));
    var top          = Math.max(0, this.utils.removePx(attributeArray[3]) + COMPENSATION_FACTOR);
    var noteWidth    = this.utils.removePx(attributeArray[4]);
    var noteHeight   = this.utils.removePx(attributeArray[5]);
    var backColor    = attributeArray[6];
    var foreColor    = this.utils.convertRGBToHex(attributeArray[7]);
    // ignore tags attributeArray[8];
    var createTime   = this.utils.parseOptionalDate(attributeArray[9]);
    var modfnTime    = null;
    var isMinimized  = false;
    var matchType    = this.URL_MATCH_URL;
    var isHTML       = false;
    var zIndex       = 1;
    var ignoreAnchor = false;
    var ignoreParams = false;
    
    var note = new this.InternoteNote(url, matchType, ignoreAnchor, ignoreParams, text,
                                      left, top, noteWidth, noteHeight, backColor, foreColor,
                                      createTime, modfnTime, zIndex, isMinimized, isHTML);
    this.checkInvariant(note, false);
    
    return note;
},

loadInternoteV2: function(allLines)
{
    var notes = [];
    var allLinesArray = allLines.split("\n");
    
    for (var i = 0; i < allLinesArray.length; i++) {
        var line = this.utils.trim(allLinesArray[i]);
        if (line != "") {
            var note = this.makeNoteFromV2Line(line);
            notes.push(note);
        }
    }
    
    return notes;
},

});

// Remember to catch exceptions that come out of here.
internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.makeStorage = function(anyMainWindowDoc)
{
    if (this.storage == null)
    {
        this.storage = new this.Storage();
        this.storage.init(anyMainWindowDoc);
    }
    else
    {
        this.storage.usageCount++;
    }
    
    return this.storage;
};

}
