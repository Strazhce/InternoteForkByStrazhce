// XXX Rewrite this to prevent leaks.

internoteUtilities.incorporate({
    PressHoverHandler: function(utils, element)
    {
        this.utils      = utils;
        this.element    = element;
    },
});

internoteUtilities.PressHoverHandler.prototype =
{
    registerHandlers: function()
    {
        this.utils.addBoundDOMEventListener(this.element, "mousedown", this, "handleMouseDown", false);
        this.utils.addBoundDOMEventListener(this.element, "mouseover", this, "handleMouseOver", false);
    },
    
    handleMouseOver: function(ev)
    {
        try
        {
            this.utils.addBoundDOMEventListener(this.element, "mouseout", this, "handleMouseOut", false);
            this.onMouseOver(ev);
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
            this.onMouseOut(ev);
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
            this.onMouseDown(ev);
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
            this.onMouseUp(ev);
        }
        catch (ex)
        {
            this.utils.handleException("Exception caught when mousing up.", ex);
        }
    },
};

internoteUtilities.incorporate({

    EFFECT_MODE_NORMAL: 0,
    EFFECT_MODE_HOVER:  1,
    EFFECT_MODE_PRESS:  2,
    
    hoveredButton: null,
    pressedButton: null,
    
    registerButtonEffectsHandler: function(element, isEnabledFunc, redrawFunc)
    {
        this.assertError(element       != null, "Element is null.",       element      );
        this.assertError(isEnabledFunc != null, "isEnabledFunc is null.", isEnabledFunc);
        this.assertError(redrawFunc    != null, "redrawFunc is null.",    redrawFunc   );
        
        var handler = new this.PressHoverHandler(this, element);
        
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
        
        handler.onMouseOver = function(ev)
        {
            if (isEnabledFunc.call())
            {
                this.utils.hoveredButton = element;
                this.redraw();
            }
        };
        
        handler.onMouseOut = function(ev)
        {
            if (this.utils.hoveredButton == element)
            {
                this.utils.hoveredButton = null;
                this.redraw();
            }
        };
        
        handler.onMouseDown = function(ev)
        {
            if (isEnabledFunc.call())
            {
                this.utils.pressedButton = element;
                this.redraw();
            }
        };
        
        handler.onMouseUp = function(ev)
        {
            if (this.utils.pressedButton == element)
            {
                this.utils.pressedButton = null;
                this.redraw();
            }
        };
        
        handler.registerHandlers();
    },
    
    registerSimpleButtonHandler: function(element, actionFunc, isEnabledFunc)
    {
        var handler = new this.PressHoverHandler(this, element);
        
        handler.onMouseOver = function(ev)
        {
            this.isInside = true;
        };
        
        handler.onMouseOut = function(ev)
        {
            this.isInside = false;
        };
        
        handler.onMouseDown = function(ev) {};
        
        handler.onMouseUp = function(ev)
        {
            if (this.isInside && isEnabledFunc.call())
            {
                actionFunc.call(this, ev);
            }
        };
        
        handler.registerHandlers();
    },
    
    registerRepeatingButtonHandler: function(element, actionFunc, isEnabledFunc, delayTime, intervalTime)
    {
        var handler = new this.PressHoverHandler(this, element);
        
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
        
        handler.onMouseDown = function()
        {
            if (isEnabledFunc.call())
            {
                actionFunc.call();
                this.isPressed = true;
                this.turnOnRepeat();
            }
        };
        
        handler.onMouseUp = function()
        {
            this.isPressed = false;
            this.turnOffRepeat();
        };
        
        handler.registerHandlers();
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
});
