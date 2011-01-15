// Internote Extension
// Note User Interface
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

// This is the Note UI, responsible for drawing the UI inside individual notes.

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.noteUI =
{
NOTE_BORDER_SIZE: 2,
NOTE_OUTER_SIZE: 10,
NOTE_SPACING: 8,
NOTE_SPACING_LITTLE: 4,

NOTE_ALPHA:  0.85,

SWAB_SPACING: 5,
SWAB_TITLE_HEIGHT: 16,
SWAB_TITLE_FONT: 12,

FRONT_PAGE  : 0,
FLIPPED_PAGE: 1,

MINIMIZED_WIDTH: 150,

noteFlipImage: new Image(),

/////////////////////////////////
// Externally called methods
/////////////////////////////////

// PUBLIC: Configure connections to other objects.
initConnections: function(windowGlobal)
{
    this.utils   = windowGlobal.sharedGlobal.utils;
    this.prefs   = windowGlobal.sharedGlobal.prefs;
    this.consts  = windowGlobal.sharedGlobal.consts;
},

// PUBLIC: Initialize note UI.
// supportsTranslucency will come in from the display UI.
init: function(supportsTranslucency)
{
    // XXX Rename -> displayUISupportsTranslucency
    this.supportsTranslucency = supportsTranslucency;
    
    // XXX Can't find a constructor for this?
    this.noteFlipImage.src = "chrome://internote/skin/arrow" + this.NOTE_OUTER_SIZE + ".png";
    
    this.MINIMIZED_HEIGHT = 2 * this.NOTE_BORDER_SIZE + this.NOTE_OUTER_SIZE;
},

// PUBLIC: Register a callback for once the image has loaded.
waitForImageLoad: function(onLoad)
{
    this.noteFlipImage.addEventListener("load", onLoad, false);
},

// PUBLIC: Check whether the image has loaded.
areImagesLoaded: function()
{
    return this.noteFlipImage.complete;
},

// PUBLIC: Register a focus listener for the text area.
addFocusListener: function(uiNote, func)
{
    uiNote.textArea.addEventListener("focus", func, false);
},

// PUBLIC: Register a listener for pressing TAB in the text area.
addTabListener: function(uiNote, func)
{
    uiNote.textArea.addEventListener("keypress", this.utils.bind(this, function(ev)
    {
        try
        {
            this.utils.assertError(!uiNote.note.isMinimized, "Tabbed from minimized note.", uiNote.note);
            
            if (ev.keyCode == ev.DOM_VK_TAB)
            {
                func(ev.shiftKey);
                ev.preventDefault();
                ev.stopPropagation();
            }
        }
        catch (ex)
        {
            this.utils.handleException("Exception caught when handling key press.", ex);
        }
    }), false);
},

// PUBLIC: This creates a UINote, an object containing all the relevant objects for the
// user interface of a note, such the XUL/HTML UI elements, and the isFlipped state. 
makeUINote: function(note)
{
    // We use this inner function so UINote is not global yet it isn't anonymous for debugging.
    function UINote(utils, note)
    {
        this.note           = note;
        this.num            = note.num;
        this.isFlipped      = false;
        
        this.backColor      = note.backColor;
        this.backColorArray = utils.parseHexColor(note.backColor);
    }
    
    return new UINote(this.utils, note);
},

// PUBLIC: Destroy the note UI.
destroy: function(uiNote)
{
    uiNote.textArea.removeEventListener("input", function(event)
    {
        onEdit(event);
    }, false);
},

// PUBLIC: Called when a new note is shown. This is called by the display UI, which may be
// some time after note creation if the display UI had to wait for a "popupshown" event.
noteShown: function(uiNote)
{
    //dump("internoteNoteUI.noteShown\n");
    
    this.updateScrollbarType(uiNote);
    
    // We delay these until note is shown, otherwise they don't work.  No idea why,
    // or why setButtonTooltip works at all, see the comment there.
    this.setButtonTooltip(uiNote.closeButton,    "internote-entity-delete-note");
    this.setMinimizeButtonTooltip(uiNote);
    this.setFlipButtonTooltip    (uiNote);
},

// PRIVATE: Determine whether we should left align the top buttons, based on prefs and platform.
hasLeftAlignedTopButtons: function()
{
    var pref = this.prefs.shouldLeftAlignTopButtons();
    if (pref === null)
    {
        return this.utils.hasLeftAlignedTopButtons();
    }
    else
    {
        return pref;
    }
},

// PUBLIC Given a back-end note object, and the relevant callbacks all stored in an object, this
// creates a UINote object and fully configures the user interface in preparation for
// being shown by a display UI.
// createXULElement is used here rather than createElement so that we can create the element
// inside the about:blank HTML doc in the scratch IFrame used for static images.
createNewNote: function(note, callbacks, doc, initialOpacity)
{
    this.utils.assertClassError(note, "InternoteNote", "Note is not correct class when creating new note.")
    
    if (doc == null) doc = document;
    
    var uiNote = this.makeUINote(note);
    
    var noteElt = uiNote.noteElt = this.utils.createXULElement("stack", doc, "internote-note" + note.num);
    
    var foreground  = uiNote.foreground  = this.utils.createXULElement("vbox", doc, "internote-foreground" + note.num);
    var background  = uiNote.background  = this.createBackground(doc, uiNote)
    var backSide    = uiNote.backSide    = this.createBackSide(doc, uiNote, callbacks.onClickBackSide);
    
    var topBox      = uiNote.topBox      = this.utils.createXULElement("hbox", doc, "internote-topbox" + note.num);
    var midBox      = uiNote.midBox      = this.utils.createXULElement("hbox", doc, "internote-midbox" + note.num);
    var botBox      = uiNote.botBox      = this.utils.createXULElement("hbox", doc, "internote-botbox" + note.num);
    
    var midBotBox        = uiNote.midBotBox = this.utils.createXULElement("vbox", doc, "internote-midbotbox"        + note.num);
    var scrollbarWrapper = uiNote.scrollbar = this.utils.createXULElement("vbox", doc, "internote-scrollbarwrapper" + note.num);
    
    var innerDeck   = uiNote.innerDeck   = this.utils.createXULElement("deck",  doc, "internote-innerdeck" + note.num);
    var eastDeck    = uiNote.eastDeck    = this.utils.createXULElement("deck",  doc, "internote-eastdeck"  + note.num);
    var topStack    = uiNote.topStack    = this.utils.createXULElement("stack", doc, "internote-topstack"  + note.num);
    
    var closeButton    = uiNote.closeButton    =
        this.createButton(doc, uiNote, callbacks.onClose,    "closeButton",    "internote-close",    "drawCloseButton");
    var minimizeButton = uiNote.minimizeButton =
        this.createButton(doc, uiNote, callbacks.onMinimize, "minimizeButton", "internote-minimize", "drawMinimizeButton");
    
    var flipButton   = uiNote.flipButton   = this.createFlipButton  (doc, uiNote, callbacks.onFlip );
    var resizeHandle = uiNote.resizeHandle = this.createResizeHandle(doc, uiNote, callbacks.onResizeStart);
    
    var littleText  = uiNote.littleText =
        this.createLittleText(doc, uiNote);
    var textArea = this.createTextArea(doc, uiNote, callbacks.onEdit, callbacks.onMoveStart, callbacks.onFocus)
    
    var isEnabledFunc      = function() { return uiNote.isEnabled; }
    var getButtonColorFunc = this.utils.bind(this, function(effectMode) { return this.getButtonColor(uiNote, effectMode); });
    var getLineColorFunc   = this.utils.bind(this, function(effectMode)
    {
        var borderColor = this.getRawBorderColor(uiNote);
        if (effectMode == this.utils.EFFECT_MODE_PRESS)
        {
            var buttonNormalColor = this.getRawButtonColor(uiNote, this.utils.EFFECT_MODE_NORMAL);
            var result = this.utils.interpolateColor(0.35, borderColor, buttonNormalColor);
        }
        else
        {
            var result = borderColor;
        }
        return this.utils.formatHexColor(result);
    });
    var getHandleColorFunc = this.utils.bind(this, function(effectMode)
    {
        var buttonNormalColor = this.getRawButtonColor(uiNote, this.utils.EFFECT_MODE_NORMAL);
        if (effectMode == this.utils.EFFECT_MODE_PRESS)
        {
            var borderColor = this.getRawBorderColor(uiNote);
            var result = this.utils.interpolateColor(0.65, borderColor, buttonNormalColor);
        }
        else
        {
            var result = buttonNormalColor;
        }
        return this.utils.formatHexColor(result);        
    });
    
    var scrollbarHandler = uiNote.scrollHandler =
        new this.utils.ScrollHandler(this.utils, this.prefs, uiNote.textArea, uiNote.num, this.NOTE_OUTER_SIZE,
                                     getLineColorFunc, getHandleColorFunc, getButtonColorFunc, isEnabledFunc);
    isEnabledFunc = getLineColorFunc = getButtonColorFunc = null; // prevent leak
    
    var scrollbar = uiNote.scrollbar = scrollbarHandler.getScrollbar();
    
    var minimizedTop = uiNote.minimizedTop =
        this.utils.createXULElement("hbox", doc, "internote-minimizedtop" + note.num);
    
    var dragNorth = uiNote.dragNorth = this.createDragBorder(doc, uiNote, "north", false, callbacks.onMoveStart);
    var dragSouth = uiNote.dragSouth = this.createDragBorder(doc, uiNote, "south", false, callbacks.onMoveStart);
    var dragWest  = uiNote.dragWest  = this.createDragBorder(doc, uiNote, "west",  true,  callbacks.onMoveStart);
    var dragEast  = uiNote.dragEast  = this.createDragBorder(doc, uiNote, "east",  true,  callbacks.onMoveStart);
    
    noteElt.appendChild(background);
    noteElt.appendChild(foreground);
    noteElt.style.overflow = "hidden";
    noteElt.style.opacity  = initialOpacity;
    noteElt.setAttribute("context", "internote-note-menu");
    
    foreground.appendChild(topBox);
    foreground.appendChild(midBotBox);
    foreground.style.margin = this.NOTE_BORDER_SIZE + "px";
    foreground.flex = "1";
    
    if (this.hasLeftAlignedTopButtons())
    {
        topBox.appendChild(closeButton);
        topBox.appendChild(this.createHorzSpacer(doc));
        topBox.appendChild(minimizeButton);
        topBox.appendChild(topStack);
    }
    else
    {
        topBox.appendChild(topStack);
        topBox.appendChild(minimizeButton);
        topBox.appendChild(this.createHorzSpacer(doc));
        topBox.appendChild(closeButton);
    }
    
    topStack.appendChild(dragNorth);
    topStack.appendChild(minimizedTop);
    topStack.style.overflow = "hidden";
    topStack.flex = "1";
    
    if (this.hasLeftAlignedTopButtons())
    {
        minimizedTop.appendChild(this.createHorzSpacer(doc, true));
        minimizedTop.appendChild(littleText);
        minimizedTop.appendChild(this.createHorzSpacer(doc));
    }
    else
    {
        minimizedTop.appendChild(this.createHorzSpacer(doc));
        minimizedTop.appendChild(littleText);
        minimizedTop.appendChild(this.createHorzSpacer(doc, true));
    }
    
    midBotBox.appendChild(midBox);
    midBotBox.appendChild(botBox);
    midBotBox.flex = "1";
    
    midBox.appendChild(dragWest);
    midBox.appendChild(innerDeck);
    midBox.appendChild(eastDeck);
    midBox.flex = "1";
    
    innerDeck.appendChild(textArea);
    innerDeck.appendChild(backSide);
    innerDeck.setAttribute("selectedIndex", 0);
    innerDeck.style.overflow = "hidden";
    innerDeck.flex = "1";
    
    eastDeck.appendChild(dragEast);
    eastDeck.appendChild(scrollbarWrapper);
    eastDeck.setAttribute("selectedIndex", 0); // XXX Scrollbars not enabled yet.
    
    scrollbarWrapper.appendChild(this.createVertSpacer(doc));
    scrollbarWrapper.appendChild(scrollbar);
    scrollbarWrapper.appendChild(this.createVertSpacer(doc));
    scrollbarWrapper.flex = "1";
    
    botBox.appendChild(flipButton);
    botBox.appendChild(dragSouth);
    botBox.appendChild(resizeHandle);
    
    if (callbacks.onMouseDown != null)
    {
        noteElt.addEventListener("mousedown", callbacks.onMouseDown, false);
    }
    
    var onMouseScroll = this.utils.bind(this, function(ev)
    {
        this.onMouseScroll(ev, uiNote);
    });
    
    uiNote.textArea. addEventListener("DOMMouseScroll", onMouseScroll, false);
    uiNote.scrollbar.addEventListener("DOMMouseScroll", onMouseScroll, false);
    
    onMouseScroll = null; // Prevent leak
    
    this.setMinimizedVisibility(uiNote);
    
    if (note.isMinimized)
    {
        this.forceMinimizedDims(uiNote);
    }
    else
    {
        this.adjustDims(uiNote, note.getDims());
    }
    
    this.paintUI(uiNote);
    
    this.setIsEnabled(uiNote, true);
    this.updateFontSize(uiNote);
    
    return uiNote;
},

// PUBLIC: Checks whether this note is focused.
isFocused: function(uiNote)
{
    return document.activeElement == uiNote.textArea;
},

// PRIVATE: Called when (un)minimized to change the tooltip of the minimized button.
setMinimizeButtonTooltip: function(uiNote)
{
    this.setButtonTooltip(uiNote.minimizeButton, uiNote.note.isMinimized
                                               ? "internote-entity-unminimize-note"
                                               : "internote-entity-minimize-note");
},

// PRIVATE: Called when flipped to change the tooltip of the flip button.
setFlipButtonTooltip: function(uiNote)
{
    this.setButtonTooltip(uiNote.flipButton, uiNote.isFlipped
                                           ? "internote-entity-edit-text"
                                           : "internote-entity-choose-colors");
},

// *** VERY WEIRD CODE AHEAD ***
// PRIVATE: This function seems to add a XUL attribute to a HTML element (canvas).
// Yet using XUL_NS, or the HTML title attribute doesn't work. removeAttributeNS also seems to be necessary
// to get it to work, as does only calling it once the panel is shown.
// I judged this less of a kludge than using an XUL wrapper around the element.
setButtonTooltip: function(button, entityLabelId)
{
    //dump("internoteNoteUI.setButtonTooltip " + entityLabelId + "\n");
    var tooltipLabel = document.getElementById(entityLabelId).getAttribute("value");
    button.removeAttributeNS(null, "tooltiptext");
    button.setAttributeNS(null, "tooltiptext", tooltipLabel);
},

// PRIVATE: Scroll wheel event handler, to properly adjust the Internote scrollbar.
onMouseScroll: function(ev, uiNote)
{
    //dump("onMouseScroll\n");
    
    try
    {
        if (!this.prefs.shouldUseNativeScrollbar())
        {
            if (ev.detail < 0)
            {
                for (var i = 0; i < Math.abs(ev.detail); i++)
                {
                    uiNote.scrollHandler.onScrollUpLine();
                }
            }
            else if (ev.detail > 0)
            {
                for (var i = 0; i < ev.detail; i++)
                {
                    uiNote.scrollHandler.onScrollDownLine();
                }
            }
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when using mouse wheel.", ex);
    }
},

// PRIVATE: Clone a UINote.
cloneUINote: function(uiNote, doc)
{
    return this.createNewNote(uiNote.note, {}, doc);
},

// PRIVATE: Configure a cloned UINote.
configureClonedUINote: function(tempUINote, uiNote)
{
    tempUINote.textArea.scrollTop = uiNote.textArea.scrollTop;
    
    // Need to do get the scrollbar right.
    this.updateScrollbarType(tempUINote);
},

pointers: {
    flipButton:     "pointer",
    resizeHandle:   "se-resize",
    dragNorth:      "move",
    dragSouth:      "move",
    dragWest:       "move",
    dragEast:       "move",
    backSide:       "pointer",
    scrollbar:      "pointer",
    closeButton:    "pointer",
    minimizeButton: "pointer",
    textArea:       "text",
},

// PRIVATE: Draw all canvases when something has changed.
paintUI: function(uiNote)
{
    this.drawNoteBackground(uiNote);
    this.drawCloseButton(uiNote);
    this.drawMinimizeButton(uiNote);
    this.drawResizeHandle(uiNote);
    this.colorFlipArrow(uiNote);
    uiNote.scrollHandler.paintUI();
},

/*
// Does not work ... resize event not emitted.
getFlexingCanvas: function(uiNote, canvas, redrawFunc)
{
    var box = canvas.ownerDocument.createElement("box");
    box.flex = "1";
    box.appendChild(canvas);
    
    //this.utils.fixDOMEltWidth(box, this.NOTE_OUTER_SIZE);
    
    var thisObj = this;
    
    if (typeof(redrawFunc) == "string")
    {
        redrawFunc = this[redrawFunc];
    }
    
    function onResize()
    {
        canvas.width  = box.width;
        canvas.height = box.height;
        redrawFunc.call(thisObj, uiNote);
    }
    
    box.addEventListener("resize", onResize, true);
    
    //onResize();
    
    return box;
},
*/

// PUBLIC: Disable all event handling for the note UI.
// This can't be undone, it's just for remove animations.
disableUI: function(uiNote)
{
    uiNote.noteElt.addEventListener("click",     this.utils.blockEvent, true);
    uiNote.noteElt.addEventListener("mousedown", this.utils.blockEvent, true);
    uiNote.noteElt.addEventListener("mouseup",   this.utils.blockEvent, true);
    uiNote.noteElt.addEventListener("mousemove", this.utils.blockEvent, true);
    uiNote.noteElt.addEventListener("keypress",  this.utils.blockEvent, true);
    uiNote.noteElt.addEventListener("keydown",   this.utils.blockEvent, true);
    uiNote.noteElt.addEventListener("keyup",     this.utils.blockEvent, true);
    
    // Repaint to get rid of hover effects.
    this.paintUI(uiNote);
    
    // Get rid of cursors.
    for (var element in this.pointers)
    {
        uiNote[element].style.cursor = "default";
    }
    
    uiNote.textArea.disabled = true;
},

// PUBLIC: Set whether the note UI is currently enabled.
setIsEnabled: function(uiNote, newIsEnabled)
{
    //dump("IsEnabled = " + newIsEnabled + "\n\n");
    
    uiNote.isEnabled = newIsEnabled;
    
    for (var element in this.pointers)
    {
        //dump("Elt = " + element + "\n");
        uiNote[element].style.cursor = newIsEnabled ? this.pointers[element] : "default";
    }
    
    if (uiNote.note.isHTML)
    {
        uiNote.textArea.style.cursor = "default";
        // We use readOnly instead of disabled so drag move events on the document won't get intercepted by
        // the text area if the mouse moves over this text area.  Also this allows still selecting and copying.
        uiNote.textArea.readOnly = true;
    }
    else
    {
        uiNote.textArea.readOnly = !newIsEnabled;
    }
},

// PUBLIC: This fixes the size of the text area to the correct dims given the
// note dims. This is necessary due to Firefox bug #542394.
fixTextArea: function(uiNote, dims)
{
    //dump("internoteNoteUI.fixTextArea\n");
    
    this.utils.assertError(dims == null || this.utils.isNonNegCoordPair(dims), "Invalid dims fixing text area.", dims);
    
    if (dims == null)
    {
        dims = this.getDims(uiNote);
    }
    
    var vertBorderArea = 2 * (this.NOTE_OUTER_SIZE + this.NOTE_BORDER_SIZE);
    var horzBorderArea = vertBorderArea;
    
    // If using the native scrollbar there is no east area,
    // because that scrollbar is a part of the text area.
    if (uiNote.eastDeck.style.display == "none")
    {
        horzBorderArea -= this.NOTE_OUTER_SIZE;
    }
    
    var textDims = this.utils.coordPairSubtract(dims, [horzBorderArea, vertBorderArea]);
    textDims = this.utils.clipNegativeCoordPair(textDims);
    
    this.utils.fixDOMEltDims(uiNote.textArea, textDims);
},

fixBackSide: function(uiNote, dims)
{
    uiNote.backSide.width  = dims[0] - 2 * (this.NOTE_OUTER_SIZE + this.NOTE_BORDER_SIZE);
    uiNote.backSide.height = dims[1] - 2 * (this.NOTE_OUTER_SIZE + this.NOTE_BORDER_SIZE);
},

// PUBLIC: This fixes the size of the scrollbar. Necessary due to some unknown
// Firefox bug or limitation.
fixScrollLine: function(uiNote, height)
{
    var scrollbarHeight = height - 2 * this.NOTE_OUTER_SIZE - 2 * this.NOTE_SPACING
                                 - 2 * this.NOTE_BORDER_SIZE;
    uiNote.scrollHandler.setHeight(scrollbarHeight);
},

// PUBLIC: Called to adjust the dimensions of the note UI, it will adjust
// the dimensions of the various components, and whether the scrollbar appears.
// Ideally, these would autosize, but that is just a pipedream in practice.
// XXX Clean up use of fixDOMEltDims versus setDims + getDims should access noteElt?
adjustDims: function(uiNote, dims)
{
    //this.utils.assertError(!uiNote.note.isMinimized, "Adjusting dimensions of a minimized note.");
    
    if (!this.utils.areArraysEqual(this.getDims(uiNote), dims))
    {
        //dump("  Adjusting dims.\n");
        this.utils.fixDOMEltDims(uiNote.noteElt,    dims);
        
        if (uiNote.scaledCanvas == null)
        {
            this.utils.setDims     (uiNote.background, dims);
            this.drawNoteBackground(uiNote);
            
            // Don't use dims as it may have a null.
            var newDims = this.utils.getDims(uiNote.background);
            this.fixTextArea(uiNote, newDims);
            this.fixBackSide(uiNote, newDims);
            this.fixScrollLine(uiNote, newDims[1]);
            this.updateScrollbarPresence(uiNote);
            
            if (uiNote.isFlipped) {
                this.calculateSwabCharacteristics(uiNote);
                this.drawNoteBackSide(uiNote);
            }
        }
        else
        {
            this.updateStaticImage(uiNote, this.utils.getDims(uiNote.noteElt.boxObject));
        }
        
        this.checkScrollTop(uiNote);
    }
},

// PRIVATE: Make sure the text area isn't scrolled lower than allowed.
checkScrollTop: function(uiNote)
{
    //dump("checkScrollTop " + uiNote.num + "\n");
    var maxScrollTop = uiNote.textArea.scrollHeight - uiNote.textArea.offsetHeight;
    
    //dump(uiNote.textArea.scrollHeight + " " + uiNote.textArea.offsetHeight +
    //     " " + maxScrollTop + "\n");
    if (maxScrollTop < uiNote.textArea.scrollTop)
    {
        uiNote.textArea.scrollTop = maxScrollTop;
    }
},

// PRIVATE: When a note is minimized, force its dimensions to the correct size.
forceMinimizedDims: function(uiNote)
{
    this.utils.assertError(uiNote.note.isMinimized, "Tried to init minimizing for unminimized note.");
    
    var dims = [this.MINIMIZED_WIDTH, this.MINIMIZED_HEIGHT];
    this.utils.setDims      (uiNote.background, dims);
    this.utils.fixDOMEltDims(uiNote.noteElt,    dims);
    
    var littleSize = dims[0] - 2 * this.NOTE_BORDER_SIZE - 2 * this.NOTE_OUTER_SIZE - 2 * this.NOTE_SPACING - this.NOTE_SPACING_LITTLE;
    this.utils.fixDOMEltWidth(uiNote.littleText, littleSize);
},

// PRIVATE: Sets visibility of special boxes depending on whether the note is minimized.
setMinimizedVisibility: function(uiNote)
{
    this.utils.assertClassError(uiNote, "UINote", "UINote is not correct class when updating minimizing.")
    this.utils.setDisplayedElts(uiNote.midBotBox,    !uiNote.note.isMinimized);
    this.utils.setDisplayedElts(uiNote.minimizedTop, uiNote.note.isMinimized );
    
    this.setMinimizeButtonTooltip(uiNote);
},

// PUBLIC: Gets the current dims of the note UI. This uses the background instead of
// the noteElt.boxObject as it seems to be wrong during initialization.
getDims: function(uiNote)
{
    return [uiNote.background.width, uiNote.background.height];
},

// PUBLIC: Flips the note over.
flipNote: function(uiNote, newIsFlipped)
{
    //dump("internoteNoteUI.flipNote\n");
    
    if (newIsFlipped == null)
    {
        uiNote.isFlipped = !uiNote.isFlipped;
    }
    else
    {
        uiNote.isFlipped = newIsFlipped;
    }
    
    if (uiNote.isFlipped)
    {
        this.calculateSwabCharacteristics(uiNote);
        this.drawNoteBackSide(uiNote);
    }
    
    var newIndex = uiNote.isFlipped ? this.FLIPPED_PAGE : this.FRONT_PAGE;
    uiNote.innerDeck.setAttribute("selectedIndex", newIndex);
    
    if (uiNote.isFlipped)
    {
        // Prevent typing while back side up.
        uiNote.textArea.blur();
    }
    
    this.setFlipButtonTooltip(uiNote);
    this.updateScrollbarPresence(uiNote);
},

// PUBLIC: Focuses this note.
focusNote: function(uiNote)
{
    this.utils.assertError(uiNote != null, "Null UINote when trying to focus.");
    uiNote.textArea.focus();
},

// PUBLIC: Sets the font size from the pref, when initialized or the pref changes.
updateFontSize: function(uiNote)
{
    var textArea = uiNote.textArea;
    textArea.style.fontSize = this.prefs.getFontSize() + "pt";
    
    var view = uiNote.noteElt.ownerDocument.defaultView;
    var style = view.getComputedStyle(textArea, "");
    var lineHeight = parseInt(style.lineHeight, 10);
    
    uiNote.scrollHandler.updateLineHeight(lineHeight);
    uiNote.scrollHandler.updateScrollLine();
},

// PUBLIC: Sets the scrollbar type (Internote/Native) from the pref, when initialized or the pref changes.
updateScrollbarType: function(uiNote)
{
    //dump("updateScrollbarType " + uiNote.num + "\n");
    
    if (this.prefs.shouldUseNativeScrollbar())
    {
        uiNote.textArea.style.overflow = "";
    }
    else
    {
        uiNote.textArea.style.overflow = "hidden";
        uiNote.eastDeck.style.display = "";
    }
    
    this.updateScrollbarPresence(uiNote);
    
    uiNote.scrollHandler.updateScrollLine();
},

// PUBLIC: Depending on whether a scrollbar should appear, due to the content, as appropriate:
// updates the presence of the Internote scrollbar, or
// removes the east deck for the native scrollbar
updateScrollbarPresence: function(uiNote)
{
    //dump("updateScrollbarPresence " + uiNote.num + "\n");
    
    var isScrollNecessary = uiNote.scrollHandler.isNecessary();
    var hasScrollbar = isScrollNecessary && !uiNote.isFlipped;
    
    if (this.prefs.shouldUseNativeScrollbar())
    {
        var shouldHideEastDeck = hasScrollbar;
    }
    else
    {
        var shouldHideEastDeck = false;
    }
    
    if (!shouldHideEastDeck)
    {
        uiNote.eastDeck.setAttribute("selectedIndex", hasScrollbar ? 1 : 0);
    }
    
    if (!isScrollNecessary)
    {
        uiNote.textArea.scrollTop = 0;
    }
    
    // Make sure east deck has correct displayed status, and update text area to compensate.
    this.utils.setDisplayedElts(uiNote.eastDeck, !shouldHideEastDeck);
    this.fixTextArea(uiNote, null);
},

// PUBLIC: Check whether note is minimized.
isMinimized: function(uiNote)
{
    return uiNote.midBotBox.style.display == "none";
},

// PUBLIC: Set the text that displays in the note's text area.
setText: function(uiNote, newText)
{
    // We check before making a change to avoid an infinite loop, since there are callbacks
    // on the UI which update back end storage, and callbacks on the storage which update the UI.
    if (newText != uiNote.textArea.value)
    {
        uiNote.textArea.value = newText;
    }
    if (newText != uiNote.littleText.textContent)
    {
        uiNote.littleText.textContent = this.utils.trim(this.utils.innerTrim(newText));
    }
},

// PUBLIC: Get the current note UI foreground color.
getForeColor: function(uiNote)
{
    return this.utils.convertRGBToHex(uiNote.textArea.style.color);
},

// PUBLIC: Get the current note UI background color.
// Note that uiNote.backColor is different from uiNote.note.backColor,
// as the former may be a transitional animation-interpolated color.
getBackColor: function(uiNote)
{
    return uiNote.backColor;
},

// PUBLIC: Sets the current note UI foreground color.
setForeColor: function(uiNote, foreColor)
{
    if (uiNote.textArea.style.color != foreColor)
    {
        uiNote.textArea.  style.color = foreColor;
        uiNote.littleText.style.color = foreColor;
        
        if (uiNote.isFlipped)
        {
            this.drawNoteBackSide(uiNote);
        }
    }
},

// PUBLIC: Sets the current note UI background color.
// This does not go to a specific UI component field, but instead is
// stored in the UINote and later used by canvas painting.
setBackColor: function(uiNote, backColor, redrawSelection)
{
    this.utils.assertError(this.utils.isHexColor(backColor), "Not a hex color when parsing.", backColor);
    
    if (redrawSelection != null) redrawSelection = true;
    
    if (backColor != uiNote.backColor)
    {
        uiNote.backColor = backColor;
        uiNote.backColorArray = this.utils.parseHexColor(backColor);
        
        this.paintUI(uiNote);
        
        if (uiNote.isFlipped && redrawSelection)
        {
            this.drawNoteBackSide(uiNote);
        }
    }
},

// PUBLIC: Takes mouse position from an event and converts to coordinates
// relative to the note.
getInternalCoordinates: function(uiNote, event)
{
    var internalX = event.screenX - uiNote.innerDeck.boxObject.screenX;
    var internalY = event.screenY - uiNote.innerDeck.boxObject.screenY;
    return [internalX, internalY];
},

/////////////////////////////////
// Helper functions
/////////////////////////////////

// PRIVATE: Gets the color of buttons in a specific mode as a CSS hex color.
getButtonColor: function(uiNote, mode)
{
    return this.utils.formatHexColor(this.getRawButtonColor(uiNote, mode));
},

// PRIVATE: Gets the color of note border (and the scrollbar line) as a CSS hex color.
getBorderColor: function(uiNote)
{
    return this.utils.formatHexColor(this.getRawBorderColor(uiNote));
},

// PRIVATE: Gets the color of buttons in a specific mode as an RGB array.
getRawButtonColor: function(uiNote, mode)
{
    var baseColor = uiNote.backColorArray;
    if (mode == this.utils.EFFECT_MODE_PRESS)
    {
        return this.utils.darken(baseColor, 0.1);
    }
    else if (mode == this.utils.EFFECT_MODE_HOVER)
    {
        return [0, 0, 0]; // Black for hover.
    }
    else
    {
        // This might be undefined mode which equals normal.
        return this.utils.darken(baseColor, 0.4);
    }
},

// PRIVATE: Gets the color of note border (and the scrollbar line) as an RGB array.
getRawBorderColor: function(uiNote)
{
    return this.utils.darken(uiNote.backColorArray, 0.05);
},

// PRIVATE: Creates a horizontal spacer.
createHorzSpacer: function(doc, isLittle)
{
    var size = (isLittle == true) ? this.NOTE_SPACING_LITTLE : this.NOTE_SPACING;
    return this.utils.createXULSpacer(doc, size, this.NOTE_OUTER_SIZE);
},

// PRIVATE: Creates a vertical spacer.
createVertSpacer: function(doc, isLittle)
{
    var size = (isLittle == true) ? this.NOTE_SPACING_LITTLE : this.NOTE_SPACING;
    return this.utils.createXULSpacer(doc, this.NOTE_OUTER_SIZE, size);
},

// PRIVATE: Creates the background of the note, including its thin border.
createBackground: function(doc, uiNote)
{
    var background = this.utils.createHTMLElement("canvas", doc, "internote-background" + uiNote.num);
    
    //background.width  = uiNote.noteElt.width;
    //background.height = uiNote.noteElt.height;
    
    return background;
},

// PRIVATE: Creates one of four small transparent areas that exist around the
// text area and can be used to drag the note.
createDragBorder: function(doc, uiNote, directionStr, isVertical, onMoveStart)
{
    var dragBorder = this.utils.createXULElement("spacer", doc, "internote-drag" + directionStr + uiNote.num);
    dragBorder.flex = "1";
    
    if (isVertical)
    {
        this.utils.fixDOMEltWidth(dragBorder, this.NOTE_OUTER_SIZE);
    }
    else
    {
        this.utils.fixDOMEltHeight(dragBorder, this.NOTE_OUTER_SIZE);
    }
    
    if (onMoveStart != null)
    {
        dragBorder.onmousedown = function(ev)
        {
            if (uiNote.isEnabled && ev.button == 0) onMoveStart(ev);
        };
    }
    
    return dragBorder;
},

// PRIVATE: Creates the small text area used for minimized notes.
createLittleText: function(doc, uiNote)
{
    var littleText = this.utils.createHTMLElement("textarea", doc, "internote-littletext" + uiNote.num);
    littleText.textContent = uiNote.note.text;
    
    littleText.style.backgroundColor = "transparent";
    littleText.style.border          = "0px none black";
    littleText.style.margin          = "0px";
    littleText.style.padding         = "0px";
    littleText.style.fontFamily      = "helvetica, sans-serif";
    littleText.style.fontSize        = this.NOTE_OUTER_SIZE + "px";
    littleText.style.fontWeight      = "bold";
    littleText.style.lineHeight      = "1em";
    littleText.style.cursor          = "default";
    littleText.style.color           = uiNote.note.foreColor;
    littleText.style.resize          = "none";
    
    littleText.setAttribute("readonly", "yes");
    littleText.setAttribute("wrap",     "off");
    littleText.setAttribute("tabindex", "-1"); // Prevent focus with TAB key.
    
    this.utils.fixDOMEltHeight(littleText, this.NOTE_OUTER_SIZE);
    
    littleText.addEventListener("mousedown", function(ev) { ev.preventDefault(); }, true);
    littleText.addEventListener("focus",     function(ev) { littleText.blur(); }, true); // This seems necessary as right-click focuses.
    
    return littleText;
},

// PRIVATE: Creates a simple button in the note UI.
createButton: function(doc, uiNote, onClick, fieldName, id, redrawFuncName)
{
    var onRedraw = this.utils.bind(this, function(effectMode) { this[redrawFuncName].call(this, uiNote, effectMode); });
    var isEnabledFunc = function() { return uiNote.isEnabled; }
    var canvas = uiNote[fieldName] =
        this.utils.createSimpleButton(doc, id + uiNote.num, this.NOTE_OUTER_SIZE, this.NOTE_OUTER_SIZE, onRedraw, onClick, isEnabledFunc);
    return canvas;
},

// PRIVATE: Creates the flip button that goes on the bottom-left.
createFlipButton: function(doc, uiNote, onFlip)
{
    var canvas = this.createButton(doc, uiNote, onFlip, "flipButton", "internote-flip", "colorFlipArrow");
    this.utils.drawImageCanvas(canvas, this.noteFlipImage);
    this.colorFlipArrow(uiNote);
    return canvas;
},

// PRIVATE: Creates the flip button that goes on the bottom-right.
createResizeHandle: function(doc, uiNote, onResizeStart)
{
    var canvas = uiNote.resizeHandle = this.utils.createHTMLElement("canvas", doc, "internote-resize" + uiNote.num);
    var context = canvas.getContext("2d");
    
    canvas.width  = this.NOTE_OUTER_SIZE;
    canvas.height = this.NOTE_OUTER_SIZE;
    
    //this.drawResizeHandle(uiNote);
    
    if (onResizeStart != null)
    {
        canvas.onmousedown = function(ev)
        {
            if (uiNote.isEnabled && ev.button == 0) onResizeStart(ev);
        }
    }
    
    return canvas;
},

/*
// An attempt to use an XUL textarea.  This does not work yet because:
// (a) there seems to be no way to turn off the native scrollbar
// (b) there seems to be no way to get the real scrollHeight.
createTextArea: function(doc, uiNote, onEdit, onMoveStart, onFocus)
{
    var textArea = uiNote.textArea = this.utils.createXULElement("textbox", doc);
    
    textArea.setAttribute("multiline", "true");
    textArea.setAttribute("class", "plain");
    
    textArea.setAttribute("value", uiNote.note.text);
    
    textArea.style.color = uiNote.note.foreColor;
    textArea.style.fontFamily = "helvetica, sans-serif";
    
    //if (!this.prefs.shouldUseNativeScrollbar()) textArea.style.overflowY = "hidden";
    
    if (uiNote.note.isHTML)
    {
        textArea.style.cursor = "default";
        // We use readOnly instead of disabled so drag move events on the document won't get intercepted by
        // the text area if the mouse moves over this text area.  Also this allows still selecting and copying.
        textArea.readOnly = true;
        textArea.style.backgroundColor = "rgba(0,0,0,0.1)";
    }    
    
    textArea.addEventListener("input", this.utils.bind(this, function()
    {
        try
        {
            this.checkScrollTop(uiNote);
            uiNote.scrollHandler.updateScrollLine();
            this.updateScrollbarPresence(uiNote);
        }
        catch (ex)
        {
            this.utils.handleException("Exception caught after user input.", ex);
        }
    }), false);    
    
    if (onEdit != null)
    {
        textArea.addEventListener("input", onEdit, false);
    }
    
    if (onFocus != null)
    {
        textArea.addEventListener("focus", onFocus, false);
    }
    
    // Sets up handlers that disable selection and enable dragging for non-highlightable notes.
    if (onMoveStart != null)
    {
        textArea.onmousedown = this.utils.bind(this, function(event)
        {
            var x = event.screenX - uiNote.innerDeck.boxObject.screenX; // Kludgy! Relies on deck pos/dims = textarea pos/dims.
            var y = event.screenY - uiNote.innerDeck.boxObject.screenY;
            
            var notOnScrollbar = (x < textArea.clientWidth) && (y < textArea.clientHeight);
            
            if (uiNote.isEnabled && !this.prefs.shouldAllowHighlighting() && notOnScrollbar)
            {
                onMoveStart(event);
            }
        });
        
        textArea.onmousemove = this.utils.bind(this, function(event)
        {
            if (uiNote.isEnabled && !this.prefs.shouldAllowHighlighting())
            {
                event.preventDefault();
            }
        });
        
        textArea.onmouseup = this.utils.bind(this, function(event)
        {
            if (uiNote.isEnabled && !this.prefs.shouldAllowHighlighting())
            {
                event.preventDefault();
            }
        });
    }
    
    return textArea;
},
*/

// PRIVATE: Creates the main text area that appears in the center.
// It is a HTML textarea because XUL textareas are not functional enough for this task.
createTextArea: function(doc, uiNote, onEdit, onMoveStart, onFocus)
{
    var textArea = uiNote.textArea = this.utils.createHTMLElement("textarea", doc, "internote-text" + uiNote.num);
    
    textArea.wrap = "yes";
    textArea.autocomplete = "off";
    
    textArea.value = uiNote.note.text;
    textArea.setAttribute("wrap", "yes");
    textArea.setAttribute("timeout", "300");
    
    textArea.style.border = "0px none black";
    textArea.style.backgroundColor = "transparent";
    textArea.style.color = uiNote.note.foreColor;
    textArea.style.resize = "none";
    textArea.style.fontFamily = "helvetica, sans-serif";
    textArea.style.width  = "100%";
    textArea.style.height = "100%";
    textArea.style.margin = "0px";
    
    if (!this.prefs.shouldUseNativeScrollbar()) textArea.style.overflow = "hidden";
    
    if (uiNote.note.isHTML)
    {
        textArea.style.cursor = "default";
        // We use readOnly instead of disabled so drag move events on the document won't get intercepted by
        // the text area if the mouse moves over this text area.  Also this allows still selecting and copying.
        textArea.readOnly = true;
        textArea.style.backgroundColor = "rgba(0,0,0,0.1)";
    }
    
    textArea.addEventListener("input", this.utils.bind(this, function()
    {
        try
        {
            this.checkScrollTop(uiNote);
            uiNote.scrollHandler.updateScrollLine();
            this.updateScrollbarPresence(uiNote);
        }
        catch (ex)
        {
            this.utils.handleException("Exception caught after user input.", ex);
        }
    }), false);
    
    /*
    textArea.addEventListener("keypress", function(ev) {
        try
        {
            if (ev.keyCode == ev.DOM_VK_UP      || ev.keyCode == ev.DOM_VK_DOWN ||
                ev.keyCode == ev.DOM_VK_PAGE_UP || ev.keyCode == ev.DOM_VK_PAGE_DOWN)
            {
                // ???
                // Should try to make selection on screen.
            }
        }
        catch (ex)
        {
            this.utils.handleException("AB", ex);
        }
    }, false);
    */
    
    if (onEdit != null)
    {
        textArea.addEventListener("input", onEdit, false);
    }
    
    if (onFocus != null)
    {
        textArea.addEventListener("focus", onFocus, false);
    }
    
    // Sets up handlers that disable selection and enable dragging for non-highlightable notes.
    if (onMoveStart != null)
    {
        textArea.onmousedown = this.utils.bind(this, function(event)
        {
            var x = event.screenX - uiNote.innerDeck.boxObject.screenX; // Kludgy! Relies on deck pos/dims = textarea pos/dims.
            var y = event.screenY - uiNote.innerDeck.boxObject.screenY;
            
            var notOnScrollbar = (x < textArea.clientWidth) && (y < textArea.clientHeight);
            
            if (uiNote.isEnabled && !this.prefs.shouldAllowHighlighting() && notOnScrollbar)
            {
                onMoveStart(event);
            }
        });
        
        textArea.onmousemove = this.utils.bind(this, function(event)
        {
            if (uiNote.isEnabled && !this.prefs.shouldAllowHighlighting())
            {
                event.preventDefault();
            }
        });
        
        textArea.onmouseup = this.utils.bind(this, function(event)
        {
            if (uiNote.isEnabled && !this.prefs.shouldAllowHighlighting())
            {
                event.preventDefault();
            }
        });
    }
    
    return textArea;
},

// PRIVATE: Creates the back side of the note that appears once it is flipped.
createBackSide: function(doc, uiNote, onClickBackSide)
{
    var canvas = uiNote.backSide = this.utils.createHTMLElement("canvas", doc, "internote-backside" + uiNote.num);
    var context = canvas.getContext("2d");
    
    //canvas.style.backgroundColor = "rgba(200,200,200,0.5)";
    
    // Set left/top so the back side canvas doesn't stretch (scale) to fit its parent deck.
    canvas.setAttribute("left", "0");
    canvas.setAttribute("top",  "0");
    
    // No need to draw - flip will do so.
    if (onClickBackSide != null)
    {
        canvas.onclick = function(event)
        {
            if (uiNote.isEnabled) onClickBackSide(event);
        }
    }
    
    return canvas;
},

calculateSwabCharacteristics: function(uiNote)
{
    var colourCount = this.consts.BACKGROUND_COLOR_SWABS.length;
    
    var swabHorzSpace = (uiNote.backSide.width - (colourCount + 1) * this.SWAB_SPACING) / colourCount;
    var swabVertSpace = uiNote.backSide.height / 2 - this.SWAB_SPACING - this.SWAB_TITLE_HEIGHT;
    
    var floatSize = Math.min(swabHorzSpace, swabVertSpace);
    uiNote.swabSize = Math.floor(floatSize);
    uiNote.swabXDist = floatSize + this.SWAB_SPACING;
    
    uiNote.SWABTEXT1_TOP = 0;
    uiNote.SWAB1_TOP = uiNote.SWABTEXT1_TOP + this.SWAB_TITLE_HEIGHT;
    uiNote.SWABTEXT2_TOP = uiNote.SWAB1_TOP + Math.ceil(floatSize) + this.SWAB_SPACING;
    uiNote.SWAB2_TOP = uiNote.SWABTEXT2_TOP + this.SWAB_TITLE_HEIGHT;
},

// PRIVATE: Draws the note background, including thin border, translucency & glassy highlight effect.
drawNoteBackground: function(uiNote)
{
    //dump("internoteNoteUI.drawNoteBackground\n");
    
    this.utils.assertClassError(uiNote, "UINote", "Note is not a UINote when drawing note background.");
    //uiNote.checkInvariant();
    
    var shouldUseTranslucency = this.prefs.shouldUseTransparency()
                             && this.supportsTranslucency;
    
    var w = uiNote.background.width;
    var h = uiNote.background.height;
    
    var context = uiNote.background.getContext("2d");
    context.clearRect(0, 0, w, h);
    
    var backColor = uiNote.backColor;
    
    context.lineJoin = "miter";
    context.strokeStyle = this.getBorderColor(uiNote);
    context.lineWidth = this.NOTE_BORDER_SIZE;
    
    context.strokeRect(this.NOTE_BORDER_SIZE / 2, this.NOTE_BORDER_SIZE / 2,
                       w - this.NOTE_BORDER_SIZE, h - this.NOTE_BORDER_SIZE);
    
    var alpha = shouldUseTranslucency ? this.NOTE_ALPHA : 1;
    
    // draw the glassy highlighted background
    var gradient = context.createLinearGradient(0, 0, 0, h);
    
    // We blend the colours here before putting them in the gradient so we only need
    // to do one pass and so get the correct alpha throughout.
    
    // We blend an colour with alpha over a colour without, giving an opaque colour.
    var topColorArray    = this.utils.lighten(uiNote.backColorArray, 0.6);
    var bottomColorArray = this.utils.lighten(uiNote.backColorArray, 0.3);
    
    // Now we add an alpha so all colours have constant alpha.
    topColorArray      = this.utils.addAlpha(topColorArray,         alpha);
    bottomColorArray   = this.utils.addAlpha(bottomColorArray,      alpha);
    var mainColorArray = this.utils.addAlpha(uiNote.backColorArray, alpha);
    
    var mainColor   = this.utils.formatRGBAColor(mainColorArray  );
    var topColor    = this.utils.formatRGBAColor(topColorArray   );
    var bottomColor = this.utils.formatRGBAColor(bottomColorArray);
    
    gradient.addColorStop(0.00, topColor    );
    gradient.addColorStop(0.40, mainColor   );
    gradient.addColorStop(0.85, mainColor   );
    gradient.addColorStop(1.00, bottomColor );
    
    context.fillStyle = gradient;
    
    context.fillRect(this.NOTE_BORDER_SIZE, this.NOTE_BORDER_SIZE,
                     w - 2 * this.NOTE_BORDER_SIZE,
                     h - 2 * this.NOTE_BORDER_SIZE);
},

getSwabXPos: function(uiNote, swabNum)
{
    return Math.floor(uiNote.swabXDist * swabNum + this.SWAB_SPACING);
},

// PRIVATE: Draws the note back side, including color swabs.
drawNoteBackSide: function(uiNote)
{
    var canvas = uiNote.backSide;
    var context = canvas.getContext("2d");
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    var colourCount = Math.max(this.consts.BACKGROUND_COLOR_SWABS.length,
                               this.consts.FOREGROUND_COLOR_SWABS.length);
    
    function chooseSelectionCharacteristics(isSelected)
    {
        const SELECTED_CHARACTERISTICS   = ["#000", 0.9]; // stroke color, width
        const UNSELECTED_CHARACTERISTICS = ["#555", 0.5];
        // highlight the selected color
        return isSelected ? SELECTED_CHARACTERISTICS : UNSELECTED_CHARACTERISTICS;
    }
    
    // draw the color swabs
    for (var colorIndex in this.consts.BACKGROUND_COLOR_SWABS)
    {
        var currentColor = this.consts.BACKGROUND_COLOR_SWABS[colorIndex];
        var isSelected = (uiNote.note.backColor == currentColor);
        [context.strokeStyle, context.lineWidth] = chooseSelectionCharacteristics(isSelected);
        
        var hPos     = this.getSwabXPos(uiNote, colorIndex);
        var nextHPos = this.getSwabXPos(uiNote, parseInt(colorIndex)+1);
        var width = nextHPos - hPos - this.SWAB_SPACING + 1;
        
        context.fillStyle = currentColor;
        context.fillRect  (hPos, uiNote.SWAB1_TOP, width, uiNote.swabSize);
        context.strokeRect(hPos, uiNote.SWAB1_TOP, width, uiNote.swabSize);
    }
    
    for (var colorIndex in this.consts.FOREGROUND_COLOR_SWABS)
    {
        var currentColor = this.consts.FOREGROUND_COLOR_SWABS[colorIndex];
        var isSelected = (uiNote.note.foreColor == currentColor);
        [context.strokeStyle, context.lineWidth] = chooseSelectionCharacteristics(isSelected);
        
        var hPos     = this.getSwabXPos(uiNote, colorIndex);
        var nextHPos = this.getSwabXPos(uiNote, parseInt(colorIndex)+1);
        var width = nextHPos - hPos - this.SWAB_SPACING + 1;
        
        context.fillStyle = currentColor;
        context.fillRect  (hPos, uiNote.SWAB2_TOP, width, uiNote.swabSize);
        context.strokeRect(hPos, uiNote.SWAB2_TOP, width, uiNote.swabSize);
    }
    
    // Draw the headers.
    var noteColorStr    = this.utils.getLocaleString(document, "NoteColorTitle");
    var textColorStr    = this.utils.getLocaleString(document, "TextColorTitle");
    
    const MAX_TEXT_WIDTH = this.consts.MIN_NOTE_WIDTH - 2 * this.NOTE_BORDER_SIZE - 2 * this.NOTE_OUTER_SIZE;
    context.fillStyle = "black";
    context.font = "bold " + this.SWAB_TITLE_FONT + "px sans-serif";
    
    if (context.fillText)
    {
        context.fillText(noteColorStr, this.SWAB_SPACING - 1, Math.floor(uiNote.SWABTEXT1_TOP + this.SWAB_TITLE_FONT), MAX_TEXT_WIDTH);
        context.fillText(textColorStr, this.SWAB_SPACING - 1, Math.floor(uiNote.SWABTEXT2_TOP + this.SWAB_TITLE_FONT), MAX_TEXT_WIDTH);
    }
    else
    {
        // Compatibility: Before FF 3.5.
        context.save();
        context.translate(this.SWAB_SPACING - 1, Math.floor(uiNote.SWABTEXT1_TOP + uiNote.SWAB_TITLE_FONT));
        context.mozDrawText(noteColorStr);
        context.restore();
        
        context.save();
        context.translate(this.SWAB_SPACING - 1, Math.floor(uiNote.SWABTEXT2_TOP + uiNote.SWAB_TITLE_FONT));
        context.mozDrawText(textColorStr);
        context.restore();
    }
},

// PRIVATE: Draws the note close button upon initialization or background recolor.
drawCloseButton: function(uiNote, mode)
{
    if (mode == null) mode = this.MODE_NORMAL;
    var color = this.getButtonColor(uiNote, mode);
    this.utils.drawCloseButton(uiNote.closeButton, color);
},

// PRIVATE: Draws the note minimize button upon initialization or background recolor.
drawMinimizeButton: function(uiNote, mode)
{
    if (mode == null) mode = this.MODE_NORMAL;
    var color = this.getButtonColor(uiNote, mode);
    this.utils.drawMinimizeButton(uiNote.minimizeButton, color);
},

// PRIVATE: Draws the note resize handle upon initialization or background recolor.
drawResizeHandle: function(uiNote)
{
    var context = uiNote.resizeHandle.getContext("2d");
    
    var w = uiNote.resizeHandle.width;
    var h = uiNote.resizeHandle.height;
    
    context.clearRect(0, 0, w, h);
    
    context.strokeStyle = this.getButtonColor(uiNote);
    context.beginPath();
    context.lineWidth = 0.1 * w;
    context.moveTo(0.00 * w, 1.00 * h); context.lineTo(1.00 * w, 0.00 * h);
    context.moveTo(0.33 * w, 1.00 * h); context.lineTo(1.00 * w, 0.33 * h);
    context.moveTo(0.66 * w, 1.00 * h); context.lineTo(1.00 * w, 0.66 * h);
    context.stroke();
},

// PRIVATE: This recolors the note flip button. Unlike the other buttons it
// is an image, so when the we just recolor the canvas upon background recolor.
colorFlipArrow: function(uiNote, mode)
{
    if (mode == null) mode = this.MODE_NORMAL;
    var color = this.getRawButtonColor(uiNote, mode);
    this.utils.colorCanvas(uiNote.flipButton, color);
},

// PRIVATE: Converts a click coordinate relevant to the note into
// a background color swab number, or null if outside a background color swab.
getBackColorSwabFromPoint: function(uiNote, x, y)
{
    if (this.utils.isBetween(y, uiNote.SWAB1_TOP-1, uiNote.SWAB1_TOP+uiNote.swabSize+1))
    {
        for (var i = 0; i < this.consts.BACKGROUND_COLOR_SWABS.length; i++)
        {
            var hPos     = this.getSwabXPos(uiNote, i);
            var nextHPos = this.getSwabXPos(uiNote, i+1);
            var endPos   = nextHPos - this.SWAB_SPACING;
            
            if (this.utils.isBetween(x, hPos-1, endPos+1))
            {
                return this.consts.BACKGROUND_COLOR_SWABS[i];
            }
        }
    }
    return null;
},

// PRIVATE: Converts a click coordinate relevant to the note into
// a foreground color swab number, or null if outside a foreground color swab.
getForeColorSwabFromPoint: function(uiNote, x, y)
{
    if (this.utils.isBetween(y, uiNote.SWAB2_TOP-1, uiNote.SWAB2_TOP+uiNote.swabSize+1))
    {
        for (var i = 0; i < this.consts.FOREGROUND_COLOR_SWABS.length; i++)
        {
            var hPos     = this.getSwabXPos(uiNote, i);
            var nextHPos = this.getSwabXPos(uiNote, i+1);
            var endPos   = nextHPos - this.SWAB_SPACING;
            
            if (this.utils.isBetween(x, hPos-1, endPos+1))
            {
                return this.consts.FOREGROUND_COLOR_SWABS[i];
            }
        }
    }
    
    return null;
},

// PUBLIC: This takes a snapshot of the UI and displays that instead of the UI.
// Then we are free to scale it to perform a flip animation.
makeStaticImage: function(uiNote, dims)
{
    this.utils.assertError(uiNote != null, "UINote is null when making note static.");
    this.utils.assertError(uiNote.image == null, "UINote Image already exists.");
    
    if (dims == null)
    {
        dims = this.getDims(uiNote);
    }
    
    var scratchIFrame = this.utils.getScratchIFrame(document);
    var scratchDoc = scratchIFrame.contentDocument;
    
    var tempUINote = this.cloneUINote(uiNote, scratchDoc);
    
    if (uiNote.isFlipped) this.flipNote(tempUINote);
    
    this.utils.setScratchElement(scratchIFrame, tempUINote.noteElt, dims);
    
    // Can't do this until the clone has been placed in a document.
    this.configureClonedUINote(tempUINote, uiNote);
    
    var rawCanvas = uiNote.rawCanvas = this.utils.getWindowCanvas(scratchIFrame.contentWindow, document, dims);
    rawCanvas.id = "internote-rawcanvas" + uiNote.num;
    
    var scaledCanvas = uiNote.scaledCanvas = this.utils.createHTMLElement("canvas", document, "internote-scaledcanvas" + uiNote.num);
    uiNote.noteElt.appendChild(scaledCanvas);
    
    this.updateStaticImage(uiNote, dims);
    
    // Hide the UI so we can view the image.
    // Background can go away entirely ...
    uiNote.background.style.display = "none";
    // ... but we must only hide the foreground, to preserve textarea selection, focus, scroll, etc.
    uiNote.foreground.style.visibility = "hidden";
},

// PUBLIC: This scales the image to new dimensions, after a previous call to makeStaticImage.
updateStaticImage: function(uiNote, dims)
{
    var scaledCanvas = uiNote.scaledCanvas;
    var context = scaledCanvas.getContext("2d");
    
    this.utils.setDims(scaledCanvas, dims);
    
    // The foreground must stick around, so we'll need to adjust its size or it messes things up.
    var foregroundMargins = [2 * this.NOTE_BORDER_SIZE, 2 * this.NOTE_BORDER_SIZE];
    var foregroundDims = this.utils.clipNegativeCoordPair(this.utils.coordPairSubtract(dims, foregroundMargins));
    this.utils.fixDOMEltDims(uiNote.foreground, foregroundDims);
    
    context.drawImage(uiNote.rawCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
},

// PUBLIC: After a flip image animation is complete, this returns the UI to normal.
makeDynamic: function(uiNote)
{
    this.utils.assertError(uiNote != null, "UINote is null when making note dynamic.");
    
    uiNote.noteElt.removeChild(uiNote.noteElt.lastChild);
    
    // Normally this won't be fixed, get rid of it or it will cause problems for minimization.
    this.utils.unfixDOMEltDims(uiNote.foreground);
    
    delete uiNote.rawCanvas;
    delete uiNote.scaledCanvas;
    
    uiNote.rawCanvas    = null;
    uiNote.scaledCanvas = null;
    
    // Show the main UI again.
    uiNote.background.style.display = "";
    uiNote.foreground.style.visibility = "";
},

// PUBLIC: Checks whether the UI is a static image (UI is flipping).
isStaticImage: function(uiNote)
{
    return uiNote.rawCanvas != null;
},

};

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.noteUI.initConnections(internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66);
