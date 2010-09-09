// Internote Extension
// Scrollbar
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

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils.ScrollHandler =
function ScrollHandler(utils, prefs, element, idSuffix, width, getLineColorFunc, getHandleColorFunc, getButtonColorFunc, isEnabledFunc)
{
    //dump("internoteUtilities.ScrollHandler.ScrollHandler\n");
    
    this.utils   = utils;
    this.prefs   = prefs;
    
    this.element = element;
    this.width   = width;
    
    this.isEnabledFunc = isEnabledFunc;
    
    this.getLineColorFunc   = getLineColorFunc;
    this.getHandleColorFunc = getHandleColorFunc;
    this.getButtonColorFunc = getButtonColorFunc;
    
    var doc = element.ownerDocument;
    var scrollbar = this.utils.createXULElement("vbox", doc, "internote-scrollbar" + idSuffix);
    
    var onScrollUpLine    = this.utils.bind(this, this.onScrollUpLine  );
    var onScrollDownLine  = this.utils.bind(this, this.onScrollDownLine);
    
    var onPressScrollLine = this.utils.bind(this, this.onPressScrollLine);
    
    var upButton   = this.upButton   = this.createButton(doc, onScrollUpLine,   "internote-upscroll"   + idSuffix, "drawUpScrollButton"  );
    var downButton = this.downButton = this.createButton(doc, onScrollDownLine, "internote-downscroll" + idSuffix, "drawDownScrollButton");
    
    var scrollLine = this.scrollLine =
        this.utils.createHTMLCanvas(doc, "internote-scrollline" + idSuffix, width, width);
    
    this.upperLineEffectMode = this.utils.EFFECT_MODE_NORMAL;
    this.lowerLineEffectMode = this.utils.EFFECT_MODE_NORMAL;
    
    var onUpperRedrawScrollLine = this.utils.bind(this, function(effectMode)
    {
        var shouldChangeArea = (this.upperLineEffectMode == this.utils.EFFECT_MODE_PRESS ||
                                effectMode               == this.utils.EFFECT_MODE_PRESS);
        this.upperLineEffectMode = effectMode;
        if (shouldChangeArea)
        {
            this.updateScrollLine();
        }
        else if (this.upperLineEffectMode != effectMode)
        {
            this.drawScrollLine();
        }
    });
    var onLowerRedrawScrollLine = this.utils.bind(this, function(effectMode)
    {
        var shouldChangeArea = (this.lowerLineEffectMode == this.utils.EFFECT_MODE_PRESS ||
                                effectMode               == this.utils.EFFECT_MODE_PRESS);
        this.lowerLineEffectMode = effectMode;
        if (shouldChangeArea)
        {
            this.updateScrollLine();
        }
        else if (this.lowerLineEffectMode != effectMode)
        {
            this.drawScrollLine();
        }
    });
    
    var onScrollUpPage   = this.utils.bind(this, this.onScrollUpPage  );
    var onScrollDownPage = this.utils.bind(this, this.onScrollDownPage);
    
    var [upperLineArea, lowerLineArea] = this.getLineArea();
    this.upperLineHandler = this.utils.registerRepeatingButtonHandler(scrollLine, onScrollUpPage,   this.isEnabledFunc,
                                                                      this.REPEAT_DELAY, this.REPEAT_INTERVAL, upperLineArea);
    this.lowerLineHandler = this.utils.registerRepeatingButtonHandler(scrollLine, onScrollDownPage, this.isEnabledFunc,
                                                                      this.REPEAT_DELAY, this.REPEAT_INTERVAL, lowerLineArea);

    this.utils.registerButtonEffectsHandler(this.upperLineHandler, onUpperRedrawScrollLine);
    this.utils.registerButtonEffectsHandler(this.lowerLineHandler, onLowerRedrawScrollLine);
    
    scrollLine.addEventListener("mousedown", onPressScrollLine, false);
    
    var scrollLineWrapper = this.scrollLineWrapper =
        this.utils.createXULElement("vbox", doc, "internote-scrolllinewrapper" + idSuffix);
    
    if (this.hasCombinedScrollButtons())
    {
        scrollbar.appendChild(scrollLineWrapper);
        scrollbar.appendChild(this.utils.createXULSpacer(doc, width, width/2));
        scrollbar.appendChild(upButton);
        scrollbar.appendChild(this.utils.createXULSpacer(doc, width, width/2));
        scrollbar.appendChild(downButton);
    }
    else
    {
        scrollbar.appendChild(upButton);
        scrollbar.appendChild(this.utils.createXULSpacer(doc, width, width/2));
        scrollbar.appendChild(scrollLineWrapper);
        scrollbar.appendChild(this.utils.createXULSpacer(doc, width, width/2));
        scrollbar.appendChild(downButton);
    }
    
    scrollbar.flex = "1";
    
    scrollLineWrapper.appendChild(scrollLine);
    this.utils.fixDOMEltWidth(scrollLineWrapper, this.width);
    scrollLineWrapper.flex = "1";
    scrollLineWrapper.style.overflow = "hidden";
    
    this.paintUI();
    
    this.scrollbar = scrollbar;
    
    this.element.addEventListener("scroll", this.utils.bind(this, function()
    {
        this.updateScrollLine();
    }), false);
    
    this.element.addEventListener("input", this.utils.bind(this, function()
    {
        this.updateScrollLine();
    }), false);
};

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils.ScrollHandler.prototype =
{

REPEAT_INTERVAL: 100,
REPEAT_DELAY:    500,

getScrollbar: function()
{
    return this.scrollbar;
},

paintUI: function()
{
    //dump("internoteUtilities.ScrollHandler.paintUI\n");
    this.drawUpScrollButton();
    this.drawDownScrollButton();
    this.drawScrollLine();
},

hasCombinedScrollButtons: function()
{
    var pref = this.prefs.shouldCombineScrollButtons();
    if (pref === null)
    {
        return this.utils.hasCombinedScrollButtons();
    }
    else
    {
        return pref;
    }
},

setHeight: function(height)
{
    //dump("internoteUtilities.ScrollHandler.setHeight " + height + "\n");
    
    var scrollLineHeight = height - 3 * this.width;
    
    if (scrollLineHeight > 0)
    {
        this.scrollLine.height = scrollLineHeight;
        this.updateScrollLine();
    }
    else
    {
        this.scrollLine.height = 0;
    }
},

updateScrollLine: function()
{
    //dump("internoteUtilities.ScrollHandler.updateScrollLine\n");
    
    this.drawScrollLine();
    
    // If we're pressing the scroll line, we must set the area wider to give the user leeway.
    var arePressingScrollLine = (this.upperLineEffectMode == this.utils.EFFECT_MODE_PRESS) ||
                                (this.lowerLineEffectMode == this.utils.EFFECT_MODE_PRESS);
    
    var [upperLineArea, lowerLineArea] = arePressingScrollLine
                                       ? this.getActiveLineArea()
                                       : this.getLineArea();
    
    this.upperLineHandler.setArea(upperLineArea);
    this.lowerLineHandler.setArea(lowerLineArea);
},

updateLineHeight: function(lineHeight)
{
    //dump("internoteUtilities.ScrollHandler.updateLineHeight\n");
    this.lineHeight = lineHeight;
},

drawUpScrollButton:   function(effectMode) { this.drawScrollButton(effectMode, true ); },
drawDownScrollButton: function(effectMode) { this.drawScrollButton(effectMode, false); },

drawScrollButton: function(effectMode, isUp)
{
    var canvas = isUp ? this.upButton : this.downButton;
    var context = canvas.getContext("2d");
    
    var w = canvas.width;
    var h = canvas.height;
    
    context.clearRect(0, 0, w, h);
    
    context.strokeStyle = this.getButtonColorFunc(effectMode);
    context.lineWidth = 0.3 * w;
    context.lineCap   = "round";
    
    var Y1 = isUp ? 0.7 : 0.3;
    var Y2 = isUp ? 0.3 : 0.7;
    
    context.beginPath();
    context.moveTo(0.1 * w, Y1 * h);
    context.lineTo(0.5 * w, Y2 * h);
    context.lineTo(0.9 * w, Y1 * h);
    context.stroke();
},

drawScrollLine: function()
{
    //dump("internoteUtilities.ScrollHandler.drawScrollLine\n");
    
    var [scrollLineTop, scrollLineBot, scrollTopPos, scrollBotPos] = this.getScrollInfo();
    
    var context = this.scrollLine.getContext("2d");
    
    var w = this.scrollLine.width;
    var h = this.scrollLine.height;
    
    context.clearRect(0, 0, w, h);
    
    context.lineWidth   = 0.4 * w;
    context.lineCap     = "round";
    
    // We're mixing width and height because the width of the ball is the the same as its height.
    if (this.width < h)
    {
        //dump("  Drawing Line\n");
        context.strokeStyle = this.getLineColorFunc(this.upperLineEffectMode);
        context.beginPath();
        context.moveTo(0.5 * w, scrollLineTop);
        context.lineTo(0.5 * w, scrollTopPos );
        context.stroke();
        
        context.strokeStyle = this.getLineColorFunc(this.lowerLineEffectMode);
        context.beginPath();
        context.moveTo(0.5 * w, scrollBotPos );
        context.lineTo(0.5 * w, scrollLineBot);
        context.stroke();
        
        //dump("  Drawing Handle\n");
        context.fillStyle   = this.getHandleColorFunc(this.handleEffectMode);
        context.beginPath();
        context.arc (0.5 * w, scrollTopPos, 0.5 * w, 0, 2 * Math.PI, false);
        context.arc (0.5 * w, scrollBotPos, 0.5 * w, 0, 2 * Math.PI, false);
        context.rect(0.0 * w, scrollTopPos, 1.0 * w, scrollBotPos - scrollTopPos);
        context.fill();
    }
    else
    {
        // This can happen initially.  We just don't draw.
    }
},

getScrollInfo: function()
{
    var scrollHeight = this.scrollLine.height;
    var scrollLineTop = 0.0 * scrollHeight + this.width / 2;
    var scrollLineBot = 1.0 * scrollHeight - this.width / 2;
    var scrollLineLength = scrollLineBot - scrollLineTop;
    
    if (this.element.scrollHeight <= this.element.offsetHeight)
    {
        var scrollHandleTopFraction = 0;
        var scrollHandleBotFraction = 0;
    }
    else
    {
        var scrollBot = (this.element.scrollTop + this.element.offsetHeight - 1);
        var scrollHandleTopFraction = this.utils.clipToRange(this.element.scrollTop / this.element.scrollHeight, 0, 1);
        var scrollHandleBotFraction = this.utils.clipToRange(scrollBot              / this.element.scrollHeight, 0, 1);
    }
    
    //dump("scrollTop = " + this.element.scrollTop + ", scrollBot = " + scrollBot + ", height = " + this.element.scrollHeight + ", offset = " + this.element.offsetHeight + "\n");
    
    var scrollHandleTop = scrollLineTop + scrollLineLength * scrollHandleTopFraction;
    var scrollHandleBot = scrollLineTop + scrollLineLength * scrollHandleBotFraction;
    
    return [scrollLineTop, scrollLineBot, scrollHandleTop, scrollHandleBot];
},

// Separates the scroll line rectangle into it's three component rectangles, upper/lower lines and handle.
// Note that the handle's rounded edges are in the line areas, not the handle area, unless an appropriate
// handle offset is specified.
getLineArea: function()
{
    //dump("internoteUtilities.ScrollHandler.getLineArea\n");
    
    var [scrollLineTop, scrollLineBot, scrollHandleTop, scrollHandleBot] = this.getScrollInfo();
    
    var area = this.utils.makeRectFromDims([0, 0], [this.width, this.scrollLine.height]);
    
    var [upperRect, ] = this.utils.splitRectVert(area, Math.floor(scrollHandleTop - this.width / 2));
    var [, lowerRect] = this.utils.splitRectVert(area, Math.ceil (scrollHandleBot + this.width / 2));
    
    return [upperRect, lowerRect];
},

// When the line is being pressed, we use a version of getLineArea that ignores the handle, giving an
// empty handleRect.  This is because the mouse pos will determine where the repeating stops and
// we want to give the user some leeway and not stop on the handle's rounded edges.
getActiveLineArea: function()
{
    //dump("getActiveLineArea\n");
    
    var [scrollLineTop, scrollLineBot, scrollHandleTop, scrollHandleBot] = this.getScrollInfo();
    
    var scrollHandleMid = (scrollHandleTop + scrollHandleBot) / 2;
    
    var area = this.utils.makeRectFromDims([0, 0], [this.width, this.scrollLine.height]);
    
    var [upperRect, lowerRect] = this.utils.splitRectVert(area, Math.round(scrollHandleMid));
    return [upperRect, lowerRect];
},

isNecessary: function()
{
    return this.element.scrollHeight > this.element.offsetHeight;
},

onChangeScroll: function(pos)
{
    //dump("internoteUtilities.ScrollHandler.onChangeScroll\n");
    
    this.element.scrollTop = pos;
    this.updateScrollLine();
},

onOffsetScroll: function(offset)
{
    //dump("internoteUtilities.ScrollHandler.onOffsetScroll " + offset + "\n");
    
    this.element.scrollTop = this.element.scrollTop + offset;
    this.updateScrollLine();
},

getPageSize: function()
{
    // -1 to scroll a little less than a page.
    return Math.ceil(this.element.offsetHeight / this.lineHeight) - 1;
},

getLineCount: function()
{
    return Math.floor(this.element.scrollHeight / this.lineHeight);
},

onScrollUpLine:   function() { this.onOffsetScroll(-this.lineHeight); },
onScrollDownLine: function() { this.onOffsetScroll(+this.lineHeight); },
onScrollUpPage:   function() { this.onOffsetScroll(-this.lineHeight * this.getPageSize()); },
onScrollDownPage: function() { this.onOffsetScroll(+this.lineHeight * this.getPageSize()); },

createButton: function(doc, onClick, id, redrawFuncName)
{
    var redrawFunc = this[redrawFuncName];
    var onRedraw = this.utils.bind(this, function(effectMode) { redrawFunc.call(this, effectMode); });
    var canvas = this.utils.createRepeatingButton(doc, id, this.width, this.width, onRedraw, onClick,
                                                  this.isEnabledFunc, this.REPEAT_DELAY, this.REPEAT_INTERVAL);
    return canvas;
},

// Returns a negative, zero or positive value depending on click proximity to the slider.
getScrollLineLocation: function(event)
{
    var [scrollLineTop, scrollLineBot, scrollTopPos, scrollBotPos] = this.getScrollInfo();
    var clickY = event.clientY - this.scrollLineWrapper.boxObject.y;
    
    if (this.utils.isBetween(clickY, scrollTopPos - this.width/2, scrollBotPos + this.width/2))
    {
        return 0;
    }
    else
    {
        return clickY - scrollTopPos;
    }
},

// XXX Should kill anims.
onPressScrollLine: function(ev)
{
    //dump("internoteUtilities.ScrollHandler.onPressScrollLine\n");
    
    try
    {
        if (ev.button == 0)
        {
            var location = this.getScrollLineLocation(ev);
            
            if (location == 0)
            {
                this.onStartDragHandle(ev);
            }
            else
            {
                // Do nothing, handled in other handlers.
            }
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when pressing scroll line.", ex);
    }
},

onStartDragHandle: function(event)
{
    //dump("internoteUtilities.ScrollHandler.onStartDragHandle\n");
    
    var CANCEL_OFFSET = 6 * this.width;
    
    var dragHandler = new this.utils.DragHandler(this.utils, this.element.ownerDocument);
    var startPos = this.element.scrollTop;
    
    this.handleEffectMode = this.utils.EFFECT_MODE_PRESS;
    this.drawScrollLine();
    
    dragHandler.onDragMouseMoved = this.utils.bind(this, function(event, offset) {
        if (CANCEL_OFFSET < Math.abs(offset[0]))
        {
            dragHandler.dragFinished(false, null);
        }
        else
        {
            var [scrollLineTop, scrollLineBot, scrollTopPos, scrollBotPos] = this.getScrollInfo();
            var scrollHeight = scrollLineBot - scrollLineTop;
            var proportionOffset = offset[1] / scrollHeight;
            var scrollMovement = proportionOffset * this.element.scrollHeight;
            this.onChangeScroll(startPos + scrollMovement);
        }
    });
    
    dragHandler.onDragFinished = this.utils.bind(this, function(wasCompleted, wasDrag, offset)
    {
        this.handleEffectMode = this.utils.EFFECT_MODE_NORMAL;
        
        if (!wasCompleted)
        {
            this.onChangeScroll(startPos);
        }
        else
        {
            this.drawScrollLine(); // Remove press color.
        }
        
        dragHandler = null;
    });
    
    dragHandler.dragStarted(event);
},

};
