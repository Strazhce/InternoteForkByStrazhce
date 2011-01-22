// Internote Extension
// Note Display System - Fixed-Positioned IFrame Implementation
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

// This is a display UI, responsible for displaying the notes within the browser.

// This implementation creates an IFrame per note and absolutely positions it.
// This does not support translucency, so we only use it on Linux on Firefox3 where
// that isn't supported for popups anyway.

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.displayUIFixedIFrames = {

autoFocusNote:  null,

posLookup:        [],
dimsLookup:       [],
actualPosLookup:  [],
actualDimsLookup: [],
flipLookup:       [],

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
    return false;
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
    
    var iFrames = document.getElementsByClassName("internote-iframe");
    
    // Go in reverse order as when elements are removed from the DOM,
    // it seems they'll be removed from here too, and indexes will change.
    for (var i = iFrames.length - 1; i >= 0; i--)
    {
        var iFrame = iFrames[i];
        iFrame.parentNode.removeChild(iFrame);
    }
    
    this.posLookup        = [];
    this.dimsLookup       = [];
    this.actualPosLookup  = [];
    this.actualDimsLookup = [];
    this.flipLookup       = [];
},

// PUBLIC: Ask the display UI whether it has a specific note number.
doesNoteExist: function(noteNum)
{
    return document.getElementById("internote-iframe" + noteNum) != null;
},

// PUBLIC: Adds a note to the display UI. The note UI will have already been set up when
// this is called. Will call noteUI.noteShown when the note appears.
addNote: function(uiNote, pos)
{
    //dump("internoteDisplayUI.addNote " + uiNote.num + "\n");
    
    this.utils.addBoundDOMEventListener(uiNote.textArea, "focus", this, "onNoteFocused", false);
    
    var dims = this.dimsLookup[uiNote.num] = this.noteUI.getDims(uiNote);
    this.posLookup [uiNote.num] = pos;
    this.flipLookup[uiNote.num] = 0;
    
    var [offset, actualDims, actualPos] = this.calculateNoteProperties(pos, dims);
    
    this.actualPosLookup [uiNote.num] = actualPos;
    this.actualDimsLookup[uiNote.num] = actualDims;
    
    var onLoad = this.utils.bind(this, function()
    {
        this.shiftShiftingIFrame (iFrame, offset    );
        this.resizeShiftingIFrame(iFrame, actualDims);
        
        var viewportPos  = [this.browser.boxObject.x, this.browser.boxObject.y];
        iFrame.style.left = (actualPos[0] + viewportPos[0]) + "px";
        iFrame.style.top  = (actualPos[1] + viewportPos[1]) + "px";
        
        iFrame.contentDocument.documentElement.style.overflow = "hidden";
        
        iFrame.style.display = "";
        
        //dump("Opening Offset = " + this.utils.compactDumpString(offset) + " Dims = " + this.utils.compactDumpString(actualDims) +
        //     " Pos = " + this.utils.compactDumpString(actualPos) + "\n");
        
        this.iFrameLoaded(uiNote);
    });
    
    // Context menus won't work properly because it's in the IFrame document instead, so handle it manually.
    uiNote.noteElt.addEventListener("click", this.utils.bind(this, function(ev)
    {
        try
        {
            if (ev.button == 2)
            {
                var iFrame = document.getElementById("internote-iframe" + this.utils.getNoteNum(ev.target));
                var [iFrameLeft, iFrameTop] = [parseInt(iFrame.style.left, 10), parseInt(iFrame.style.top,  10)];
                document.popupNode = iFrame;
                var popup = document.getElementById("internote-note-menu");
                popup.openPopup(null, null, iFrameLeft + ev.clientX, iFrameTop + ev.clientY, true, false);
            }
        }
        catch (ex)
        {
            this.utils.handleException("Exception caught while clicking on note.", ex);
        }
    }), false);
    
    var iFrame = this.createShiftingIFrame(uiNote.num, uiNote.noteElt, onLoad);
    iFrame.setAttribute("style", "position: fixed; background-color: transparent; border: none;");
    iFrame.style.zIndex = uiNote.note.zIndex;
    
    onLoad = null; // prevent leak
},

// PUBLIC: Removes a note from the display UI.
removeNote: function(uiNote)
{
    //dump("internoteDisplayUI.removeNote\n");
    
    var iFrame = document.getElementById("internote-iframe" + uiNote.num);
    
    iFrame.parentNode.removeChild(iFrame);
    
    delete this.posLookup       [uiNote.num];
    delete this.dimsLookup      [uiNote.num];
    delete this.actualPosLookup [uiNote.num];
    delete this.actualDimsLookup[uiNote.num];
},

// PUBLIC: Raise a note in the display UI.
raiseNote: function(uiNote)
{
    //dump("internoteDisplayUI.raiseNote\n");
    var iFrame = document.getElementById("internote-iframe" + uiNote.num);
    iFrame.style.zIndex = uiNote.note.zIndex;
},

// PUBLIC: This focuses the note, calling noteUI.focusNote when appropriate.
// For this display UI, we can only call noteUI's focusNote method once the iFrame is loaded.
focusNote: function(uiNote)
{
    //dump("internoteDisplayUI.focusNote\n");
    
    var iFrame = document.getElementById("internote-iframe" + uiNote.num);
    
    if (iFrame.contentDocument.body.firstChild != null)
    {
        // The iFrame is already loaded, just focus the new note.
        this.noteUI.focusNote(uiNote);
    }
    else
    {
        // The iFrame is not loaded, but it should be loading.  If this is the first note, set
        // it for later autofocus. If it's a later note, make this the new autofocus note.
        this.autoFocusNote = uiNote;
    }
},

// PRIVATE: Callback for the noteUI text area getting focused. For this display UI, nothing is
// required.
onNoteFocused: function()
{
    // Do nothing in this implementation.
},

// PRIVATE: A periodic check of the display UI, called by the controller, to make sure all is in order.
periodicCheck: function()
{
    // Do nothing in this implementation.
},

// PRIVATE: A callback for when the iFrame loads.
iFrameLoaded: function(uiNote)
{
    //dump("internoteDisplayUI.iFrameLoaded\n");
    
    try
    {
        if (this.autoFocusNote != null)
        {
            this.noteUI.focusNote(this.autoFocusNote);
            this.autoFocusNote = null;
        }
        
        this.noteUI.noteShown(uiNote);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when iFrame loaded.", ex);
    }
},

// PUBLIC: Scroll the display UI to show a specific note.
scrollToNote: function(uiNote)
{
    // Check whether off-page.
    var currNoteRect = this.utils.makeRectFromDims(uiNote.note.getPos(), uiNote.note.getDims());
    var wasMoved = this.utils.scrollToShowRect(window, this.browser, currNoteRect);
    
    if (wasMoved)
    {
        // Might not be able to focus the note yet, wait until handleChangedAspects.
        this.autoFocusNote = uiNote;
    }
    else
    {
        this.focusNote(uiNote);
        this.raiseNote(uiNote);
    }
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
    
    if (this.autoFocusNote != null)
    {
        this.focusNote(this.autoFocusNote);
        this.raiseNote(this.autoFocusNote);
        this.autoFocusNote = null;
    }
},

// PUBLIC: Gets the current viewport position of the note.
getScreenPosition: function(uiNote)
{
    return this.posLookup[uiNote.num];
},

// PRIVATE: Changes the position of notes depending on page scroll state.
adjustAllNotes: function(getUpdatedPosFunc)
{
    //dump("internoteDisplayUI.adjustAllNotes\n");
    
    for (var i = 0; i < this.allUINotes.length; i++)
    {
        var uiNote = this.allUINotes[i];
        var updatedPos = (getUpdatedPosFunc == null) ? null : getUpdatedPosFunc(uiNote);
        this.adjustNote(uiNote, updatedPos, null);
    }
},

// PUBLIC: Move note to new position on viewport. This may be called internally to update matters,
// or by the controller during drag-move or drag-resize operations.
// The newFlipOffset parameter will only be supplied internally.
adjustNote: function(uiNote, newPos, newDims, newFlipOffset)
{
    //dump("internoteDisplayUI.adjustNote " + uiNote.num + "\n");
    
    this.utils.assertError(this.utils.isCoordPair(newPos)          || newPos  == null, "New position is invalid.", newPos);
    this.utils.assertError(this.utils.isPositiveCoordPair(newDims) || newDims == null, "Invalid note dims.",       newDims);
    
    var iFrame = document.getElementById("internote-iframe" + uiNote.num);
    
    this.utils.assertError(iFrame != null, "IFrame doesn't exist.", uiNote.num);
    
    var currentPos        = this.posLookup [uiNote.num];
    var currentDims       = this.dimsLookup[uiNote.num];
    var currentFlipOffset = this.flipLookup[uiNote.num];
    
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
    
    if (newFlipOffset == null)
    {
        newFlipOffset = currentFlipOffset;
    }
    else
    {
        this.flipLookup[uiNote.num] = newFlipOffset;
    }
    
    var newPos = [newPos[0] + newFlipOffset, newPos[1]];
    
    this.utils.assertError(this.utils.isCoordPair        (newPos),  "New position is invalid.", newPos);
    this.utils.assertError(this.utils.isPositiveCoordPair(newDims), "Invalid note dims.",       newDims);
    
    var [offset, actualDims, actualPos] = this.calculateNoteProperties(newPos, newDims);
    
    var oldOffset     = this.getShiftingIFrameOffset(iFrame);
    var oldActualPos  = this.actualPosLookup [uiNote.num];
    var oldActualDims = this.actualDimsLookup[uiNote.num];
    
    if (!this.utils.areCoordPairsEqual(offset, oldOffset))
    {
        //dump("  Shifting " + oldOffset + " -> " + offset + "\n");
        this.shiftShiftingIFrame(iFrame, offset);
    }
    
    if (!this.utils.areCoordPairsEqual(actualDims, oldActualDims))
    {
        //dump("  Resizing " + oldActualDims + " -> " + actualDims + "\n");
        this.actualDimsLookup[uiNote.num] = actualDims;
        this.resizeShiftingIFrame(iFrame, actualDims);
    }
    
    var isPosDifferent = !this.utils.areCoordPairsEqual(actualPos, oldActualPos);
    
    if (isPosDifferent)
    {
        //dump("  MovingReal   " + currentPos   + " -> " + newPos    + "\n");
        //dump("  MovingActual " + oldActualPos + " -> " + actualPos + "\n");
        
        this.actualPosLookup[uiNote.num] = actualPos;
        
        var viewportPos  = [this.browser.boxObject.x, this.browser.boxObject.y];
        iFrame.style.left = (actualPos[0] + viewportPos[0]) + "px";
        iFrame.style.top  = (actualPos[1] + viewportPos[1]) + "px";
        
        this.utils.setDisplayedElts(iFrame, actualDims[0] > 0 && actualDims[1] > 0);
    }
},

// PRIVATE: Calculate various properties for the note based its intersection
// with the page and viewport.
calculateNoteProperties: function(pos, dims)
{
    this.utils.assertError(this.utils.isCoordPair      (pos ), "Invalid pos calcing note properties",           pos         );
    this.utils.assertError(this.utils.isNonNegCoordPair(dims), "Invalid dims calcing note properties",          dims        );
    
    var viewportDims = this.getViewportDimsFunc();
    
    this.utils.assertError(this.utils.isNonNegCoordPair(viewportDims), "Invalid viewport dims calcing note properties", viewportDims);
    
    var viewportRect = this.utils.makeRectFromDims([0, 0], viewportDims);
    
    if (this.utils.isRectEmpty(viewportRect))
    {
        // Can happen during loading.
        return [[0, 0], [0, 0], [0, 0]];
    }
    else
    {
        var noteRect = this.utils.makeRectFromDims(pos, dims);
        var noteShowingRect = this.utils.getRectIntersection(viewportRect, noteRect);
        var offset = this.utils.coordPairSubtract(pos, noteShowingRect.topLeft);
        return [offset, noteShowingRect.dims, noteShowingRect.topLeft];
    }
},

// PUBLIC: Initialization for flipping the note.
flipStart: function(uiNote)
{
    // Do nothing in this implementation.
},

// PUBLIC: Adjust the display UI for a step of flipping the note.
flipStep: function(uiNote, offsetX, width)
{
    this.adjustNote(uiNote, null, null, offsetX);
    var iFrame = document.getElementById("internote-iframe" + uiNote.num);
    this.utils.fixDOMEltWidth(iFrame, width);
},

// PUBLIC: Initialization for moving the note (via drag or animation).
moveStart: function(uiNote)
{
    // Do nothing in this implementation.
},

// PUBLIC: Completion of moving the note (via drag or animation).
moveEnd: function(uiNote)
{
    // Do nothing in this implementation.
},

// PUBLIC: For debugging purposes only.
activateDebugFunction: function() {},

// PRIVATE: Creates an IFRAME with an internal stack that can be scrolled to allow
// only a part of the note to be displayed, ie allows the top or left being truncated.
createShiftingIFrame: function(suffix, containee, onLoad)
{
    var iFrame = this.utils.createHTMLElement("iframe", document);
    iFrame.setAttribute("id", "internote-iframe" + suffix);
    iFrame.setAttribute("style", "background-color: transparent; border: none; position: fixed; display: none;");
    iFrame.setAttribute("class", "internote-iframe");
    
    var iFrameDoc = iFrame.contentDocument;
    
    // We need this stack because you can position in stacks but not other elements.
    var container = document.createElement("stack");
    container.setAttribute("id", "internote-shiftcontainer" + suffix);
    container.setAttribute("style", "overflow: hidden; background-color: transparent;");
    
    var myBody = document.getElementById("main-window");
    myBody.appendChild(iFrame);
    
    container.appendChild(containee);
    
    iFrame.contentWindow.addEventListener("load", this.utils.bind(this, function() {
        try
        {
            var body = iFrame.contentDocument.getElementsByTagName("body")[0];
            body.style.padding = "0px";
            body.style.border  = "none";
            body.style.margin  = "0px";
            body.appendChild(container);
            onLoad();
        }
        catch (ex)
        {
           this.utils.handleException("Exception caught when loading IFrame.", ex);
        }
    }), false);
    
    return iFrame;
},

// PRIVATE: Shifts the internal stack in the shifting IFRAME.
shiftShiftingIFrame: function(iFrame, offset)
{
    //dump("internoteDisplayUI.shiftShiftingIFrame\n");
    
    var containee = this.getShiftingIFrameContainee(iFrame);
    
    if (containee == null)
    {
        iFrame.contentWindow.addEventListener("load", this.utils.bind(this, function() {
            containee = this.getShiftingIFrameContainee(iFrame);
            [containee.left, containee.top] = offset;
        }), false);
    }
    else
    {
        [containee.left, containee.top] = offset;
    }
},

// PRIVATE: Resizes the shifting IFRAME.
resizeShiftingIFrame: function(iFrame, dims)
{
    //dump("internoteDisplayUI.resizeShiftingIFrame\n");
    
    var containee = this.getShiftingIFrameContainee(iFrame);
    
    if (containee == null)
    {
        iFrame.contentWindow.addEventListener("load", this.utils.bind(this, function() {
            var container = containee.parentNode;    
            this.utils.fixDOMEltDims(iFrame, dims);
            this.utils.fixDOMEltDims(container, dims);
        }), false);
    }
    else
    {
        var container = containee.parentNode;    
        this.utils.fixDOMEltDims(iFrame, dims);    
        this.utils.fixDOMEltDims(container, dims);
    }
},

// PRIVATE: Gets the current offset of the shifting IFRAME, ie how much of the top and left isn't shown.
getShiftingIFrameOffset: function(iFrame)
{
    var containee = this.getShiftingIFrameContainee(iFrame);
    if (containee == null)
    {
        // Can happen during initialization.
        return [0, 0];
    }
    else
    {
        return [containee.left, containee.top];
    }
},

// PRIVATE: Get the containee of the shifting IFRAME, ie the main element of the note UI.
getShiftingIFrameContainee: function(iFrame)
{
    var body = iFrame.contentDocument.body;
    if (body.firstChild == null)
    {
        // Hasn't loaded yet.
        return null;
    }
    else
    {
        return body.firstChild.firstChild;
    }
},

};

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.displayUIFixedIFrames.initConnections(internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66);
