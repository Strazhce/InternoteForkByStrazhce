// Internote Extension
// Platform Detection Utilities
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

// This file contains various checks for platform-specific issues. 

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils.incorporate("PlatformUtils", {

// PUBLIC: Returns the platform.
getPlatform: function()
{
    var platform = new String(this.navigator.platform);
    var platString = "";
    if (!platform.search(/^Mac/))
    {
       return "mac";
    }
    else if (!platform.search(/^Win/))
    {
       return "win";
    }
    else
    {
       return "unix";
    }
},

// PUBLIC: Returns whether this platform supports transparent popups (panels).
supportsTranslucentPopups: function()
{
    var platform = this.getPlatform();
    if (platform == "win" || platform == "mac")
    {
        return true;
    }
    else if (platform == "unix")
    {
        return false;
    }
    else
    {
        this.assertWarnNotHere("Unknown platform when testing translucent popups.", platform);
        return false;
    }
},

// PUBLIC: Returns whether this platform allows interacting with the web page
// thru a transparent popup (panel).
// XXX Report this bug.
supportsTransparentClickThru: function()
{
    var platform = this.getPlatform();
    if (platform == "win" || platform == "unix")
    {
        return true;
    }
    else if (platform == "mac")
    {
        return false;
    }
    else
    {
        this.assertWarnNotHere("Unknown platform when testing transparent clickthru.", platform);
        return false;
    }
},

// PUBLIC: Returns whether this platform has bugs that prevent the popup pane Display UI from working.
// XXX Report these bugs.
hasPopupBugs: function()
{
    var platform = this.getPlatform();
    if (platform == "unix")
    {
        return true;
    }
    else if (platform == "mac" || platform == "win")
    {
        return false;
    }
    else
    {
        this.assertWarnNotHere("Unknown platform when whether plaform has popup bugs.", platform);
        return true;
    }
},

// PUBLIC: Returns whether this platform has a browser stack for displaying chrome over content (ie FF4).
hasBrowserStack: function(browser)
{
    return browser.parentNode.localName == "stack";
},

// PUBLIC: Returns whether to center the minimize icon (ie on Mac).
hasMinimizeIconCentered: function()
{
    return this.getPlatform() == "mac";
},

// PUBLIC: Returns whether to draw the scrollbar buttons together (ie on Mac).
hasCombinedScrollButtons: function()
{
    return this.getPlatform() == "mac";
},

// PUBLIC: Returns whether to left-align the top buttons of notes (ie on Mac).
hasLeftAlignedTopButtons: function()
{
    return this.getPlatform() == "mac";
},

});
