// Internote Extension
// System Information Gathering Utilities
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

// This file is used for filling in the about dialog and reporting bugs.

Components.utils.import("resource://internotejs/internote-shared-global.jsm");

internoteUtilities.incorporate({

getExtensionManager: function()
{
    return this.getCCService("@mozilla.org/extensions/manager;1", "nsIExtensionManager");
},

loadInstallRDF: function(em)
{
    var MY_ID = "{e3631030-7c02-11da-a72b-0800200c9a66}";
    var file = em.getInstallLocation(MY_ID).getItemFile(MY_ID, "install.rdf");
    
    if (file.exists())
    {
        try
        {
            return this.loadXML(file);
        }
        catch (ex)
        {
            this.handleException("Failed to load install.rdf.", ex);
            return null;
        }
    }
    else
    {
        this.assertErrorNotHere("Failed to find install.rdf.");
        return null;
    }
},

getInternoteVersion: function(installRDF)
{
    var versionElt = installRDF.getElementsByTagName("em:version", this.MOZ_RDF_URL)[0];
    return versionElt.firstChild.data;
},

getExtensionList: function(em)
{
    try
    {
        var TYPE_EXTENSION = this.getCIConstant("nsIUpdateItem", "TYPE_EXTENSION");
        var extensionCount = {};
        var extensions = em.getItemList(TYPE_EXTENSION, extensionCount);
        return extensions.map(function(ext) { return ext.name + " [" + ext.version + "]"; });
    }
    catch (ex)
    {
        return ["Exception " + ex];
    }
},

getPlatformString: function()
{
    return navigator.platform + " (" + navigator.oscpu + ")";
},

getBrowserString: function()
{
    var xulAppInfo = this.getCCService("@mozilla.org/xre/app-info;1", "nsIXULAppInfo");
    return xulAppInfo.name + " " + xulAppInfo.version;
},

getErrorInfo: function(em, internoteVersion)
{
    try
    {
        var textBox = document.getElementById("errors-text");
        textBox.readOnly = true;
        //textBox.style.backgroundColor = "transparent";
        
        var text = "";
        for (var i = 0; i < this.global.dumpData.length; i++)
        {
            text += this.global.dumpData[i];
        }
        
        text = text.replace(/\n\n\n+/g, "\n\n");
        text = this.trim(text);
        
        text = "Platform: "   + this.getPlatformString()             + "\n" +
               "Browser: "    + this.getBrowserString()              + "\n" +
               "Internote: "  + internoteVersion                     + "\n" +
               "Extensions: " + this.getExtensionList(em).join(", ") + "\n\n" +
               "Internal Errors/Warnings/Messages: " + ((text == "") ? "None" : "\n\n") +
               text;
        
        return text;
    }
    catch (ex)
    {
        this.handleException("Exception while trying to write dump data.", ex);
        return "???";
    }
},

});
