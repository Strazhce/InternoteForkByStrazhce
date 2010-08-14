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

// XXX Probably can remove "enabled" stuff, or at least integrate it with makeStaticImage which
// is used instead (maybe some extra UI changes for disabling).

var internoteNoteUI =
{
NOTE_BORDER_SIZE: 2,
NOTE_OUTER_SIZE: 10,
NOTE_SPACING: 8,
NOTE_SPACING_LITTLE: 4,

NOTE_ALPHA:  0.85,

noteFlipImage: new Image(),

SWAB_LEFT: 5,
SWAB_TITLE_HEIGHT: 16,
SWAB_TITLE_FONT: 12,
SWAB_WIDTH:    16,
SWAB_HEIGHT:   16,
SWAB_X_SPACING: 4,
SWAB_Y_SPACING: 6,

FRONT_PAGE  : 0,
FLIPPED_PAGE: 1,

/////////////////////////////////
// Externally called methods
/////////////////////////////////

init: function(prefs, utils, consts)
{
    this.utils   = utils;
    this.prefs   = prefs;
    this.consts  = consts;
        
    // XXX Can't find a constructor for this?
    this.noteFlipImage.src = "chrome://internote/content/arrow.png";
    
    this.SWAB_DISTANCE = this.SWAB_WIDTH + this.SWAB_X_SPACING,
    
    this.SWABTEXT1_TOP = 0;
    this.SWAB1_TOP     = this.SWABTEXT1_TOP + this.SWAB_TITLE_HEIGHT;
    this.SWABTEXT2_TOP = this.SWAB1_TOP     + this.SWAB_HEIGHT + this.SWAB_Y_SPACING;
    this.SWAB2_TOP     = this.SWABTEXT2_TOP + this.SWAB_TITLE_HEIGHT;
    this.SWAB_CANVAS_HEIGHT = this.SWAB2_TOP + this.SWAB_HEIGHT + this.SWAB_Y_SPACING;
    
    var colourCount = Math.max(this.consts.BACKGROUND_COLOR_SWABS.length,
                               this.consts.FOREGROUND_COLOR_SWABS.length);
    this.SWAB_CANVAS_WIDTH = this.SWAB_LEFT + colourCount * (this.SWAB_WIDTH + this.SWAB_X_SPACING);
    
    this.MINIMIZED_WIDTH  = this.consts.MIN_NOTE_WIDTH;
    this.MINIMIZED_HEIGHT = 2 * this.NOTE_BORDER_SIZE + this.NOTE_OUTER_SIZE;
    
    this.HOVER_COLOR = [0, 0, 0];
    this.PRESS_COLOR = [this.utils.MAX_INTENSITY, this.utils.MAX_INTENSITY, this.utils.MAX_INTENSITY];
},

waitForImageLoad: function(onLoad)
{
    this.noteFlipImage.addEventListener("load", onLoad, false);
},

areImagesLoaded: function()
{
    return this.noteFlipImage.complete;
},

addFocusListener: function(uiNote, func)
{
    uiNote.textArea.addEventListener("focus", func, false);
},

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

destroy: function(uiNote)
{
    uiNote.textArea.removeEventListener("input", function(event)
    {
        onEdit(event);
    }, false);
},

noteShown: function(uiNote)
{
    //dump("internoteNoteUI.noteShown\n");
    
    this.updateScrollbarType(uiNote);
    uiNote.scrollHandler.drawScrollLine();
},

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
    
    var isEnabledFunc = function() { return uiNote.isEnabled; }
    var scrollbarHandler = uiNote.scrollHandler =
        new this.utils.ScrollHandler(this.utils, this.prefs, uiNote.textArea, uiNote.num,
                                     this.NOTE_OUTER_SIZE, this.getBorderColor(uiNote), this.getButtonColor(uiNote),
                                     this.utils.formatHexColor(this.HOVER_COLOR),
                                     this.utils.formatHexColor(this.PRESS_COLOR), isEnabledFunc);
    
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

isFocused: function(uiNote)
{
    return document.activeElement == uiNote.textArea;
},

cloneUINote: function(uiNote, doc)
{
    var tempUINote = this.createNewNote(uiNote.note, {}, doc);
    tempUINote.textArea.scrollTop = uiNote.textArea.scrollTop;
    tempUINote.hasScrollbar = this.isScrollbarNecessary(uiNote);
    
    // Need to do get the scrollbar right.
    this.updateScrollbarType(tempUINote);
    tempUINote.scrollHandler.drawScrollLine(uiNote.scrollHandler.getScrollInfo());
    
    return tempUINote;
},

pointers: {
    flipButton:     "pointer",
    resizeHandle:   "se-resize",
    dragNorth:      "move",
    dragSouth:      "move",
    dragWest:       "move",
    dragEast:       "move",
    backSide:       "pointer",
    scrollbar:        "pointer",
    closeButton:    "pointer",
    minimizeButton: "pointer",
    textArea:       "text",
},

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
    //this.utils.dumpTraceData(canvas, 110, 1);
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
    
    this.paintUI(uiNote); // get rid of hover effects
    
    for (var element in this.pointers)
    {
        uiNote[element].style.cursor = "default";
    }
    
    uiNote.textArea.disabled = true;
},

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

fixTextArea: function(uiNote, dims)
{
    this.utils.assertError(dims == null || this.utils.isNonNegCoordPair(dims), "Invalid dims fixing text area.", dims);
    
    if (dims == null)
    {
        dims = this.getDims(uiNote);
    }
    
    var vertBorderArea = 2 * (this.NOTE_OUTER_SIZE + this.NOTE_BORDER_SIZE);
    var horzBorderArea = vertBorderArea;
    
    if (uiNote.eastDeck.style.display == "none")
    {
        horzBorderArea -= this.NOTE_OUTER_SIZE;
    }
    
    // See firefox bug #542394.
    var textDims = this.utils.coordPairSubtract(dims, [horzBorderArea, vertBorderArea]);
    textDims = this.utils.coordPairMax(textDims, [0, 0]);
    
    this.utils.fixDOMEltDims(uiNote.textArea, textDims);
},

// Firefox doesn't support flexing canvases!
fixScrollLine: function(uiNote, height)
{
    var scrollbarHeight = height - 2 * this.NOTE_OUTER_SIZE - 2 * this.NOTE_SPACING
                                 - 2 * this.NOTE_BORDER_SIZE;
    uiNote.scrollHandler.setHeight(scrollbarHeight);
},

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
            this.fixScrollLine(uiNote, newDims[1]);
            this.updateScrollbarPresence(uiNote);
        }
        else
        {
            this.updateStaticImage(uiNote, this.utils.getDims(uiNote.noteElt.boxObject));
        }
        
        this.checkScrollTop(uiNote);
    }
},

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

forceMinimizedDims: function(uiNote)
{
    this.utils.assertError(uiNote.note.isMinimized, "Tried to init minimizing for unminimized note.");
    
    var dims = [this.MINIMIZED_WIDTH, this.MINIMIZED_HEIGHT];
    this.utils.setDims      (uiNote.background, dims);
    this.utils.fixDOMEltDims(uiNote.noteElt,    dims);
    
    var littleSize = dims[0] - 2 * this.NOTE_BORDER_SIZE - 2 * this.NOTE_OUTER_SIZE - 2 * this.NOTE_SPACING - this.NOTE_SPACING_LITTLE;
    this.utils.fixDOMEltWidth(uiNote.littleText, littleSize);
},

adjustMinimizing: function(uiNote)
{
    this.utils.assertClassError(uiNote, "UINote", "UINote is not correct class when updating minimizing.")
    
    this.setMinimizedVisibility(uiNote);
},

setMinimizedVisibility: function(uiNote)
{
    this.utils.assertClassError(uiNote, "UINote", "UINote is not correct class when updating minimizing.")
    this.utils.setDisplayed(uiNote.midBotBox,    !uiNote.note.isMinimized);
    this.utils.setDisplayed(uiNote.minimizedTop, uiNote.note.isMinimized );
},

getDims: function(uiNote)
{
    //return [uiNote.noteElt.boxObject.width, uiNote.noteElt.boxObject.height]; // XXX Seems to be a bit buggy and transitional.
    return [uiNote.background.width, uiNote.background.height];
},

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
        this.drawNoteBackSide(uiNote);
    }
    
    var newIndex = uiNote.isFlipped ? this.FLIPPED_PAGE : this.FRONT_PAGE;
    uiNote.innerDeck.setAttribute("selectedIndex", newIndex);
    
    if (uiNote.isFlipped)
    {
        // Prevent typing while back side up.
        uiNote.textArea.blur();
    }
    
    this.updateScrollbarPresence(uiNote);
},

focusNote: function(uiNote)
{
    this.utils.assertError(uiNote != null, "Null UINote when trying to focus.");
    uiNote.textArea.focus();
},

updateFontSize: function(uiNote)
{
    var textArea = uiNote.textArea;
    textArea.style.fontSize = this.prefs.getFontSize() + "pt";
    
    var view = uiNote.noteElt.ownerDocument.defaultView;
    var style = view.getComputedStyle(textArea, "");
    var lineHeight = parseInt(style.lineHeight, 10);
    
    uiNote.scrollHandler.updateLineHeight(lineHeight);
},

isScrollbarNecessary: function(uiNote)
{
    //dump("isScrollbarNecessary = " + uiNote.scrollHandler.isNecessary() + " " +
    //     uiNote.isFlipped + "\n");
    return uiNote.scrollHandler.isNecessary() && !uiNote.isFlipped;
},

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
},

updateScrollbarPresence: function(uiNote)
{
    //dump("updateScrollbarPresence " + uiNote.num + "\n");
    
    if (uiNote.hasOwnProperty("hasScrollbar"))
    {
        // Used during flipping to avoid checks.
        var hasScrollbar = uiNote.hasScrollbar;
    }
    else
    {
        var hasScrollbar = this.isScrollbarNecessary(uiNote);
    }
    
    if (this.prefs.shouldUseNativeScrollbar())
    {
        var shouldHideEastDeck = this.isScrollbarNecessary(uiNote);
    }
    else
    {
        var shouldHideEastDeck = false;
        
        if (hasScrollbar)
        {
            uiNote.eastDeck.setAttribute("selectedIndex", 1);
        }
        else
        {
            uiNote.eastDeck.setAttribute("selectedIndex", 0);
            uiNote.textArea.scrollTop = 0;
        }
    }
    
    // Make sure east deck has correct displayed status, and update text area to compensate.
    this.utils.setDisplayed(uiNote.eastDeck, !shouldHideEastDeck);
    this.fixTextArea(uiNote, null);
},

isMinimized: function(uiNote)
{
    return uiNote.midBotBox.style.display == "none";
},

setText: function(uiNote, newText)
{
    // These need to be checked separately, since when one is edited the callback will
    // find the editable field to have no changes.
    if (newText != uiNote.textArea.value)
    {
        uiNote.textArea.  value       = newText;
    }
    if (newText != uiNote.littleText.textContent)
    {
        uiNote.littleText.textContent = this.utils.trim(this.utils.innerTrim(newText));
    }
},

getForeColor: function(uiNote)
{
    return this.utils.convertRGBToHex(uiNote.textArea.style.color);
},

getBackColor: function(uiNote)
{
    return uiNote.backColor;
},

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

setBackColor: function(uiNote, backColor, redrawSelection)
{
    this.utils.assertError(this.utils.isHexColor(backColor), "Not a hex color when parsing.", backColor);
    
    if (redrawSelection != null) redrawSelection = true;
    
    if (backColor != uiNote.backColor)
    {
        uiNote.backColor = backColor;
        uiNote.backColorArray = this.utils.parseHexColor(backColor);
        
        uiNote.scrollHandler.updateColors(this.getBorderColor(uiNote), this.getButtonColor(uiNote));
        
        this.paintUI(uiNote);
        
        if (uiNote.isFlipped && redrawSelection)
        {
            this.drawNoteBackSide(uiNote);
        }
    }
},

getInternalCoordinates: function(uiNote, event)
{
    var internalX = event.screenX - uiNote.innerDeck.boxObject.screenX;
    var internalY = event.screenY - uiNote.innerDeck.boxObject.screenY;
    return [internalX, internalY];
},

/////////////////////////////////
// Helper functions
/////////////////////////////////

getButtonColor: function(uiNote, mode)
{
    return this.utils.formatHexColor(this.getRawButtonColor(uiNote, mode));
},

getRawButtonColor: function(uiNote, mode)
{
    if (mode == this.utils.EFFECT_MODE_PRESS)
    {
        return this.PRESS_COLOR;
    }
    else if (mode == this.utils.EFFECT_MODE_HOVER)
    {
        return this.HOVER_COLOR;
    }
    else
    {
        // This might be undefined mode which equals normal.
        return this.utils.darken(uiNote.backColorArray, 0.4);
    }
},

getBorderColor: function(uiNote)
{
    return this.utils.formatHexColor(this.utils.darken(uiNote.backColorArray, 0.05));
},

createHorzSpacer: function(doc, isLittle)
{
    var size = (isLittle == true) ? this.NOTE_SPACING_LITTLE : this.NOTE_SPACING;
    return this.utils.createXULSpacer(doc, size, this.NOTE_OUTER_SIZE);
},

createVertSpacer: function(doc, isLittle)
{
    var size = (isLittle == true) ? this.NOTE_SPACING_LITTLE : this.NOTE_SPACING;
    return this.utils.createXULSpacer(doc, this.NOTE_OUTER_SIZE, size);
},

createBackground: function(doc, uiNote)
{
    var background = this.utils.createHTMLElement("canvas", doc, "internote-background" + uiNote.num);
    
    //background.width  = uiNote.noteElt.width;
    //background.height = uiNote.noteElt.height;
    
    return background;
},

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
        dragBorder.onmousedown = function(event)
        {
            if (uiNote.isEnabled) onMoveStart(event);
        };
    }
    
    return dragBorder;
},

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
    //this.utils.addBoundDOMEventListener(littleText, "mousedown", obj, propertyName, useCapture)
    
    return littleText;
},

createButton: function(doc, uiNote, onClick, fieldName, id, redrawFuncName)
{
    var onRedraw = this.utils.bind(this, function(effectMode) { this[redrawFuncName].call(this, uiNote, effectMode); });
    var isEnabledFunc = function() { return uiNote.isEnabled; }
    var canvas = uiNote[fieldName] =
        this.utils.createSimpleButton(doc, id + uiNote.num, this.NOTE_OUTER_SIZE, this.NOTE_OUTER_SIZE, onRedraw, onClick, isEnabledFunc);
    return canvas;
},

/*
createFlipButton: function(doc, uiNote, onFlip)
{
    var flipArrowIFrame = document.getElementById("internote-flip-arrow");
    
    var canvas = uiNote.flipButton = this.utils.createHTMLElement("canvas", doc);
    canvas.width  = this.NOTE_OUTER_SIZE;
    canvas.height = this.NOTE_OUTER_SIZE;
    canvas.id = "internote-flip" + uiNote.num;
    
    var context = canvas.getContext("2d");
    //context.drawWindow(flipArrowIFrame.contentWindow, 0, 0, this.NOTE_OUTER_SIZE, this.NOTE_OUTER_SIZE, "rgba(0,0,0,0)");
    
    if (onFlip != null)
    {
        canvas.onclick = function(event)
        {
            if (uiNote.isEnabled) onFlip(event);
        };
    }
    
    return canvas;

},
*/

createFlipButton: function(doc, uiNote, onFlip)
{
    var canvas = this.createButton(doc, uiNote, onFlip, "flipButton", "internote-flip", "colorFlipArrow");
    var context = canvas.getContext("2d");
    var [w, h] = [canvas.width, canvas.height];
    context.drawImage(this.noteFlipImage, 0.0 * w, 0.0 * h, 1.0 * w, 1.0 * h);
    this.colorFlipArrow(uiNote);
    return canvas;
},

/*
createFlipButton: function(doc, uiNote, onFlip)
{
    var canvas = uiNote.flipButton = this.utils.createHTMLElement("canvas", doc, "internote-flip" + uiNote.num);
    
    canvas.width  = this.NOTE_OUTER_SIZE;
    canvas.height = this.NOTE_OUTER_SIZE;
    
    var w = canvas.width;
    var h = canvas.height;
    
    context.drawImage(this.noteFlipImage, 0.0 * w, 0.0 * h, 1.0 * w, 1.0 * h);
    
    this.colorFlipArrow(uiNote);
    
    if (onFlip != null)
    {
        canvas.onclick = function(event)
        {
            if (uiNote.isEnabled) onFlip(event);
        }
    }
    
    return canvas;
},
*/

createResizeHandle: function(doc, uiNote, onResizeStart)
{
    var canvas = uiNote.resizeHandle = this.utils.createHTMLElement("canvas", doc, "internote-resize" + uiNote.num);
    var context = canvas.getContext("2d");
    
    canvas.width  = this.NOTE_OUTER_SIZE;
    canvas.height = this.NOTE_OUTER_SIZE;
    
    //this.drawResizeHandle(uiNote);
    
    if (onResizeStart != null)
    {
        canvas.onmousedown = function(event)
        {
            if (uiNote.isEnabled) onResizeStart(event);
        }
    }
    
    return canvas;
},

/* // An attempt to use an XUL textarea.
createTextArea: function(doc, uiNote, onEdit, onMoveStart)
{
    var textArea = uiNote.textArea = this.utils.createXULElement("textbox", doc);
    
    //dump("textArea:\n");
    //this.utils.dumpTraceData(textArea, 110, 1);
    //dump("doc:\n");
    //this.utils.dumpTraceData(doc, 110, 1);
    
    textArea.setAttribute("multiline", "true");
    textArea.setAttribute("class", "plain");
    
    textArea.value = uiNote.note.text;
    
    //if (!this.prefs.shouldUseNativeScrollbar()) textArea.style.overflow = "hidden";

    //textArea.oninput = onEdit;
    //if (onEdit != null)
    //{
    //    textArea.addEventListener("input", onEdit, false);
    //}
    
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
    
    if (!this.prefs.shouldUseNativeScrollbar()) textArea.style.overflow = "hidden";
    
    textArea.style.margin = "0px";
    
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
            uiNote.scrollHandler.drawScrollLine();
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

createBackSide: function(doc, uiNote, onClickBackSide)
{
    var canvas = uiNote.backSide = this.utils.createHTMLElement("canvas", doc, "internote-backside" + uiNote.num);
    var context = canvas.getContext("2d");
    
    canvas.width  = this.SWAB_CANVAS_WIDTH;
    canvas.height = this.SWAB_CANVAS_HEIGHT;
    
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

drawNoteBackground: function(uiNote)
{
    this.utils.assertClassError(uiNote, "UINote", "Note is not a UINote when drawing note background.");
    //uiNote.checkInvariant();
    
    var shouldUseTranslucency = this.prefs.shouldUseTransparency()
                             && this.utils.supportsTranslucentPopups();
    
    var w = uiNote.background.width;
    var h = uiNote.background.height;
    
    var context = uiNote.background.getContext("2d");
    context.clearRect(0, 0, w, h);
    
    var backColor = uiNote.backColor;
    
    context.lineJoin = "round";
    context.strokeStyle = this.getBorderColor(uiNote);
    context.lineWidth = this.NOTE_BORDER_SIZE;
    
    context.strokeRect(this.NOTE_BORDER_SIZE / 2, this.NOTE_BORDER_SIZE / 2,
                       w - this.NOTE_BORDER_SIZE, h - this.NOTE_BORDER_SIZE);
    
    var alpha = shouldUseTranslucency ? this.NOTE_ALPHA : 1;
    
    // draw the glassy highlighted background
    var gradient = context.createLinearGradient(0, 0, 0, h);
    
    // We blend the colours here before putting them in so we only need to do one
    // pass and so get the correct alpha throughout.
    
    // We blend an colour with alpha over a colour without, giving an opaque colour.
    var topColorArray    = this.utils.lighten(uiNote.backColorArray, 0.6);
    var bottomColorArray = this.utils.lighten(uiNote.backColorArray, 0.3);
    
    // Now we add an alpha so all colours have constant alpha.
    topColorArray    = this.utils.addAlpha(topColorArray,         alpha);
    bottomColorArray = this.utils.addAlpha(bottomColorArray,      alpha);
    var mainColorArray   = this.utils.addAlpha(uiNote.backColorArray, alpha);
    
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

drawNoteBackSide: function(uiNote)
{
    var canvas = uiNote.backSide;
    var context = canvas.getContext("2d");
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    
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
        
        var hPos = this.SWAB_DISTANCE * colorIndex + this.SWAB_LEFT;
        context.fillStyle = currentColor;
        context.fillRect  (hPos, this.SWAB1_TOP, this.SWAB_WIDTH, this.SWAB_HEIGHT);
        context.strokeRect(hPos, this.SWAB1_TOP, this.SWAB_WIDTH, this.SWAB_HEIGHT);
    }
    
    for (var colorIndex in this.consts.FOREGROUND_COLOR_SWABS)
    {
        var currentColor = this.consts.FOREGROUND_COLOR_SWABS[colorIndex];
        var isSelected = (uiNote.note.foreColor == currentColor);
        [context.strokeStyle, context.lineWidth] = chooseSelectionCharacteristics(isSelected);
        
        var hPos = this.SWAB_DISTANCE * colorIndex + this.SWAB_LEFT;
        context.fillStyle = currentColor;
        context.fillRect  (hPos, this.SWAB2_TOP, this.SWAB_WIDTH, this.SWAB_HEIGHT);
        context.strokeRect(hPos, this.SWAB2_TOP, this.SWAB_WIDTH, this.SWAB_HEIGHT);
    }
    
    // draw the color swab headers
    var noteColorStr = this.utils.getLocaleString("NoteColorTitle");
    var textColorStr = this.utils.getLocaleString("TextColorTitle");
    
    const MAX_TEXT_WIDTH = this.consts.MIN_NOTE_WIDTH - 2 * this.NOTE_BORDER_SIZE - 2 * this.NOTE_OUTER_SIZE;
    context.fillStyle = "black";
    context.font = "bold " + this.SWAB_TITLE_FONT + "px sans-serif";
    
    if (context.fillText)
    {
        context.fillText(noteColorStr, this.SWAB_LEFT - 1, this.SWABTEXT1_TOP + this.SWAB_TITLE_FONT, MAX_TEXT_WIDTH);
        context.fillText(textColorStr, this.SWAB_LEFT - 1, this.SWABTEXT2_TOP + this.SWAB_TITLE_FONT, MAX_TEXT_WIDTH);
    }
    else
    {
        // Compatibility: Before FF 3.5.
        context.save();
        context.translate(this.SWAB_LEFT - 1, this.SWABTEXT1_TOP + this.SWAB_TITLE_FONT);
        context.mozDrawText(noteColorStr);
        context.restore();
        
        context.save();
        context.translate(this.SWAB_LEFT - 1, this.SWABTEXT2_TOP + this.SWAB_TITLE_FONT);
        context.mozDrawText(textColorStr);
        context.restore();
    }
},

drawCloseButton: function(uiNote, mode)
{
    var context = uiNote.closeButton.getContext("2d");
    
    if (mode == null) mode = this.MODE_NORMAL;
    
    var w = uiNote.closeButton.width;
    var h = uiNote.closeButton.height;
    
    context.clearRect(0, 0, w, h);
    
    context.lineWidth = 0.3 * w;
    context.lineCap = "round";
    context.strokeStyle = this.getButtonColor(uiNote, mode);
    context.beginPath();
    context.moveTo(0.10 * w, 0.10 * h); context.lineTo(0.90 * w, 0.90 * h);
    context.moveTo(0.90 * w, 0.10 * h); context.lineTo(0.10 * w, 0.90 * h);
    context.stroke();
},

drawMinimizeButton: function(uiNote, mode)
{
    //dump("internoteNoteUI.drawMinimizeButton " + mode + "\n");

    if (mode == null) mode = this.MODE_NORMAL;
    
    var context = uiNote.minimizeButton.getContext("2d");
    
    var w = uiNote.minimizeButton.width;
    var h = uiNote.minimizeButton.height;
    
    var WIDTH_PROPORTION = 0.3;
    context.clearRect(0, 0, w, h);
    
    context.lineWidth = WIDTH_PROPORTION * w;
    context.lineCap = "round";
    context.strokeStyle = this.getButtonColor(uiNote, mode);
    
    var yPos = this.utils.hasMinimizeIconCentered() ? 0.5 : (1 - WIDTH_PROPORTION / 2);
    context.beginPath();
    context.moveTo(0.10 * w, yPos * h); context.lineTo(0.90 * w, yPos * h);
    context.stroke();
},

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

colorFlipArrow: function(uiNote, mode)
{
    if (mode == null) mode = this.MODE_NORMAL;
    
    var context = uiNote.flipButton.getContext("2d");
    
    var w = uiNote.flipButton.width;
    var h = uiNote.flipButton.height;
    
    var imageData = context.getImageData(0, 0, w, h);
    var color = this.getRawButtonColor(uiNote, mode);
    
    for (var x = 0; x < w; x++) {
        for (var y = 0; y < h; y++) {
            var i = 4 * (y * w + x);
            imageData.data[i + 0] = color[0];
            imageData.data[i + 1] = color[1];
            imageData.data[i + 2] = color[2];
            // Keep alpha the same.
        }
    }
    
    context.putImageData(imageData, 0, 0);
},

getBackColorSwabFromPoint: function(x, y)
{
    if (this.utils.isBetween(y, this.SWAB1_TOP-1, this.SWAB1_TOP+this.SWAB_HEIGHT))
    {
        for (var colorIndex in this.consts.BACKGROUND_COLOR_SWABS)
        {
            var hPos = this.SWAB_DISTANCE * colorIndex + this.SWAB_LEFT;
            
            if (this.utils.isBetween(x, hPos - 1, hPos + this.SWAB_WIDTH))
            {
                return this.consts.BACKGROUND_COLOR_SWABS[colorIndex];
            }
        }
    }
    return null;
},

getForeColorSwabFromPoint: function(x, y)
{
    if (this.utils.isBetween(y, this.SWAB2_TOP-1, this.SWAB2_TOP+this.SWAB_HEIGHT))
    {
        for (var colorIndex in this.consts.FOREGROUND_COLOR_SWABS)
        {
            var hPos = this.SWAB_DISTANCE * colorIndex + this.SWAB_LEFT;
            
            if (this.utils.isBetween(x, hPos - 1, hPos + this.SWAB_WIDTH))
            {
                return this.consts.FOREGROUND_COLOR_SWABS[colorIndex];
            }
        }
    }
    
    return null;
},

makeStaticImage: function(uiNote, dims)
{
    this.utils.assertError(uiNote != null, "UINote is null when making note static.");
    this.utils.assertError(uiNote.image == null, "UINote Image already exists.");
    
    if (dims == null)
    {
        dims = this.getDims(uiNote);
    }
    
    var scratchIFrame = this.utils.getScratchIFrame();
    var doc = scratchIFrame.contentDocument;
    
    var tempUINote = this.cloneUINote(uiNote, doc);
    
    if (uiNote.isFlipped) this.flipNote(tempUINote);
    
    // The dimensions may be different to that on the note due to minimizing, etc, so copy from the uiNote instead.
    
    var rawCanvas = uiNote.rawCanvas =
        this.utils.getCanvasOfElement(scratchIFrame, tempUINote.noteElt, dims);
    rawCanvas.id = "internote-rawcanvas" + uiNote.num;
    
    var scaledCanvas = uiNote.scaledCanvas = this.utils.createHTMLElement("canvas", document, "internote-scaledcanvas" + uiNote.num);
    uiNote.noteElt.appendChild(scaledCanvas);
    
    this.updateStaticImage(uiNote, dims);
    
    // Hide the UI so we can view the image.
    uiNote.foreground.style.display = "none";
    uiNote.background.style.display = "none";
    
    // XXX Why don't these work?
    //uiNote.foreground.style.visibility = "hidden";
    //uiNote.background.style.visibility = "hidden";
    
    //uiNote.foreground.style.opacity = 0;
    //uiNote.background.style.opacity = 0;
},

updateStaticImage: function(uiNote, dims)
{
    var scaledCanvas = uiNote.scaledCanvas;
    var context = scaledCanvas.getContext("2d");
    
    this.utils.setDims(scaledCanvas, dims);
    
    context.drawImage(uiNote.rawCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
},

makeDynamic: function(uiNote)
{
    this.utils.assertError(uiNote != null, "UINote is null when making note dynamic.");
    
    uiNote.noteElt.removeChild(uiNote.noteElt.lastChild);
    
    delete uiNote.rawCanvas;
    delete uiNote.scaledCanvas;
    
    uiNote.rawCanvas    = null;
    uiNote.scaledCanvas = null;
    
    // Show the main UI again.
    uiNote.foreground.style.display = "";
    uiNote.background.style.display = "";
    
    // Reinstate the fixed DOM dimensions.
    //uiNote.foreground.style.opacity = 1;
    //uiNote.background.style.opacity = 1;
    
    //uiNote.foreground.style.visibility = "";
    //uiNote.background.style.visibility = "";
},

};
