// Internote Extension
// Testing Skeleton - UI Controller 
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

// This is a basic replacement for UI controller that does not include many
// features.  Its use is in testing and developing reduced test cases.

// Features Included: Display, Note UI, Basic Chrome, Animations, Scrolling
// Features Not Included: Storage, MVC, Per-Page Notes, Pref Watching, Menus,
//    Dialogs, Scope Setting, Balloons, Proper Viewport Calculation
//    Raising, AutoFocusing, Progress Listeners

Components.utils.import("resource://internotejs/internote-shared-global.jsm");

var internoteUIController = {

DRAG_NOTE_NONE:    0,
DRAG_NOTE_MOVE:    1,
DRAG_NOTE_RESIZE:  2,

CREATE_ANIMATION_TIME: 600,
REMOVE_ANIMATION_TIME: 600,
FLIP_ANIMATION_TIME: 600,
MOVE_ANIMATION_TIME: 1500,
RESIZE_ANIMATION_TIME: 600,
MINIMIZE_ANIMATION_TIME: 600,
RECOLOR_ANIMATION_TIME: 250,

WIDTH_BETWEEN_MINIMIZED: 2,

CHECK_VIEWPORT_INTERVAL: 50,

dragMode:            this.DRAG_NONE,
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

noteAnimations: {},

noteUICallbacks: null,

minimizedNotes: [],

allUINotes: [],
uiNoteLookup: [],

checkViewportEvent: null,

init: function()
{
    this.utils     = internoteUtilities;
    this.prefs     = internotePreferences;
    this.noteUI    = internoteNoteUI;
    this.displayUI = internoteDisplayUI;
    this.anim      = internoteAnimation;
    this.consts    = internoteConstants;
    this.global    = internoteSharedGlobal;
    
    this.utils.init();
    this.prefs.init(this.utils);
    
    this.noteUICallbacks = {
        onMoveStart:     this.utils.bind(this, this.userMovesNote),
        onResizeStart:   this.utils.bind(this, this.userResizesNote),
        onMinimize:      this.utils.bind(this, this.userMinimizesNote),
        onClose:         this.utils.bind(this, this.userRemovesNote),
        onFlip:          this.utils.bind(this, this.userFlipsNote),
        onEdit:          this.utils.bind(this, this.userEditsNote),
        onClickBackSide: this.utils.bind(this, this.userClicksBackSideOfNote),
    };
    
    internoteDisplayUI.init(this.prefs, this.utils, this.noteUI);
    internoteNoteUI   .init(this.prefs, this.utils, this.consts);
    internoteAnimation.init(this.utils);
    
    this.displayUI.setBrowser(this.utils.getCurrentBrowser());
    	
	this.uiNoteLookup   = [];
	this.allUINotes     = [];
	this.minimizedNotes = [];
	
    this.utils.nameConstructor(this, "InternoteNote");
    this.InternoteNote.prototype.getDims = function() { return [this.width, this.height]; };
    this.InternoteNote.prototype.getPos  = function() { return [this.left,  this.top   ]; };

	this.checkViewportEvent = setInterval(this.utils.bind(this, this.screenCheckViewport),
								  this.CHECK_VIEWPORT_INTERVAL);
	
    dump("Internote startup successful\n");
},

userTearsDown: function()
{
    this.abandonAllNoteAnimations();
    this.displayUI.tearDown();
},

InternoteNote: function(url, matchType, text, left, top, width, height, backColor, foreColor, createTime, modfnTime, zIndex, isMinimized, isHTML)
{
    if (arguments.length >= 1)
    {
        this.url          = url;
        this.matchType    = matchType;
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

makeNote: function(url, text, noteTopLeft, noteDims)
{
    this.utils.assertError(this.utils.isNonNegCoordPair(noteTopLeft), "NoteTopLeft not a coordinate.", noteTopLeft);
    this.utils.assertError(this.utils.isPositiveCoordPair(noteDims),  "NoteDims not dimensions.", noteDims);
    
    var currTime     = new Date().getTime();
    var backColor    = "#FFFF99";
    var foreColor    = "#000000";
    var zIndex       = this.allUINotes.length;
    var isMinimized  = false;
    var isHTML       = false;
    var matchType    = 0;
	
    var note = new this.InternoteNote(url, matchType, text,
                                               noteTopLeft[0], noteTopLeft[1], noteDims[0], noteDims[1],
                                               backColor, foreColor,
                                               currTime, currTime, zIndex, isMinimized, isHTML);
	note.num = this.allUINotes.length;
	return note;
},

userCreatesNote: function()
{
    try
    {
        var loc = this.utils.getBrowserURL();
        
		var viewportRect = this.screenGetViewportRect();
		var noteDims = [150, 150];
		var noteTopLeft = this.screenCalcNewNotePos(viewportRect, noteDims);
		
		this.utils.assertError(this.utils.isNonNegCoordPair(noteTopLeft), "Invalid note top left.", noteTopLeft);
		
		var note = this.makeNote(loc, "", noteTopLeft, noteDims);
		this.utils.assertError(note != null, "Note not found when creating.");
        
        if (this.noteAnimations[note.num] != null) {
            this.noteAnimations[note.num].hurry();
        }
		
        var uiNote = this.noteUI.createNewNote(note, this.noteUICallbacks);
		
		this.utils.assertError(uiNote != null, "Can't add null UINote.", uiNote);
		this.uiNoteLookup[uiNote.num] = uiNote;
		this.allUINotes.push(uiNote);
        
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

userRemovesNote: function(elementOrEvent)
{
    try
    {
        var noteNum = this.screenGetNoteNum(elementOrEvent);
        var uiNote = this.uiNoteLookup[noteNum];
		
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

userEditsNote: function(event)
{
    try
    {
        var noteNum = this.screenGetNoteNum(event);
        var uiNote = this.uiNoteLookup[noteNum];
		
		uiNote.note.text = event.target.value;
		this.noteUI.setText(uiNote, uiNote.note.text);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to edit note.", ex);
    }
},

screenCommitPos: function(uiNote, posOnViewport)
{
    var contentWindow = this.utils.getCurrentBrowser().contentWindow;
    var scrollPos = [contentWindow.scrollX, contentWindow.scrollY];
    [uiNote.note.left, uiNote.top] = this.utils.coordPairAdd(posOnViewport, scrollPos);
},

screenResetNoteDims: function(uiNote)
{
    this.utils.assertError(!uiNote.note.isMinimized, "Can't set note dims for minimized note.");
    this.noteUI.adjustDims(uiNote, uiNote.note.getDims());
},

userResizesNote: function(event)
{
    try
    {
	    var onDragMouseMoved = this.utils.bind(this, function(event, offset, uiNote) {
            this.screenSetModifiedNoteDims(uiNote, offset);
		});
		
	    var onDragFinished = this.utils.bind(this, function(wasCompleted, wasDrag, offset, uiNote) {
	        if (wasCompleted && wasDrag)
	        {
	            var topLeftOnViewport = this.displayUI.getScreenPosition(uiNote);
	            this.screenCommitPos(uiNote, topLeftOnViewport);
	            
	            var newDims = this.screenCalcModifiedNoteDims(uiNote, offset);
	            [uiNote.note.left, uiNote.note.top] = newDims;
	        }
	        else
	        {
	            this.screenResetNoteDims(uiNote, [0, 0], false);
	        }
	    });
	    
        this.userStartsDrag(event, this.DRAG_MODE_RESIZE, onDragMouseMoved, onDragFinished);  
    }
    catch (ex)
    {
        this.utils.handleException("Caught exception while attempting to resize note.", ex);
    }
},

userMovesNote: function(event)
{
    try
    {
	    var onDragMouseMoved = this.utils.bind(this, function(event, offset, uiNote) {
            this.utils.assertError(this.utils.isCoordPair(offset), "Invalid offset.");
            var newPosOnViewport = this.screenCalcDraggedPos(uiNote, offset);
            this.displayUI.moveNote(uiNote, newPosOnViewport);
		});
		
	    var onDragFinished = this.utils.bind(this, function(wasCompleted, wasDrag, offset, uiNote) {
	        if (wasCompleted && wasDrag)
	        {
	            var newPosOnViewport = this.screenCalcDraggedPos(uiNote, offset);
	            this.screenCommitPos(uiNote, newPosOnViewport);
	        }
	        else
	        {
		        this.screenRepositionNote(uiNote);
		    }
	    });
	    
        this.userStartsDrag(event, this.DRAG_MODE_MOVE, onDragMouseMoved, onDragFinished);  
    }
    catch (ex)
    {
        this.utils.handleException("Caught exception while attempting to resize note.", ex);
    }
},

userStartsDrag: function(event, dragMode, onDragMouseMoved, onDragFinished)
{
    this.utils.assertError(event != null, "Null event when starting drag.");
	
    var noteNum = this.screenGetNoteNum(event.target);
	var uiNote = this.uiNoteLookup[noteNum];
    
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
	    
    	onDragFinished(wasCompleted, wasDrag, offset, uiNote);
		
	    this.dragStartPos = null;
	    this.dragMode     = this.DRAG_MODE_NONE;
	    
	    this.noteUI.setIsEnabled(uiNote, true);
	});
    
    handler.dragStarted(event);
},

userFlipsNote: function(elementOrEvent)
{
    try
    {
        var noteNum = this.screenGetNoteNum(elementOrEvent);
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
    try
    {
        var noteNum = this.screenGetNoteNum(elementOrEvent);
        var uiNote = this.uiNoteLookup[noteNum];
		uiNote.note.isMinimized = !uiNote.note.isMinimized;
		
        if (uiNote.note.isMinimized)
        {
            this.screenInsertMinimizedNotes([uiNote], this.MINIMIZE_ANIMATION_TIME);
        }
        else
        {
            this.screenRemoveMinimizedNotes([uiNote], this.MINIMIZE_ANIMATION_TIME);
        }
        
        this.screenUpdateNotesShading([uiNote]);
        
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to resize note on screen.", ex);
    }
},

userClicksBackSideOfNote: function(event)
{
    try
    {   
        var noteNum = this.screenGetNoteNum(event.target);
        var uiNote = this.uiNoteLookup[noteNum];
        
        var [internalX, internalY] = this.noteUI.getInternalCoordinates(uiNote, event);
        
        var backColor = this.noteUI.getBackColorSwabFromPoint(internalX, internalY);
        
        if (backColor != null)
        {
            this.setBackColor(uiNote, backColor);
        }
        else
        {
            var foreColor = this.noteUI.getForeColorSwabFromPoint(internalX, internalY);
            
            if (foreColor != null)
            {
                this.setForeColor(uiNote, foreColor);
            }
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when user clicked back side of note.", ex);
    }
},

setForeColor: function(uiNote, foreColor)
{
	uiNote.note.foreColor = foreColor;
	this.noteUI.setForeColor(uiNote, foreColor);
},

setBackColor: function(uiNote, backColor)
{
	uiNote.note.backColor = backColor;
	var animation = internoteAnimation.getBackRecolorAnimation(this.utils, this.noteUI, uiNote, backColor);
	this.startNoteAnimation(uiNote, animation, this.RECOLOR_ANIMATION_TIME);
},

screenAreAllMinimized: function()
{
    return this.allUINotes.map(function(uiNote) { return uiNote.note.isMinimized; })
                            .reduce(function(a, b) { return a && b; }, true);
},

screenGetNoteNum: function(elementOrEvent)
{
    var element = (elementOrEvent.tagName != null) ? elementOrEvent : elementOrEvent.target;
    
    var ELEMENT_NODE = 1;
    while (element != null && element.nodeType == ELEMENT_NODE)
    {
        if (element.hasAttribute("id"))
        {
            var num = element.id.replace(/internote-[a-zA-Z]+([0-9]+)/, "$1");
            if (num.match(/^[0-9]+$/)) {
                return parseInt(num, 10);
            }
        }
        element = element.parentNode;
    }
    
    this.utils.assertErrorNotHere("Could not find note num.");
},

screenCreateNote: function(uiNote, shouldAnimate)
{
    this.utils.assertClassError(uiNote, "UINote", "Not a UINote when calling screenCreateNote.");
    
    this.utils.assertError(!this.displayUI.doesNoteExist(uiNote.num), "Note is already on-screen.");

    this.displayUI.addNewNote(uiNote, this.screenGetViewportDims());
    
    var posOnViewport = this.screenCalcNotePosOnViewport(uiNote);
    
    if (shouldAnimate && this.utils.supportsTranslucentPopups())
    {
        var animation = internoteAnimation.getFadeAnimation(this.utils, uiNote.noteElt, true);
        this.startNoteAnimation(uiNote, animation, this.CREATE_ANIMATION_TIME);
    }
    
    this.displayUI.readyToShowNote(uiNote, posOnViewport, [uiNote.note.width, uiNote.note.height]);
},

screenRemoveNote: function(uiNote)
{
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
    this.utils.assertClassError(uiNote, "UINote", "Not a UINote when calling screenRemoveNoteNow.");
    
    this.displayUI.removeNote(uiNote);
	
    this.utils.assertError(uiNote != null, "Can't remove null UINote.", uiNote);
    delete this.uiNoteLookup[uiNote.num];
    this.utils.spliceFirstInstance(this.allUINotes, uiNote);
},

screenCalcNotePosOnPage: function(uiNote, offset)
{
    this.utils.assertError(this.utils.isCoordPair(offset), "Invalid offset.");
    
    var note = uiNote.note;
    
    var contentWin = this.utils.getCurrentBrowser().contentWindow;
    
    var notePos = [note.left, note.top];
    var pos = this.utils.coordPairAdd(notePos, offset);
    
    var viewportDims  = this.screenGetViewportDims();
    var maxPos = this.utils.coordPairSubtract(viewportDims, [note.width, note.height]);
    
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
    
    var restrictRect  = this.utils.makeRectFromCoords([0, 0], maxPos);
    var restrictedPos = this.utils.restrictPosToRect(pos, restrictRect);
    return restrictedPos;
},

screenGetViewportDims: function()
{
    return this.utils.getDims(this.utils.getCurrentBrowser().boxObject);
},

screenGetViewportRect: function()
{
    var contentWin = this.utils.getCurrentBrowser().contentWindow;
    
    var viewportDims = this.screenGetViewportDims();
    var scrollPos = [contentWin.scrollX, contentWin.scrollY];
    return this.utils.makeRectFromDims(scrollPos, viewportDims);
},

screenGetPageDims: function()
{
    var contentDoc = this.utils.getCurrentBrowser().contentDocument;
    return [contentDoc.documentElement.scrollWidth, contentDoc.documentElement.scrollHeight];
},

screenCalcNotePosOnViewport: function(uiNote)
{
    var note = uiNote.note;
    
    this.utils.assertError(note != null, "Note is null when calculating note position.");
    
    if (note.isMinimized)
    {
        var viewportDims = this.screenGetViewportDims();
        var top  = viewportDims[1] - this.noteUI.MINIMIZED_HEIGHT;
        
        this.utils.assertError(uiNote.minimizePos != null, "Missing minimize pos.");
        var left = uiNote.minimizePos * (this.noteUI.MINIMIZED_WIDTH + this.WIDTH_BETWEEN_MINIMIZED)
                 - this.utils.getCurrentBrowser().contentWindow.scrollX;
        
        return [left, top];
    }
    else
    {
        var topLeftOnPage = this.screenCalcNotePosOnPage(uiNote, [0, 0]);
        var scrollPos = [this.utils.getCurrentBrowser().contentWindow.scrollX,
                         this.utils.getCurrentBrowser().contentWindow.scrollY];
        var topLeftOnViewport = this.utils.coordPairSubtract(topLeftOnPage, scrollPos);
        
        return topLeftOnViewport;
    }
},

screenCalcDraggedPos: function(uiNote, offset)
{
    this.utils.assertError(this.utils.isCoordPair(offset), "Invalid offset.");
    this.utils.assertError(!uiNote.note.isMinimized, "Can't move a minimized note.");
    
    var note = uiNote.note;
    
    this.utils.assertError(note != null, "Note is null when calculating note position.");
    
    var viewportDims = this.screenGetViewportDims();
    
    var noteDims     = [note.width, note.height];
    
    var scrollPos = [this.utils.getCurrentBrowser().contentWindow.scrollX,
                     this.utils.getCurrentBrowser().contentWindow.scrollY];
    
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
    
    var newTopLeftOnViewport = this.utils.coordPairAdd(this.dragStartPos, restrictedOffset);
    
    if ((offset[0] != 0 || offset[1] != 0) && !this.done)
    {
        this.done = true;
    }
    
    return newTopLeftOnViewport;
},

screenCalcModifiedNoteDims: function(uiNote, offset)
{
    this.utils.assertError(this.utils.isCoordPair(offset), "Invalid offset.");
    
    var note = uiNote.note;
    
    var contentDoc = this.utils.getCurrentBrowser().contentDocument;
    
    var noteDims = [note.width, note.height];
    var newDims = this.utils.coordPairAdd(noteDims, offset);
    
    var posOnViewport = this.screenCalcNotePosOnViewport(uiNote);
    var viewportDims = this.screenGetViewportDims();
    
    var maxDimsDueToViewport = this.utils.coordPairSubtract(viewportDims, posOnViewport);
    
    maxDimsDueToViewport = this.clipDims(maxDimsDueToViewport);
    
    var allowedRect = this.utils.makeRectFromDims([0,0], maxDimsDueToViewport);
    this.utils.assertError(this.utils.isPositiveCoordPair(maxDimsDueToViewport),
                           "Max Dims Due To Boundary <= 0");
    newDims = this.utils.restrictPosToRect(newDims, allowedRect);
    
    return this.clipDims(newDims);
},

clipDims: function(dims)
{
    return [this.utils.clipToRange(dims[0], 100, 400),
            this.utils.clipToRange(dims[1], 100, 400)];
},

screenCalcNewNotePos: function(viewportRect, noteDims)
{
    var INTERNOTE_DISTANCE = this.noteUI.NOTE_OUTER_SIZE + this.noteUI.NOTE_BORDER_SIZE * 2;
    
    this.utils.assertError(this.utils.isRectangle(viewportRect), "Not a rectangle.");
    this.utils.assertError(this.utils.isPositiveCoordPair(noteDims), "Not dimensions.");
    
    var allowedRectDims = this.utils.coordPairSubtractNonNeg(viewportRect.dims, noteDims);
    var allowedRect = this.utils.makeRectFromDims(viewportRect.topLeft, allowedRectDims);
    
    this.utils.assertError(this.utils.isRectangle(allowedRect), "Bad start coordinate for positioning.");
    
	offset = [+INTERNOTE_DISTANCE, +INTERNOTE_DISTANCE];
	start  = this.utils.coordPairAdd(allowedRect.topLeft, offset);
    
	this.utils.assertError(this.utils.isNonNegCoordPair(start), "Bad start coordinate for positioning.");
    
    var scanStartPos = 0;
    for (var checkPos = start; this.utils.isInRect(checkPos, allowedRect); checkPos = this.utils.coordPairAdd(checkPos, offset))
    {
        if (!this.screenDoOverlappingNotesExist(this.utils.makeRectFromDims(checkPos, noteDims)))
        {
            this.utils.assertError(this.utils.isNonNegCoordPair(checkPos), "Bad check coordinate for positioning.");
            return checkPos;
        }
    }
    
    return start;
},

screenDoOverlappingNotesExist: function(newNoteRect)
{
    for (var i = 0; i < this.allUINotes.length; i++)
    {
        var note = this.allUINotes[i].note;
        if (!note.isMinimized && this.utils.areCoordPairsEqual(newNoteRect.topLeft, [note.left, note.top]))
		{
			return true;
        }
    }
    return false;
},

screenRepositionAllNotes: function()
{
    for (var i = 0; i < this.allUINotes.length; i++)
    {
        var uiNote = this.allUINotes[i];
        this.screenRepositionNote(uiNote);
    }
},

screenRepositionNote: function(uiNote)
{
    if (uiNote == this.uiNoteBeingDragged && this.dragMode == this.DRAG_NOTE_MOVE)
    {
        return;
    }
    
    var existingDriver = this.noteAnimations[uiNote.num];
    if (existingDriver != null)
    {
        existingDriver.addEventListener("animationCompleted", this.utils.bind(this, function()
        {
            this.screenRepositionNote(uiNote);
        }));
    }
    else
    {
        var newPosOnViewport = this.screenCalcNotePosOnViewport(uiNote);
        
        this.utils.assertError(this.utils.isCoordPair(newPosOnViewport), "Invalid Pos On Viewport Trying to Reposition Note", newPosOnViewport);
        
        this.displayUI.moveNote(uiNote, newPosOnViewport);
    }
},

screenSetModifiedNoteDims: function(uiNote, offset)
{
    this.utils.assertError(!uiNote.note.isMinimized, "Can't set note dims for minimized note.");
    this.utils.assertError(this.utils.isCoordPair(offset), "Invalid offset.");
    
    var newDims = this.screenCalcModifiedNoteDims(uiNote, offset);
    this.noteUI.adjustDims(uiNote, newDims);
},

screenCheckViewport: function(ev)
{
    if (this.allUINotes.length <= 0) return;
	
    try
    {
        var content = this.utils.getCurrentBrowser().contentWindow;
        
        var newScrollX = content.scrollX;
        var newScrollY = content.scrollY;
        
        var newLeft    = this.utils.getCurrentBrowser().boxObject.screenX;
        var newTop     = this.utils.getCurrentBrowser().boxObject.screenY;
        
        var [newWidth,     newHeight]      = this.screenGetViewportDims();
        var [newPageWidth, newPageHeight]  = this.screenGetPageDims();
        
        function updateViewportCharacteristics()
        {
            this.currentScrollX    = newScrollX;
            this.currentScrollY    = newScrollY;
            this.currentWidth      = newWidth;
            this.currentHeight     = newHeight;
            this.currentLeft       = newLeft;
            this.currentTop        = newTop;
            this.currentPageWidth  = newPageWidth;
            this.currentPageHeight = newPageHeight;
        }
        
        var changed = false;
        
        if (this.currentWidth   != newWidth   || this.currentHeight  != newHeight ||
            this.currentLeft    != newLeft    || this.currentTop     != newTop)
        {
            this.displayUI.viewportMovedOrResized(this.screenGetViewportDims());
            changed = true;
        }
        
        if (this.currentScrollX != newScrollX || this.currentScrollY != newScrollY)
        {
            changed = true;
        }
        
        if (this.currentPageWidth != newPageWidth || this.currentPageHeight != newPageHeight)
        {
            changed = true;
        }
        
        if (changed)
        {
            updateViewportCharacteristics.apply(this);
            this.screenRepositionAllNotes();
        }
        
        this.displayUI.checkInnerContainerScroll();
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when attempting to check viewport.", ex);
    }
},

screenMoveNote: function(uiNote)
{
    var newPosOnViewport     = this.screenCalcNotePosOnViewport(uiNote);
    var currentPosOnViewport = this.displayUI.getScreenPosition(uiNote);
    
    if (!this.utils.areCoordPairsEqual(newPosOnViewport, currentPosOnViewport))
    {
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
    var newDims = [uiNote.note.width, uiNote.note.height];
    var currentDims = this.noteUI.getDims(uiNote);
    
    if (!this.utils.areCoordPairsEqual(newDims, currentDims))
    {
        var movementOffset = this.utils.coordPairSubtract(newDims, currentDims);
        var movementDistance = this.utils.coordPairDistance(movementOffset);
        var animationTime = this.RESIZE_ANIMATION_TIME + 2 * movementDistance;
        
        var animation = internoteAnimation.getMoveOrResizeAnimation(this.utils, this.noteUI, this.displayUI, uiNote,
                                                                    newDims, true, false);
        this.startNoteAnimation(uiNote, animation, animationTime);
    }
},

screenUpdateNotesShading: function(uiNotes)
{
    for (var i = 0; i < uiNotes.length; i++)
    {
        var uiNote = uiNotes[i];
        var newPosOnViewport     = this.screenCalcNotePosOnViewport(uiNote);
        
        var newDims = uiNote.note.isMinimized ? [ this.noteUI.MINIMIZED_WIDTH, this.noteUI.MINIMIZED_HEIGHT ]
                                              : [uiNote.note.width, uiNote.note.height];

        this.hurryNoteAnimation(uiNote);
        
        var animation = internoteAnimation.getMinimizeAnimation(this.utils, this.noteUI, this.displayUI, uiNote,
                                                                newPosOnViewport, newDims);
        this.startNoteAnimation(uiNote, animation, this.MINIMIZE_ANIMATION_TIME);
    }
},

screenAdjustMinimized: function(uiNote, animationTime)
{
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
    uiNotesToInsert.sort(this.minimizedNoteSortFunc);
    
    var insertIndex = 0;
    var allIndex = 0;
    
    while (allIndex < this.minimizedNotes.length && insertIndex < uiNotesToInsert.length)
    {
        var noteToInsert = uiNotesToInsert[insertIndex];
        var currentNote = this.minimizedNotes[allIndex];

        if (this.minimizedNoteSortFunc(noteToInsert, this.minimizedNotes[allIndex]) < 0)
        {
            this.minimizedNotes.splice(allIndex, 0, noteToInsert);
            noteToInsert.minimizePos = allIndex;
            insertIndex++;
            allIndex++;
        }
        else
        {
            if (allIndex != currentNote.minimizePos)
            {
                currentNote.minimizePos = allIndex;
                this.screenAdjustMinimized(currentNote, animationTime);
            }
            allIndex++;
        }
    }
    
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
    uiNotesToRemove.sort(this.minimizedNoteSortFunc);
    
    var removeIndex = 0;
    var allIndex = 0;
    
    while (removeIndex < uiNotesToRemove.length)
    {
        var noteToRemove = uiNotesToRemove[removeIndex];
        var currentNote = this.minimizedNotes[allIndex];
        
        if (noteToRemove == currentNote)
        {
            this.minimizedNotes.splice(allIndex, 1);
            delete noteToRemove.minimizePos;
            removeIndex++;
        }
        else
        {
            if (allIndex != currentNote.minimizePos)
            {
                currentNote.minimizePos = allIndex;
                this.screenAdjustMinimized(currentNote, animationTime);
            }
            
            allIndex++;
        }
    }
    
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

abandonAllNoteAnimations: function()
{
    for (var noteNum in this.noteAnimations)
    {
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

startNoteAnimation: function(uiNote, animation, animationTime, onCompleteExtra, shouldSkip)
{
    if (shouldSkip == null) shouldSkip = false;
    
    this.utils.assertError(shouldSkip || this.utils.isPositiveNumber(animationTime), "Bad animation time.", animationTime);
    
    var existingDriver = this.noteAnimations[uiNote.num];
    if (existingDriver != null) existingDriver.hurry();
    
    var driver = new internoteAnimation.AnimationDriver(this.utils, animation);
    this.noteAnimations[uiNote.num] = driver;
    
    var onComplete = this.utils.bind(this, function()
    {
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

};

window.addEventListener("load", function()
{
    try
    {
        internoteUIController.init();
    }
    catch (ex)
    {
        var message = internoteUtilities.getLocaleString(alertMessageName);
        alert(message);
		internoteUtilities.handleException("Caught exception when initialising internote.", ex);
    }
}, false);
