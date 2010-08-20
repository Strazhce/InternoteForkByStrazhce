// Internote Extension
// Main Application Controller
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

// Uses: internote-storage.js, internote-watcher.js, internote-utils.js,
//       internote-ui-display.js, internote-ui-notes.js, internote-ui-animation.js,
//       internote-ui-balloon.js

// This is the main UI class for the browser overlay.  With the exception of the manager and
// prefs dialogs that it can open, it calls into the other classes and controls the overall
// operation of the application.

// Because InternoteV3 uses a Model/View system, most user changes do not take immediate effect
// on-screen, instead the back-end storage is modified, which besides saving the changes, will call
// back into this file, for this and other windows, and also might call back into manager.  Thus:
// - User changes generally result in calls to "user" methods, which generally call storage.method().
// - This results in callbacks to "on" methods, which often call "screen" methods.
// - The "screen" methods deal with screen management.

// In some circumstances, the user methods might call the screen methods directly, in particular
// dragging does not appear in other windows until the mouse is released, and flipping is not intended
// to be a persistent feature.

// The UI makes extensive use of the UINote class, this includes variables for the various UI elements,
// as well as a reference to the corresponding Note class used by the back-end storage.

Components.utils.import("resource://internotejs/internote-shared-global.jsm");

var internoteUIController = {

DRAG_MODE_NONE:    0,
DRAG_MODE_MOVE:    1,
DRAG_MODE_RESIZE:  2,

CREATE_ANIMATION_TIME: 600,
REMOVE_ANIMATION_TIME: 600,
FLIP_ANIMATION_TIME: 600,
MOVE_ANIMATION_TIME: 1500,
RESIZE_ANIMATION_TIME: 600,
MINIMIZE_ANIMATION_TIME: 600,
RECOLOR_ANIMATION_TIME: 250,

WIDTH_BETWEEN_MINIMIZED: 2,

ACTIVE_WARNING_INTERVAL: 500,
CHECK_VIEWPORT_INTERVAL: 50,

dragMode:            this.DRAG_MODE_NONE,
noteMode:            this.NOTE_NORMAL,
uiNoteBeingDragged:  null,
hasBeenDragMovement: false,
pointerInitialPos:   null,

currentScrollX:    null,
currentScrollY:    null,
currentWidth:      null,
currentHeight:     null,
currentLeft:       null,
currentTop:        null,
currentPageWidth:  null,
currentPageHeight: null,

internoteDisabled: false,
isInitialized:    false,
arePageListeners: false,

currentBrowser:  null,
currentURL:      null,
pageWatcher:     null,

managerDialog:   null,
prefsDialog:     null,

isPageLoaded:    false,

noteAnimations: {},

noteUICallbacks: null,

minimizedNotes: [],

allUINotes: [],
uiNoteLookup: [],

checkViewportEvent: null,

///////////////////////////////
// Initialisation, Destruction
///////////////////////////////

init: function()
{
    this.utils     = internoteUtilities;
    this.prefs     = internotePreferences;
    this.noteUI    = internoteNoteUI;
    this.balloonUI = internoteBalloonUI;
    this.anim      = internoteAnimation;
    this.consts    = internoteConstants;
    this.global    = internoteSharedGlobal;
    
    this.utils.init();
    this.prefs.init(this.utils);
    
    this.displayUI = this.chooseDisplayUI();
    
    InternoteEventDispatcher.prototype.incorporateED(InternoteStorage.prototype);
    InternoteEventDispatcher.prototype.incorporateED(InternoteStorageWatcher.prototype);
    
    // This will provide a global object shared between windows
    this.storage   = InternoteStorage.makeStorage();
    
    this.utils.assertError(this.storage != null, "Failed to initialize storage.");
    
    if (this.storage.loadStatus == this.storage.LOAD_FAILED)
    {
        this.handleStorageFailure("LoadFailedError");
        return;
    }
    else if (this.storage.loadStatus == this.storage.LOAD_DIR_DOESNT_EXIST)
    {
        this.handleStorageFailure("CantFindDirError");
        this.userOpensPrefs();
        return;
    }
    else if (this.storage.loadStatus == this.storage.LOADED_FROM_BACKUP)
    {
        var msg = this.utils.getLocaleString("RestoredBackupMessage");
        alert(msg);
    }
    else if (this.storage.loadStatus == this.storage.LOAD_LEGACY_FAILED)
    {
        var msg = this.utils.getLocaleString("LegacyFailedError");
        alert(msg);
    }
    else if (this.storage.loadStatus == this.storage.LOADED_FROM_SCRATCH ||
             this.storage.loadStatus == this.storage.LOADED_FROM_LEGACY)
    {
        try
        {
            this.storage.saveXMLNow();
        }
        catch (ex)
        {
            this.handleStorageFailure("CantSaveNewStorageError");
        }
    }
    
    this.noteUICallbacks = {
        onMouseDown:     this.utils.bind(this, this.userPressesNote),
        onMoveStart:     this.utils.bind(this, this.userMovesNote),
        onResizeStart:   this.utils.bind(this, this.userResizesNote),
        onMinimize:      this.utils.bind(this, this.userMinimizesNote),
        onClose:         this.utils.bind(this, this.userRemovesNote),
        onFlip:          this.utils.bind(this, this.userFlipsNote),
        onEdit:          this.utils.bind(this, this.userEditsNote),
        onClickBackSide: this.utils.bind(this, this.userClicksBackSideOfNote),
        onFocus:         this.utils.bind(this, this.userFocusesNote),
    };
    
    this.displayUI.init(this.prefs, this.utils, this.noteUI);
    this.noteUI   .init(this.prefs, this.utils, this.consts);
    this.anim     .init(this.utils);
    
    this.utils.addBoundDOMEventListener(window, "unload", this, "destroy", false);
    
    this.storage.addBoundEventListener("noteDisplayToggled",      this, "onNoteDisplayToggled");
    this.storage.addBoundEventListener("storageFailed",           this, "onInternoteStorageFailed");
    
    this.storage.addBoundEventListener("translucencyChanged", this, "onTranslucencyPrefSet");
    this.storage.addBoundEventListener("fontSizeChanged",     this, "onFontSizePrefSet");
    this.storage.addBoundEventListener("scrollbarChanged",    this, "onScrollbarPrefSet");
    this.storage.addBoundEventListener("statusbarChanged",    this, "onStatusbarPrefSet");
    
	this.utils.addBoundDOMEventListener(window, "focus", this, "onWindowFocused", false);
	
    this.chromeUpdateStatusBarIconDisplay(false);
    this.chromeUpdateInternoteIcon();
    this.chromeUpdateDisplayCheckbox();
    
    // See about starting stage 2 of initialisation.
    if (this.noteUI.areImagesLoaded())
    {
        this.setUpInternote();
        this.isInitialized = true;
    }
    else
    {
        // Delay stage 2 of initialisation until the images are loaded.
        this.noteUI.waitForImageLoad(this.utils.bind(this, this.imageLoadCheck));
    }
    
    if (this.prefs.isInDebugMode())
    {
        this.activeWarnInterval =
            setInterval(this.utils.bind(this, this.chromeActiveWarning), this.ACTIVE_WARNING_INTERVAL);
        
        var key    = document.createElement("key");
        key.setAttribute("key",       "g");
        key.setAttribute("modifiers", "alt");
        key.setAttribute("oncommand", "internoteUIController.activateDebugFunction()");
        
        var keySet = document.getElementById("mainKeyset");
        keySet.appendChild(key);
    }
	
    dump("Internote startup successful\n");
},

chooseDisplayUI: function()
{
    if (this.utils.supportsTransparentClickThru())
    {
        return internoteDisplayUIPopupPane;
    }
    else
    {
        return internoteDisplayUISeparatePopups;
    }
},

setUpInternote: function()
{
    if (!this.storage.areNotesDisplaying)
    {
        return;
    }
    
    this.changePage(null, true);
    getBrowser().addProgressListener(this.progressListener,
                                     this.utils.getCIConstant("nsIWebProgress", "NOTIFY_STATE_DOCUMENT"));
},

tearDownInternote: function()
{
    this.tearDownOldPage();
    getBrowser().removeProgressListener(this.progressListener,
                                        this.utils.getCIConstant("nsIWebProgress", "NOTIFY_STATE_DOCUMENT"));
},

maybeDisplayNotes: function()
{
    if (!this.storage.areNotesDisplaying)
    {
        var displayMessage = this.utils.getLocaleString("DisplayQuestion");
        
        var shouldDisplay = confirm(displayMessage);
        
        if (shouldDisplay) {
            this.storage.toggleNoteDisplay();
        }
    }
},

handleCatastrophicFailure: function(alertMessageName)
{
    internoteSharedGlobal.initialisationFailed = true;
    
    try
    {
        var message = this.utils.getLocaleString(alertMessageName);
        alert(message);
    }
    catch (ex)
    {
        try
        {
            this.utils.handleException("Failure when trying to give a catastrophic alert.", ex);
        }
        catch (ex2) { /* Nothing we can do. */ }
    }
    
    try
    {
        var panel = document.getElementById("internote-panel");
        panel.parentNode.removeChild(panel);
    }
    catch (ex)
    {
        try
        {
            this.utils.handleException("Failure when trying to remove status bar icon.", ex);
        }
        catch (ex2) { /* Nothing we can do. */ }
    }
    
    try
    {
        var menu = document.getElementById("internote-main-menu");
        menu.disabled = "true";
    }
    catch (ex)
    {
        try
        {
            this.utils.handleException("Failure when trying to disable main menu.", ex);
        }
        catch (ex2) { /* Nothing we can do. */ }
    }
},

handleStorageFailure: function(localeMsg)
{
    try
    {
        this.handleCatastrophicFailure(localeMsg);
    }
    catch (ex) { /* Nothing we can do. */ }
    
    this.utils.assertWarnNotHere("Initialisation failed because of storage failure.");
},

handleInitFailure: function(ex)
{
    try
    {
        this.handleCatastrophicFailure("InternoteFailedError");
    }
    catch (ex) { /* Nothing we can do. */ }
    
    this.utils.handleException("Caught exception when initialising internote.", ex);
},

destroy: function()
{
    //dump("destroy\n");
    
    if (this.pageWatcher != null)
    {
        this.pageWatcher.destroy();
    }
    
    this.storage.removeBoundEventListener("noteDisplayToggled",  this, "onNoteDisplayToggled");
    this.storage.removeBoundEventListener("storageFailed",       this, "onInternoteStorageFailed");
    
    this.storage.removeBoundEventListener("translucencyChanged", this, "onTranslucencyPrefSet");
    this.storage.removeBoundEventListener("fontSizeChanged",     this, "onFontSizePrefSet");
    this.storage.removeBoundEventListener("scrollbarChanged",    this, "onScrollbarPrefSet");
    this.storage.removeBoundEventListener("statusbarChanged",    this, "onStatusbarPrefSet");
    
    this.storage.usageCount--;
    if (this.storage.usageCount == 0)
    {
        this.storage.destroy();
    }
    
    getBrowser().removeProgressListener(this.progressListener);
},

imageLoadCheck: function()
{
    try
    {
        if (!this.isInitialized && this.noteUI.areImagesLoaded())
        {
            this.setUpInternote();
            this.isInitialized = true;
        }
    }
    catch (ex)
    {
        this.isInitialized = true;
        this.handleInitFailure(ex);
    }
},

// The storage watcher watches the underlying storage and has a filter that gives
// the subset of notes to show on this page, emitting events due to changes.
configureStorageWatcher: function(newURL)
{
    //dump("configureStorageWatcher\n");
    
    if (this.pageWatcher != null)
    {
        this.pageWatcher.destroy();
    }
    
    var extraReevaluateEvents  = ["noteRelocated"];
    var extraPassthruEvents    = ["noteResized", "noteMoved", "noteReset", "notesMinimized",
                                  "noteBackRecolored", "noteForeRecolored", "noteEdited", "noteRaised"];
    var pageFilter = this.getPageFilter(newURL);
    
    this.pageWatcher =
        new InternoteStorageWatcher(this.storage, pageFilter, extraReevaluateEvents, extraPassthruEvents);
    
    this.pageWatcher.addBoundEventListener("noteAdded",         this, "onNoteAdded");
    this.pageWatcher.addBoundEventListener("noteRemoved",       this, "onNoteRemoved");
    this.pageWatcher.addBoundEventListener("noteForeRecolored", this, "onNoteForeRecolored");
    this.pageWatcher.addBoundEventListener("noteBackRecolored", this, "onNoteBackRecolored");
    this.pageWatcher.addBoundEventListener("noteEdited",        this, "onNoteEdited");
    this.pageWatcher.addBoundEventListener("noteMoved",         this, "onNoteMoved");
    this.pageWatcher.addBoundEventListener("noteResized",       this, "onNoteResized");
    this.pageWatcher.addBoundEventListener("notesMinimized",    this, "onNotesMinimized");
    this.pageWatcher.addBoundEventListener("noteRaised",        this, "onNoteRaised");
    this.pageWatcher.addBoundEventListener("noteReset",         this, "onNoteReset");
},

getPageFilter: function(filterURL)
{
    return function(note)
    {
        return this.storage.matchesURL(note, filterURL);
    };
},

tearDownOldPage: function()
{
    //dump("tearDownOldPage\n");
    
    this.balloonUI.abandonAllMessages();
    this.abandonAllNoteAnimations();
    this.displayUI.tearDown();
    
    if (this.arePageListeners)
    {
        this.removePageListeners();
    }
    
    this.currentURL = null;
},

uiNoteAdd: function(uiNote)
{
    this.utils.assertError(uiNote != null, "Can't add null UINote.", uiNote);
    this.uiNoteLookup[uiNote.num] = uiNote;
    this.allUINotes.push(uiNote);
},

uiNoteRemove: function(uiNote)
{
    this.utils.assertError(uiNote != null, "Can't remove null UINote.", uiNote);
    delete this.uiNoteLookup[uiNote.num];
    this.utils.spliceFirstInstance(this.allUINotes, uiNote);
},

changePage: function(newURL, isPageLoaded)
{
    // We might tab change to the same page, so we still need this ...
    
    this.currentBrowser = this.utils.getCurrentBrowser();
    
    if (newURL == null)
    {
        newURL = this.utils.getBrowserURL(this.currentBrowser);
    }
    
    if (this.allowNotesOnThisPage(newURL))
    {
        // Check that URL parsing works properly ... just an internal warning to detect problems.
        var parsedURL = this.utils.parseURL(newURL);
        this.utils.assertWarn(parsedURL != null, "Invalid URL?", newURL);
        if (parsedURL != null)
        {
            this.utils.assertWarn(this.utils.isValidURLSite(parsedURL.site, parsedURL.protocol), "Invalid Site?", parsedURL.site);
        }
        
        this.displayUI.setBrowser(this.currentBrowser, this.utils.getViewportDims(this.currentBrowser));
    }
    else
    {
        this.displayUI.setBrowser(null, null);
    }
    
    // XXX These two should probably be distinguished.  It's possible that
    // XXX the page is loaded but the message hasn't been shown, because
    // XXX the user changed tabs.
    this.isPageLoaded    = isPageLoaded;
    
    if (newURL == this.currentURL)
    {
        //dump("Redo " + this.currentURL + " " + newURL + "\n");
        // If we've changed to the same URL on another tab, we should check for scrolling ...
        if (this.allowNotesOnThisPage(newURL))
        {
            this.screenCheckAspects();
        }
    }
    else
    {
        this.tearDownOldPage();
        
        this.currentURL = newURL;
        
        this.uiNoteLookup   = [];
        this.allUINotes     = [];
        this.minimizedNotes = [];
        this.arePageListeners = false;
        
        this.displayUI.setUINotes(this.allUINotes, this.uiNoteLookup);

        if (this.allowNotesOnThisPage(newURL))
        {
            this.configureStorageWatcher(this.currentURL);
            
            for each (var note in this.pageWatcher.noteMap)
            {
                var uiNote = this.noteUI.createNewNote(note, this.noteUICallbacks, document, 1);
                this.uiNoteAdd(uiNote);
                
                if (note.isMinimized)
                {
                    this.minimizedNotes.push(uiNote);
                }
            }

            this.minimizedNotes.sort(this.minimizedNoteSortFunc);
            
            for (var i = 0; i < this.minimizedNotes.length; i++)
            {
                this.minimizedNotes[i].minimizePos = i;
            }
            
            // Sort in correct order because screenCreateNote might create notes on top.
            this.allUINotes.sort(function(uiNote1, uiNote2) { return uiNote1.note.zIndex - uiNote2.note.zIndex; });
            
            for (var i = 0; i < this.allUINotes.length; i++)
            {
                this.screenCreateNote(this.allUINotes[i], false);
            }
        }
    }
},

allowNotesOnThisPage: function(url)
{
    return !this.utils.startsWith(url, "about:");
},

// We check for browser resize because the VP may change size but not the window (due to sidebar, etc).
// We check for window resize because the VP may change size but no the browser (due to excessively small window).
// We check for scroll because the notes need to be moved.
// We also do a periodic check because the other events tend not to get sent enough, as well as to handle anything
// else that goes wrong.
addPageListeners: function()
{
    //dump("addPageListeners\n");
    
    if (!this.arePageListeners)
    {
        this.arePageListeners = true;
        
        this.utils.addBoundDOMEventListener(window,              "resize", this, "screenCheckAspects", true);
        this.utils.addBoundDOMEventListener(this.currentBrowser, "resize", this, "screenCheckAspects", true);
        this.utils.addBoundDOMEventListener(this.currentBrowser, "scroll", this, "screenCheckAspects", true);
        
        // This interval check is undesirable but necessary for the following reasons:
        // (a) resize and scroll events don't seem responsive enough by themselves
        // (b) there is no event set on page dims change or window move (as yet)
        // (c) it also checks the innerContainerScroll
        this.checkViewportEvent = setInterval(this.utils.bind(this, this.screenCheckAspects),
                                              this.CHECK_VIEWPORT_INTERVAL);
    }
    else
    {
        this.utils.assertWarnNotHere("Tried to add duplicate page listeners.");
    }
},

removePageListeners: function()
{
    //dump("removePageListeners\n");
    
    if (this.arePageListeners)
    {
        this.arePageListeners = false;
        
        this.utils.removeBoundDOMEventListener(window,              "resize", this, "screenCheckAspects", true);
        this.utils.removeBoundDOMEventListener(this.currentBrowser, "resize", this, "screenCheckAspects", true);
        this.utils.removeBoundDOMEventListener(this.currentBrowser, "scroll", this, "screenCheckAspects", true);
        
        clearInterval(this.checkViewportEvent);
        this.checkViewportEvent = null;
    }
    else
    {
        this.utils.assertWarnNotHere("Tried to remove non-existent page listeners.");
    }
},

///////////////////////
// Events from the user
///////////////////////

// These user* methods don't change the screen usually, instead they change storage which then
// calls back into this window as well as others potentially.

// This method is for debugging only.
activateDebugFunction: function()
{
    //dump("\n\n\n\n\nactivateDebugFunction\n");
    
    this.displayUI.createInsertionContainer(this.utils.getViewportDims(this.currentBrowser));
    this.displayUI.showPopupPane();
    
    this.utils.assertWarnNotHere("--- Test Warning ---");
    
    /*
    for (var i = 0; i < this.allUINotes.length; i++)
    {
        var uiNote = this.allUINotes[i];
        if (this.utils.trim(uiNote.note.text) == "")
        {
            this.storage.removeNote(uiNote.note);
        }
    }
    */
},

userPressesNote: function(event)
{
    //dump("userPressesNote\n");
    
    try
    {
        // It looks like there is a race condition of some kind, that very quickly after a flip completes we
        // can get an empty ID string when clicking again, at least the flip button.  So just ignore this case.
        if (event.target.id != "")
        {
            var noteNum = this.utils.getNoteNum(event.target);
            var note = this.storage.allNotes[noteNum];
            if (!note.isMinimized)
            {
                this.storage.raiseNote(note);
                
                var uiNote = this.uiNoteLookup[noteNum];
                this.displayUI.focusNote(uiNote);
            }
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when user pressed note.", ex);
    }
},

userCreatesNote: function()
{
    //dump("userCreatesNote\n");
    
    if (internoteSharedGlobal.initialisationFailed)
    {
        return;
    }
    
    try
    {
        var loc = this.utils.getBrowserURL();
        
        if (!this.allowNotesOnThisPage(loc))
        {
            this.showMessage("NotOnThisPageMessage");
            return;
        }
        
        this.maybeDisplayNotes();
        
        if (this.storage.areNotesDisplaying)
        {
            var viewportRect = this.utils.getViewportRect(this.currentBrowser);
            var noteDims = this.storage.getDefaultDims();
            var noteTopLeft = this.screenCalcNewNotePos(viewportRect, noteDims);
            
            this.utils.assertError(this.utils.isNonNegCoordPair(noteTopLeft), "Invalid note top left.", noteTopLeft);
            
            var note = this.storage.addSimpleNote(loc, "", noteTopLeft, noteDims);
            this.utils.assertError(note != null, "Note not found when creating.");
            
            // This should have been added by callbacks, we check.
            this.utils.assertError(this.uiNoteLookup[note.num] != null, "UINote not created properly.", note);
            
            // Now attempt to focus new note.  We do it here as we only focus notes created in this window,
            // not those created on page load, on another window or due to manager changes.
            var uiNote = this.uiNoteLookup[note.num];
            this.utils.assertError(uiNote != null, "UINote not found when trying to focus note.", note.num);
            
            this.displayUI.focusNote(uiNote);
        }
		
		throw new Error("Test");
    }
    catch (ex)
    {
        try
        {
            this.showMessage("NoteCreationError", true, "ReportBugLabel", this.utils.bind(this, function() {
                if (this.bugReportDialog != null && !this.bugReportDialog.closed)
                {
                    this.bugReportDialog.focus();
                    this.bugReportDialog.postMessage("reload", "*");	
                }
                else
                {
                    this.bugReportDialog = window.openDialog('chrome://internote/content/internote-dlg-bugreport.xul',
                                                             'internotebugreport', 'centerscreen, chrome, all', window);
                }
            }));
        }
        catch (ex2)
        {
            alert("Sorry, an unanticipated problem prevented your note being created.  " +
                  "Restarting your browser might fix the problem.");
            this.utils.handleException("Exception caught when user showing message.", ex2);
        }
        
        this.utils.handleException("Exception caught when user created note.", ex);
    }
},

userRemovesNote: function(elementOrEvent)
{
    //dump("userRemovesNote\n");
    
    try
    {
        var noteNum = this.utils.getNoteNum(elementOrEvent);
        var note = this.storage.allNotes[noteNum];
        
        if (note != null)
        {
            var deleteConfirmed = true;
            if (this.prefs.shouldAskBeforeDelete())
            {
                // While notes are popups they are not affected by modality, so we need a special method.
                deleteConfirmed = this.confirmDialog(this.utils.getLocaleString("DeleteSingleConfirm"));
            }
            
            if (deleteConfirmed)
            {
                this.storage.removeNote(note);
            }
        }
        else
        {
            this.utils.assertWarnNotHere("Could not remove a non-existent note.");
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when user removed note.", ex);
    }
},

userResizesNote: function(event)
{
    //dump("userResizesNote\n");
    
    try
    {
        this.utils.assertError(event != null, "Null event when starting drag.");
    
        var noteNum = this.utils.getNoteNum(event.target);
        var uiNote = this.uiNoteLookup[noteNum];
    
        var onDragMouseMoved = this.utils.bind(this, function(event, offset, uiNote) {
            // XXX Limit resize to viewport?
            this.screenSetModifiedNoteDims(uiNote, offset);
        });
        
        var onDragFinished = this.utils.bind(this, function(wasCompleted, wasDrag, offset, uiNote) {
            if (wasCompleted && wasDrag)
            {
                // We first set the *position* to the current screen position.  Normally, this will do nothing
                // since we resized, not moved the note.  However if an off-page note was forced onto the page
                // this will cause it to be locked into its screen position and no longer forced, because such
                // notes must stay on the edge of the page and we just resized the note, so it probably isn't.
                var topLeftOnViewport = this.displayUI.getScreenPosition(uiNote);
                this.screenCommitPos(uiNote, topLeftOnViewport);
                
                // Then we set the new size.
                var newDims = this.screenCalcModifiedNoteDims(uiNote, offset);
                this.storage.setDimensions(uiNote.note, newDims);
            }
            else
            {
                this.screenResetNoteDims(uiNote, [0, 0], false);
            }
        });
        
        this.userStartsDrag(event, uiNote, this.DRAG_MODE_RESIZE, onDragMouseMoved, onDragFinished);
    }
    catch (ex)
    {
        this.utils.handleException("Caught exception while attempting to resize note.", ex);
    }
},

userMovesNote: function(event)
{
    //dump("userMovesNote\n");
    
    try
    {
        this.utils.assertError(event != null, "Null event when starting drag.");
        
        var noteNum = this.utils.getNoteNum(event.target);
        var uiNote = this.uiNoteLookup[noteNum];
        
        var onDragMouseMoved = this.utils.bind(this, function(event, offset, uiNote) {
            this.utils.assertError(this.utils.isCoordPair(offset), "Invalid offset.");
            var newPosOnViewport = this.screenCalcDraggedPos(uiNote, offset);
            this.displayUI.adjustNote(uiNote, newPosOnViewport, null);
        });
        
        var onDragFinished = this.utils.bind(this, function(wasCompleted, wasDrag, offset, uiNote) {
            this.displayUI.moveEnd(uiNote);
            
            // Store any changes.
            if (wasCompleted && wasDrag)
            {
                var newPosOnViewport = this.screenCalcDraggedPos(uiNote, offset);
                this.screenCommitPos(uiNote, newPosOnViewport);
            }
            else
            {
                // Importantly we move to the position that should be correct now, not the original position,
                // because that might have changed (due to force-on-page) if the page was loading during drag.
                // Note that the drag has completed by this time so we can reposition the note now.
                this.screenAdjustTopNote(uiNote);
            }
        });
        
        this.userStartsDrag(event, uiNote, this.DRAG_MODE_MOVE, onDragMouseMoved, onDragFinished);
        
        // Set up the drag handler before this, because doing this can mess with the event object screen positions.
        this.displayUI.moveStart(uiNote);
    }
    catch (ex)
    {
        this.utils.handleException("Caught exception while attempting to resize note.", ex);
    }
},

userStartsDrag: function(event, uiNote, dragMode, onDragMouseMoved, onDragFinished)
{
    //dump("userStartsDrag\n");
    
    if (uiNote.note.isMinimized)
    {
        return;
    }
    
    // Normally animations should disable dragging if necessary, but just in case ...
    this.hurryNoteAnimation(uiNote);
    
    // Don't allow typing and who knows what else while dragging ... simpler that way.
    this.noteUI.setIsEnabled(uiNote, false);
    
    // Store the info on the drag.  This might be used elsewhere eg screenResetPosition.
    this.uiNoteBeingDragged = uiNote;
    this.dragStartPos       = this.displayUI.getScreenPosition(uiNote);
    this.dragMode           = dragMode;
    
    var handler = new this.utils.DragHandler(this.utils, uiNote);
    
    handler.onDragMouseMoved = onDragMouseMoved;
    
    handler.onDragFinished   = this.utils.bind(this, function(wasCompleted, wasDrag, offset, uiNote)
    {
        this.uiNoteBeingDragged = null;
        
        // It's important to call the callback after cleaning uiNoteBeingDragged
        // because we may wish to do things that will check that the drag has finished.
        onDragFinished(wasCompleted, wasDrag, offset, uiNote);
    
        // Clear this after onDragFinished which may use it.
        this.dragStartPos = null;
        this.dragMode     = this.DRAG_MODE_NONE;
        
        this.noteUI.setIsEnabled(uiNote, true);
    });
    
    handler.dragStarted(event);
},

userFlipsNote: function(elementOrEvent)
{
    //dump("userFlipsNote\n");
    
    try
    {
        var noteNum = this.utils.getNoteNum(elementOrEvent);
        var uiNote = this.uiNoteLookup[noteNum];
        
        var startLeft  = parseInt(uiNote.note.left, 10);
        var startWidth = uiNote.note.width;
        
        var animation = internoteAnimation.getFlipAnimation(this.utils, this.noteUI, this.displayUI, uiNote);
        this.startNoteAnimation(uiNote, animation, this.FLIP_ANIMATION_TIME);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when user flipped note.", ex);
    }
},

userMinimizesNote: function(elementOrEvent)
{
    //dump("userFlipsNote\n");
    
    try
    {
        var noteNum = this.utils.getNoteNum(elementOrEvent);
        var note = this.storage.allNotes[noteNum];
        
        if (note.isMinimized)
        {
            // This would normally happen in userPressesNote, but not for minimized notes.
            this.storage.raiseNote(note);
        }
        
        this.storage.setIsMinimizedMulti([note], !note.isMinimized);
        
        if (!note.isMinimized)
        {
            var currNoteRect = this.utils.makeRectFromDims(this.storage.getPos(note), this.storage.getDims(note));
            var viewportRect = this.utils.getViewportRect(this.currentBrowser);
            if (this.utils.doRectsOverlap(viewportRect, currNoteRect))
            {
                var uiNote = this.uiNoteLookup[noteNum];
                this.displayUI.focusNote(uiNote);
            }
            else
            {
                this.showMessage("RestoreOffscreenMessage");
            }
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when user minimized note.", ex);
    }
},

userEditsNote: function(event)
{
    //dump("userEditsNote\n");
    
    try
    {
        this.utils.assertError(event.target != null, "No event target for onNoteEdited.");
        
        var noteNum = this.utils.getNoteNum(event.target);
        var note = this.storage.allNotes[noteNum];
        this.storage.setText(note, event.target.value);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when user edited note.", ex);
    }
},

userClicksBackSideOfNote: function(event)
{
    try
    {
        var noteNum = this.utils.getNoteNum(event.target);
        var uiNote = this.uiNoteLookup[noteNum];
        
        var [internalX, internalY] = this.noteUI.getInternalCoordinates(uiNote, event);
        
        var backColor = this.noteUI.getBackColorSwabFromPoint(internalX, internalY);
        
        if (backColor != null)
        {
            this.storage.setBackColor(uiNote.note, backColor);
        }
        else
        {
            var foreColor = this.noteUI.getForeColorSwabFromPoint(internalX, internalY);
            
            if (foreColor != null)
            {
                this.storage.setForeColor(uiNote.note, foreColor);
            }
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when user clicked back side of note.", ex);
    }
},

userFocusesNote: function(event)
{
    // XXX Need to get rid of the stack that necessitates removal to reorder, then
    // raising would lose focus and cause problems here.
    //dump("userFocusesNote\n");
    
    try
    {
        var noteNum = this.utils.getNoteNum(event.target);
        var uiNote = this.uiNoteLookup[noteNum];
        this.storage.raiseNote(uiNote.note);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when user focused note.", ex);
    }
},

userTogglesDisplay: function(note)
{
    try
    {
        this.storage.toggleNoteDisplay(!this.storage.areNotesDisplaying);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when toggling note display.", ex);
    }
},

userViewsInManager: function(element)
{
    try
    {
        var noteNum = this.utils.getNoteNum(element);
        this.userOpensManager(noteNum);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when user viewing note in manager.", ex);
    }
},

userOpensManager: function(message)
{
    if (internoteSharedGlobal.initialisationFailed)
    {
        return;
    }
    
    try
    {
        if (this.managerDialog != null && !this.managerDialog.closed)
        {
            this.managerDialog.focus();
            if (message != null)
            {
                this.managerDialog.postMessage(message, "*");
            }
        }
        else
        {
            this.managerDialog = window.openDialog('chrome://internote/content/internote-dlg-manager.xul',
                                                   'internotemanager', 'centerscreen, chrome, all', window);
            if (this.managerDialog == null)
            {
                this.showMessage("WindowOpenFailed");
            }
            else
            {
                if (message != null)
                {
                    this.managerDialog.addEventListener("load", this.utils.bind(this, function()
                    {
                        this.managerDialog.postMessage(message, "*");
                    }), true);
                }
            }
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when user opening manager.", ex);
    }
},

userOpensPrefs: function()
{
    try
    {
        if (this.prefsDialog != null && !this.prefsDialog.closed)
        {
            this.prefsDialog.focus();
        }
        else
        {
            this.prefsDialog = window.openDialog('chrome://internote/content/internote-dlg-prefs.xul',
                                                 'internoteprefs', 'centerscreen', window);
            if (this.prefsDialog == null)
            {
                this.showMessage("WindowOpenFailed");
            }
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when user opening preferences.", ex);
    }
},

userOpensAbout: function()
{
    try
    {
        this.prefsDialog = window.openDialog('chrome://internote/content/internote-dlg-about.xul',
                                                'internoteabout', 'centerscreen, modal', window);
        if (this.prefsDialog == null)
        {
            this.showMessage("WindowOpenFailed");
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when user opening preferences.", ex);
    }
},

userOpensHelp: function()
{
    gBrowser.selectedTab = gBrowser.addTab(this.consts.HELP_PAGE);
},

userMinimizesAll: function(shouldBeMinimized)
{
    try
    {
        if (this.storage.areNotesDisplaying)
        {
            var notes = this.allUINotes.map(function(uiNote)
            {
                return uiNote.note;
            });
            
            if (shouldBeMinimized == null)
            {
                shouldBeMinimized = !this.screenAreAllMinimized();
            }
            
            this.storage.setIsMinimizedMulti(notes, shouldBeMinimized);
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when user minimized/restored all notes.", ex);
    }
},

userCutsText: function()
{
    document.getElementById("cmd_cut").doCommand();
},

userCopiesText: function()
{
    document.getElementById("cmd_copy").doCommand();
},

userPastesText: function()
{
    document.getElementById("cmd_paste").doCommand();
},

userDeletesText: function()
{
    document.getElementById("cmd_delete").doCommand();
},

userSelectsAll: function()
{
    document.getElementById("cmd_selectAll").doCommand();
},

userChoosesMatchURL: function(element)
{
    //dump("userChoosesMatchURL\n");
    
    try
    {
        var note = this.storage.allNotes[this.utils.getNoteNum(element)];
        this.storage.setMatch(note, this.currentURL, this.storage.URL_MATCH_URL);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when selecting match URL.", ex);
    }
},

userChoosesMatchSite: function(element)
{
    //dump("userChoosesMatchSite\n");
    
    try
    {
        var note = this.storage.allNotes[this.utils.getNoteNum(element)];
        this.storage.setMatch(note, this.utils.getURLSite(this.currentURL), this.storage.URL_MATCH_SITE);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when selecting match site.", ex);
    }
},

userChoosesMatchAll: function(element)
{
    //dump("userChoosesMatchAll\n");
    
    try
    {
        var note = this.storage.allNotes[this.utils.getNoteNum(element)];
        this.storage.setMatch(note, "", this.storage.URL_MATCH_ALL);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when selecting match all.", ex);
    }
},

userChoosesPagePrefix: function(ev, element)
{
    //dump("userChoosesPagePrefix\n");
    
    try
    {
        var note = this.storage.allNotes[this.utils.getNoteNum(element)];
        var url = ev.target.getUserData("internote-data");
        this.storage.setMatch(note, url, this.storage.URL_MATCH_PREFIX);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when selecting URL prefix.", ex);
    }
},

userChoosesSiteSuffix: function(ev, element)
{
    //dump("userChoosesSiteSuffix\n");
    
    try
    {
        var note = this.storage.allNotes[this.utils.getNoteNum(element)];
        var site = ev.target.getUserData("internote-data");
        this.storage.setMatch(note, site, this.storage.URL_MATCH_SUFFIX);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when selecting site suffix.", ex);
    }
},

userIgnoresAnchor: function(ev, element)
{
    try
    {
        var note = this.storage.allNotes[this.utils.getNoteNum(element)];
        this.storage.setIgnoreAnchor(note, ev.target.getAttribute("checked") == "true");
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when ignoring anchor.", ex);
    }
},

userIgnoresParams: function(ev, element)
{
    try
    {
        var note = this.storage.allNotes[this.utils.getNoteNum(element)];
        this.storage.setIgnoreParams(note, ev.target.getAttribute("checked") == "true");
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when ignoring params.", ex);
    }
},

//////////////////////
// Chrome Manipulation
//////////////////////

chromeUpdateStatusBarIconDisplay: function(shouldShowMessage)
{
    var shouldShowIcon = !internoteSharedGlobal.initialisationFailed && this.prefs.shouldUseStatusbar();
    var panel          = document.getElementById("internote-panel");
    this.utils.setDisplayed(panel, shouldShowIcon);
    if (shouldShowMessage && !shouldShowIcon)
    {
        this.showMessage("NoStatusBarMessage");
    }
},

chromeUpdateInternoteIcon: function()
{
    var panel      = document.getElementById("internote-panel");
    var popupLabel = document.getElementById("internote-popup-label");
    
    if (panel != null)
    {
        if (this.storage.areNotesDisplaying)
        {
            panel.src = "chrome://internote/content/newnote16.png";
        }
        else
        {
            panel.src = "chrome://internote/content/newnote16bw.png";
        }
    }
},

chromePrepareTooltip: function()
{
    var tooltipElement = document.getElementById("internote-popup-label");
    
    if (tooltipElement != null)
    {
        if (this.storage.areNotesDisplaying)
        {
            var noteCount = (this.pageWatcher == null)
                          ? 0                            // Only happens during initialisation
                          : this.pageWatcher.getCount(); // XXX This gets spliced so should be accurate?
            
            var stringName = (noteCount == 1) ? "SingularNoteCount" : "PluralNoteCount";
            var newMessageTemplate = this.utils.getLocaleString(stringName);
            var newMessage = newMessageTemplate.replace("%1", noteCount);
            tooltipElement.value = newMessage;
        }
        else
        {
            tooltipElement.value = this.utils.getLocaleString("NotesHiddenMessage");
        }
    }
},

chromePrepareStatusBarMenu: function()
{
    this.chromePrepareMenu("statusbar");
},

chromePrepareMainMenu: function()
{
    this.chromePrepareMenu("main");
},

chromePrepareMenu: function(prefix)
{
    try
    {
        var minimizeAllOption   = document.getElementById("internote-minimize-all-" + prefix);
        var unminimizeAllOption = document.getElementById("internote-unminimize-all-" + prefix);
        
        if (this.pageWatcher == null || this.pageWatcher.getCount() <= 0 || !this.storage.areNotesDisplaying)
        {
            minimizeAllOption.style.display = "";
            minimizeAllOption.disabled = "true";
            unminimizeAllOption.style.display = "none";
        }
        else
        {
            if (this.screenAreAllMinimized())
            {
                minimizeAllOption.style.display = "none";
                unminimizeAllOption.style.display = "";
            }
            else
            {
                minimizeAllOption.style.display = "";
                minimizeAllOption.disabled = "";
                unminimizeAllOption.style.display = "none";
            }
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when trying to update status bar menu.", ex);
    }
},

chromeUpdateDisplayCheckbox: function()
{
    var checkbox1 = document.getElementById("internote-display-notes-main");
    var checkbox2 = document.getElementById("internote-display-notes-statusbar");
    
    if (this.storage.areNotesDisplaying)
    {
        checkbox1.setAttribute("checked", "true");
        checkbox2.setAttribute("checked", "true");
    }
    else
    {
        checkbox1.removeAttribute("checked");
        checkbox2.removeAttribute("checked");
    }
},

chromePrepareContextMenu: function(element)
{
    //dump("chromePrepareContextMenu\n");
    
    try
    {
        var uiNote = this.uiNoteLookup[this.utils.getNoteNum(element)];
        
        var isFlipped   = uiNote.isFlipped;
        var isMinimized = this.noteUI.isMinimized(uiNote);
        
        var editElements = ["internote-context-cut-text", "internote-context-copy-text", "internote-context-paste-text",
                            "internote-context-delete-text", "internote-context-select-all"];
        
        this.utils.setEnabled(editElements, !isFlipped && !isMinimized);
        this.utils.setEnabled("internote-context-flip-note", !isMinimized);
        
        this.utils.setDisplayed("internote-context-minimize-note", !isMinimized);
        this.utils.setDisplayed("internote-context-unminimize-note",  isMinimized );
    }
    catch (ex)
    {
        this.utils.handleException("Exception when preparing context menu.", ex);
    }
},

chromePrepareShowOnMenu: function(element)
{
    try
    {
        var note = this.storage.allNotes[this.utils.getNoteNum(element)];
        
        // First set the radio checkboxes for the static items.
        var urlItem    = document.getElementById("internote-match-url");
        var siteItem   = document.getElementById("internote-match-site");
        var allItem    = document.getElementById("internote-match-all");
        var regexpItem = document.getElementById("internote-match-regexp");
        var anchorItem = document.getElementById("internote-ignore-anchor");
        var paramsItem = document.getElementById("internote-ignore-params");
        
        var isURL        = (note.matchType == this.storage.URL_MATCH_URL   );
        var isSite       = (note.matchType == this.storage.URL_MATCH_SITE  );
        var isAll        = (note.matchType == this.storage.URL_MATCH_ALL   );
        var isRegexp     = (note.matchType == this.storage.URL_MATCH_REGEXP);
        var isURLPrefix  = (note.matchType == this.storage.URL_MATCH_PREFIX);
        var isSiteSuffix = (note.matchType == this.storage.URL_MATCH_SUFFIX);
        
        this.utils.setDisplayed(regexpItem, isRegexp);
        
        var areIgnoresApplicable = this.storage.areIgnoresApplicable(note.matchType);
        this.utils.setEnabled(anchorItem, areIgnoresApplicable);
        this.utils.setEnabled(paramsItem, areIgnoresApplicable);
        
        if (isURL   ) urlItem   .setAttribute("checked", "true");
        if (isSite  ) siteItem  .setAttribute("checked", "true");
        if (isAll   ) allItem   .setAttribute("checked", "true");
        if (isRegexp) regexpItem.setAttribute("checked", "true");
        
        if (note.ignoreAnchor) anchorItem.setAttribute("checked", "true");
        if (note.ignoreParams) paramsItem.setAttribute("checked", "true");
        
        this.chromePrepareShowOnMenuPages(note, isURLPrefix );
        this.chromePrepareShowOnMenuSites(note, isSiteSuffix);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught while preparing show on menu.", ex);
    }
},

chromePrepareShowOnMenuPages: function(note, isURLPrefix)
{
    var menuSeparator = document.getElementById("internote-showon-menu-pages-sep");
    var startsWithLabel = this.utils.getLocaleString("PageStartsWithMenuItem");
    
    // Now remove any existing prefix items.
    this.utils.clearAfterMenuSeparator(menuSeparator);
    
    // Add an existing prefix item, if relevant.
    if (isURLPrefix && !this.utils.endsWith(note.url, "/"))
    {
        var text = startsWithLabel.replace("%1", url);
        this.chromePrepareShowOnCreateItem(menuSeparator, text, url, true, null);
    }
    
    // Now add the new prefix items.
    var url = this.currentURL;
    
    while (true)
    {
        var index = url.lastIndexOf("/");
        
        if (index == -1 || url.charAt(index - 1) == "/") break;
        
        url = url.substr(0, index + 1);
        
        var text = startsWithLabel.replace("%1", url);
        var isChecked = (isURLPrefix && url == note.url);
        this.chromePrepareShowOnCreateItem(menuSeparator, text, url, isChecked,
                                           "internoteUIController.userChoosesPagePrefix(event, popupNode)");
        
        url = url.substr(0, url.length - 1);
    }
},

chromePrepareShowOnMenuSites: function(note, isSiteSuffix)
{
    var menuSeparator = document.getElementById("internote-showon-menu-sites-sep");
    var endsWithLabel = this.utils.getLocaleString("SiteEndsWithMenuItem");
    var site = this.utils.getURLSite(this.currentURL);
    
    // Now remove any existing prefix items.
    this.utils.clearAfterMenuSeparator(menuSeparator);
    
    if (this.utils.isIPAddress(site))
    {
        var text = this.utils.getLocaleString("NoSitesMessage");
        var menuItem = this.chromePrepareShowOnCreateItem(menuSeparator, text, site, false, null);
        menuItem.setAttribute("disabled", "true");
    }
    else
    {
        // Add sites derived from the site in the URL.
        if (site != null)
        {
            while (true)
            {
                var text = endsWithLabel.replace("%1", site);
                var isChecked = (isSiteSuffix && site == note.url);
                this.chromePrepareShowOnCreateItem(menuSeparator, text, site, isChecked,
                                                   "internoteUIController.userChoosesSiteSuffix(event, popupNode)");
                
                var index = site.indexOf(".");
                
                if (index == -1) break;
                
                site = site.substr(index + 1);
                
                if (!this.utils.isValidSite(site)) break;
            }
        }
    }
},

chromePrepareShowOnCreateItem: function(menuSeparator, text, data, isChecked, onCommand)
{
    var menuItem = document.createElement("menuitem");
    
    menuItem.setAttribute("label", text);
    menuItem.setAttribute("type", "radio");
    menuItem.setAttribute("name", "showson");
    
    menuItem.setUserData("internote-data", data, null);
    
    if (isChecked)
    {
        menuItem.setAttribute("checked", "true");
    }
    
    // May be necessary to set handler after setting the check!
    if (onCommand != null)
    {
        menuItem.setAttribute("oncommand", onCommand);
    }
    
    menuSeparator.parentNode.insertBefore(menuItem, menuSeparator.nextSibling);
    
    return menuItem;
},

// For debugging purposes, only runs in debug mode.
chromeActiveWarning: function()
{
    //dump("chromeActiveWarning\n");
    
    try
    {
        if (this.activeWarnCount == null)
        {
            this.activeWarnCount = 0;
        }
        
        var newCount = this.global.dumpData.length;
        
        if (this.activeWarnCount < newCount)
        {
            this.activeWarnCount = newCount;
            
            if (this.prefs.shouldUseStatusbar())
            {
                var panel = document.getElementById("internote-panel");
                if (panel.style.backgroundColor == "red")
                {
                    panel.removeAttribute("style");
                }
                else
                {
                    panel.setAttribute("style", "-moz-appearance: none; background-color: red;");
                }
            }
			else
			{
				this.showMessage(":New errors/warnings/messages detected.");
			}
        }
    }
    catch (ex)
    {
        try
        {
            clearInterval(this.activeWarningInterval);
        }
        catch (ex2)
        {
            dump("Failed to clear interval.");
        }
        this.utils.handleException("Chrome warning failed", ex);
    }
},

//////////////////////////////
// Screen Management
//////////////////////////////

// These do many functions for the notes on screen, calling into the Note UI and Display UI
// as appropriate.  The storage callbacks call these a lot.

screenAreAllMinimized: function()
{
    return this.allUINotes.map(function(uiNote) { return uiNote.note.isMinimized; })
                            .reduce(function(a, b) { return a && b; }, true);
},

screenCreateNote: function(uiNote, shouldAnimate)
{
    //dump("screenCreateNote " + uiNote.num + " " + this.utils.compactDumpString(uiNote.note.text) + "\n");
    
    this.utils.assertClassError(uiNote, "UINote", "Not a UINote when calling screenCreateNote.");
    this.utils.assertError(!this.displayUI.doesNoteExist(uiNote.num), "Note is already on-screen.");
    
    if (this.allUINotes.length > 0 && !this.arePageListeners)
    {
        this.addPageListeners();
    }
    
    var posOnViewport = this.screenCalcNotePosOnViewport(uiNote);
    this.utils.assertError(this.utils.isCoordPair(posOnViewport), "Bad pos on viewport.", posOnViewport);
    
    this.displayUI.addNote(uiNote, posOnViewport, this.storage.getDims(uiNote.note));
    
    // Animation should be the very last thing so it doesn't get interrupted by other CPU tasks.
    if (shouldAnimate && this.utils.supportsTranslucentPopups())
    {
        var animation = internoteAnimation.getFadeAnimation(this.utils, uiNote.noteElt, true);
        this.startNoteAnimation(uiNote, animation, this.CREATE_ANIMATION_TIME);
    }
},

screenRemoveNote: function(uiNote)
{
    //dump("screenRemoveNote " + uiNote.num + " " + this.utils.compactDumpString(uiNote.note.text) + "\n");
    
    this.utils.assertError(uiNote != null, "Note is not on-screen when attempting to remove animatedly.");
    this.utils.assertError(this.utils.isSpecificJSClass(uiNote, "UINote"), "Not a UINote when calling screenRemoveNote.");
    
    this.noteUI.disableUI(uiNote);
    
    var animation = internoteAnimation.getFadeAnimation(this.utils, uiNote.noteElt, false);
    
    var shouldSkipAnimation = !this.utils.supportsTranslucentPopups();
    this.startNoteAnimation(uiNote, animation, this.REMOVE_ANIMATION_TIME, this.utils.bind(this, function()
    {
        this.screenRemoveNoteNow(uiNote);
    }), shouldSkipAnimation);
},

screenRemoveNoteNow: function(uiNote)
{
    //dump("screenRemoveNoteNow " + uiNote.num + " " + this.utils.compactDumpString(uiNote.note.text) + "\n");
    
    this.utils.assertClassError(uiNote, "UINote", "Not a UINote when calling screenRemoveNoteNow.");
    
    this.displayUI.removeNote(uiNote);
    this.uiNoteRemove(uiNote);
    
    //dump("NewLen = " + this.allUINotes.length + "\n");
    
    if (this.allUINotes.length == 0)
    {
        this.removePageListeners();
    }
},

// Calculates the effective position of the note on the page, which is its stored position
// restricted to be within the dimensions of the current page.
screenCalcNotePosOnPage: function(uiNote, offset)
{
    //dump("screenCalcNotePosOnPage\n");
    
    this.utils.assertError(this.utils.isCoordPair(offset), "Invalid offset.");
    
    var note = uiNote.note;
    
    var contentWin = this.currentBrowser.contentWindow;
    
    //dump("  Offset = " + this.utils.compactDumpString(offset) + "\n");
    
    var notePos = this.storage.getPos(note);
    var pos = this.utils.coordPairAdd(notePos, offset);
    
    // If the document is not yet fully loaded, we don't try to restrict notes
    // to be within the page whose dimensions aren't yet finalized.  This would
    // result in them moving as new content comes in.
    if (!this.isPageLoaded)
    {
        return pos;
    }
    
    var viewportDims  = this.utils.getViewportDims(this.currentBrowser);
    var pageDims      = this.utils.getPageDims(this.currentBrowser);
    var effectiveDims = this.utils.coordPairMax(viewportDims, pageDims);
    
    //dump("  ScrollHeight  = " + this.currentBrowser.contentDocument.documentElement.scrollHeight + "\n");
    //dump("  ViewportDims  = " + this.utils.compactDumpString(viewportDims) + "\n");
    //dump("  PageDims      = " + this.utils.compactDumpString(pageDims) + "\n");
    //dump("  EffectiveDims = " + this.utils.compactDumpString(effectiveDims) + "\n");
    
    // Firstly restrict to the page or viewport so we can always see the note.
    var maxPos = this.utils.coordPairSubtract(effectiveDims, this.storage.getDims(note));
    
    //dump("  NotePos = " + this.utils.compactDumpString(notePos) + "\n");
    //dump("  Pos     = " + this.utils.compactDumpString(pos) + "\n");
    //dump("  MaxPos  = " + this.utils.compactDumpString(maxPos) + "\n");
    
    if (maxPos[0] < 0)
    {
        pos[0] = 0;
        maxPos[0] = 0;
    }
    
    if (maxPos[1] < 0)
    {
        pos[1] = 0;
        maxPos[1] = 0;
    }
    
    //dump("  MaxPos2 = " + this.utils.compactDumpString(maxPos) + "\n");
    
    var restrictRect  = this.utils.makeRectFromCoords([0, 0], maxPos);
    
    //dump("  ResRect = " + restrictRect.toString() + "\n");
    
    var restrictedPos = this.utils.restrictPosToRect(pos, restrictRect);

    //dump("  ResPos  = " + this.utils.compactDumpString(restrictedPos) + "\n");
    
    return restrictedPos;
},

screenCalcNotePosOnViewport: function(uiNote)
{
    //dump("screenCalcNotePosOnViewport\n");
    
    var note = uiNote.note;
    
    this.utils.assertError(note != null, "Note is null when calculating note position.");
    
    if (note.isMinimized)
    {
        var viewportDims = this.utils.getViewportDims(this.currentBrowser);
        var top = viewportDims[1] - this.noteUI.MINIMIZED_HEIGHT;
        
        this.utils.assertError(uiNote.minimizePos != null, "Missing minimize pos.");
        var left = uiNote.minimizePos * (this.noteUI.MINIMIZED_WIDTH + this.WIDTH_BETWEEN_MINIMIZED)
                 - this.currentBrowser.contentWindow.scrollX;
        
        return [left, top];
    }
    else
    {
        var topLeftOnPage = this.screenCalcNotePosOnPage(uiNote, [0, 0]);
        var scrollPos = [this.currentBrowser.contentWindow.scrollX,
                         this.currentBrowser.contentWindow.scrollY];
        var topLeftOnViewport = this.utils.coordPairSubtract(topLeftOnPage, scrollPos);
        
        //dump("  TopLeft   = " + this.utils.compactDumpString(topLeftOnPage) + "\n");
        //dump("  ScrollPos = " + this.utils.compactDumpString(scrollPos    ) + "\n");
        //dump("  TopLeft2  = " + this.utils.compactDumpString(topLeftOnViewport) + "\n");
        
        return topLeftOnViewport;
    }
},

// Figures out where the note goes on the viewport after having been offset due to moving.
// Takes into account the note's effective page position, how much the page is scrolled,
// and prevents moving the note (further) off the viewport.
// We use the start drag position as the basis of this calculation, because notes may not
// be at their page position due to restricting onto the page if it was too small.  We also
// can't use the current screen position as it changes as it goes along so we don't want to
// offset it again.
screenCalcDraggedPos: function(uiNote, offset)
{
    //dump("screenCalcDraggedPos\n");
    
    this.utils.assertError(this.utils.isCoordPair(offset), "Invalid offset.");
    this.utils.assertError(!uiNote.note.isMinimized, "Can't move a minimized note.");
    
    var note = uiNote.note;
    
    this.utils.assertError(note != null, "Note is null when calculating note position.");
    
    var viewportDims = this.utils.getViewportDims(this.currentBrowser);
    
    var noteDims     = this.storage.getDims(note);
    
    var scrollPos = [this.currentBrowser.contentWindow.scrollX,
                     this.currentBrowser.contentWindow.scrollY];
    
    //var oldTopLeftOnPage     = this.screenCalcNotePosOnPage(uiNote, [0, 0]);
    //var oldTopLeftOnViewport = this.utils.coordPairSubtract(oldTopLeftOnPage, scrollPos);
    //var oldTopLeftOnViewport = this.displayUI.getScreenPosition(uiNote);
    var oldTopLeftOnViewport = this.dragStartPos;
    
    var maxTopLeftOnViewport = this.utils.coordPairSubtract(viewportDims, noteDims);
    
    var maxLeftMovement  = Math.max(0, oldTopLeftOnViewport[0]);
    var maxUpMovement    = Math.max(0, oldTopLeftOnViewport[1]);
    
    var maxRightMovement = Math.max(0, maxTopLeftOnViewport[0] - oldTopLeftOnViewport[0]);
    var maxDownMovement  = Math.max(0, maxTopLeftOnViewport[1] - oldTopLeftOnViewport[1]);
    
    var restrictedOffset = [
        this.utils.clipToRange(offset[0], -maxLeftMovement, maxRightMovement),
        this.utils.clipToRange(offset[1], -maxUpMovement,   maxDownMovement )
    ];
    
    //var newTopLeftOnPage     = this.screenCalcNotePosOnPage(uiNote, restrictedOffset);
    //var newTopLeftOnViewport = this.utils.coordPairSubtract(newTopLeftOnPage, scrollPos);
    var newTopLeftOnViewport = this.utils.coordPairAdd(this.dragStartPos, restrictedOffset);
    
    if ((offset[0] != 0 || offset[1] != 0) && !this.done)
    {
        //dump("  SP " + this.utils.compactDumpString(this.dragStartPos) + "\n");
        //dump("  OP " + this.utils.compactDumpString(offset) + "\n");
        //dump("  VD " + this.utils.compactDumpString(viewportDims) + "\n");
        //dump("  ND " + this.utils.compactDumpString(noteDims) + "\n");
        //dump("  SP " + this.utils.compactDumpString(scrollPos) + "\n");
        //dump("  MT " + this.utils.compactDumpString(maxTopLeftOnViewport) + "\n");
        //dump("  RO " + this.utils.compactDumpString(restrictedOffset) + "\n");
        //dump("  NTP " + this.utils.compactDumpString(newTopLeftOnPage) + "\n");
        //dump("  NTL " + this.utils.compactDumpString(newTopLeftOnViewport) + "\n\n\n");
        this.done = true;
    }
    
    return newTopLeftOnViewport;
},

// This calculates the dimensions of a note, as if it were unminimized.  An offset to size
// can be applied, and optionally you can restrict to viewport to limit this offset.
screenCalcModifiedNoteDims: function(uiNote, offset)
{
    this.utils.assertError(this.utils.isCoordPair(offset), "Invalid offset.");
    
    var note = uiNote.note;
    
    var contentDoc = this.currentBrowser.contentDocument;
    
    var noteDims = this.storage.getDims(note);
    var newDims = this.utils.coordPairAdd(noteDims, offset);
    
    var posOnViewport = this.screenCalcNotePosOnViewport(uiNote);
    var viewportDims = this.utils.getViewportDims(this.currentBrowser);
    
    //dump("NP " + this.utils.compactDumpString(posOnViewport) + "\n");
    //dump("VD " + this.utils.compactDumpString(viewportDims) + "\n");
    
    var maxDimsDueToViewport = this.utils.coordPairSubtract(viewportDims, posOnViewport);
    
    //dump("MD1 " + this.utils.compactDumpString(maxDimsDueToViewport) + "\n");
    
    // We need to handle the situation where due to small window the maxdims < min allowed, even negative.
    maxDimsDueToViewport = this.storage.clipDims(maxDimsDueToViewport);
    
    //dump("MD2 " + this.utils.compactDumpString(maxDimsDueToViewport) + "\n");
    
    var allowedRect = this.utils.makeRectFromDims([0,0], maxDimsDueToViewport);
    this.utils.assertError(this.utils.isPositiveCoordPair(maxDimsDueToViewport),
                           "Max Dims Due To Boundary <= 0");
    newDims = this.utils.restrictPosToRect(newDims, allowedRect);
    
    return this.storage.clipDims(newDims);
},

screenCalcNewNotePos: function(viewportRect, noteDims)
{
    var INTERNOTE_DISTANCE = this.noteUI.NOTE_OUTER_SIZE + this.noteUI.NOTE_BORDER_SIZE * 2; // enough to show close box
    
    this.utils.assertError(this.utils.isRectangle(viewportRect), "Not a rectangle.");
    this.utils.assertError(this.utils.isPositiveCoordPair(noteDims), "Not dimensions.");
    
    var posType  = this.prefs.getDefaultPosition();
    
    // Calculate the rectangle which the topLeft can fall into.
    var allowedRectDims = this.utils.coordPairSubtractNonNeg(viewportRect.dims, noteDims);
    var allowedRect = this.utils.makeRectFromDims(viewportRect.topLeft, allowedRectDims);
    
    this.utils.assertError(this.utils.isRectangle(allowedRect), "Bad start coordinate for positioning.");
    
    var offset, start;
    switch (posType)
    {
        case 0: // Top Left
            offset = [+INTERNOTE_DISTANCE, +INTERNOTE_DISTANCE];
            start  = this.utils.coordPairAdd(allowedRect.topLeft, offset);
            break;
        case 1: // Top Right
            offset = [-INTERNOTE_DISTANCE, +INTERNOTE_DISTANCE];
            start  = this.utils.coordPairAdd(this.utils.getRectTopRight(allowedRect), offset);
            break;
        case 2: // Bottom Left
            offset = [+INTERNOTE_DISTANCE, -INTERNOTE_DISTANCE];
            start  = this.utils.coordPairAdd(this.utils.getRectBottomLeft(allowedRect), offset);
            break;
        case 3: // Bottom Right
            offset = [-INTERNOTE_DISTANCE, -INTERNOTE_DISTANCE];
            start  = this.utils.coordPairAdd(allowedRect.bottomRight, offset);
            break;
        case 4: // Centered
            offset = [+INTERNOTE_DISTANCE, +INTERNOTE_DISTANCE];
            start  = this.utils.getRectCenter(allowedRect);
            break;
        default:
            this.utils.assertNotHere("Unknown position type.");
    }
    
    this.utils.assertError(this.utils.isNonNegCoordPair(start), "Bad start coordinate for positioning.");
    
    // Search for a position where there is no note.
    var scanStartPos = 0;
    for (var checkPos = start; this.utils.isInRect(checkPos, allowedRect); checkPos = this.utils.coordPairAdd(checkPos, offset))
    {
        if (!this.screenDoOverlappingNotesExist(this.utils.makeRectFromDims(checkPos, noteDims)))
        {
            this.utils.assertError(this.utils.isNonNegCoordPair(checkPos), "Bad check coordinate for positioning.");
            return checkPos;
        }
    }
    
    // If we can't find an nonoverlapping position, just choose the default one.
    return start;
},

// This is very slow ... it only really show up when you hold down Alt-I to create
// lots of notes, but it should possibly be rewritten anyway.
screenDoOverlappingNotesExist: function(newNoteRect)
{
    //dump("screenDoOverlappingNotesExist " + this.utils.compactDumpString(newNoteRect) + "\n");
    
    for (var i = 0; i < this.allUINotes.length; i++)
    {
        //dump("  Note " + i + "\n");
        var uiNote = this.allUINotes[i];
        var note = uiNote.note;
        
        if (!note.isMinimized)
        {
            var noteTopLeft = this.storage.getPos(note);
            
            //dump("    NoteFound " + i + " " + this.utils.compactDumpString(noteTopLeft) + "\n");
            
            if (note.text == "")
            {
                if (this.utils.areCoordPairsEqual(newNoteRect.topLeft, noteTopLeft))
                {
                    return true;
                }
            }
            else
            {
                var currNoteRect = this.utils.makeRectFromDims(noteTopLeft, this.storage.getDims(note));
                if (this.utils.doRectsOverlap(newNoteRect, currNoteRect))
                {
                    return true;
                }
            }
        }
    }
    return false;
},

screenGetUpdatedPosFunc: function(uiNote)
{
    if (uiNote == this.uiNoteBeingDragged && this.dragMode == this.DRAG_MODE_MOVE)
    {
        // We don't want to mess with the drag.  If it's committed this reposition
        // won't matter.  If cancelled later the new correct position will be taken anyway.
        return null;
    }
    
    // Urgh, kludgy side effects ...
    var existingDriver = this.noteAnimations[uiNote.num];
    if (existingDriver != null)
    {
        // Delay ...
        existingDriver.addEventListener("animationCompleted", this.utils.bind(this, function()
        {
            this.screenAdjustTopNote(uiNote);
        }));
        
        return null;
    }
    
    return this.screenCalcNotePosOnViewport(uiNote);
},

// We can't simply loop over all the notes calling screenAdjustSingleNote, because some display
// implementations (separate popups) may reopen and raise the note upon repositioning, and if notes higher
// than repositioned notes don't get repositioned too they'll be out of Z-order.  Let displayUI handle it.
screenAdjustAllNotes: function()
{
    //dump("screenAdjustAllNotes\n");
    this.displayUI.adjustAllNotes(this.utils.bind(this, this.screenGetUpdatedPosFunc));
},

// This is just for the top note, so Z-order should not be an issue.
screenAdjustTopNote: function(uiNote)
{
    //dump("screenAdjustTopNote\n");
    
    var updatedPos = this.screenGetUpdatedPosFunc(uiNote);
    if (updatedPos != null)
    {
        this.displayUI.adjustNote(uiNote, updatedPos, null);
    }
},

screenResetNoteDims: function(uiNote)
{
    this.utils.assertError(!uiNote.note.isMinimized, "Can't set note dims for minimized note.");
    
    var newDims = this.storage.getDims(uiNote.note);
    this.displayUI.adjustNote(uiNote, null, newDims);
    this.noteUI.adjustDims(uiNote, newDims);
    
    // XXX Changing dimensions might change effective note position and therefore screen position.
},

screenSetModifiedNoteDims: function(uiNote, offset)
{
    this.utils.assertError(!uiNote.note.isMinimized, "Can't set note dims for minimized note.");
    this.utils.assertError(this.utils.isCoordPair(offset), "Invalid offset.");
    
    var newDims = this.screenCalcModifiedNoteDims(uiNote, offset);
    
    // Deal with noteUI before displayUI because the display UI might care.
    this.noteUI.adjustDims(uiNote, newDims);
    this.displayUI.adjustNote(uiNote, null, newDims);
    
    // XXX Changing dimensions might change effective note position and therefore screen position.
},

// If the scrollbar has moved, we need to reposition the notes.
// If the viewport size has changed, we may need to show/hide notes.
// If the viewport screen position has changed, this could indicate a window move (in which case
// the panel popup needs to get cut off).
// If the page size has changed, we may need to change how notes are forced on-page.
// In any case, we need to redraw any translucency.
screenCheckAspects: function(ev)
{
    if (this.utils.isMinimized())
    {
        return;
    }
    
    try
    {
        if (ev != null && ev.type != null)
        {
            //dump("screenCheckAspects " + this.utils.arrayToString(this.allUINotes.map(function(a) { return a.num; })) + "\n");
            //dump("screenCheckAspects " + this.utils.compactDumpString(ev.type) + "\n");
        }
        else
        {
            //dump("screenCheckAspects periodic\n");
        }
        
        var content = this.currentBrowser.contentWindow;
        
        var newScrollX = content.scrollX;
        var newScrollY = content.scrollY;
        
        var newLeft    = this.currentBrowser.boxObject.screenX;
        var newTop     = this.currentBrowser.boxObject.screenY;
        
        var [newWidth,     newHeight]      = this.utils.getViewportDims(this.currentBrowser);
        var [newPageWidth, newPageHeight]  = this.utils.getPageDims(this.currentBrowser);
        
        var viewportMoved   = (this.currentLeft      != newLeft      || this.currentTop        != newTop       );
        var viewportResized = (this.currentWidth     != newWidth     || this.currentHeight     != newHeight    );
        var scrolled        = (this.currentScrollX   != newScrollX   || this.currentScrollY    != newScrollY   );
        var pageResized     = (this.currentPageWidth != newPageWidth || this.currentPageHeight != newPageHeight);
        
        if (viewportMoved || viewportResized || scrolled || pageResized)
        {
            this.currentScrollX    = newScrollX;
            this.currentScrollY    = newScrollY;
            this.currentWidth      = newWidth;
            this.currentHeight     = newHeight;
            this.currentLeft       = newLeft;
            this.currentTop        = newTop;
            this.currentPageWidth  = newPageWidth;
            this.currentPageHeight = newPageHeight;
            
            var viewportDims = viewportResized ? this.utils.getViewportDims(this.currentBrowser) : null;
            var posFunc = this.utils.bind(this, this.screenGetUpdatedPosFunc);
            
            this.displayUI.handleChangedAspects(viewportDims, posFunc, viewportResized, viewportMoved, scrolled, pageResized);
        }
        
        this.displayUI.periodicCheck();
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to check viewport.", ex);
    }
},

// This saves the current screen position to storage.  Primarily used during
// dragging where the position isn't committed until drag release.
screenCommitPos: function(uiNote, posOnViewport)
{
    //dump("screenCommitPos\n");

    // Convert the screen pos to page pos ...
    var contentWindow = this.currentBrowser.contentWindow;
    var scrollPos = [contentWindow.scrollX, contentWindow.scrollY];
    var pagePos = this.utils.coordPairAdd(posOnViewport, scrollPos);
    // ... and store it.
    this.storage.setPosition(uiNote.note, pagePos);
    
    //dump("  posOnViewport = " + this.utils.compactDumpString(posOnViewport) + "\n");
    //dump("  scrollPos     = " + this.utils.compactDumpString(scrollPos)     + "\n");
    //dump("  pagePos       = " + this.utils.compactDumpString(pagePos)       + "\n");
},

screenMoveNote: function(uiNote)
{
    var newPosOnViewport     = this.screenCalcNotePosOnViewport(uiNote);
    var currentPosOnViewport = this.displayUI.getScreenPosition(uiNote);
    
    if (!this.utils.areCoordPairsEqual(newPosOnViewport, currentPosOnViewport))
    {
        // This animation will only be necessary if the position was changed in another window.
        var movementOffset = this.utils.coordPairSubtract(newPosOnViewport, currentPosOnViewport);
        var movementDistance = this.utils.coordPairDistance(movementOffset);
        var animationTime = this.MOVE_ANIMATION_TIME + movementDistance;
        
        var animation = internoteAnimation.getMoveOrResizeAnimation(this.utils, this.noteUI, this.displayUI, uiNote,
                                                                    newPosOnViewport, false, false);
        this.startNoteAnimation(uiNote, animation, animationTime);
    }
},

screenResizeNote: function(uiNote)
{
    var newDims = this.storage.getDims(uiNote.note);
    var currentDims = this.noteUI.getDims(uiNote);
    
    if (!this.utils.areCoordPairsEqual(newDims, currentDims))
    {
        // This animation will only be necessary if the position was changed in another window.
        var movementOffset = this.utils.coordPairSubtract(newDims, currentDims);
        var movementDistance = this.utils.coordPairDistance(movementOffset);
        var animationTime = this.RESIZE_ANIMATION_TIME + 2 * movementDistance;
        
        var animation = internoteAnimation.getMoveOrResizeAnimation(this.utils, this.noteUI, this.displayUI, uiNote,
                                                                    newDims, true, false);
        this.startNoteAnimation(uiNote, animation, animationTime);
        
        //var animation =
        //    new internoteAnimation.MoveResizeAnimation(this.utils, animationTime,
        //                                               currentDims, newDims, uiNote.setDimsFunc);
        //this.startNoteAnimation(uiNote, animation);
    }
},

screenUpdateNotesMinimizing: function(uiNotes)
{
    //dump("screenUpdateNotesMinimizing\n");
    
    for (var i = 0; i < uiNotes.length; i++)
    {
        var uiNote = uiNotes[i];
        var newPosOnViewport     = this.screenCalcNotePosOnViewport(uiNote);
        //var currentPosOnViewport = this.displayUI.getScreenPosition(uiNote);
        
        var newDims = uiNote.note.isMinimized ? [ this.noteUI.MINIMIZED_WIDTH, this.noteUI.MINIMIZED_HEIGHT ]
                                           : this.storage.getDims(uiNote.note);

        this.hurryNoteAnimation(uiNote);
        
        var animation = internoteAnimation.getMinimizeAnimation(this.utils, this.noteUI, this.displayUI, uiNote,
                                                                newPosOnViewport, newDims);
        this.startNoteAnimation(uiNote, animation, this.MINIMIZE_ANIMATION_TIME);
    }
},

screenAdjustMinimized: function(uiNote, animationTime)
{
    //dump("screenAdjustMinimized\n");
    //dump("  NoteNum = " + uiNote.num + " NewMinimizePos = " + uiNote.minimizePos + " AnimTime = " + animationTime + "\n");
    
    // We will need to move some notes after a insert/remove into the minimized list.
    var newPosOnViewport     = this.screenCalcNotePosOnViewport(uiNote);
    var currentPosOnViewport = this.displayUI.getScreenPosition(uiNote);
    
    if (!this.utils.areCoordPairsEqual(newPosOnViewport, currentPosOnViewport))
    {
        var animation = internoteAnimation.getMoveOrResizeAnimation(this.utils, this.noteUI, this.displayUI, uiNote,
                                                                    newPosOnViewport, false, true);
        this.startNoteAnimation(uiNote, animation, animationTime);
    }
},

screenInsertMinimizedNotes: function(uiNotesToInsert, animationTime)
{
    // We pre-sort the notes to insert so we can do a merge-style process.
    uiNotesToInsert.sort(this.minimizedNoteSortFunc);
    
    var insertIndex = 0;
    var allIndex = 0;
    
    while (allIndex < this.minimizedNotes.length && insertIndex < uiNotesToInsert.length)
    {
        var noteToInsert = uiNotesToInsert[insertIndex];
        var currentNote = this.minimizedNotes[allIndex];

        if (this.minimizedNoteSortFunc(noteToInsert, this.minimizedNotes[allIndex]) < 0)
        {
            // The note to insert goes before the current note, so splice it in.
            this.minimizedNotes.splice(allIndex, 0, noteToInsert);
            noteToInsert.minimizePos = allIndex;
            insertIndex++;
            allIndex++;
        }
        else
        {
            // The next note to insert goes after the current note, so just update the minimizePos.
            if (allIndex != currentNote.minimizePos)
            {
                currentNote.minimizePos = allIndex;
                this.screenAdjustMinimized(currentNote, animationTime);
            }
            allIndex++;
        }
    }
    
    // Handle any notes left to update minimize pos if all have been inserted before the end.
    while (allIndex < this.minimizedNotes.length)
    {
        var currentNote = this.minimizedNotes[allIndex];
        if (allIndex != currentNote.minimizePos)
        {
            currentNote.minimizePos = allIndex;
            this.screenAdjustMinimized(currentNote, animationTime);
        }
        allIndex++;
    }
    
    // Handle any notes left to insert after all the current notes.
    while (insertIndex < uiNotesToInsert.length)
    {
        var noteToInsert = uiNotesToInsert[insertIndex];
        noteToInsert.minimizePos = allIndex;
        this.minimizedNotes.push(noteToInsert);
        insertIndex++;
        allIndex++;
    }
},

screenRemoveMinimizedNotes: function(uiNotesToRemove, animationTime)
{
    //dump("screenRemoveMinimizedNotes\n");
    
    // We pre-sort the notes to remove so we can do a merge-style process.
    uiNotesToRemove.sort(this.minimizedNoteSortFunc);
    
    var removeIndex = 0;
    var allIndex = 0;
    
    while (removeIndex < uiNotesToRemove.length)
    {
        var noteToRemove = uiNotesToRemove[removeIndex];
        var currentNote = this.minimizedNotes[allIndex];
        
        if (noteToRemove == currentNote)
        {
            //dump("  Removed.\n");
            
            // This is the note to remove, so do so.
            this.minimizedNotes.splice(allIndex, 1);
            delete noteToRemove.minimizePos;
            removeIndex++;
        }
        else
        {
            //dump("  Not removed.\n");
            
            // The next note to remove will be after the current note, so just update the minimizePos if necessary.
            if (allIndex != currentNote.minimizePos)
            {
                //dump("  Updated minimize position.\n");
                currentNote.minimizePos = allIndex;
                this.screenAdjustMinimized(currentNote, animationTime);
            }
            
            allIndex++;
        }
    }
    
    // Handle any notes left to update minimizePos after all the notes have been removed.
    while (allIndex < this.minimizedNotes.length)
    {
        var currentNote = this.minimizedNotes[allIndex];
        
        this.utils.assertWarn(allIndex != currentNote.minimizePos,
                              "Unexpected lack of need to adjust minimize positions after removing minimized notes.");
        
        currentNote.minimizePos = allIndex;
        this.screenAdjustMinimized(currentNote, animationTime);
        allIndex++;
    }
},

//////////////////////////////
// Animations
//////////////////////////////

abandonAllNoteAnimations: function()
{
    //dump("abandonAllNoteAnimations\n");
    
    for (var noteNum in this.noteAnimations)
    {
        //dump("  Abandoning " + noteNum + "\n");
        
        var animation = this.noteAnimations[noteNum];
        animation.abandonTimer();
    }
    
    this.noteAnimations = {};
},

hurryAllNoteAnimations: function()
{
    for each (var animation in this.noteAnimations)
    {
        if (animation != null)
        {
            animation.hurry();
        }
    }
    
    this.noteAnimations = {};
},

hurryNoteAnimation: function(uiNote)
{
    if (this.noteAnimations[uiNote.num] != null)
    {
        this.noteAnimations[uiNote.num].hurry();
    }
},

// This helper makes sure that there is only one animation running at a time for each note.
startNoteAnimation: function(uiNote, animation, animationTime, onCompleteExtra, shouldSkip)
{
    //dump("startNoteAnimation " + uiNote.num + "\n");
    
    if (shouldSkip == null) shouldSkip = false;
    
    this.utils.assertError(shouldSkip || this.utils.isPositiveNumber(animationTime), "Bad animation time.", animationTime);
    
    var existingDriver = this.noteAnimations[uiNote.num];
    if (existingDriver != null) existingDriver.hurry();
    
    var driver = new internoteAnimation.AnimationDriver(this.utils, animation);
    this.noteAnimations[uiNote.num] = driver;
    
    var onComplete = this.utils.bind(this, function()
    {
        //dump("startNoteAnimation.onComplete " + uiNote.num + "\n");
        
        if (onCompleteExtra != null) onCompleteExtra();
        delete this.noteAnimations[uiNote.num];
        driver.removeEventListener("animationCompleted", onComplete);
        onComplete = null;
    });
    
    driver.addEventListener("animationCompleted", onComplete);
    
    if (this.utils.isMinimized() || shouldSkip)
    {
        driver.hurry();
    }
    else
    {
        driver.start(animationTime);
    }
},

//////////////////////////////
// Balloon Messages
//////////////////////////////

hasHTMLNotes: function()
{
    for (var i = 0; i < this.allUINotes.length; i++)
    {
        if (this.allUINotes[i].note.isHTML)
        {
            return true;
        }
    }
    return false;
},

hasOffscreenNotes: function()
{
    var viewportRect = this.utils.getViewportRect(this.currentBrowser);
    
    for (var i = 0; i < this.allUINotes.length; i++)
    {
        var uiNote = this.allUINotes[i];
        if (!uiNote.note.isMinimized) // XXX Fix this is there are ever in-place minimized.
        {
            var posOnPage = this.screenCalcNotePosOnPage(uiNote, [0, 0]);
            var noteRect   = this.utils.makeRectFromDims(posOnPage, this.storage.getDims(uiNote.note));
            if (!this.utils.doRectsOverlap(noteRect, viewportRect))
            {
                return true;
            }
        }
    }
    return false;
},

showMessage: function(messageName, shouldTimeout, linkMessageName, linkFunc)
{
    if (shouldTimeout == null)
    {
        shouldTimeout = true;
    }
    
    if (!this.balloonUI.isInitialized)
    {
        var myBody = document.getElementById("main-window");
        this.balloonUI.init(this.utils, this.anim, "internote-balloon-popup", myBody);
    }
    
    var links = [];
    if (linkMessageName != null)
    {
        links.push({messageName: linkMessageName, func: linkFunc});
    }
    this.balloonUI.showMessage({messageName: messageName, links: links, shouldTimeout: shouldTimeout});
},

showMessageNow: function(messageName, linkMessageName, linkFunc)
{
    if (!this.balloonUI.isInitialized)
    {
        var myBody = document.getElementById("main-window");
        this.balloonUI.init(this.utils, this.anim, "internote-balloon-popup", myBody);
    }
    
    this.balloonUI.popup(this.utils.getLocaleString(messageName), linkMessageName, linkFunc);
},

// This is purely for forward compatibility.  HTML notes are not supported as yet.
maybeShowHTMLMessage: function()
{
    //dump("maybeShowHTMLMessage\n");
    
    if (this.hasHTMLNotes())
    {
        this.showMessage("HTMLMessage");
    }
},

maybeShowOffscreenMessage: function()
{
    //dump("maybeShowOffscreenMessage\n");
    
    if (this.hasOffscreenNotes())
    {
        this.showMessage("OffscreenMessage");
    }
},

//////////////////////////////
// Helpers
//////////////////////////////

// While the notes are in popups modal dialogs won't disable them, so we need to do so manually.
confirmDialog: function(text)
{
    this.hurryAllNoteAnimations();
    
    for (var i = 0; i < this.allUINotes.length ; i++)
    {
        this.noteUI.setIsEnabled(this.allUINotes[i], false);
    }
    
    var confirmResult = confirm(text);
    
    for (var i = 0; i < this.allUINotes.length ; i++)
    {
        this.noteUI.setIsEnabled(this.allUINotes[i], true);
    }
    
    return confirmResult;
},

minimizedNoteSortFunc: function(a, b)
{
    if (a.note.left != b.note.left)
    {
        return a.note.left - b.note.left;
    }
    else
    {
        return a.note.num - b.note.num;
    }
},

//////////////////////////////////////
// Event handlers for storage changes
//////////////////////////////////////

// These are the callbacks from storage.

onNoteAdded: function(event)
{
    //dump("onNoteAdded\n");
    
    try
    {
        var note = event.note;
        
        this.utils.assertError(note != null, "No event target for onNoteAdded.");
        
        // We might still have a remove animation on-screen if changes were made to
        // URL settings in the manager and then quickly undone.  So we need to get
        // rid of it first so the old uiNote is cleared out.
        if (this.noteAnimations[note.num] != null) {
            //dump("  Hurried.\n");
            
            this.noteAnimations[note.num].hurry();
        }
        
        var uiNote = this.noteUI.createNewNote(note, this.noteUICallbacks, document, 0);
        this.uiNoteAdd(uiNote);
        
        if (note.isMinimized)
        {
            this.screenInsertMinimizedNotes([uiNote], this.CREATE_ANIMATION_TIME);
        }
        
        this.screenCreateNote(uiNote, true);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to show new note.", ex);
    }
},

onNoteRemoved: function(event)
{
    //dump("onNoteRemoved\n");
    
    try
    {
        var note = event.note;
        this.utils.assertError(note != null, "No event target for onNoteRemoved.", note);
        
        var uiNote = this.uiNoteLookup[note.num];
        this.utils.assertError(uiNote != null, "UINote is null trying to remove note.", uiNote);
        
        if (this.noteUI.isMinimized(uiNote))
        {
            this.screenRemoveMinimizedNotes([uiNote], this.REMOVE_ANIMATION_TIME);
        }
        
        this.screenRemoveNote(uiNote);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to remove removed note off the screen.", ex);
    }
},

onNoteForeRecolored: function(event)
{
    try
    {
        var note = event.note;
        this.utils.assertError(note != null, "No event target for onNoteForeRecolored.");
        
        var uiNote = this.uiNoteLookup[note.num];
        this.utils.assertError(uiNote != null, "UINote is null trying to fore-recolor note.");
        
        if (uiNote.isFlipped)
        {
            this.noteUI.setForeColor(uiNote, event.data1);
        }
        else
        {
            // This will only happen for a change in another window.
            var animation = internoteAnimation.getForeRecolorAnimation(this.utils, this.noteUI, uiNote, event.data1);
            this.startNoteAnimation(uiNote, animation, this.RECOLOR_ANIMATION_TIME);
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to fore-recolor note.", ex);
    }
},

onNoteBackRecolored: function(event)
{
    try
    {
        var note = event.note;
        this.utils.assertError(note != null, "No event target for onNoteBackRecolored.");
        
        var uiNote = this.uiNoteLookup[note.num];
        this.utils.assertError(uiNote != null, "UINote is null trying to back-recolor note.");
        
        var animation = internoteAnimation.getBackRecolorAnimation(this.utils, this.noteUI, uiNote, event.data1);
        this.startNoteAnimation(uiNote, animation, this.RECOLOR_ANIMATION_TIME);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to back-recolor note.", ex);
    }
},

onNoteEdited: function(event)
{
    //dump("onNoteEdited\n");
    
    try
    {
        var note = event.note;
        this.utils.assertError(note != null, "No event target for onNoteEdited.");
        
        var uiNote = this.uiNoteLookup[note.num];
        this.utils.assertError(uiNote != null, "UINote is null trying to update note text.");
        
        this.noteUI.setText(uiNote, event.data1);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to update note text.", ex);
    }
},

onNoteMoved: function(event)
{
    try
    {
        var note = event.note;
        this.utils.assertError(note != null, "No event target for onNoteMoved.");
        
        if (note.isMinimized)
        {
            this.utils.assertWarnNotHere("Unexpected movement of minimized note.");
            return;
        }
        
        var uiNote = this.uiNoteLookup[note.num];
        this.utils.assertError(uiNote != null, "UINote is null trying to move note.");
        
        this.screenMoveNote(uiNote);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to move note on screen.", ex);
    }
},

onNoteResized: function(event)
{
    try
    {
        var note = event.note;
        this.utils.assertError(note != null, "No event target for onNoteResized.");
        
        if (note.isMinimized)
        {
            this.utils.assertWarnNotHere("Unexpected resize of minimized note.");
            return;
        }
        
        var uiNote = this.uiNoteLookup[note.num];
        this.utils.assertError(uiNote != null, "UINote is null trying to resize note.");
        
        this.screenResizeNote(uiNote);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to resize note on screen.", ex);
    }
},

onNotesMinimized: function(event)
{
    try
    {
        var notesToProcess   = event.note;
        var uiNotesToProcess = notesToProcess.map(function(note) { return this.uiNoteLookup[note.num]; }, this);
        
        var isMinimized = event.data1;
        
        if (isMinimized)
        {
            this.screenInsertMinimizedNotes(uiNotesToProcess, this.MINIMIZE_ANIMATION_TIME);
        }
        else
        {
            this.screenRemoveMinimizedNotes(uiNotesToProcess, this.MINIMIZE_ANIMATION_TIME);
        }
        
        this.screenUpdateNotesMinimizing(uiNotesToProcess);
        
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to resize note on screen.", ex);
    }
},

onNoteRaised: function(event)
{
    //dump("onNoteRaised\n");
    
    try
    {
        var note = event.note;
        this.utils.assertError(note != null, "No event target for onNoteRaised.");
        
        //dump("Text = " + note.text + "\n");
        
        var uiNote = this.uiNoteLookup[note.num];
        this.utils.assertError(uiNote != null, "UINote is null trying to raise note.");
        
        this.displayUI.raiseNote(uiNote);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to raise note on screen.", ex);
    }
},

onNoteReset: function(event)
{
    //dump("onNoteReset\n");
    
    try
    {
        var note = event.note;
        this.utils.assertError(note != null, "No event target for onNoteResized.");
        
        var uiNote = this.uiNoteLookup[note.num];
        this.utils.assertError(uiNote != null, "UINote is null trying to resize note.");
        
        if (this.noteUI.isMinimized(uiNote))
        {
            var updateStartPos = uiNote.minimizePos;
            this.screenRemoveMinimizedNotes([uiNote], this.MINIMIZE_ANIMATION_TIME);
            this.screenUpdateNotesMinimizing([uiNote]);
        }
        else
        {
            this.screenMoveNote(uiNote);
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to reset note position.", ex);
    }
},

onNoteDisplayToggled: function()
{
    try
    {
        this.chromeUpdateInternoteIcon();
        
        // We need to set the checkbox in case it was changed in another window.
        // If it was changed in this window, storage will stop the infinite event loop.
        this.chromeUpdateDisplayCheckbox();
        
        if (this.storage.areNotesDisplaying)
        {
            this.setUpInternote();
        }
        else
        {
            this.tearDownInternote();
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to set whether to display notes.", ex);
    }
},

onTranslucencyPrefSet: function()
{
    try
    {
        for (var i = 0; i < this.allUINotes.length; i++)
        {
            this.noteUI.drawNoteBackground(this.allUINotes[i]);
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to change translucency preference.", ex);
    }
},

onFontSizePrefSet: function()
{
    try
    {
        for (var i = 0; i < this.allUINotes.length; i++)
        {
            this.noteUI.updateFontSize(this.allUINotes[i]);
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to change font size preference.", ex);
    }
},

onScrollbarPrefSet: function()
{
    try
    {
        for (var i = 0; i < this.allUINotes.length; i++)
        {
            this.noteUI.updateScrollbarType(this.allUINotes[i]);
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to change scrollbar preference.", ex);
    }
},

onStatusbarPrefSet: function()
{
    try
    {
        this.chromeUpdateStatusBarIconDisplay(true);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to change statusbar preference.", ex);
    }
},

onInternoteStorageFailed: function(ex)
{
    this.tearDownInternote();
    this.handleCatastrophicFailure("SaveFailedError");
    this.utils.handleException("Caught exception when saving notes.", ex);
},

onWindowFocused: function()
{
	this.balloonUI.checkWhetherToShowMessage();
},

//////////////////////////
// Progress Listener Code
//////////////////////////

// This is called only when we change to a fully loaded tab,
// otherwise onPageLoadStart() will be called.
onTabChange: function(newURL)
{
    //dump("onTabChange\n");
    this.changePage(newURL, true);
},

onPageLoadStart: function(newURL)
{
    //dump("onPageLoadStart\n");
    this.changePage(newURL, false);
},

onPageLoadEnd: function()
{
    //dump("onPageLoadEnd\n");
    
    this.isPageLoaded = true;
    
    if (this.allowNotesOnThisPage(this.currentURL))
    {
        // Changing the page to loaded should trigger forcing
        // off-page notes back onto the page, so reposition them.
        this.screenAdjustAllNotes();
        
        this.maybeShowHTMLMessage();
        this.maybeShowOffscreenMessage();
    }
},

onPageContentArrived: function()
{
    if (this.allowNotesOnThisPage(this.currentURL))
    {
        // Update notes as content comes in ...
        this.screenCheckAspects();
        //this.screenAdjustAllNotes();
    }
},

progressListener: {
    QueryInterface : function(aIID)
    {
        if (aIID.equals(this.utils.getCIInterface("nsIWebProgressListener"  )) ||
            aIID.equals(this.utils.getCIInterface("nsISupportsWeakReference")) ||
            aIID.equals(this.utils.getCIInterface("nsISupports"             )))
                return this;
        throw this.utils.Cr.NS_NOINTERFACE;
    },
    
    onStateChange: function(webProgress, request, stateFlags, status)
    {
        if (!this.internoteDisabled)
        {
            const STATE_START = 0x00000001;
            const STATE_STOP  = 0x00000010;
            
            if (stateFlags & STATE_STOP)
            {
                // There can be other requests (iframes and so on), check it's the right one.
                if (request != null && request.name == internoteUIController.currentURL)
                {
                    internoteUIController.onPageContentArrived(); // XXX Needed?
                    internoteUIController.onPageLoadEnd();
                }
            }
        }
    },
    
    onLocationChange: function(progress, request, location)
    {
        if (!this.internoteDisabled)
        {
            try
            {
                if (location == null)
                {
                    //dump("  Location changed to none.\n");
                    
                    internoteUIController.onTabChange("about:blank");
                }
                else {
                    // First check it's the right address, and not an IFrame, etc.
                    var newURL = location.spec.toString();
                    var currentURL = gBrowser.currentURI.spec.toString();
                    
                    if (newURL == currentURL)
                    {
                        //dump("  Location changed to " + newURL + "\n");
                        
                        if (progress.isLoadingDocument)
                        {
                            internoteUIController.onPageLoadStart(newURL);
                            internoteUIController.onPageContentArrived();
                        }
                        else
                        {
                            internoteUIController.onTabChange(newURL);
                        }
                    }
                }
            }
            catch (ex)
            {
                internoteUtilities.handleException("Exception caught when reporting location change.", ex);
            }
        }
    },
    
    onProgressChange    : function(a,b,c,d,e,f) {},
    onStatusChange      : function(a,b,c,d)     {},
    onSecurityChange    : function(a,b,c)       {},
    onLinkIconAvailable : function(a)           {},
},

};

window.addEventListener("load", function()
{
    //dump("window onload\n");
    
    try
    {
        // Check to see if we already failed to initialize a previous window - we don't need to realert.
        if (internoteSharedGlobal.initialisationFailed)
        {
            var panel = document.getElementById("internote-panel");
            panel.parentNode.removeChild(panel);
        }
        else
        {
            internoteUIController.init();
        }
    }
    catch (ex)
    {
        internoteUIController.handleInitFailure(ex);
    }
}, false);
