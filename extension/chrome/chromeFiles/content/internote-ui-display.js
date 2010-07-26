// Internote Extension
// Note Display System
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

// Currently it creates a transparent anchored panel-popup over the whole viewport, within
// which the notes are displayed.  Special handling needs to be performed to ensure the
// popup does not go off-screen, which causes (at times strange) repositioning back on-screen.

// Previously Internote2 created absolutely-positioned chrome over the viewport,
// however this no longer works in Firefox3.

var internoteDisplayUI = {

popupPanel:     null,
outerContainer: null,
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
    this.lastWindowState = window.windowState;
},

setBrowser: function(browser)
{
    this.browser = browser;
},

tearDown: function()
{
    //dump("internoteDisplayUI.tearDown\n");
    
    if (this.popupPanel != null)
    {
        this.popupPanel.parentNode.removeChild(this.popupPanel);
        
        this.popupPanel = null;
        this.outerContainer = null;
        this.innerContainer = null;
    }
    
    this.isPanelCreated = false;
    this.isPanelShown   = false;
},

doesNoteExist: function(noteNum)
{
    return document.getElementById("internote-note" + noteNum) != null;
},

addNewNote: function(uiNote, viewportDims)
{
    //dump("internoteDisplayUI.addNote\n");
    
    this.utils.assertError(this.utils.isNonNegCoordPair(viewportDims), "Invalid dims.", viewportDims);
    
    this.createInsertionContainer(viewportDims);
    
    uiNote.noteElt.style.display = "none";
    
    this.addNote(uiNote, viewportDims);
},

addNote: function(uiNote, viewportDims)
{
    this.utils.addBoundDOMEventListener(uiNote.textArea, "focus", this, "onNoteFocused", false);
    
    for (var i = 0; i < this.innerContainer.childNodes.length; i++)
    {
        var otherUINote = this.innerContainer.childNodes[i].getUserData("uiNote");
        if (uiNote.note.zIndex <= otherUINote.note.zIndex)
        {
            var elt = this.innerContainer.insertBefore(uiNote.noteElt, this.innerContainer.childNodes[i]);
            elt.setUserData("uiNote", uiNote, null);
            return;
        }
    }
    
    var elt = this.innerContainer.appendChild(uiNote.noteElt);
    elt.setUserData("uiNote", uiNote, null);
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
        this.removeNote(uiNote);
        this.addNote(uiNote);
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
        this.checkInnerContainerScroll();
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when handling focus of note.", ex);
    }        
},

// If a note suddenly becomes focused the innerContainer can be unexpectedly scrolled,
// resulting in incorrect coordinates.  This happens when you use the tab key between notes,
// for example. We need to adjust the underlying document's scrollbars in this case.
checkInnerContainerScroll: function()
{
    //dump("internoteDisplayUI.checkInnerContainerScroll\n");
    
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
    
    if (this.autoFocusNote != null)
    {
        //dump("  AutoFocusing ...\n");
        
        this.noteUI.focusNote(this.autoFocusNote);
        this.autoFocusNote = null;
    }
    
    this.isPanelShown = true;
    this.utils.removeBoundDOMEventListener(this.popupPanel, "popupshown", this, "popupPanelShown", false);    
},

createInsertionContainer: function(viewportDims)
{
    //dump("internoteDisplayUI.getInsertionContainer\n");
    
    this.utils.assertError(this.utils.isNonNegCoordPair(viewportDims), "Invalid dims in createInsertionContainer", viewportDims);
    
    if (this.innerContainer == null)
    {
        //dump("  Creating new popup & container.\n");
        
        this.popupPanel = document.createElement("panel");
        this.popupPanel.setAttribute("id", "internote-displaypopup");
        // -moz-appearance seems to be necessary on Linux but not Windows.
        this.popupPanel.setAttribute("style", "background-color: transparent; border: none; -moz-appearance: none;");
        this.popupPanel.setAttribute("noautohide", "true");
        
        // We need this intermediate stack so resetPane can adjust the top-left coordinate
        // of the inner container.
        this.outerContainer = document.createElement("stack");
        this.outerContainer.id = "internote-displayoutercontainer";
        this.outerContainer.style.overflow = "hidden";
        this.outerContainer.style.backgroundColor = "transparent";
        //this.outerContainer.style.backgroundColor = "rgba(255, 0, 0, 0.1)"
        
        this.innerContainer = document.createElement("stack");
        this.innerContainer.id = "internote-displayinnercontainer";
        this.innerContainer.style.overflow = "hidden";
        this.innerContainer.style.backgroundColor = "transparent";
        //this.innerContainer.style.backgroundColor = "rgba(255, 0, 0, 0.1)"
        
        var myBody = document.getElementById("main-window");
        myBody.appendChild(this.popupPanel);
        this.popupPanel.appendChild(this.outerContainer);
        this.outerContainer.appendChild(this.innerContainer);
        
        this.isPanelCreated = true;
        this.positionPane(viewportDims);
        
        this.utils.addBoundDOMEventListener(this.popupPanel, "popupshown", this, "popupPanelShown", false);
    }
    
    this.utils.assertError(document.getElementById("internote-displaypopup") != null, "Can't find display popup.");
},

// For debugging only.  Ctrl-G to activate ... see the main overlay.
showPopupPane: function()
{
    //dump("internoteDisplayUI.showPopupPane\n");
    
    this.innerContainer.style.backgroundColor =
        (this.innerContainer.style.backgroundColor == "transparent") ? "rgba(255, 0, 0, 0.1)" : "transparent";
    this.outerContainer.style.backgroundColor =
        (this.outerContainer.style.backgroundColor == "transparent") ? "rgba(255, 0, 0, 0.1)" : "transparent";
},

getScreenRect: function()
{
    const WINDOW_MAXIMIZED = 1;
    
    var screenWidth  = window.screen.availWidth;
    var screenHeight = window.screen.availHeight;
    
    if (this.utils.getPlatform() == "win")
    {
        // Some quirky aspects of (at least) Windows mess up moving the window close to but not going
        // off-screen to the right, top half of it, or the bottom.  These are worked around by subtracting
        // 4 pixels below, which would seem to be the size of Windows's resize border.
        var shouldUseWorkaround = false;
        
        if (window.windowState != WINDOW_MAXIMIZED)
        {
            shouldUseWorkaround = true;
        }
        else
        {
            // A full-sized popup seems to work when maximized, as long as the popup extends
            // below 110 pixels above the bottom of the screen, which would normally be the case but
            // we just check just in case there's overlaid chrome there raising the viewport bottom.
            var boxBottom = this.browser.boxObject.screenY + this.outerContainer.boxObject.height - 1;
            shouldUseWorkaround = (boxBottom <= (screenHeight - 110));
        }
        
        if (shouldUseWorkaround)
        {
            //dump("  Activated screen size workaround.\n");
            
            var WINDOW_BORDER_SIZE = 4;
            screenWidth -= WINDOW_BORDER_SIZE;
            screenHeight -= WINDOW_BORDER_SIZE;
        }
        else
        {
            // This seems necessary too but probably shouldn't matter in practice, due to the status
            // bar ... I only saw it due to other bugs.
            screenHeight -= 3;
        }
    }
    
    // Don't assume we're on the main monitor!
    var screenTopLeft = [window.screen.availLeft, window.screen.availTop];
    
    return this.utils.makeRectFromDims(screenTopLeft, [screenWidth, screenHeight]);
},

// We need to change the pane dimensions if the viewport dimensions change.  Also
// if popups are positioned partially offscreen, they will get moved on-screen, which
// would be inappropriate.  We shrink the popup pane appropriately to avoid this.
// Also on Windows at least, popups on windows that get minimized and then restored,
// get set to state "closed" once the window is restored, but still appear unanchored
// at the wrong position and unmodifiable.  So we hide and open the popup as minimized.
positionPane: function(viewportDims)
{
    //dump("internoteDisplayUI.positionPane\n");
    
    this.utils.assertError(this.utils.isNonNegCoordPair(viewportDims), "Invalid dims in positionPane", viewportDims);
    
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
            var viewportRect = this.utils.makeRectFromDims(viewportPos, viewportDims);
            var screenRect = this.getScreenRect();
            var overlapRect = this.utils.getRectIntersection(screenRect, viewportRect);
            var newOffset = this.utils.coordPairSubtract(overlapRect.topLeft, viewportRect.topLeft);
            
            //dump("  viewportPos  = " + this.utils.compactDumpString(viewportPos) + "\n");
            //dump("  viewportRect = " + viewportRect.toString() + "\n");
            //dump("  screenRect   = " + screenRect.toString() + "\n");
            //dump("  overlapRect  = " + overlapRect.toString() + "\n");
            //dump("  newOffset    = " + this.utils.compactDumpString(newOffset) + "\n\n\n");
            
            // The inner container can be to the top or left of the outer container, and so is smaller,
            // if we need to cut off the left or top of the popup panel.
            this.utils.fixDOMEltDims(this.outerContainer, overlapRect .dims);
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
        
        this.lastWindowState = windowState;
    }
},

viewportMovedOrResized: function(viewportDims)
{
    //dump("internoteDisplayUI.viewportMovedOrResized " + this.utils.compactDumpString(viewportDims) + "\n");
    
    if (this.popupPanel != null)
    {
        this.positionPane(viewportDims);
    }
},

readyToShowNote: function(uiNote, posOnViewport, dims)
{
    //dump("internoteDisplayUI.readyToShowNote\n");
    
    this.utils.assertError(this.utils.isCoordPair(posOnViewport), "Invalid pos.",  posOnViewport);
    this.utils.assertError(this.utils.isCoordPair(dims),          "Invalid dims.", dims);
    
    this.moveNote  (uiNote, posOnViewport);
    this.resizeNote(uiNote, dims);
    
    uiNote.noteElt.style.display = "";
},

getScreenPosition: function(uiNote)
{
    return this.utils.getPos(uiNote.noteElt);
},

// Gives the note new viewport coordinates
moveNote: function(uiNote, newPosOnViewport)
{
    this.utils.assertError(this.utils.isPair(newPosOnViewport), "Invalid pos (1).", newPosOnViewport);
    this.utils.assertError(this.utils.isOptionalFiniteNumber(newPosOnViewport[0]), "Invalid pos (2).", newPosOnViewport[0]);
    this.utils.assertError(this.utils.isOptionalFiniteNumber(newPosOnViewport[1]), "Invalid pos (3).", newPosOnViewport[1]);

    this.utils.setPos(uiNote.noteElt, newPosOnViewport);
},

resizeNote: function(uiNote, newDims)
{
    // No need to do anything for this implementation.
},

};
