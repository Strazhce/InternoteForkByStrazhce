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

internoteUtilities.incorporate({
    DragHandler: function(utils, data)
    {
        this.utils = utils;
        this.data  = data;
    }
});

internoteUtilities.DragHandler.prototype =
{

// Overwrite these as appropriate.
onDragMouseMoved: function(event, offset, data) {},
onDragFinished:   function(wasCompleted, wasDrag, offset, data) {},

registerHandlers: function()
{
    //dump("internoteUtilities.DragHandler.registerHandlers\n");
    
    this.utils.addBoundDOMEventListener(document, "keypress",  this, "dragKeyPressed",     false);
    this.utils.addBoundDOMEventListener(document, "mousemove", this, "dragMouseMoved",     false);
    this.utils.addBoundDOMEventListener(document, "mouseup",   this, "dragButtonReleased", false);
},

deregisterHandlers: function()
{
    //dump("internoteUtilities.DragHandler.deregisterHandlers\n");
    
    this.utils.removeBoundDOMEventListener(document, "keypress",  this, "dragKeyPressed"    , false);
    this.utils.removeBoundDOMEventListener(document, "mousemove", this, "dragMouseMoved"    , false);
    this.utils.removeBoundDOMEventListener(document, "mouseup",   this, "dragButtonReleased", false);
},

isAdequateDrag: function(offset)
{
    const DRAG_MIN_DISTANCE = 3;
    var pointerMovement = this.utils.coordPairDistance(offset);
    return DRAG_MIN_DISTANCE <= pointerMovement;
},

dragStarted: function(event)
{
    //dump("internoteUtilities.DragHandler.dragStarted\n");
    
    this.pointerInitialPos = [event.screenX, event.screenY];
    this.registerHandlers();
},

dragFinished: function(wasCompleted, wasDrag)
{
    //dump("internoteUtilities.DragHandler.dragFinished\n");
    
    try
    {
        this.onDragFinished(wasCompleted, wasDrag, this.pointerOffset, this.data);
        this.hasBeenDragMovement = false;
        this.deregisterHandlers();
    }
    catch (ex)
    {
        this.dragFailure("Exception when drag finished.", ex);
    }
},

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

dragKeyPressed: function(event)
{
    //dump("internoteUtilities.DragHandler.dragKeyPressed\n");
    
    try
    {
        const VK_ESCAPE = 27;
        if (event.keyCode == VK_ESCAPE)
        {
            this.dragFinished(false, null, null, this.data);
            event.stopPropagation();
            event.preventDefault();
        }
    }
    catch (ex)
    {
        this.dragFailure("Exception caught while pressing key during drag.", ex);
    }
},

dragMouseMoved: function(event)
{
    //dump("internoteUtilities.DragHandler.dragMouseMoved\n");
    
    try
    {
        var pointerCurrentPos = [event.screenX, event.screenY];
        this.pointerOffset = this.utils.coordPairSubtract(pointerCurrentPos, this.pointerInitialPos);
        
        if (!this.hasBeenDragMovement && this.isAdequateDrag(this.pointerOffset))
        {
            //dump("  Has been movement.\n");
            this.hasBeenDragMovement = true;
        }
        
        if (this.hasBeenDragMovement)
        {
            this.onDragMouseMoved(event, this.pointerOffset, this.data);
        }
    }
    catch (ex)
    {
        this.dragFailure("Exception caught while moving mouse during drag.", ex);
    }
},

dragButtonReleased: function(event)
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

};

