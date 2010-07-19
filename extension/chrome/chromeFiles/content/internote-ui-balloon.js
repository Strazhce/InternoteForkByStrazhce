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
BALLOON_WIDTH: 220,
BALLOON_HEIGHT: 60,

init: function(utils, anim, id, container)
{
    this.utils     = utils;
    this.anim      = anim;
    this.id        = id;
    this.container = container;
    
    this.STANDARD_MARGIN = Math.floor(this.ROUNDED_CORNER_SIZE / 2);
},

popup: function(text)
{
    this.abandonAnimation();
    
    this.balloonPanel = document.createElement("panel");
    this.balloonPanel.setAttribute("style", "background-color: transparent; border: none;");
    this.balloonPanel.setAttribute("id", this.id);
    this.balloonPanel.setAttribute("noautohide", "true");
    
    var mainStack = document.createElement("stack");
    mainStack.flex = "1";
    this.utils.fixDOMEltWidth(this.balloonPanel, this.BALLOON_WIDTH);
    
    this.balloonCanvas = this.utils.createHTMLElement("canvas");
    
    this.balloonCanvas.setAttribute("style", "border: none; margin: 0px; padding: 0px;");
    this.balloonCanvas.height = 1; // we can work out the correct height when the popup shows
    this.balloonCanvas.width  = this.BALLOON_WIDTH;
    
    this.balloonDiv = this.utils.createHTMLElement("div");
    this.balloonDiv.setAttribute("style", "font-size: 10pt; border: none; margin: 0px;");
    this.balloonDiv.style.marginLeft   = this.STANDARD_MARGIN + "px";
    this.balloonDiv.style.marginRight  = this.STANDARD_MARGIN + "px";
    this.balloonDiv.style.marginTop    = this.STANDARD_MARGIN + "px";
    this.balloonDiv.style.marginBottom = (this.STANDARD_MARGIN + this.DIAGONAL_HEIGHT) + "px";
    this.balloonDiv.style.cursor       = "pointer";
    
    this.balloonDiv.appendChild(document.createTextNode(text));
    
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
        this.startAnimation(this.MIN_DISPLAY_TIME + text.length * 100);
    }), false);
    
    this.balloonPanel.addEventListener("click", this.utils.bind(this, function()
    {
        if (!this.balloonAnimDriver.isStarted)
        {
            this.balloonAnimDriver.start();
        }        
    }), false);
},

abandonAnimation: function()
{
    if (this.balloonAnimDriver != null)
    {
        this.balloonAnimDriver.abandonTimer();
        this.balloonAnimDriver = null;
    }
    
    this.resetPanel();
},

resetPanel: function()
{
    if (this.balloonPanel != null)
    {
        // It is much easier to destroy the panel than hide it and try to reuse it later,
        // due to the instrinsic height.
        this.balloonPanel.parentNode.removeChild(this.balloonPanel);
        this.balloonPanel = null;
    }
    
    this.balloonDiv   = null;
},

onBalloonAnimComplete: function()
{
    this.balloonAnimDriver = null;
    this.resetPanel();
},

startAnimation: function(displayTime)
{
    var fadeAnimation = this.anim.getFadeAnimation(this.utils, this.balloonPanel, false);
    fadeAnimation.onComplete = this.utils.bind(this, this.onBalloonAnimComplete);
    
    this.balloonAnimDriver =
        new this.anim.AnimationDriver(this.utils, fadeAnimation, this.FADE_OUT_TIME);
    this.balloonAnimDriver.delayedStart(displayTime);
},

drawCanvas: function()
{
    var context = this.balloonCanvas.getContext("2d");
    
    var w = this.balloonCanvas.width;
    var h = this.balloonCanvas.height;
    
    context.clearRect(0, 0, w, h);
    
    context.lineJoin    = "round";
    context.strokeStyle = "black";
    context.fillStyle   = "rgba(255, 255, 200, 0.9)";
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
