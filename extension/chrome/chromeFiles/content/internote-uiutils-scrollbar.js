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

internoteUtilities.incorporate({
    ScrollHandler: function(utils, prefs, element, idSuffix, width, lineColor, buttonColor)
    {
        //dump("internoteUtilities.ScrollHandler.ScrollHandler\n");
        
        this.utils   = utils;
        this.prefs   = prefs;
        
        this.element = element;
        this.width   = width;
        
        this.lineColor   = lineColor;
        this.buttonColor = buttonColor;
        
        var doc = element.ownerDocument;
        var scrollbar = this.utils.createXULElement("vbox", doc, "internote-scrollbar" + idSuffix);
        
        var onScrollUpLine    = this.utils.bind(this, this.onScrollUpLine  );
        var onScrollDownLine  = this.utils.bind(this, this.onScrollDownLine);
        
        var onPressScrollLine = this.utils.bind(this, this.onPressScrollLine);
        var onPressUpArrow    = this.utils.bind(this, this.onPressUpArrow   );
        var onPressDownArrow  = this.utils.bind(this, this.onPressDownArrow );
        
        var upButton   = this.upButton   =
            this.utils.createHTMLCanvas(doc, "internote-upscroll"   + idSuffix, width, width);
        var downButton = this.downButton = 
            this.utils.createHTMLCanvas(doc, "internote-downscroll" + idSuffix, width, width);
        var scrollLine = this.scrollLine = 
            this.utils.createHTMLCanvas(doc, "internote-scrollline" + idSuffix, width, width);
        
        upButton  .addEventListener("mousedown", onPressUpArrow,    false);
        downButton.addEventListener("mousedown", onPressDownArrow,  false);
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
            this.drawScrollLine();
        }), false);
        
        this.element.addEventListener("input", this.utils.bind(this, function()
        {
            this.drawScrollLine();
        }), false);    
    }    
});

internoteUtilities.ScrollHandler.prototype =
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
        this.drawScrollLine();
    }
    else
    {
        this.scrollLine.height = 0;
    }
},

updateLineHeight: function(lineHeight)
{
    //dump("internoteUtilities.ScrollHandler.updateLineHeight\n");
    this.lineHeight = lineHeight;
},

updateColors: function(lineColor, buttonColor)
{
    this.lineColor   = lineColor;
    this.buttonColor = buttonColor;
},

drawUpScrollButton:   function() { this.drawScrollButton(true ); },
drawDownScrollButton: function() { this.drawScrollButton(false); },

drawScrollButton: function(isUp)
{
    var canvas = isUp ? this.upButton : this.downButton;
    var context = canvas.getContext("2d");
    
    var w = canvas.width;
    var h = canvas.height;
    
    context.clearRect(0, 0, w, h);
    
    context.strokeStyle = this.buttonColor;
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

drawScrollLine: function(scrollInfo)
{
    //dump("internoteUtilities.ScrollHandler.drawScrollLine\n");
    
    if (scrollInfo == null)
    {
        scrollInfo = this.getScrollInfo();
    }
    
    var [scrollLineTop, scrollLineBot, scrollTopPos, scrollBotPos] = scrollInfo;
    
    var context = this.scrollLine.getContext("2d");
    
    var w = this.scrollLine.width;
    var h = this.scrollLine.height;
    
    context.clearRect(0, 0, w, h);
    
    context.strokeStyle = this.lineColor;
    context.fillStyle   = this.buttonColor;
    context.lineWidth   = 0.4 * w;
    context.lineCap     = "round";
    
    // We're mixing width and height because the width of the ball is the the same as its height.
    if (this.width < h)
    {
        //dump("  Drawing Line\n");
        context.beginPath();
        context.moveTo(0.5 * w, scrollLineTop);
        context.lineTo(0.5 * w, scrollLineBot);
        context.stroke();
        
        //dump("  Drawing Handle\n"); 
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
        var scrollTopFraction = 0;
        var scrollBotFraction = 0;
    }
    else
    {
        var scrollBot = (this.element.scrollTop + this.element.offsetHeight - 1);
        var scrollTopFraction = this.utils.clipToRange(this.element.scrollTop / this.element.scrollHeight, 0, 1);
        var scrollBotFraction = this.utils.clipToRange(scrollBot              / this.element.scrollHeight, 0, 1);
    }
    
    //dump("scrollTop = " + this.element.scrollTop + ", scrollBot = " + scrollBot + ", height = " + this.element.scrollHeight + ", offset = " + this.element.offsetHeight + "\n");
    
    var scrollTopPos = scrollLineTop + scrollLineLength * scrollTopFraction;
    var scrollBotPos = scrollLineTop + scrollLineLength * scrollBotFraction;
    
    return [scrollLineTop, scrollLineBot, scrollTopPos, scrollBotPos];
},

isNecessary: function()
{
    return this.element.scrollHeight > this.element.offsetHeight;
},

onChangeScroll: function(pos)
{
    //dump("internoteUtilities.ScrollHandler.onChangeScroll\n");
    
    this.element.scrollTop = pos;
    this.drawScrollLine();
},

onOffsetScroll: function(offset)
{
    //dump("internoteUtilities.ScrollHandler.onOffsetScroll " + offset + "\n");
    
    this.element.scrollTop = this.element.scrollTop + offset;
    this.drawScrollLine();
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
    //dump("internoteNoteUI.onPressScrollLine\n");
    
    try
    {
        if (ev.button == 0)
        {
            var location = this.getScrollLineLocation(ev);
            
            if (location > 0)
            {
                this.onPressRepeatingButton(ev, this.onScrollDownPage);
            }
            else if (location < 0)
            {
                this.onPressRepeatingButton(ev, this.onScrollUpPage);
            }
            else
            {
                this.onStartDragSlider(ev);
            }
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when pressing scroll line.", ex);
    }
},

onPressUpArrow: function(ev)
{
    //dump("internoteUtilities.Scrollbar.onPressUpArrow\n");
    
    try
    {
        this.onPressRepeatingButton(ev, this.onScrollUpLine);
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when pressing up arrow.", ex);
    }
},

onPressDownArrow: function(ev)
{
    //dump("internoteUtilities.Scrollbar.onPressDownArrow\n");
    
    try
    {
        this.onPressRepeatingButton(ev, this.onScrollDownLine);    
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when pressing up arrow.", ex);
    }
},

onPressRepeatingButton: function(ev, executeFunc)
{
    //dump("internoteUtilities.Scrollbar.onPressRepeatingButton\n");
    
    if (ev.button == 0)
	{
		executeFunc.call(this);
		
		var onMouseUp = this.utils.bind(this, function()
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
			
			document.removeEventListener("mouseup", onMouseUp, false);
			onMouseUp = null;
		});
		
		document.addEventListener("mouseup", onMouseUp, false);
		
		this.delayTimeout = setTimeout(this.utils.bind(this, function()
		{
			this.delayTimeout = null;
			this.repeatInterval = setInterval(this.utils.bind(this, function()
			{
				executeFunc.call(this);
			}), this.REPEAT_INTERVAL);
		}), this.REPEAT_DELAY);
	}
},

onStartDragSlider: function(event)
{
    //dump("internoteNoteUI.onStartDragSlider\n");
    
    var dragHandler = new this.utils.DragHandler(this.utils);
    var startPos = this.element.scrollTop;
    
    dragHandler.onDragMouseMoved = this.utils.bind(this, function(event, offset) {
        var [scrollLineTop, scrollLineBot, scrollTopPos, scrollBotPos] = this.getScrollInfo();
        var scrollHeight = scrollLineBot - scrollLineTop;
        var proportionOffset = offset[1] / scrollHeight;
        var scrollMovement = proportionOffset * this.element.scrollHeight;
        this.onChangeScroll(startPos + scrollMovement);
    });
    
    dragHandler.onDragFinished = this.utils.bind(this, function(wasCompleted, wasDrag, offset)
    {
        if (!wasCompleted)
        {
            this.onChangeScroll(startPos);
        }
        
        dragHandler = null;
    });
    
    dragHandler.dragStarted(event);
},

};

