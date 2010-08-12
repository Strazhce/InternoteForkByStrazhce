// Internote Extension
// Note Display System - Single Popup Pane Implementation
// Copyright (C) 2010 Matthew Tuck
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
// This is the Display UI, responsible for displaying the notes within the browser.

var internoteDisplayUIPopupPane = {

popupPanel:     null,
innerContainer: null,
offset: [0, 0],
autoFocusNote:  null,

init: function(prefs, utils, noteUI)
{
    // It seems that a strange limitation with JS Code Modules prevents
    // global references from callbacks.
    this.prefs   = prefs;
    this.utils   = utils;
    this.noteUI  = noteUI;
    
    this.isPanelShown   = false;
    this.isPanelCreated = false;
},

setBrowser: function(browser, viewportDims)
{
    this.browser = browser;
    this.viewportDims = viewportDims;
},

setUINotes: function(allUINotes, uiNoteLookup)
{
    this.allUINotes   = allUINotes;
    this.uiNoteLookup = uiNoteLookup;
},

tearDown: function()
{
    //dump("internoteDisplayUI.tearDown\n");
    
    if (this.popupPanel != null)
    {
        this.popupPanel.hidePopup();
        this.popupPanel.parentNode.removeChild(this.popupPanel);
        
        this.popupPanel = null;
        this.innerContainer = null;
    }
    
    this.isPanelCreated = false;
    this.isPanelShown   = false;
},

doesNoteExist: function(noteNum)
{
    return document.getElementById("internote-note" + noteNum) != null;
},

addNote: function(uiNote, pos, dims)
{
    //dump("internoteDisplayUI.addNote\n");
    
    this.utils.assertError(uiNote != null, "Null UINote.", uiNote);
    this.utils.assertError(this.utils.isCoordPair(pos),        "Bad pos on viewport.",  pos );
    this.utils.assertError(this.utils.isNonNegCoordPair(dims), "Bad dims on viewport.", dims);
    
    this.noteUI.addFocusListener(uiNote, this.utils.bind(this, this.onNoteFocused));
    
    this.createInsertionContainer();
    
    this.adjustNote(uiNote, pos, dims);
    
    for (var i = 0; i < this.innerContainer.childNodes.length; i++)
    {
        var noteNum = this.utils.getNoteNum(this.innerContainer.childNodes[i]);
        var otherUINote = this.uiNoteLookup[noteNum];
        if (uiNote.note.zIndex <= otherUINote.note.zIndex)
        {
            var elt = this.innerContainer.insertBefore(uiNote.noteElt, this.innerContainer.childNodes[i]);
            return;
        }
    }
    
    this.innerContainer.appendChild(uiNote.noteElt);
},

removeNote: function(uiNote)
{
    this.innerContainer.removeChild(uiNote.noteElt);
    
    if (this.innerContainer.childNodes.length == 0)
    {
        this.tearDown();
    }
},

raiseNote: function(uiNote)
{
    if (uiNote.noteElt != this.innerContainer.lastChild)
    {
        var pos  = this.getScreenPosition(uiNote);
        var dims = this.noteUI.getDims(uiNote);
        
        this.removeNote(uiNote);
        this.addNote(uiNote, pos, dims);
    }
},

// NoteUI's focusNote method can only be called if the popup panel is already shown,
// whereas you can call this beforehand and it will handle matters.
// It must be called after createInsertionContainer however.
focusNote: function(uiNote)
{
    if (this.isPanelShown)
    {
        // The panel is already on-screen, just focus the new note.
        this.noteUI.focusNote(uiNote);
    }
    else
    {
        // The panel is not on-screen, but it should be coming because of the previous call
        // to createInsertionContainer.  If this is the first note,set it for later autofocus.
        // If it's a later note, make this the new autofocus note.
        this.autoFocusNote = uiNote;
    }
},

onNoteFocused: function()
{
    //dump("internoteDisplayUI.onNoteFocused\n");
    
    try
    {
        this.periodicCheck();
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when handling focus of note.", ex);
    }        
},

// If a note suddenly becomes focused the innerContainer can be unexpectedly scrolled,
// resulting in incorrect coordinates.  This happens when you use the tab key between notes,
// for example. We need to adjust the underlying document's scrollbars in this case.
periodicCheck: function()
{
    //dump("internoteDisplayUI.periodicCheck\n");
    
    if (this.innerContainer != null)
    {
        if (this.innerContainer.scrollLeft != 0 || this.innerContainer.scrollTop != 0)
        {
            //dump("  Detected focus problem.\n");
            var contentWin = this.browser.contentWindow;
            var EXTRA_MOVEMENT = 20; // A little bit extra to try to get the whole note on.
            
            var xMovement = this.innerContainer.scrollLeft + this.utils.sgn(this.innerContainer.scrollLeft) * EXTRA_MOVEMENT;
            var yMovement = this.innerContainer.scrollTop  + this.utils.sgn(this.innerContainer.scrollTop ) * EXTRA_MOVEMENT;
            
            this.innerContainer.scrollLeft = 0;
            this.innerContainer.scrollTop = 0;
            
            //dump("  Movement = " + xMovement + " " + yMovement + "\n");
            
            // Move the underlying scroll window to try to get this note on.  It should trigger a
            // reposition of all notes, just in case.
            contentWin.scrollBy(xMovement, yMovement);
        }
    }
},

// A callback for when the popup panel appears.
popupPanelShown: function()
{
    //dump("internoteDisplayUI.popupPanelShown\n");
    
    try
    {
        if (this.autoFocusNote != null)
        {
            //dump("  AutoFocusing ...\n");
            
            this.noteUI.focusNote(this.autoFocusNote);
            this.autoFocusNote = null;
        }
        
        this.isPanelShown = true;
        
        for (var i = 0; i < this.allUINotes.length; i++)
        {
            var uiNote = this.allUINotes[i];
            this.noteUI.noteShown(uiNote);
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when popup panel shown.", ex);
    }
},

createInsertionContainer: function()
{
    //dump("internoteDisplayUI.createInsertionContainer\n");
    
    this.utils.assertError(this.utils.isNonNegCoordPair(this.viewportDims), "Invalid dims in createInsertionContainer", this.viewportDims);
    
    if (this.innerContainer == null)
    {
        //dump("  Creating new popup & container.\n");
        
        this.innerContainer = document.createElement("stack");
        this.innerContainer.id = "internote-displayinnercontainer";
        this.innerContainer.style.overflow = "hidden";
        this.innerContainer.style.backgroundColor = "transparent";
        //this.innerContainer.style.backgroundColor = "rgba(255, 0, 0, 0.1)"
        
        this.popupPanel = this.utils.createShiftingPanel("pane", this.innerContainer);
        
        this.utils.addBoundDOMEventListener(this.popupPanel, "popupshown",   this, "popupPanelShown",   false);

        this.isPanelCreated = true;
        this.positionPane();
    }
    
    this.utils.assertError(document.getElementById("internote-popuppane") != null, "Can't find display popup.");
},

// For debugging only.  Ctrl-G to activate ... see the main overlay.
showPopupPane: function()
{
    //dump("internoteDisplayUI.showPopupPane\n");
    
    this.innerContainer.style.backgroundColor =
        (this.innerContainer.style.backgroundColor == "transparent") ? "rgba(255, 0, 0, 0.1)" : "transparent";
},

// We need to change the pane dimensions if the viewport dimensions change.  Also
// if popups are positioned partially offscreen, they will get moved on-screen, which
// would be inappropriate.  We shrink the popup pane appropriately to avoid this.
// Also on Windows at least, popups on windows that get minimized and then restored,
// get set to state "closed" once the window is restored, but still appear unanchored
// at the wrong position and unmodifiable.  So we hide and open the popup as minimized.
positionPane: function()
{
    //dump("internoteDisplayUI.positionPane\n");
    
    this.utils.assertError(this.utils.isNonNegCoordPair(this.viewportDims), "Invalid dims in positionPane", this.viewportDims);
    
    var isMinimized = this.utils.isMinimized();
    
    if (this.isPanelCreated)
    {
        if (isMinimized)
        {
            this.popupPanel.hidePopup();
        }
        else
        {
            var viewportPos  = this.utils.getScreenPos(this.browser.boxObject);
            var viewportRect = this.utils.makeRectFromDims(viewportPos, this.viewportDims);
            
            //var screenRect = this.utils.getPopupScreenRect(this.browser);
            //var overlapRect = this.utils.getRectIntersection(screenRect, viewportRect);
            
            var overlapRect = this.utils.restrictRectToScreen(this.browser, viewportRect);
            var newOffset = this.utils.coordPairSubtract(overlapRect.topLeft, viewportRect.topLeft);
            
            //dump("  viewportPos  = " + this.utils.compactDumpString(viewportPos) + "\n");
            //dump("  viewportRect = " + viewportRect.toString() + "\n");
            //dump("  screenRect   = " + screenRect.toString() + "\n");
            //dump("  overlapRect  = " + overlapRect.toString() + "\n");
            //dump("  newOffset    = " + this.utils.compactDumpString(newOffset) + "\n\n\n");
            
            // The inner container can be to the top or left of the outer container, and so is smaller,
            // if we need to cut off the left or top of the popup panel.
            this.utils.fixDOMEltDims(this.innerContainer.parentNode, overlapRect.dims);
            this.utils.fixDOMEltDims(this.innerContainer, viewportRect.dims);
            
            if (isMinimized || this.popupPanel.state == "closed")
            {
                this.popupPanel.openPopup(this.browser, "overlap", newOffset[0], newOffset[1], false, false);
            }
            else if (!this.utils.areArraysEqual(this.offset, newOffset))
            {
                this.utils.setPos(this.innerContainer, this.utils.coordPairMultiply(-1, newOffset));
                this.offset = newOffset;
                
                this.popupPanel.hidePopup();
                this.popupPanel.openPopup(this.browser, "overlap", newOffset[0], newOffset[1], false, false);
            }
        }
    }
},

handleChangedAspects: function(viewportDims, posFunc, viewportResized, viewportMoved, scrolled, pageResized)
{
    //dump("internoteDisplayUI.handleChangedAspects\n");
    
    if (viewportResized)
    {
        this.viewportDims = viewportDims;
    }
    
    if ((viewportResized || viewportMoved) && this.popupPanel != null)
    {
        this.positionPane(viewportDims);
    }
    
    if (scrolled || viewportResized || pageResized)
    {
        this.adjustAllNotes(posFunc);
    }
},

adjustAllNotes: function(getUpdatedPosFunc)
{
    for (var i = 0; i < this.allUINotes.length; i++)
    {
        var uiNote = this.allUINotes[i];
        var updatedPos = (getUpdatedPosFunc == null) ? null : getUpdatedPosFunc(uiNote);
        
        this.adjustNote(uiNote, updatedPos, null);
    }
},

getScreenPosition: function(uiNote)
{
    return this.utils.getPos(uiNote.noteElt);
},

flipStart: function(uiNote)
{
    this.flipStartPos = this.getScreenPosition(uiNote);
},

flipStep: function(uiNote, offsetX)
{
    this.adjustNote(uiNote, [this.flipStartPos[0] + offsetX, this.flipStartPos[1]], null);
},

adjustNote: function(uiNote, newPosOnViewport, newDims)
{
    //dump("internoteDisplayUI.adjustNote " + this.utils.arrayToString(newPosOnViewport) + " " +
    //     this.utils.arrayToString(newDims) + "\n");
    
    this.utils.assertError(uiNote != null, "Null UINote.", uiNote);
    this.utils.assertError(newPosOnViewport == null || this.utils.isCoordPair(newPosOnViewport), "Bad pos on viewport.",  newPosOnViewport);
    this.utils.assertError(newDims          == null || this.utils.isNonNegCoordPair(newDims),    "Bad dims on viewport.", newDims         );
    
    if (newPosOnViewport != null)
    {
        this.utils.assertError(this.utils.isPair(newPosOnViewport), "Invalid pos (1).", newPosOnViewport);
        this.utils.assertError(this.utils.isOptionalFiniteNumber(newPosOnViewport[0]), "Invalid pos (2).", newPosOnViewport[0]);
        this.utils.assertError(this.utils.isOptionalFiniteNumber(newPosOnViewport[1]), "Invalid pos (3).", newPosOnViewport[1]);

        this.utils.setPos(uiNote.noteElt, newPosOnViewport);
    }
},

moveStart: function(uiNote)
{
},

moveEnd: function(uiNote)
{
},

};
