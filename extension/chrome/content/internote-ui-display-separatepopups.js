// Internote Extension
// Note Display System - Separate Popups Implementation
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

// This implementation creates a popup per note.  This doesn't scale too well
// but is necessary for platforms that have issues with the popup pane, ie Mac.

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.displayUISeparatePopups = {

autoFocusNote:  null,

notesBeingMoved:  [],
posLookup:        [],
dimsLookup:       [],
actualPosLookup:  [],
actualDimsLookup: [],
noteOrder:        [], // We use this to avoid unnecessary reopens.

// PUBLIC: Configure connections to other objects.
initConnections: function(windowGlobal)
{
    this.prefs   = windowGlobal.sharedGlobal.prefs;
    this.utils   = windowGlobal.sharedGlobal.utils;
    
    this.noteUI  = windowGlobal.noteUI;
},

// PUBLIC: Initialise the displayUI.
init: function(getViewportDimsFunc)
{
    this.getViewportDimsFunc = getViewportDimsFunc;
},

// PUBLIC: Whether this display UI supports note translucency.
supportsTranslucency: function()
{
    return this.utils.supportsTranslucentPopups();
},

// PUBLIC: Set the browser.
setBrowser: function(browser)
{
    this.browser = browser;
},

// PUBLIC: The controller set its array of all UINote objects and map of note num of UINote object.
setUINotes: function(allUINotes, uiNoteLookup)
{
    this.allUINotes   = allUINotes;
    this.uiNoteLookup = uiNoteLookup;
},

// PUBLIC: Called to tear down display of notes, eg when moving between tabs or changing page.
tearDown: function()
{
    //dump("internoteDisplayUI.tearDown\n");
    
    var popups = document.getElementsByClassName("internote-popup");
    
    // Go in reverse order as when elements are removed from the DOM,
    // it seems they'll be removed from here too, and indexes will change.
    for (var i = popups.length - 1; i >= 0; i--)
    {
        var popup = popups[i];
        popup.hidePopup();
        popup.parentNode.removeChild(popup);
    }
    
    this.posLookup        = [];
    this.dimsLookup       = [];
    this.actualPosLookup  = [];
    this.actualDimsLookup = [];
    this.noteOrder        = [];
},

// PUBLIC: Ask the display UI whether it has a specific note number.
doesNoteExist: function(noteNum)
{
    return document.getElementById("internote-popup" + noteNum) != null;
},

// PUBLIC: Adds a note to the display UI. The note UI will have already been set up when
// this is called. Will call noteUI.noteShown when the note appears (delayed until popupShown).
addNote: function(uiNote, pos)
{
    //dump("internoteDisplayUI.addNote " + uiNote.num + "\n");
    
    this.utils.addBoundDOMEventListener(uiNote.textArea, "focus", this, "onNoteFocused", false);
    
    var popup = this.utils.createShiftingPanel(document, uiNote.num, uiNote.noteElt);
    popup.setAttribute("class", "internote-popup");
    
    var dims = this.dimsLookup[uiNote.num] = uiNote.note.getDims();
    this.posLookup[uiNote.num] = pos;
    
    var [offset, actualDims, actualPos] = this.calculateNoteProperties(pos, dims);
    
    this.actualPosLookup [uiNote.num] = actualPos;
    this.actualDimsLookup[uiNote.num] = actualDims;
    
    this.utils.shiftShiftingPanel (popup, offset    );
    this.utils.resizeShiftingPanel(popup, actualDims);
    
    //dump("Opening Offset = " + this.utils.compactDumpString(offset) + " Dims = " + this.utils.compactDumpString(actualDims) +
    //     " Pos = " + this.utils.compactDumpString(actualPos) + "\n");
    
    popup.openPopup(this.browser, "overlap", actualPos[0], actualPos[1], false, false);
    
    popup.addEventListener("popupshown", this.utils.bind(this, function(ev)
    {
        this.popupShown(ev, uiNote);
    }), false);
    
    this.addNoteToOrder(uiNote);
},

// PUBLIC: Removes a note from the display UI.
removeNote: function(uiNote)
{
    //dump("internoteDisplayUI.removeNote\n");

    var popup = document.getElementById("internote-popup" + uiNote.num);
    
    popup.hidePopup();
    popup.parentNode.removeChild(popup);
    
    this.removeNoteFromOrder(uiNote);
    
    delete this.posLookup       [uiNote.num];
    delete this.dimsLookup      [uiNote.num];
    delete this.actualPosLookup [uiNote.num];
    delete this.actualDimsLookup[uiNote.num];
},

// PRIVATE: Add a note to the stored note order.
addNoteToOrder: function(uiNote)
{
    this.noteOrder.push(uiNote.num);
},

// PRIVATE: Remove a note from the stored note order.
removeNoteFromOrder: function(uiNote)
{
    var oldPos = this.noteOrder.indexOf(uiNote.num);
    this.utils.assertError(0 <= oldPos, "Could not find note to remove from order.", uiNote.num);
    this.utils.spliceFirstInstance(this.noteOrder, uiNote.num);
},

// PRIVATE: Determine whether this note is on top. Used to prevent unnecessary flickery reopening.
isOnTop: function(uiNote)
{
    //dump("Ordering: " + uiNote.num + " " + this.utils.compactDumpString(this.noteOrder) + "\n");
    return uiNote.num == this.noteOrder[this.noteOrder.length - 1];
},

// PRIVATE: Raise a note in the stored note order.
raiseNoteInOrder: function(uiNote)
{
    if (this.isOnTop(uiNote))
    {
        return false;
    }
    else
    {
        this.removeNoteFromOrder(uiNote);
        this.addNoteToOrder(uiNote);
        return true;
    }
},

// PUBLIC: Raise a note in the display UI. This requires it be reopened.
raiseNote: function(uiNote)
{
    //dump("internoteDisplayUI.raiseNote\n");
    
    var wasRaised = this.raiseNoteInOrder(uiNote);
    if (wasRaised)
    {
        //dump("  Reopening note due to raise.\n");
        // Avoid the flickering reopen unless necessary.
        this.reopenNote(uiNote);
    }
},

// PUBLIC: This focuses the note, calling noteUI.focusNote when appropriate.
// For this display UI, we can only call noteUI's focusNote method once the popup panel is shown.
// It must be called after createInsertionContainer however.
focusNote: function(uiNote)
{
    //dump("internoteDisplayUI.focusNote\n");
    
    var popup = document.getElementById("internote-popup" + uiNote.num);
    
    if (popup.state == "open")
    {
        // The panel is already on-screen, just focus the new note.
        this.noteUI.focusNote(uiNote);
    }
    else
    {
        // The panel is not on-screen, but it should be coming.  If this is the first note, set
        // it for later autofocus. If it's a later note, make this the new autofocus note.
        this.autoFocusNote = uiNote;
    }
},

// PRIVATE: Callback for the noteUI text area getting focused.
onNoteFocused: function()
{
    // Do nothing in this implementation.
},

// PRIVATE: A periodic check of the display UI, called by the controller, to make sure all is in order.
periodicCheck: function()
{
    // Do nothing in this implementation.
},

// PRIVATE: A callback for when the popup appears - we may need to focus the note.
popupShown: function(event, uiNote)
{
    //dump("internoteDisplayUI.popupShown\n");
    
    try
    {
        var popup = event.target;
        
        if (this.autoFocusNote != null)
        {
            if (popup != null && popup.state == "open")
            {
                this.noteUI.focusNote(this.autoFocusNote);
                this.autoFocusNote = null;
            }
        }
        
        this.noteUI.noteShown(uiNote);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when popup shown.", ex);
    }
},

// PUBLIC: Scroll the display UI to show a specific note.
scrollToNote: function(uiNote)
{
    var currNoteRect = this.utils.makeRectFromDims(uiNote.note.getPos(), uiNote.note.getDims());
    this.utils.scrollToShowRect(window, this.browser, currNoteRect);
    
    this.focusNote(uiNote);
    this.raiseNote(uiNote);
},

// PUBLIC: When the controller detects changed viewport/page characteristics,
// we get informed and adjust the display UI as necessary.
handleChangedAspects: function(posFunc, viewportResized, viewportMoved, scrolled, pageResized)
{
    //dump("internoteDisplayUI.handleChangedAspects " + viewportResized + " " + viewportMoved + " " + scrolled + " " + pageResized + "\n");
    
    // Both scrolling and resizing the viewport can lead to positions changing.
    if (scrolled || viewportResized || pageResized)
    {
        // These can lead to changing note positions.  Both types of resizing because of
        // notes forced on page, plus viewport resized because of minimized notes.
        this.adjustAllNotes(posFunc);
    }
    else
    {
        this.adjustAllNotes(null);
    }
},

// PRIVATE: When we adjust all the notes in this display UI, we have to reopen the popups.
// This means taking care to reopen them in the right order to maintain Z-order.
sortUINotes: function(uiNotes)
{
    var uiNotesClone = uiNotes.slice(0);
    uiNotesClone.sort(function(uiNote1, uiNote2) { return uiNote1.note.zIndex - uiNote2.note.zIndex; });
    return uiNotesClone;
},

// PUBLIC: Gets the current viewport position of the note.
getScreenPosition: function(uiNote)
{
    return this.posLookup[uiNote.num];
},

// PRIVATE: Reopens the note at the right position.
reopenNote: function(uiNote)
{
    //dump("internoteDisplayUI.reopenNote \"" + uiNote.note.text + "\"\n");
    
    var isMoving = (this.notesBeingMoved.indexOf(uiNote) != -1);
    if (isMoving)
    {
        this.utils.assertWarnNotHere("Tried to reopen note during move operation.");
        this.utils.spliceFirstInstance(this.notesBeingMoved, uiNote);
    }
    
    var popup = document.getElementById("internote-popup" + uiNote.num);
    
    var actualPos = this.actualPosLookup[uiNote.num];
    var wasFocused = this.noteUI.isFocused(uiNote);
    
    popup.hidePopup();
    popup.openPopup(this.browser, "overlap", actualPos[0], actualPos[1], false, false);
    
    if (wasFocused)
    {
        this.focusNote(uiNote);
    }
},

// PRIVATE: Changes the position of notes depending on page scroll state.
adjustAllNotes: function(getUpdatedPosFunc)
{
    var uiNotes = this.sortUINotes(this.allUINotes);
    
    var shouldForceReopen = false;
    for (var i = 0; i < uiNotes.length; i++)
    {
        var uiNote = uiNotes[i];
        var updatedPos = (getUpdatedPosFunc == null) ? null : getUpdatedPosFunc(uiNote);
        var wasReopened = this.adjustNote(uiNote, updatedPos, null, shouldForceReopen);
        
        // If we reopen a popup we must also reopen those above it to maintain Z-order.
        if (wasReopened)
        {
            shouldForceReopen = true;
        }
    }
},

// PUBLIC: Move note to new position on viewport. This may be called internally to update matters,
// or by the controller during drag-move or drag-resize operations.
// This implementation reopens the note if necessary. popup.moveTo is buggy (bug #457600) on
// anchored popups, so we only use moveTo if we've previously called moveStart to unanchor the popup.
// The shouldForceReopen parameter will only be supplied internally.
adjustNote: function(uiNote, newPos, newDims, shouldForceReopen)
{
    //dump("internoteDisplayUI.adjustNote " + uiNote.num + "\n");
    
    this.utils.assertError(this.utils.isCoordPair(newPos)          || newPos  == null, "New position is invalid.", newPos);
    this.utils.assertError(this.utils.isPositiveCoordPair(newDims) || newDims == null, "Invalid note dims.",       newDims);
    
    //this.utils.assertWarn(this.isOnTop(uiNote), "Not on top when moving.");
    
    var popup = document.getElementById("internote-popup" + uiNote.num);
    
    var currentPos    = this.posLookup [uiNote.num];
    var currentDims   = this.dimsLookup[uiNote.num];
    
    if (newPos == null)
    {
        newPos = currentPos;
    }
    else
    {
        this.posLookup[uiNote.num] = newPos;
    }
    
    if (newDims == null)
    {
        newDims = currentDims;
    }
    else
    {
        this.dimsLookup[uiNote.num] = newDims;
    }
    
    this.utils.assertError(this.utils.isCoordPair        (newPos),  "New position is invalid.", newPos);
    this.utils.assertError(this.utils.isPositiveCoordPair(newDims), "Invalid note dims.",       newDims);
    
    var [offset, actualDims, actualPos] = this.calculateNoteProperties(newPos, newDims);
    
    var oldOffset     = this.utils.getShiftingPanelOffset(popup);
    var oldActualPos  = this.actualPosLookup [uiNote.num];
    var oldActualDims = this.actualDimsLookup[uiNote.num];
    
    if (!this.utils.areCoordPairsEqual(offset, oldOffset))
    {
        //dump("  Shifting " + oldOffset + " -> " + offset + "\n");
        this.utils.shiftShiftingPanel(popup, offset);
    }
    
    if (!this.utils.areCoordPairsEqual(actualDims, oldActualDims))
    {
        //dump("  Resizing " + oldActualDims + " -> " + actualDims + "\n");
        this.actualDimsLookup[uiNote.num] = actualDims;
        this.utils.resizeShiftingPanel(popup, actualDims);
    }
    
    if (actualDims[0] == 0 || actualDims[1] == 0)
    {
        shouldForceReopen = false;
    }
    
    var isPosDifferent = !this.utils.areCoordPairsEqual(actualPos, oldActualPos);
    var isMoving       = (this.notesBeingMoved.indexOf(uiNote) != -1);
    
    if (isPosDifferent)
    {
        //dump("  Moving " + oldActualPos + " -> " + actualPos + "\n");
        this.actualPosLookup[uiNote.num] = actualPos;
    }
    
    if (shouldForceReopen || (isPosDifferent && !isMoving))
    {
        this.reopenNote(uiNote);
        return true;
    }
    else if (isPosDifferent)
    {
        var popup = document.getElementById("internote-popup" + uiNote.num);
        var viewportPos = this.utils.getScreenPos(this.browser.boxObject);
        popup.moveTo(actualPos[0] + viewportPos[0], actualPos[1] + viewportPos[1]);
        return false;
    }
    else
    {
        return false;
    }
},

// PRIVATE: Get the part of the viewport that's showing on the screen.
getViewportShowingRect: function()
{
    var viewportPos  = this.utils.getScreenPos(this.browser.boxObject);
    var viewportRect = this.utils.makeRectFromDims(viewportPos, this.getViewportDimsFunc());
    //var screenRect = this.utils.getPopupScreenRect(this.browser);
    //var overlapRect = this.utils.getRectIntersection(screenRect, this.viewportRect);
    var overlapRect = this.utils.restrictRectToScreen(window, this.browser, viewportRect);
    var newOffset = this.utils.coordPairSubtract(overlapRect.topLeft, viewportRect.topLeft);
    
    //dump("AK1 " + this.arrayToString(viewportPos) + "\n");
    //dump("AK2 " + viewportRect + "\n");
    //dump("AK3 " + screenRect + "\n");
    //dump("AK4 " + overlapRect + "\n");
    //dump("AK5 " + newOffset + "\n");
    
    return this.utils.makeRectFromDims(newOffset, overlapRect.dims);
},

// PRIVATE: Calculate various properties for the note based its intersection
// with the page, viewport and screen.
calculateNoteProperties: function(pos, dims)
{
    this.utils.assertError(this.utils.isCoordPair      (pos         ), "Invalid pos calcing note properties",           pos         );
    this.utils.assertError(this.utils.isNonNegCoordPair(dims        ), "Invalid dims calcing note properties",          dims        );
    
    //dump("  POS = " + this.utils.compactDumpString(pos         ) + "\n");
    //dump("  DIMS= " + this.utils.compactDumpString(dims        ) + "\n");
    
    var viewportShowingRect = this.getViewportShowingRect();
    
    if (this.utils.isRectEmpty(viewportShowingRect))
    {
        // Can happen during loading.
        return [[0, 0], [0, 0], [0, 0]];
    }
    else
    {
        var noteRect = this.utils.makeRectFromDims(pos, dims);
        var noteShowingRect = this.utils.getRectIntersection(viewportShowingRect, noteRect);
        var offset = this.utils.coordPairSubtract(pos, noteShowingRect.topLeft);
        var actualPos = this.utils.restrictPosToRect(pos, viewportShowingRect);
        
        //dump("VSR = " + viewportShowingRect.toString() + "\n");
        //dump("NR  = " + noteRect.toString() + "\n");
        //dump("NSR = " + noteShowingRect.toString() + "\n");
        //dump("OFF = " + offset.toString() + "\n");
        //dump("APOS= " + actualPos + "\n");
        
        return [offset, noteShowingRect.dims, actualPos];
    }
},

// PUBLIC: Initialization for flipping the note.
flipStart: function(uiNote)
{
    var popup = document.getElementById("internote-popup" + uiNote.num);
    this.flipStartOffset = this.utils.getShiftingPanelOffset(popup);
},

// PUBLIC: Adjust the display UI for a step of flipping the note.
flipStep: function(uiNote, offsetX)
{
    var popup = document.getElementById("internote-popup" + uiNote.num);
    this.utils.shiftShiftingPanel(popup, [this.flipStartOffset[0] + offsetX, this.flipStartOffset[1]]);
},

// PUBLIC: Initialization for moving the note (via drag or animation).
moveStart: function(uiNote)
{
    // First we kludgily raise/reopen the note, because if we do it once the move has started,
    // that creates problems for the current code, as we can't reopen during move.  Any
    // subsequent raise will be a null op because it's already on top.
    this.raiseNote(uiNote);
    
    // Change to non-anchored so moving the note will switch to an unanchored popup.
    // We use this temporarily because moveTo works properly only with unanchored popups (bug #457600)
    // and we prefer to avoid numerous flickery reopens during a drag.
    this.notesBeingMoved.push(uiNote);
    this.adjustNote(uiNote, null, null, false); // We don't need to reopen the note, move will unanchor it.
},

// PUBLIC: Completion of moving the note (via drag or animation).
moveEnd: function(uiNote)
{
    // Change to anchored.
    this.utils.spliceFirstInstance(this.notesBeingMoved, uiNote);
    this.adjustNote(uiNote, null, null, true);
},

// PUBLIC: For debugging purposes only.
activateDebugFunction: function() {},

};

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.displayUISeparatePopups.initConnections(internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66);
