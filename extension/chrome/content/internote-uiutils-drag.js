// Internote Extension
// Drag Handler
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

// This is used for handling drags for movement and resizing.

// To use, you simply create a drag handler, overwrite onDragMouseMoved and onDragFinished,
// and call dragStarted().  The handler will distingush a drag (moved an adequate distance)
// from a click (didn't), as well as handling the ESC key, both through parameters to onDragFinished.

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils.DragHandler =
function DragHandler(utils, chromeDoc, data)
{
    this.utils = utils;
    this.chromeDoc = chromeDoc;
    this.data  = data;
};

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils.DragHandler.prototype =
{

// Overwrite these as appropriate.
onDragMouseMoved: function(ev, offset, data) {},
onDragFinished:   function(wasCompleted, wasDrag, offset, data) {},

// PRIVATE: Configure the event handlers.
registerHandlers: function()
{
    //dump("internoteUtilities.DragHandler.registerHandlers\n");
    
    this.utils.addBoundDOMEventListener(this.chromeDoc, "keypress",  this, "dragKeyPressed",     false);
    this.utils.addBoundDOMEventListener(this.chromeDoc, "keydown",   this, "dragKeyDownUp",      false);
    this.utils.addBoundDOMEventListener(this.chromeDoc, "keyup",     this, "dragKeyDownUp",      false);
    this.utils.addBoundDOMEventListener(this.chromeDoc, "mousemove", this, "dragMouseMoved",     false);
    this.utils.addBoundDOMEventListener(this.chromeDoc, "mouseup",   this, "dragButtonReleased", false);
},

// PRIVATE: Tear down the event handlers.
deregisterHandlers: function()
{
    //dump("internoteUtilities.DragHandler.deregisterHandlers\n");
    
    this.utils.removeBoundDOMEventListener(this.chromeDoc, "keypress",  this, "dragKeyPressed",     false);
    this.utils.removeBoundDOMEventListener(this.chromeDoc, "keydown",   this, "dragKeyDownUp",      false);
    this.utils.removeBoundDOMEventListener(this.chromeDoc, "keyup",     this, "dragKeyDownUp",      false);
    this.utils.removeBoundDOMEventListener(this.chromeDoc, "mousemove", this, "dragMouseMoved",     false);
    this.utils.removeBoundDOMEventListener(this.chromeDoc, "mouseup",   this, "dragButtonReleased", false);
},

// PRIVATE: Check whether a mouse movement is sufficient to constitute a drag instead of a click.
isAdequateDrag: function(offset)
{
    const DRAG_MIN_DISTANCE = 3;
    var pointerMovement = this.utils.coordPairDistance(offset);
    return DRAG_MIN_DISTANCE <= pointerMovement;
},

// PUBLIC: Call this on a mouse down operation.
dragStarted: function(ev)
{
    //dump("internoteUtilities.DragHandler.dragStarted\n");
    
    this.pointerInitialPos = [ev.screenX, ev.screenY];
    this.effectiveOffset = this.pointerOffset = [0, 0];
    this.registerHandlers();
},

// PRIVATE: The drag has finished, work out the situation.
dragFinished: function(wasCompleted, wasDrag)
{
    //dump("internoteUtilities.DragHandler.dragFinished\n");
    
    try
    {
        this.onDragFinished(wasCompleted, wasDrag, this.effectiveOffset, this.data);
        this.hasBeenDragMovement = false;
        this.deregisterHandlers();
    }
    catch (ex)
    {
        this.dragFailure("Exception when drag finished.", ex);
    }
},

// PRIVATE: The drag has failed due to exception, clean up.
// Lots of catches here to try to do as much as we can in case of failure.
dragFailure: function(msg, ex)
{
    this.hasBeenDragMovement = false;
    
    try
    {
        this.utils.handleException(msg, ex);
    }
    catch (ex2)
    {
        /* Nothing we can do. */
    }
    
    try
    {
        this.deregisterHandlers();
    }
    catch (ex2)
    {
        try
        {
            this.utils.handleException("Failed to deregister handlers after exception.", ex2);
        }
        catch (ex3) { /* Nothing we can do. */ }
    }
    
    try
    {
        this.onDragFinished(false, null, null, this.data);
    }
    catch (ex2)
    {
        try
        {
            this.utils.handleException("Exception caught from onDragFinished after exception.", ex2);
        }
        catch (ex3) { /* Nothing we can do. */ }
    }
},

// PRIVATE: Handles key press during drag. Upon ESC key press, will abort the drag,
// cleaning up and calling the user defined onDragFinished method.
dragKeyPressed: function(ev)
{
    dump("internoteUtilities.DragHandler.dragKeyPressed\n");
    
    try
    {
        if (ev.keyCode == ev.DOM_VK_ESCAPE)
        {
            this.dragFinished(false, null);
            ev.stopPropagation();
            ev.preventDefault();
        }
    }
    catch (ex)
    {
        this.dragFailure("Exception caught while pressing key during drag.", ex);
    }
},

dragKeyDownUp: function(ev)
{
    dump("internoteUtilities.DragHandler.dragKeyDownUp\n");
    
    if (ev.keyCode == ev.DOM_VK_SHIFT)
    {
        // Check for changes with shift key dragging.
        this.checkEffectiveOffset(ev);
    }
},

// PRIVATE: Handles mouse movement during drag and passes this on to the user-defined
// onDragMouseMoved function.
// If it notices adequate mouse movement to constitute a drag, it will record this.
dragMouseMoved: function(ev)
{
    //dump("internoteUtilities.DragHandler.dragMouseMoved\n");
    
    try
    {
        var pointerCurrentPos = [ev.screenX, ev.screenY];
        this.pointerOffset = this.utils.coordPairSubtract(pointerCurrentPos, this.pointerInitialPos);
        
        if (!this.hasBeenDragMovement && this.isAdequateDrag(this.pointerOffset))
        {
            //dump("  Has been movement.\n");
            this.hasBeenDragMovement = true;
        }
        
        this.checkEffectiveOffset(ev);
    }
    catch (ex)
    {
        this.dragFailure("Exception caught while moving mouse during drag.", ex);
    }
},

// PRIVATE: Handles mouse release during drag, cleaning up and calling the user-defined
// onDragFinished function.
// XXX Should just use dragFinished?
dragButtonReleased: function(ev)
{
    //dump("internoteUtilities.DragHandler.dragButtonReleased\n");
    
    try
    {
        this.dragFinished(true, this.hasBeenDragMovement);
        this.deregisterHandlers();
    }
    catch (ex)
    {
        this.dragFailure("Exception caught while releasing button during drag.", ex);
    }
},

// PRIVATE: Checks whether the effective offset (pointer offset adjusted by shift key if
// applicable) has changed, if so generate an event.
checkEffectiveOffset: function(ev)
{
    if (ev.shiftKey)
    {
        if (Math.abs(this.pointerOffset[0]) < Math.abs(this.pointerOffset[1]))
        {
            var newEffectiveOffset = [0, this.pointerOffset[1]];
        }
        else
        {
            var newEffectiveOffset = [this.pointerOffset[0], 0];
        }
    }
    else
    {
        var newEffectiveOffset = this.pointerOffset;
    }
    
    if (!this.utils.areCoordPairsEqual(this.effectiveOffset, newEffectiveOffset))
    {
        this.effectiveOffset = newEffectiveOffset;
    }
    
    if (this.hasBeenDragMovement)
    {
        this.onDragMouseMoved(ev, this.effectiveOffset, this.data);
    }
},

};
