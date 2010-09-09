// Internote Extension
// Text Balloon Display
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

// Uses: internote-animation.js, internote-utilities.js,

// This displays a "speech balloon" to the user attached to the internote statusbar icon.

var internoteBalloonUI =
{

balloonPanel: null,
balloonAnimDriver: null,

isInitialized: false,

MIN_DISPLAY_TIME: 2500,
FADE_OUT_TIME: 500,

ROUNDED_CORNER_SIZE: 15,
DIAGONAL_HEIGHT: 12,
DIAGONAL_WIDTH:  5,
BALLOON_WIDTH: 260,
BALLOON_HEIGHT: 60,

CLOSE_SIZE: 10,

messageQueue: [],

init: function(utils, anim, id, container)
{
    //dump("internoteBalloonUI.init\n");
    
    this.utils     = utils;
    this.anim      = anim;
    this.id        = id;
    this.container = container;
    this.STANDARD_MARGIN = Math.floor(this.ROUNDED_CORNER_SIZE / 2);
},

onClose: function()
{
    if (this.utils.supportsTranslucentPopups())
    {
        if (!this.balloonAnimDriver.isStarted)
        {
            this.balloonAnimDriver.start(this.FADE_OUT_TIME);
        }
    }
    else
    {
        this.resetPanel();
        this.messageQueue.shift();
        this.checkWhetherToShowMessage();
    }
},

redrawCloseButton: function(mode)
{
    var color = (mode == this.utils.EFFECT_MODE_HOVER) ? "#000000" :
                (mode == this.utils.EFFECT_MODE_PRESS) ? "#BBBBBB" :
                "#666666";
    this.utils.drawCloseButton(this.closeButton, color);
},

showMessage: function(message)
{
    //dump("internoteBalloonUI.showMessage " + this.messageQueue.length + "\n");
    
    if (this.messageQueue.length == 0)
    {
        var shouldShowMessage = true;
    }
    else
    {
        var lastMessage = this.messageQueue[this.messageQueue.length - 1];
        var shouldShowMessage = (lastMessage.messageName != message.messageName);
    }
    
    if (shouldShowMessage)
    {
        this.messageQueue.push(message);
    }
    
    this.checkWhetherToShowMessage();
},

checkWhetherToShowMessage: function()
{
    //dump("internoteBalloonUI.checkWhetherToShowMessage\n");
    
    var isDisplayed = (this.balloonPanel != null);
    // We avoid showing a message if the window isn't on top because a popup would bring it to front.
    if (!isDisplayed && document.hasFocus() && this.messageQueue.length > 0)
    {
        this.showMessageNow(this.messageQueue[0]);
    }
},

showMessageNow: function(message)
{
    //dump("internoteBalloonUI.showMessageNow\n");
    
    this.abandonAnimation();
    
    this.links = this.utils.ifNull(message.links, {});
    
    this.balloonPanel = document.createElement("panel");
    // -moz-appearance seems to be necessary on Linux but not Windows.
    this.balloonPanel.setAttribute("style", "background-color: transparent; border: none; -moz-appearance: none;");
    
    this.balloonPanel.setAttribute("id", this.id);
    this.balloonPanel.setAttribute("noautohide", "true");
    
    var mainStack = document.createElement("stack");
    mainStack.flex = "1";
    this.utils.fixDOMEltWidth(this.balloonPanel, this.BALLOON_WIDTH);
    
    this.balloonCanvas = this.utils.createHTMLElement("canvas", document);
    
    this.balloonCanvas.setAttribute("style", "border: none; margin: 0px; padding: 0px;");
    this.balloonCanvas.height = 1; // we can work out the correct height when the popup shows
    this.balloonCanvas.width  = this.BALLOON_WIDTH;
    
    this.balloonDiv = this.utils.createHTMLElement("div", document);
    this.balloonDiv.setAttribute("style", "font-size: 10pt; border: none; margin: 0px;");
    this.balloonDiv.style.marginLeft   = this.STANDARD_MARGIN + "px";
    this.balloonDiv.style.marginRight  = this.STANDARD_MARGIN + "px";
    this.balloonDiv.style.marginTop    = this.STANDARD_MARGIN + "px";
    this.balloonDiv.style.marginBottom = (this.STANDARD_MARGIN + this.DIAGONAL_HEIGHT) + "px";
    
    this.closeButton = this.utils.createSimpleButton(document, null, this.CLOSE_SIZE, this.CLOSE_SIZE,
                                                     this.utils.bind(this, this.redrawCloseButton),
                                                     this.utils.bind(this, this.onClose),
                                                     function() { return true; });
    this.closeButton.setAttribute("style", "float: right; cursor: pointer;");
    this.redrawCloseButton();
    
    var text = this.utils.getLocaleString(document, message.messageName);
    
    var mainPara = this.utils.createHTMLElement("p", document);
    mainPara.appendChild(this.closeButton);
    mainPara.appendChild(document.createTextNode(text));
    mainPara.style.margin = "0px";
    this.balloonDiv.appendChild(mainPara);
    
    for (var i in this.links)
    {
        var linkText = this.utils.getLocaleString(document, this.links[i].messageName);
        
        var aPara = this.utils.createHTMLElement("a", document);
        aPara.appendChild(document.createTextNode(linkText));
        aPara.style.color          = "blue";
        aPara.style.cursor         = "pointer";
        aPara.style.textDecoration = "underline";
        aPara.style.margin         = "0px";
        
        aPara.addEventListener("click", this.utils.bind(this, function()
        {
            this.links[i].func();
            this.onClose();
        }), false);
        
        var linkPara = this.utils.createHTMLElement("p", document);
        linkPara.appendChild(aPara);
        linkPara.style.margin = "0px";
        linkPara.style.textAlign = "center";
        linkPara.style.marginTop = "5px";
        this.balloonDiv.appendChild(linkPara);
    }
    
    mainStack.appendChild(this.balloonCanvas);
    mainStack.appendChild(this.balloonDiv);
    
    this.balloonPanel.appendChild(mainStack);
    
    this.container.appendChild(this.balloonPanel);
    
    this.isInitialized = true;
    
    var anchor = document.getElementById("internote-panel");
    var offset;
    
    if (anchor == null || anchor.style.display == "none")
    {
        anchor = document.getElementById("status-bar");
        offset = 10;
    }
    else
    {
        offset = anchor.boxObject.width / 2;
    }
    
    this.balloonPanel.openPopup(anchor, "before_end", -offset, anchor.boxObject.height / 3, false, false);
    
    this.balloonPanel.addEventListener("popupshown", this.utils.bind(this, function()
    {
        // Once the popup is up, the text div's height will affect the balloon panel's height,
        // so we can then figure out the correct canvas height.
        this.balloonCanvas.height = this.balloonPanel.boxObject.height;
        this.drawCanvas();
        if (message.shouldTimeout)
        {
            var displayTime = this.MIN_DISPLAY_TIME + text.length * 75;
            this.startAnimation(displayTime);
        }
    }), false);
    
    this.balloonDiv.style.cursor = "default";
},

abandonAllMessages: function()
{
    //dump("internoteBalloonUI.abandonAllMessages\n");
    
    this.abandonAnimation();
    this.messageQueue = [];
},

abandonAnimation: function()
{
    //dump("internoteBalloonUI.abandonAnimation\n");
    
    if (this.balloonAnimDriver != null)
    {
        this.balloonAnimDriver.abandonTimer();
        this.balloonAnimDriver = null;
    }
    
    if (this.hurryTimeout != null)
    {
        this.utils.cancelTimer(this.hurryTimeout);
        this.hurryTimeout = null;
    }
    
    this.resetPanel();
},

resetPanel: function()
{
    if (this.balloonPanel != null)
    {
        // It is much easier to destroy the panel than hide it and try to reuse it later,
        // due to the instrinsic height.
        this.balloonPanel.hidePopup();
        this.balloonPanel.parentNode.removeChild(this.balloonPanel);
        this.balloonPanel = null;
    }
    
    this.balloonDiv   = null;
},

onBalloonAnimComplete: function()
{
    //dump("internoteBalloonUI.onBalloonAnimComplete\n");
    
    this.balloonAnimDriver = null;
    this.resetPanel();
    this.messageQueue.shift();
    this.checkWhetherToShowMessage();
},

startAnimation: function(displayTime)
{
    var fadeAnimation = this.anim.getFadeAnimation(this.utils, this.balloonPanel, false);
    fadeAnimation.onComplete = this.utils.bind(this, this.onBalloonAnimComplete);
    
    this.balloonAnimDriver =
        new this.anim.AnimationDriver(this.utils, fadeAnimation);
    
    if (this.utils.supportsTranslucentPopups())
    {
        this.balloonAnimDriver.delayedStart(displayTime, this.FADE_OUT_TIME);
    }
    else
    {
        this.hurryTimeout = this.utils.createTimeout(this.utils.bind(this, function() {
            this.balloonAnimDriver.hurry();
        }), displayTime + this.FADE_OUT_TIME / 2);
    }
},

drawCanvas: function()
{
    var context = this.balloonCanvas.getContext("2d");
    
    var w = this.balloonCanvas.width;
    var h = this.balloonCanvas.height;
    var alpha = this.utils.supportsTranslucentPopups() ? 0.9 : 1.0;
    
    context.clearRect(0, 0, w, h);
    
    context.lineJoin    = "round";
    context.strokeStyle = "black";
    context.fillStyle   = "rgba(255, 255, 200, " + alpha + ")";
    context.lineWidth   = 2;
    
    var x1      = this.ROUNDED_CORNER_SIZE;
    var xMax    = w;
    var x2      = xMax - this.ROUNDED_CORNER_SIZE;
    var x3      = w    - this.DIAGONAL_WIDTH;
    var y1      = this.ROUNDED_CORNER_SIZE;
    var yMax    = h    - this.DIAGONAL_HEIGHT;
    var y2      = yMax - this.ROUNDED_CORNER_SIZE;
    var yBottom = h;
    
    context.beginPath();
    
    context.moveTo          (0,    y1);
    context.quadraticCurveTo(0,    0,
                             x1,   0);
    context.lineTo          (x2,   0);
    context.quadraticCurveTo(xMax, 0,
                             xMax, y1);
    context.lineTo          (xMax, yBottom);
    context.lineTo          (x3,   yMax);
    context.lineTo          (x1,   yMax);
    context.quadraticCurveTo(0,    yMax,
                             0,    y2);
    
    context.closePath();
    
    context.fill();
    context.stroke();
    
},

};
