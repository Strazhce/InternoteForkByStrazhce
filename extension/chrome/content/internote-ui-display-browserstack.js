// Internote Extension
// Note Display System - Browser Stack Implementation (Firefox 4)
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

// This implementation uses a stack element around the browser, which is present in FF4 onwards.
// It is the least buggy of all display UIs and so is vastly preferable.

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.displayUIBrowserStack =
{

displayPanel:   null,
innerContainer: null,

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
    return true;
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
    
    if (this.displayPanel != null)
    {
        this.innerContainer.parentNode.removeChild(this.innerContainer);
        
        this.displayPanel   = null;
        this.innerContainer = null;
    }
},

// PUBLIC: Ask the display UI whether it has a specific note number.
doesNoteExist: function(noteNum)
{
    return document.getElementById("internote-note" + noteNum) != null;
},

// PUBLIC: Adds a note to the display UI. The note UI will have already been set up when
// this is called. Will call noteUI.noteShown when the note appears.
addNote: function(uiNote, pos, dims)
{
    //dump("internoteDisplayUI.addNote\n");
    
    this.utils.assertError(uiNote != null, "Null UINote.", uiNote);
    this.utils.assertError(this.utils.isCoordPair(pos),        "Bad pos on viewport.",  pos );
    this.utils.assertError(this.utils.isNonNegCoordPair(dims), "Bad dims on viewport.", dims);
    
    this.noteUI.addFocusListener(uiNote, this.utils.bind(this, this.onNoteFocused));
    
    if (this.displayPanel == null)
    {
        this.createInsertionContainer();
    }
    
    this.adjustNote(uiNote, pos, dims);
    
    this.addNoteToInnerContainer(uiNote);
    
    this.noteUI.noteShown(uiNote);
},

// PRIVATE: Adds the note to the container for notes.
addNoteToInnerContainer: function(uiNote)
{
    uiNote.noteElt.setAttribute("mousethrough", "never");
    
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

// PUBLIC: Removes a note from the display UI, tearing down the note container.
removeNote: function(uiNote)
{
    this.innerContainer.removeChild(uiNote.noteElt);
    
    if (this.innerContainer.childNodes.length == 0)
    {
        this.tearDown();
    }
},

// PUBLIC: Raise the note in the display UI.
raiseNote: function(uiNote)
{
    // XXX This should check the note has the biggest Z-order.
    if (uiNote.noteElt != this.innerContainer.lastChild)
    {
        var pos  = this.getScreenPosition(uiNote);
        var dims = this.noteUI.getDims(uiNote);
        
        var isFocused = this.noteUI.isFocused(uiNote);
        
        try
        {
            var selection = [uiNote.textArea.selectionStart, uiNote.textArea.selectionEnd];
        }
        catch (ex)
        {
            if (ex.name == "NS_ERROR_FAILURE")
            {
                // This will happen if you try to store the selection for a minimized note,
                // which can happen during the restore process.  We should continue and skip it.
                // I think this is tricky to detect otherwise, I think because there's no
                // guaranteed order between raising and restoring.
                var selection = null;
            }
            else
            {
                throw ex;
            }
        }
        
        this.removeNote(uiNote);
        this.addNote(uiNote, pos, dims);
        
        // This delay seems necessary to get the field to focus if we raised the note
        // as a result of tabbing between notes.
        // XXX Check if necessary for this impl?
        this.utils.createTimeout(this.utils.bind(this, function() {
            // We need to focus and reselect explicitly because any focus may be lost when we just did the raiseNote because
            // it removes the note from and readds it to the DOM.
            if (isFocused)
            {
                //dump("  Refocusing.\n");
                this.focusNote(uiNote);
            }
            
            if (selection != null)
            {
                [uiNote.textArea.selectionStart, uiNote.textArea.selectionEnd] = selection;
            }
        }), 0);
    }
},

// PUBLIC: This focuses the note, calling noteUI.focusNote when appropriate.
focusNote: function(uiNote)
{
    //dump("displayUI.focusNote\n");
    this.noteUI.focusNote(uiNote);
},

// PRIVATE: Callback for the noteUI text area getting focused. This won't necessarily
// go through displayUI.focusNote, for example when using the TAB key. So the note
// container may have scrolled, and we may need to scroll the page so they line up again.  
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

// PRIVATE: A periodic check of the display UI, called by the controller, to make sure all is in order.
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

// PRIVATE: Creates the single container where all notes are added.
createInsertionContainer: function()
{
    //dump("internoteDisplayUI.createInsertionContainer\n");
    
    this.utils.assertError(this.innerContainer == null, "Inner container already exists");
    
    this.innerContainer = document.createElement("stack");
    this.innerContainer.id = "internote-displayinnercontainer";
    this.innerContainer.style.overflow = "hidden";
    this.innerContainer.style.backgroundColor = "transparent";
    this.innerContainer.setAttribute("mousethrough", "always");
    //this.innerContainer.style.backgroundColor = "rgba(255, 0, 0, 0.1)"
    
    this.displayPanel = this.browser.parentNode;
    
    // -moz-appearance seems to be necessary on Linux/Mac but not Windows.
    this.displayPanel.setAttribute("style", "background-color: transparent; border: none; -moz-appearance: none; -moz-window-shadow: none; overflow: hidden;");
    this.displayPanel.setAttribute("noautohide", "true");
    this.displayPanel.appendChild(this.innerContainer);
},

// PUBLIC: For debugging purposes only.
activateDebugFunction: function()
{
    //dump("internoteDisplayUI.activateDebugFunction\n");
    
    if (this.innerContainer == null)
    {
        this.createInsertionContainer();
    }
    
    this.innerContainer.style.backgroundColor =
        (this.innerContainer.style.backgroundColor == "transparent") ? "rgba(255, 0, 0, 0.1)" : "transparent";
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
    //dump("internoteDisplayUI.handleChangedAspects\n");
    
    if (viewportResized && this.displayPanel != null)
    {
        //dump("Fixing ...\n");
        var viewportDims = this.getViewportDimsFunc();
        this.utils.assertError(this.utils.isNonNegCoordPair(viewportDims), "Invalid dims in handleChangedAspects.", viewportDims);
        
        this.innerContainer.setAttribute("width",  viewportDims[0]);
        this.innerContainer.setAttribute("height", viewportDims[1]);
    }
    
    if (scrolled || viewportResized || pageResized)
    {
        this.adjustAllNotes(posFunc);
    }
},

// PRIVATE: Changes the position of notes depending on page scroll state.
adjustAllNotes: function(getUpdatedPosFunc)
{
    for (var i = 0; i < this.allUINotes.length; i++)
    {
        var uiNote = this.allUINotes[i];
        var updatedPos = (getUpdatedPosFunc == null) ? null : getUpdatedPosFunc(uiNote);
        
        this.adjustNote(uiNote, updatedPos, null);
    }
},

// PUBLIC: Gets the current viewport position of the note.
getScreenPosition: function(uiNote)
{
    return this.utils.getPos(uiNote.noteElt);
},

// PUBLIC: Initialization for flipping the note.
flipStart: function(uiNote)
{
    this.flipStartPos = this.getScreenPosition(uiNote);
},

// PUBLIC: Adjust the display UI for a step of flipping the note.
flipStep: function(uiNote, offsetX)
{
    this.adjustNote(uiNote, [this.flipStartPos[0] + offsetX, this.flipStartPos[1]], null);
},

// PUBLIC: Move note to new position on viewport. This may be called internally to update matters,
// or by the controller during drag-move or drag-resize operations.
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

};

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.displayUIBrowserStack.initConnections(internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66);
