// Internote Extension
// Popup Utilities
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

createShiftingPanel: function(suffix, containee)
{
    var popupPanel = document.createElement("panel");
    popupPanel.setAttribute("id", "internote-popup" + suffix);
    // -moz-appearance seems to be necessary on Linux/Mac but not Windows.
    popupPanel.setAttribute("style", "background-color: transparent; border: none; -moz-appearance: none; -moz-window-shadow: none;");
    popupPanel.setAttribute("noautohide", "true");
    
    // We need this stack because you can position in stacks but not panels.
    container = document.createElement("stack");
    container.setAttribute("id", "internote-shiftcontainer" + suffix);
    container.setAttribute("style", "overflow: hidden; background-color: transparent;");
    
    var myBody = document.getElementById("main-window");
    myBody.appendChild(popupPanel);
    popupPanel.appendChild(container);
    container.appendChild(containee);    
    
    return popupPanel;
},

shiftShiftingPanel: function(popupPanel, offset)
{
    var containee = popupPanel.firstChild.firstChild;
    
    [containee.left, containee.top] = offset;
},

resizeShiftingPanel: function(popupPanel, dims)
{
    var container = popupPanel.firstChild;
    var containee = container.firstChild;
    
    this.fixDOMEltDims(container, dims);
    //this.fixDOMEltDims(containee, dims);
},

getShiftingPanelOffset: function(popupPanel)
{
    var containee = popupPanel.firstChild.firstChild;
    return [containee.left, containee.top];
},

getShiftingPanelContainee: function(popupPanel)
{
    return popupPanel.firstChild.firstChild;
},

restrictRectToScreen: function(browser, rect)
{
    const WINDOW_MAXIMIZED = 1;
    
    var screenWidth  = window.screen.availWidth;
    var screenHeight = window.screen.availHeight;
    
    if (this.getPlatform() == "win")
    {
        // Some quirky aspects of (at least) Windows mess up moving the window close to but not going
        // off-screen to the right, top half of it, or the bottom.  These are worked around by subtracting
        // 4 pixels below, which would seem to be the size of Windows's resize border.
        var shouldUseWorkaround = false;
        
        if (window.windowState != WINDOW_MAXIMIZED)
        {
            shouldUseWorkaround = true;
        }
        else
        {
            // A full-sized popup seems to work when maximized, as long as the popup extends
            // below 110 pixels above the bottom of the screen, which would normally be the case but
            // we just check just in case there's overlaid chrome there raising the viewport bottom.
            //var boxBottom = browser.boxObject.screenY + this.outerContainer.boxObject.height - 1;
            shouldUseWorkaround = (rect.bottomRight[1] <= (screenHeight - 110));
        }
        
        if (shouldUseWorkaround)
        {
            //dump("  Activated screen size workaround.\n");
            
            var WINDOW_BORDER_SIZE = 4;
            screenWidth -= WINDOW_BORDER_SIZE;
            screenHeight -= WINDOW_BORDER_SIZE;
        }
        else
        {
            // This seems necessary too but probably shouldn't matter in practice, due to the status
            // bar ... I only saw it due to other bugs.
            screenHeight -= 3;
        }
    }
    
    // Don't assume we're on the main monitor!
    var screenTopLeft = [window.screen.availLeft, window.screen.availTop];
    
    var screenRect = this.makeRectFromDims(screenTopLeft, [screenWidth, screenHeight]);
    return this.getRectIntersection(rect, screenRect);
},
    
});
