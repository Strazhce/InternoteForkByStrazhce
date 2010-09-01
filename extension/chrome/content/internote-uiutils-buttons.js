// XXX Rewrite this to prevent leaks.

internoteUtilities.incorporate({
    PressHoverHandler: function(utils, element)
    {
        this.utils      = utils;
        this.element    = element;
        
        this.isInside   = false;
        this.isPressed  = false;
    },
    
    FlexiblePressHoverHandler: function(utils, element, area)
    {
        utils.assertError(element != null, "Null element.", element);
        utils.assertError(area    != null, "Null area.",    area   );
    
        this.utils        = utils;
        this.element      = element;
        this.area         = area;
        this.lastLocalPos = [-1, -1]; // Should never be inside.
        
        this.isInside   = false;
        this.isPressed  = false;
    }
});

internoteUtilities.PressHoverHandler.prototype = new InternoteEventDispatcher();

internoteUtilities.incorporate2(internoteUtilities.PressHoverHandler.prototype,
{
    registerHandlers: function()
    {
        this.utils.addBoundDOMEventListener(this.element, "mousedown", this, "handleMouseDown", false);
        this.utils.addBoundDOMEventListener(this.element, "mouseover", this, "handleMouseOver", false);
    },
    
    setButtonArea: function(area)
    {
        this.area = area;
        this.handleMouseMove();
    },
    
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

// This version lets you set a changeable area within the element that is considered the press/hover area.
internoteUtilities.FlexiblePressHoverHandler.prototype = new InternoteEventDispatcher();

internoteUtilities.incorporate2(internoteUtilities.FlexiblePressHoverHandler.prototype,
{
    registerHandlers: function()
    {
        this.utils.addBoundDOMEventListener(this.element, "mousedown", this, "handleMouseDown", false);
        this.utils.addBoundDOMEventListener(this.element, "mouseover", this, "handleMouseOver", false);
    },
    
    setArea: function(area)
    {
        if (!this.utils.areRectsEqual(this.area, area))
        {
            this.area = area;
            this.checkWhetherMouseInArea();
        }
    },
    
    isInArea: function(localPos)
    {
        return this.utils.isInRect(localPos, this.area);
    },
    
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
    
    convertFromClientToLocalCoords: function(mouseClientPos)
    {
        var elementClientRect = this.utils.getSingleElement(this.element.getClientRects());
        return this.utils.coordPairSubtract(mouseClientPos, [elementClientRect.left, elementClientRect.top]);
    },
    
    // Override as necessary.
    isHoverOK: function(ev) { return true; },
    isPressOK: function(ev) { return true; },
});

internoteUtilities.incorporate({
    EFFECT_MODE_NORMAL: 0,
    EFFECT_MODE_HOVER:  1,
    EFFECT_MODE_PRESS:  2,
    
    registerGeneralHandler: function(handler)
    {
        handler.initEventDispatcher();
        handler.createEvent("effectModeChanged");
        
        handler.dispatchNewMode = function()
        {
            if      (!this.isInside) var mode = this.utils.EFFECT_MODE_NORMAL
            else if (this.isPressed) var mode = this.utils.EFFECT_MODE_PRESS
            else                     var mode = this.utils.EFFECT_MODE_HOVER;
            
            this.dispatchEvent("effectModeChanged", mode);
        };
    },
    
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
    
    registerRepeatingButtonHandler: function(element, actionFunc, isEnabledFunc, delayTime, intervalTime, flexibleArea)
    {
        var handler = (flexibleArea != null)
                    ? new this.FlexiblePressHoverHandler(this, element, flexibleArea)
                    : new this.PressHoverHandler(this, element);
        
        this.registerGeneralHandler(handler);
        
        handler.turnOnRepeat = function()
        {
            this.turnOffRepeat(); // Just in case.
            
            this.delayTimeout = setTimeout(this.utils.bind(this, function()
            {
                this.delayTimeout = null;
                this.repeatInterval = setInterval(this.utils.bind(this, function()
                {
                    if (this.isInside)
                    {
                        actionFunc.call(this, this.element);
                    }
                }), intervalTime);
            }), delayTime);
        };
        
        handler.turnOffRepeat = function()
        {
            if (this.delayTimeout != null)
            {
                clearTimeout(this.delayTimeout);
                this.delayTimeout = null;
            }
            
            if (this.repeatInterval != null)
            {
                clearInterval(this.repeatInterval);
                this.repeatInterval = null;
            }
        };
        
        handler.onMouseOver = function()
        {
            this.dispatchNewMode();
            if (this.isPressed)
            {
                this.turnOnRepeat();
            }
        };
        
        handler.onMouseOut = function()
        {
            this.dispatchNewMode();
            if (this.isPressed)
            {
                this.turnOffRepeat();
            }
        };
        
        handler.onMouseDown = function(button)
        {
            this.dispatchNewMode();
            this.turnOnRepeat();
            
            // This action is delayed because when we click on a canvas with
            // multiple repeat button handlers, we should determine which area
            // the mouse is in first, in case the action function changes
            // the area and this might affect the result.
            setTimeout(function() { actionFunc.call(this, this.element); }, 0);
        };
        
        handler.onMouseUp = function(button)
        {
            this.dispatchNewMode();
            this.turnOffRepeat();
        };
        
        handler.isHoverOK = function(ev) { return isEnabledFunc.call(); }
        handler.isPressOK = function(ev) { return isEnabledFunc.call() && ev.button == 0; }
        
        handler.registerHandlers();
        
        return handler;
    },
    
    registerButtonEffectsHandler: function(handler, redrawFunc)
    {
        this.assertError(handler    != null, "handler is null.",    handler   );
        this.assertError(redrawFunc != null, "redrawFunc is null.", redrawFunc);
        
        handler.addEventListener("effectModeChanged", redrawFunc);
    },
    
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
    
    drawImageCanvas: function(canvas, image)
    {
        var context = canvas.getContext("2d");
        var [w, h] = [canvas.width, canvas.height];
        context.clearRect(0, 0, w, h);
        context.drawImage(image, 0.0 * w, 0.0 * h, 1.0 * w, 1.0 * h);
        return canvas;
    },
    
});

