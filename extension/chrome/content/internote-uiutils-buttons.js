// Internote Extension
// Button Handler
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

// This file handles the buttons in the note UI, including simple single-press & repeating
// buttons, and press/hover effects.

// The PressHoverHandler class is a framework for handling press/hover state changes. 
internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils.PressHoverHandler =
function PressHoverHandler(utils, element)
{
    this.utils      = utils;
    this.element    = element;
    
    this.isInside   = false;
    this.isPressed  = false;
};

// The FlexiblePressHoverHandler is an alternate framework for when the element can change
// its size, or the handler should only apply to part of the element - this is used by the scrollbar.
internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils.FlexiblePressHoverHandler =
function FlexiblePressHoverHandler(utils, element, area)
{
    utils.assertError(element != null, "Null element.", element);
    utils.assertError(area    != null, "Null area.",    area   );

    this.utils        = utils;
    this.element      = element;
    this.area         = area;
    this.lastLocalPos = [-1, -1]; // Should never be inside at the start.
    
    this.isInside   = false;
    this.isPressed  = false;
};

////
// PressHoverHandler class.
// You MUST declare onMouseOver, onMouseOut, onMouseDown and onMouseUp methods.
// You MAY override isHoverOK and isPressOK.
////

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils.PressHoverHandler.prototype =
    new internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.EventDispatcher();

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils.PressHoverHandler.prototype.incorporate("PressHoverHandler", {
    // PRIVATE: Initialize the handlers.
    registerHandlers: function()
    {
        this.utils.addBoundDOMEventListener(this.element, "mousedown", this, "handleMouseDown", false);
        this.utils.addBoundDOMEventListener(this.element, "mouseover", this, "handleMouseOver", false);
    },
    
    // XXX Unused - delete?
    setButtonArea: function(area)
    {
        this.area = area;
        this.handleMouseMove();
    },
    
    // PRIVATE: Event handler for when the mouse enters the element.
    handleMouseOver: function(ev)
    {
        try
        {
            if (this.isHoverOK(ev))
            {
                this.isInside = true;
                this.utils.addBoundDOMEventListener(this.element, "mouseout", this, "handleMouseOut", false);
                this.onMouseOver();
            }
        }
        catch (ex)
        {
            this.utils.handleException("Exception caught when mousing over.", ex);
        }
    },
    
    // PRIVATE: Event handler for when the mouse leaves the element.
    handleMouseOut: function(ev)
    {
        try
        {
            if (this.isInside)
            {
                this.isInside = false;
                this.utils.removeBoundDOMEventListener(this.element, "mouseout", this, "handleMouseOut", false);
                this.onMouseOut();
            }
        }
        catch (ex)
        {
            this.utils.handleException("Exception caught when mousing out.", ex);
        }
    },
    
    // PRIVATE: Event handler for when the mouse is pressed on the element.
    handleMouseDown: function(ev)
    {
        try
        {
            if (this.isPressOK(ev))
            {
                this.isPressed = true;
                this.utils.addBoundDOMEventListener(this.element.ownerDocument, "mouseup", this, "handleMouseUp", false);
                this.onMouseDown();
            }
        }
        catch (ex)
        {
            this.utils.handleException("Exception caught when mousing down.", ex);
        }
    },
    
    // PRIVATE: Event handler for when the mouse is released on the element.
    handleMouseUp: function(ev)
    {
        try
        {
            if (this.isPressed)
            {
                this.isPressed = false;
                this.utils.removeBoundDOMEventListener(this.element.ownerDocument, "mouseup", this, "handleMouseUp", false);
                this.onMouseUp();
            }
        }
        catch (ex)
        {
            this.utils.handleException("Exception caught when mousing up.", ex);
        }
    },
    
    // Override as necessary.
    isHoverOK: function(ev) { return true; },
    isPressOK: function(ev) { return true; },
});

////
// FlexiblePressHoverHandler class.
// This version lets you set a changeable area within the element that is considered the press/hover area.
////

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils.FlexiblePressHoverHandler.prototype =
   new internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.EventDispatcher();

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils.FlexiblePressHoverHandler.prototype.incorporate("FlexiblePressHoverHandler", {

    // PRIVATE: Initialize the handlers.
    registerHandlers: function()
    {
        this.utils.addBoundDOMEventListener(this.element, "mousedown", this, "handleMouseDown", false);
        this.utils.addBoundDOMEventListener(this.element, "mouseover", this, "handleMouseOver", false);
    },
    
    // PUBLIC: Change the handler area. This may result in over/out events being generated.
    setArea: function(area)
    {
        if (!this.utils.areRectsEqual(this.area, area))
        {
            this.area = area;
            this.checkWhetherMouseInArea();
        }
    },
    
    // PRIVATE: Check whether the mouse is in the handler area.    
    isInArea: function(localPos)
    {
        return this.utils.isInRect(localPos, this.area);
    },
    
    // PRIVATE: Event handler for when the mouse enters the element.
    handleMouseOver: function(ev)
    {
        try
        {
            this.utils.addBoundDOMEventListener(this.element, "mouseout",  this, "handleMouseOut",  false);
            this.utils.addBoundDOMEventListener(this.element, "mousemove", this, "handleMouseMove", false);
            
            this.lastLocalPos = this.convertFromClientToLocalCoords([ev.clientX, ev.clientY]);
            
            if (this.isInArea(this.lastLocalPos) && this.isHoverOK(ev))
            {
                this.isInside = true;
                this.onMouseOver();
            }
        }
        catch (ex)
        {
            this.utils.handleException("Exception caught when mousing over.", ex);
        }
    },
    
    // PRIVATE: Event handler for when the mouse moves within the element.
    // This may result in over/out events being generated.
    handleMouseMove: function(ev)
    {
        try
        {
            this.lastLocalPos = this.convertFromClientToLocalCoords([ev.clientX, ev.clientY]);
            this.checkWhetherMouseInArea();
        }
        catch (ex)
        {
            this.utils.handleException("Exception caught when moving mouse.", ex);
        }
    },
    
    // PRIVATE: Event handler for when the mouse leaves the element.
    handleMouseOut: function(ev)
    {
        try
        {
            this.utils.removeBoundDOMEventListener(this.element, "mouseout",  this, "handleMouseOut",  false);
            this.utils.removeBoundDOMEventListener(this.element, "mousemove", this, "handleMouseMove", false);
            
            // Need to update lastLocalPos so that we'll stay out if setArea is called again.
            this.lastLocalPos = this.convertFromClientToLocalCoords([ev.clientX, ev.clientY]);
            
            if (this.isInside)
            {
                this.isInside = false;
                this.onMouseOut();
            }
        }
        catch (ex)
        {
            this.utils.handleException("Exception caught when mousing out.", ex);
        }
    },
    
    // PRIVATE: Event handler for when the mouse is pressed on the element.
    handleMouseDown: function(ev)
    {
        try
        {
            if (this.isInside && this.isPressOK(ev))
            {
                this.isPressed = true;
                this.utils.addBoundDOMEventListener(this.element.ownerDocument, "mouseup", this, "handleMouseUp", false);
                this.onMouseDown();
            }
        }
        catch (ex)
        {
            this.utils.handleException("Exception caught when mousing down.", ex);
        }
    },
    
    // PRIVATE: Event handler for when the mouse is released on the element.
    handleMouseUp: function(ev)
    {
        try
        {
            if (this.isPressed)
            {
                this.isPressed = false;
                this.utils.removeBoundDOMEventListener(this.element.ownerDocument, "mouseup", this, "handleMouseUp", false);
                this.onMouseUp();
            }
        }
        catch (ex)
        {
            this.utils.handleException("Exception caught when mousing up.", ex);
        }
    },
    
    // PRIVATE: This rechecks whether the mouse is in the defined handler area.
    checkWhetherMouseInArea: function()
    {
        var isInsideNow = this.isInArea(this.lastLocalPos);
        
        if (this.isInside && !isInsideNow)
        {
            this.isInside = false;
            this.onMouseOut();
        }
        else if (!this.isInside && isInsideNow)
        {
            this.isInside = true;
            this.onMouseOver();
        }
    },
    
    // PRIVATE: Converts from client coordinates to the element's local coordinates.
    convertFromClientToLocalCoords: function(mouseClientPos)
    {
        var elementClientRect = this.utils.getSingleElement(this.element.getClientRects());
        return this.utils.coordPairSubtract(mouseClientPos, [elementClientRect.left, elementClientRect.top]);
    },
    
    // Override as necessary.
    isHoverOK: function(ev) { return true; },
    isPressOK: function(ev) { return true; },
});

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils.incorporate("ButtonUIUtils", {
    EFFECT_MODE_NORMAL: 0,
    EFFECT_MODE_HOVER:  1,
    EFFECT_MODE_PRESS:  2,
    
    // PRIVATE: This help function sets up a button handler.
    registerGeneralHandler: function(handler)
    {
        handler.initEventDispatcher();
        handler.createEvent("effectModeChanged");
        
        // This helper function dispatches a mode change event.
        handler.dispatchNewMode = function()
        {
            if      (!this.isInside) var mode = this.utils.EFFECT_MODE_NORMAL
            else if (this.isPressed) var mode = this.utils.EFFECT_MODE_PRESS
            else                     var mode = this.utils.EFFECT_MODE_HOVER;
            
            this.dispatchEvent("effectModeChanged", mode);
        };
    },
    
    // PUBLIC: This registers a simple button handler. This is a button you can left-click on &
    // it performs an action once.
    // It returns a fully configured PressHoverHandler or FlexiblePressHoverHandler on which you can
    // listen to the "effectModeChanged" event, in order to change the button for press/hover effects.
    // You must also pass a function to say whether the button is currently enabled,
    // and may specify a flexible area (null otherwise) to use the FlexiblePressHoverHandler.
    registerSimpleButtonHandler: function(element, actionFunc, isEnabledFunc, flexibleArea)
    {
        var handler = (flexibleArea != null)
                    ? new this.FlexiblePressHoverHandler(this, element, flexibleArea)
                    : new this.PressHoverHandler(this, element);
        
        this.registerGeneralHandler(handler);
        
        handler.onMouseOver = function() { this.dispatchNewMode(); };
        handler.onMouseOut  = function() { this.dispatchNewMode(); };
        handler.onMouseDown = function() { this.dispatchNewMode(); };
        
        handler.onMouseUp = function() {
            this.dispatchNewMode();
            
            if (this.isInside)
            {
                actionFunc.call(this, this.element);
            }
        };
        
        handler.isHoverOK = function(ev) { return isEnabledFunc.call(); }
        handler.isPressOK = function(ev) { return isEnabledFunc.call() && ev.button == 0; }
        
        handler.registerHandlers();
        
        return handler;
    },
    
    // PUBLIC: This works in exactly the same way as the simple button handler above, however
    // the user can press and hold the button to have it fire once, wait a specified initial delay
    // and then repeat on an interval, as occurs with scrollbar buttons.
    registerRepeatingButtonHandler: function(element, actionFunc, isEnabledFunc, delayTime, intervalTime, flexibleArea)
    {
        var handler = (flexibleArea != null)
                    ? new this.FlexiblePressHoverHandler(this, element, flexibleArea)
                    : new this.PressHoverHandler(this, element);
        
        this.registerGeneralHandler(handler);
        
        handler.waitForRepeat = function()
        {
            this.stopRepeating(); // Just in case.
            
            this.delayTimeout = this.utils.createTimeout(this.utils.bind(this, function()
            {
                actionFunc.call(this, this.element);
                this.delayTimeout = null;
                this.startRepeating();
            }), delayTime);
        };
        
        handler.startRepeating = function()
        {
            this.repeatInterval = this.utils.createInterval(this.utils.bind(this, function()
            {
                if (this.isInside)
                {
                    actionFunc.call(this, this.element);
                }
            }), intervalTime);
        };
        
        handler.stopRepeating = function()
        {
            if (this.delayTimeout != null)
            {
                this.utils.cancelTimer(this.delayTimeout);
                this.delayTimeout = null;
            }
            
            if (this.repeatInterval != null)
            {
                this.utils.cancelTimer(this.repeatInterval);
                this.repeatInterval = null;
            }
        };
        
        handler.onMouseOver = function()
        {
            this.dispatchNewMode();
            if (this.isPressed)
            {
                actionFunc.call(this, this.element);
                this.startRepeating();
            }
        };
        
        handler.onMouseOut = function()
        {
            this.dispatchNewMode();
            if (this.isPressed)
            {
                this.stopRepeating();
            }
        };
        
        handler.onMouseDown = function(button)
        {
            this.dispatchNewMode();
            
            // This action is delayed because when we click on a canvas with
            // multiple repeat button handlers, we should determine which area
            // the mouse is in first, in case the action function changes
            // the area and this might affect the result.
            this.utils.createTimeout(this.utils.bind(this, function() {
                actionFunc.call(this, this.element);
                this.waitForRepeat();
            }), 0);
        };
        
        handler.onMouseUp = function(button)
        {
            this.dispatchNewMode();
            this.stopRepeating();
        };
        
        handler.isHoverOK = function(ev) { return isEnabledFunc.call(); }
        handler.isPressOK = function(ev) { return isEnabledFunc.call() && ev.button == 0; }
        
        handler.registerHandlers();
        
        return handler;
    },
    
    // PUBLIC: Registers a redraw callback for when a (Flexible)PressHoverHandler's mode changes.
    // The callback is passed the relevant EFFECT_MODE so you can do press/hover effects.
    registerButtonEffectsHandler: function(handler, redrawFunc)
    {
        this.assertError(handler    != null, "handler is null.",    handler   );
        this.assertError(redrawFunc != null, "redrawFunc is null.", redrawFunc);
        
        handler.addEventListener("effectModeChanged", redrawFunc);
    },
    
    // PUBLIC: This creates a HTML canvas and configures it to act as a simple button. It is a
    // convenience function for registering a simple button handler and then button effects handler.
    createSimpleButton: function(doc, id, width, height, redrawFunc, actionFunc, isEnabledFunc)
    {
        var canvas = this.createHTMLCanvas(doc, id, width, height);
        
        try
        {
            var handler = this.registerSimpleButtonHandler(canvas, actionFunc, isEnabledFunc);
            this.registerButtonEffectsHandler(handler, redrawFunc);
        }
        catch (ex)
        {
            this.handleException("Exception caught when registering simple button handlers.", ex);
        }
        
        return canvas;
    },
    
    // PUBLIC: This creates a HTML canvas and configures it to act as a repeating button. It is a
    // convenience function for registering a repeating button handler and then button effects handler.
    createRepeatingButton: function(doc, id, width, height, redrawFunc, actionFunc, isEnabledFunc, delayTime, intervalTime)
    {
        var canvas = this.createHTMLCanvas(doc, id, width, height);
        
        try
        {
            var handler = this.registerRepeatingButtonHandler(canvas, actionFunc, isEnabledFunc, delayTime, intervalTime);
            this.registerButtonEffectsHandler(handler, redrawFunc);
        }
        catch (ex)
        {
            this.handleException("Exception caught when registering repeating button handlers.", ex);
        }
        
        return canvas;
    },
    
    // PUBLIC: This function draws a close icon of a specified color on the given canvas.
    drawCloseButton: function(canvas, color)
    {
        var context = canvas.getContext("2d");
        var [w, h] = [canvas.width, canvas.height];
        
        context.clearRect(0, 0, w, h);
        
        context.lineWidth = 0.3 * w;
        context.lineCap = "round";
        context.strokeStyle = color;
        
        context.beginPath();
        context.moveTo(0.10 * w, 0.10 * h); context.lineTo(0.90 * w, 0.90 * h);
        context.moveTo(0.90 * w, 0.10 * h); context.lineTo(0.10 * w, 0.90 * h);
        context.stroke();
    },
    
    // PUBLIC: This function draws a minimize icon of a specified color on the given canvas.
    // Note that the line position will be determined by the hasMinimizeIconCentered method.
    drawMinimizeButton: function(canvas, color)
    {
        var WIDTH_PROPORTION = 0.3;
        
        var context = canvas.getContext("2d");
        var [w, h] = [canvas.width, canvas.height];
        
        context.clearRect(0, 0, w, h);
        
        context.lineWidth = WIDTH_PROPORTION * w;
        context.lineCap = "round";
        context.strokeStyle = color;
        
        var yPos = this.hasMinimizeIconCentered() ? 0.5 : (1 - WIDTH_PROPORTION / 2);
        context.beginPath();
        context.moveTo(0.10 * w, yPos * h); context.lineTo(0.90 * w, yPos * h);
        context.stroke();
    },
    
    // PUBLIC: This function draws the given image onto the given canvas.
    drawImageCanvas: function(canvas, image)
    {
        var context = canvas.getContext("2d");
        var [w, h] = [canvas.width, canvas.height];
        context.clearRect(0, 0, w, h);
        context.drawImage(image, 0.0 * w, 0.0 * h, 1.0 * w, 1.0 * h);
        return canvas;
    },
    
});
