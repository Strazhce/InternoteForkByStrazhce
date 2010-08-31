// XXX Rewrite this to prevent leaks.

internoteUtilities.incorporate({
    PressHoverHandler: function(utils, element)
    {
        this.utils      = utils;
        this.element    = element;
    },
    
    FlexiblePressHoverHandler: function(utils, element, area)
    {
        utils.assertError(element != null, "Null element.", element);
        utils.assertError(area    != null, "Null area.",    area   );
    
        this.utils        = utils;
        this.element      = element;
        this.area         = area;
        this.lastLocalPos = [-1, -1]; // Should never be inside.
    }
});

internoteUtilities.PressHoverHandler.prototype =
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
            this.utils.addBoundDOMEventListener(this.element, "mouseout", this, "handleMouseOut", false);
            this.onMouseOver();
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
            this.utils.removeBoundDOMEventListener(this.element, "mouseout", this, "handleMouseOut", false);
            this.onMouseOut();
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
            this.utils.addBoundDOMEventListener(this.element.ownerDocument, "mouseup", this, "handleMouseUp", false);
            this.onMouseDown(ev.button);
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
            this.utils.removeBoundDOMEventListener(this.element.ownerDocument, "mouseup", this, "handleMouseUp", false);
            this.onMouseUp(ev.button);
        }
        catch (ex)
        {
            this.utils.handleException("Exception caught when mousing up.", ex);
        }
    },
};

// This version lets you set a changeable area within the element that is considered the press/hover area.
internoteUtilities.FlexiblePressHoverHandler.prototype =
{
    registerHandlers: function()
    {
        this.utils.addBoundDOMEventListener(this.element, "mousedown", this, "handleMouseDown", false);
        this.utils.addBoundDOMEventListener(this.element, "mouseover", this, "handleMouseOver", false);
    },
    
    setArea: function(area)
    {
        //dump("setArea\n");
        this.area = area;
        this.checkWhetherMouseInArea();
    },
    
    isInArea: function(localPos)
    {
        return this.utils.isInRect(localPos, this.area);
    },
    
    handleMouseOver: function(ev)
    {
        //dump("handleMouseOver\n");
        try
        {
            this.utils.addBoundDOMEventListener(this.element, "mouseout",  this, "handleMouseOut",  false);
            this.utils.addBoundDOMEventListener(this.element, "mousemove", this, "handleMouseMove", false);
            
            this.lastLocalPos = this.convertFromClientToLocalCoords([ev.clientX, ev.clientY]);
            
            if (this.isInArea(this.lastLocalPos))
            {
                //dump("  Entered area.\n");
                this.wasInArea = true;
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
        //dump("handleMouseMove\n");
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
        //dump("handleMouseOut\n");
        try
        {
            this.utils.removeBoundDOMEventListener(this.element, "mouseout",  this, "handleMouseOut",  false);
            this.utils.removeBoundDOMEventListener(this.element, "mousemove", this, "handleMouseMove", false);
            
            // Need to update lastLocalPos so that we'll stay out if setArea is called again.
            this.lastLocalPos = this.convertFromClientToLocalCoords([ev.clientX, ev.clientY]);
            
            if (this.wasInArea)
            {
                //dump("  Left area.\n");
                this.onMouseOut();
                this.wasInArea = false;
            }
        }
        catch (ex)
        {
            this.utils.handleException("Exception caught when mousing out.", ex);
        }
    },
    
    handleMouseDown: function(ev)
    {
        //dump("handleMouseDown\n");
        try
        {
            if (this.wasInArea)
            {
                //dump("  Pressed in area.\n");
                this.utils.addBoundDOMEventListener(this.element.ownerDocument, "mouseup", this, "handleMouseUp", false);
                this.onMouseDown(ev.button);
            }
        }
        catch (ex)
        {
            this.utils.handleException("Exception caught when mousing down.", ex);
        }
    },
    
    handleMouseUp: function(ev)
    {
        //dump("handleMouseUp\n");
        try
        {
            //dump("  Released.\n");
            this.utils.removeBoundDOMEventListener(this.element.ownerDocument, "mouseup", this, "handleMouseUp", false);
            this.onMouseUp(ev.button);
        }
        catch (ex)
        {
            this.utils.handleException("Exception caught when mousing up.", ex);
        }
    },
    
    checkWhetherMouseInArea: function()
    {
        var isInAreaNow = this.isInArea(this.lastLocalPos);
        
        if (this.wasInArea && !isInAreaNow)
        {
            //dump("  Left area.\n");
            this.onMouseOut();
        }
        else if (!this.wasInArea && isInAreaNow)
        {
            //dump("  Entered area.\n");
            this.onMouseOver();
        }
        
        this.wasInArea = isInAreaNow;
    },
    
    convertFromClientToLocalCoords: function(mouseClientPos)
    {
           var elementClientRect = this.utils.getSingleElement(this.element.getClientRects());
        return this.utils.coordPairSubtract(mouseClientPos, [elementClientRect.left, elementClientRect.top]);
    },
};

internoteUtilities.incorporate({

    noteFlipImage: new Image(),
    
    EFFECT_MODE_NORMAL: 0,
    EFFECT_MODE_HOVER:  1,
    EFFECT_MODE_PRESS:  2,
    
    hoveredButton: null,
    pressedButton: null,
    
    registerButtonEffectsHandler: function(element, isEnabledFunc, redrawFunc, flexibleArea)
    {
        this.assertError(element       != null, "Element is null.",       element      );
        this.assertError(isEnabledFunc != null, "isEnabledFunc is null.", isEnabledFunc);
        this.assertError(redrawFunc    != null, "redrawFunc is null.",    redrawFunc   );
        
        var handler = (flexibleArea != null)
                    ? new this.FlexiblePressHoverHandler(this, element, flexibleArea)
                    : new this.PressHoverHandler(this, element);
        
        handler.redraw = function()
        {
            if (this.utils.hoveredButton != element)
            {
                redrawFunc.call(this, this.utils.EFFECT_MODE_NORMAL);
            }
            else if (this.utils.pressedButton == element)
            {
                redrawFunc.call(this, this.utils.EFFECT_MODE_PRESS);
            }
            else
            {
                redrawFunc.call(this, this.utils.EFFECT_MODE_HOVER);
            }
        };
        
        handler.onMouseOver = function()
        {
            if (isEnabledFunc.call())
            {
                this.utils.hoveredButton = element;
                this.redraw();
            }
        };
        
        handler.onMouseOut = function()
        {
            if (this.utils.hoveredButton == element)
            {
                this.utils.hoveredButton = null;
                this.redraw();
            }
        };
        
        handler.onMouseDown = function(button)
        {
            if (button == 0 && isEnabledFunc.call())
            {
                this.utils.pressedButton = element;
                this.redraw();
            }
        };
        
        handler.onMouseUp = function(button)
        {
            if (this.utils.pressedButton == element)
            {
                this.utils.pressedButton = null;
                this.redraw();
            }
        };
        
        handler.registerHandlers();

        return handler;
    },
    
    registerSimpleButtonHandler: function(element, actionFunc, isEnabledFunc, flexibleArea)
    {
        var handler = (flexibleArea != null)
                    ? new this.FlexiblePressHoverHandler(this, element, flexibleArea)
                    : new this.PressHoverHandler(this, element);
        
        handler.onMouseOver = function()
        {
            this.isInside = true;
        };
        
        handler.onMouseOut = function()
        {
            this.isInside = false;
        };
        
        handler.onMouseDown = function(button) {
            if (button == 0 && isEnabledFunc.call())
            {
                this.isPressed = true;
            }
        };
        
        handler.onMouseUp = function(button)
        {
            if (this.isInside && this.isPressed)
            {
                actionFunc.call(this);
            }
            this.isPressed = false;
        };
        
        handler.registerHandlers();
        
        return handler;
    },
    
    registerRepeatingButtonHandler: function(element, actionFunc, isEnabledFunc, delayTime, intervalTime, flexibleArea)
    {
        var handler = (flexibleArea != null)
                    ? new this.FlexiblePressHoverHandler(this, element, flexibleArea)
                    : new this.PressHoverHandler(this, element);
        
        handler.turnOnRepeat = function()
        {
            this.turnOffRepeat(); // Just in case.
            
            this.delayTimeout = setTimeout(this.utils.bind(this, function()
            {
                this.delayTimeout = null;
                this.repeatInterval = setInterval(this.utils.bind(this, function()
                {
                    if (this.isHovered)
                    {
                        actionFunc.call(this);
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
            this.isHovered = true;
        };
        
        handler.onMouseOut = function()
        {
            this.isHovered = false;
        };
        
        handler.onMouseDown = function(button)
        {
            if (button == 0 && isEnabledFunc.call())
            {
                actionFunc.call();
                this.isPressed = true;
                this.turnOnRepeat();
            }
        };
        
        handler.onMouseUp = function(button)
        {
            if (this.isPressed)
            {
                this.turnOffRepeat();
            }
            this.isPressed = false;
        };
        
        handler.registerHandlers();
        
        return handler;
    },
    
    createSimpleButton: function(doc, id, width, height, redrawFunc, actionFunc, isEnabledFunc)
    {
        var canvas = this.createHTMLCanvas(doc, id, width, height);
        this.registerButtonEffectsHandler(canvas, isEnabledFunc, redrawFunc);
        this.registerSimpleButtonHandler(canvas, actionFunc, isEnabledFunc);
        return canvas;
    },
    
    createRepeatingButton: function(doc, id, width, height, redrawFunc, actionFunc, isEnabledFunc, delayTime, intervalTime)
    {
        var canvas = this.createHTMLCanvas(doc, id, width, height);
        this.registerButtonEffectsHandler(canvas, isEnabledFunc, redrawFunc);
        this.registerRepeatingButtonHandler(canvas, actionFunc, isEnabledFunc, delayTime, intervalTime);
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

