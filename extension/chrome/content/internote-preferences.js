// Internote Extension
// Preferences Back End
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

if (internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.prefs == null)
{

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.prefs =
{

IN_PLACE_MODE: 0,

initConnections: function(sharedGlobal)
{
    this.utils  = sharedGlobal.utils;
    this.consts = sharedGlobal.consts;
},

init: function()
{
    if (this.prefsBranch == null)
    {
        this.prefsBranch = this.utils.getCCService("@mozilla.org/preferences-service;1", "nsIPrefService").getBranch("internote.");
    }
    
    var colorIndex = this.getDefaultNoteColor();
    if (this.utils.isNaturalString(colorIndex))
    {
        this.setCharPref("defaultnotecolor", this.consts.DEFAULT_NOTE_PALETTE[colorIndex]);
    }

    colorIndex = this.getDefaultTextColor();
    if (this.utils.isNaturalString(colorIndex))
    {
        this.setCharPref("defaulttextcolor", this.consts.DEFAULT_TEXT_PALETTE[colorIndex]);
    }
},

getBoolPref: function(prefName, defaultValue)
{
    if (this.prefsBranch.getPrefType(prefName) != 0)
    {
        if (this.prefsBranch.getBoolPref(prefName))
            return true;
        else
            return false;
    }
    else
    {
        return defaultValue;
    }
},

getOptionalBoolPref: function(prefName)
{
    if (this.prefsBranch.getPrefType(prefName) != 0)
    {
        if (this.prefsBranch.getBoolPref(prefName))
            return true;
        else
            return false;
    }
    else
    {
        return null;
    }
},

getCharPref: function(prefName, defaultValue)
{
    if (this.prefsBranch.getPrefType(prefName) !=0)
    {
        return this.prefsBranch.getCharPref(prefName);
    }
    else
    {
        return defaultValue;
    }
},

getI18NStringPref: function(prefName, defaultValue)
{
    if (this.prefsBranch.getPrefType(prefName) !=0)
    {
        var nsISupportsString = this.utils.getCIInterface("nsISupportsString");
        return this.prefsBranch.getComplexValue("savelocation", nsISupportsString).data;
    }
    else
    {
        return defaultValue;
    }
},

getEnumPref: function(prefName, defaultValue, maxValue)
{
    if (this.prefsBranch.getPrefType(prefName) !=0)
    {
        var prefValue = this.prefsBranch.getCharPref(prefName);
        if (prefValue.match(/^[0-9]+$/))
        {
            var num = parseInt(prefValue, 10);
            if (0 <= num && num <= maxValue)
            {
                return num;
            }
        }
    }
    return defaultValue;
},

getFontSize : function()
{
    if (this.prefsBranch.getPrefType("fontsize") !=0)
    {
        var defaultFontSize = this.prefsBranch.getCharPref("fontsize");
        if (defaultFontSize == "10") return 10;
        if (defaultFontSize == "12") return 12;
        if (defaultFontSize == "14") return 14;
        if (defaultFontSize == "16") return 16;
        if (defaultFontSize == "18") return 18;
        return this.prefsBranch.getCharPref("fontsize");
    }
    else
    {
        return 12;
    }
},

setCharPref: function(prefName, newValue)
{
    this.utils.assertError(this.prefsBranch.getPrefType(prefName) == this.prefsBranch.PREF_STRING, "Not an char pref.", prefName);
    this.prefsBranch.setCharPref(prefName, "" + newValue);
},

setEnumPref: function(prefName, newValue)
{
    this.utils.assertError(this.prefsBranch.getPrefType(prefName) == this.prefsBranch.PREF_STRING, "Not an enum pref.", prefName);
    this.prefsBranch.setCharPref(prefName, "" + newValue);
},

setBoolPref: function(prefName, newValue)
{
    this.utils.assertError(this.utils.isBoolean(newValue), "Setting bool pref to non-bool.", newValue);
    this.utils.assertError(this.prefsBranch.getPrefType(prefName) == this.prefsBranch.PREF_BOOL, "Not a boolean pref.", prefName);
    this.prefsBranch.setBoolPref(prefName, newValue);
},

shouldUseStatusbar      : function() { return this.getBoolPref("usestatusbar",    true ); },
shouldUseTransparency   : function() { return this.getBoolPref("transparency",    false); },
shouldAllowHighlighting : function() { return this.getBoolPref("highlightable",   false); },
shouldUseNativeScrollbar: function() { return this.getBoolPref("usenativescroll", false); },
shouldUseOtherSaveLoc   : function() { return this.getBoolPref("changelocation",  false); },
shouldAskBeforeDelete   : function() { return this.getBoolPref("askbeforedelete", false); },

// Hidden Prefencences
isInDebugMode:              function() { return this.getBoolPref("debugmode", false); },
shouldCombineScrollButtons: function() { return this.getOptionalBoolPref("usecombinedscrollbuttons"); },
shouldLeftAlignTopButtons:  function() { return this.getOptionalBoolPref("useleftalignedtopbuttons"); },

getSaveLocationPref: function()
{
    if (this.shouldUseOtherSaveLoc())
    {
        return this.getI18NStringPref("savelocation", "");
    }
    else
    {
        return "";
    }
},

getModifiedSaveLocation: function()
{
    var loc = this.getSaveLocationPref();
    return this.utils.getFileOrNull(loc);
},

// XXX Demagic
getDefaultSize      : function() { return this.getEnumPref("defaultsize",      0, 3); },
getDefaultPosition  : function() { return this.getEnumPref("defaultposition",  0, 4); },
getMinimizedPos     : function() { return this.getEnumPref("minimizedpos",     4, 8); },

getNoteColor: function(i) { return this.getCharPref("notecolor" + i, this.consts.DEFAULT_NOTE_PALETTE[i]); },
getTextColor: function(i) { return this.getCharPref("textcolor" + i, this.consts.DEFAULT_TEXT_PALETTE[i]); },

getDefaultNoteColor: function() { return this.getCharPref("defaultnotecolor", this.consts.DEFAULT_NOTE_PALETTE[0]); },
getDefaultTextColor: function() { return this.getCharPref("defaulttextcolor", this.consts.DEFAULT_TEXT_PALETTE[0]); },

detectFirstRun : function()
{
    if (this.prefsBranch.getPrefType("firstrun") != 0)
    {
        if (!this.prefsBranch.getBoolPref("firstrun"))
        {
            this.prefsBranch.setBoolPref("firstrun", true);
            return true;
        }
        else
        {
            return false;
        }
    }
    
    this.prefsBranch.setBoolPref("firstrun", true);
    return true;
},

setSaveLocationPref: function(path)
{
    if (path == null || path == "")
    {
        this.prefsBranch.setBoolPref("changelocation", false)
        this.prefsBranch.setCharPref("savelocation", "");
    }
    else
    {
        this.prefsBranch.setBoolPref("changelocation", true);
        this.prefsBranch.setCharPref("savelocation", path);
    }
},

setAskBeforeDelete: function(isSet)
{
    this.setBoolPref("askbeforedelete", isSet);
},

setDefaultColors: function(foreColor, backColor)
{
    this.utils.assertError(this.utils.isHexColor(foreColor), "Invalid foreground color.", foreColor);
    this.utils.assertError(this.utils.isHexColor(backColor), "Invalid background color.", backColor);
    
    var foreColorNum = this.consts.TEXT_COLORS.indexOf(foreColor);
    var backColorNum = this.consts.NOTE_COLORS.indexOf(backColor);
    
    if (foreColorNum >= 0 && backColorNum >= 0)
    {
        // XXX Should probably update prefs dialog by observation.
        this.setCharPref("defaulttextcolor", foreColorNum);
        this.setCharPref("defaultnotecolor", backColorNum);
    }
    else
    {
        this.assertWarnNotHere("Attempt to set custom colors as defaults.");
    }
},

addPrefsObserver: function(observeFunc)
{
    this.prefsBranch.QueryInterface(this.utils.getCIInterface("nsIPrefBranch2"));
    this.prefsBranch.addObserver("", {observe: observeFunc}, false);
},

};

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.prefs.initConnections(internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66);

}
