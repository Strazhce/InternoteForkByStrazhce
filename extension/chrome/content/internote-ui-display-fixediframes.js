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
// This is the Display UI, responsible for displaying the notes within the browser.

// This implementation creates an IFrame per note.  This does not support
// translucency, so we only use it on Linux where that isn't supported for
// popups anyway.

var internoteDisplayUIFixedIFrames = {

autoFocusNote:  null,

posLookup:        [],
dimsLookup:       [],
actualPosLookup:  [],
actualDimsLookup: [],
flipLookup:       [],

init: function(prefs, utils, noteUI)
{
    // It seems that a strange limitation with JS Code Modules prevents
    // global references from callbacks.
    this.prefs   = prefs;
    this.utils   = utils;
    this.noteUI  = noteUI;
},

supportsTranslucency: function()
{
    return false;
},

setBrowser: function(browser, viewportDims)
{
    this.browser      = browser;
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

doesNoteExist: function(noteNum)
{
    return document.getElementById("internote-iframe" + noteNum) != null;
},

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

raiseNote: function(uiNote)
{
    //dump("internoteDisplayUI.raiseNote\n");
    var iFrame = document.getElementById("internote-iframe" + uiNote.num);
    iFrame.style.zIndex = uiNote.note.zIndex;
},

// NoteUI's focusNote method can only be called if the iFrame is already loaded,
// whereas you can call this beforehand and it will handle matters.
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

onNoteFocused: function()
{
    //dump("internoteDisplayUI.onNoteFocused\n");
},

periodicCheck: function()
{
    // Do nothing in this implementation.
},

// A callback for when the iFrame loads.
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
        
        uiNote.textArea.addEventListener("keypress", this.utils.bind(this, function(ev)
        {
            try
            {
                if (ev.keyCode == ev.DOM_VK_TAB)
                {
                    this.utils.assertError(!uiNote.note.isMinimized, "Tabbed from minimized note.", uiNote.note);
                    
                    var index = this.allUINotes.indexOf(uiNote);
                    var len = this.allUINotes.length;
                    var nextUINote;
                    
                    if (ev.shiftKey)
                    {
                        do
                        {
                            index = (index - 1 + len) % len;
                            nextUINote = this.allUINotes[index];
                        }
                        while (nextUINote.note.isMinimized);
                    }
                    else
                    {
                        do
                        {
                            index = (index + 1) % len;
                            nextUINote = this.allUINotes[index];
                        }
                        while (nextUINote.note.isMinimized);
                    }
                    
                    // Check whether off-page.
                    var currNoteRect = this.utils.makeRectFromDims(nextUINote.note.getPos(), nextUINote.note.getDims());
                    var wasMoved = this.utils.scrollToShowRect(this.browser, currNoteRect);
                    
                    if (wasMoved)
                    {
                        // Might not be able to focus the note yet, wait until handleChangedAspects.
                        this.autoFocusNote = nextUINote;
                    }
                    else
                    {
                        this.focusNote(nextUINote);
                        this.raiseNote(nextUINote);
                    }
                    
                    ev.preventDefault();
                    ev.stopPropagation();
                }
            }
            catch (ex)
            {
                this.utils.handleException("Exception caught when handling key press.", ex);
            }
        }), false);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when iFrame loaded.", ex);
    }
},

handleChangedAspects: function(viewportDims, posFunc, viewportResized, viewportMoved, scrolled, pageResized)
{
    //dump("internoteDisplayUI.handleChangedAspects " + viewportResized + " " + viewportMoved + " " + scrolled + " " + pageResized + "\n");
    
    this.utils.assertError(viewportDims == null || this.utils.isNonNegCoordPair(viewportDims), "Bad dims when handleChangedAspects", viewportDims);
    
    if (viewportResized)
    {
        this.viewportDims = viewportDims;
    }
    
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

getScreenPosition: function(uiNote)
{
    return this.posLookup[uiNote.num];
},

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
        
        this.utils.setDisplayed(iFrame, actualDims[0] > 0 && actualDims[1] > 0);
    }
},

calculateNoteProperties: function(pos, dims)
{
    this.utils.assertError(this.utils.isNonNegCoordPair(this.viewportDims), "Invalid viewport dims calcing note properties", this.viewportDims);
    this.utils.assertError(this.utils.isCoordPair      (pos ), "Invalid pos calcing note properties",           pos         );
    this.utils.assertError(this.utils.isNonNegCoordPair(dims), "Invalid dims calcing note properties",          dims        );
    
    var viewportRect = this.utils.makeRectFromDims([0, 0], this.utils.getViewportDims(this.browser));
    
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

flipStart: function(uiNote)
{
},

flipStep: function(uiNote, offsetX, width)
{
    this.adjustNote(uiNote, null, null, offsetX);
    var iFrame = document.getElementById("internote-iframe" + uiNote.num);
    this.utils.fixDOMEltWidth(iFrame, width);
},

moveStart: function(uiNote)
{
},

moveEnd: function(uiNote)
{
},

activateDebugFunction: function() {},

createShiftingIFrame: function(suffix, containee, onLoad)
{
    var iFrame = this.utils.createHTMLElement("iframe");
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
