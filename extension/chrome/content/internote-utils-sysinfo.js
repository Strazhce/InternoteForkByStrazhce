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

initSysInfo: function()
{
    try
    {
        Components.utils.import("resource://gre/modules/AddonManager.jsm");
        this.assertError(typeof(AddonManager) != "undefined", "Addon manager doesn't exist.");
    }
    catch (ex)
    {
        if (ex.name == "NS_ERROR_FILE_NOT_FOUND")
        {
            this.extensionManager = this.getCCService("@mozilla.org/extensions/manager;1", "nsIExtensionManager");
            this.assertError(this.extensionManager != null, "Unable to initialize system info.");
        }
        else
        {
            this.handleException("Exception caught when initializing addon manager.", ex);
        }    
    }
    
    this.MY_ID = "{e3631030-7c02-11da-a72b-0800200c9a66}";
},

loadInstallRDF: function()
{
    var file = this.getInstallRDFLocation();
    
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
        this.assertWarnNotHere("Failed to find install.rdf.");
        return null;
    }
},

getInternoteVersion: function(installRDF)
{
    var versionElt = installRDF.getElementsByTagName("em:version", this.MOZ_RDF_URL)[0];
    return versionElt.firstChild.data;
},

getInstallRDFLocation: function()
{
    if (this.extensionManager != null)
    {
        return this.extensionManager.getInstallLocation(this.MY_ID).getItemFile(this.MY_ID, "install.rdf");
    }
    else
    {
        // XXX Support a better method for FF4 if and when mozilla does.
        var dirService = this.getCCService("@mozilla.org/file/directory_service;1", "nsIProperties");
        var file = dirService.get("ProfD", this.getCIInterface("nsIFile"));
        file.append("extensions");
        file.append(this.MY_ID);
        file.append("install.rdf");
        return file;
    }
},

getExtensionList: function(callback)
{
    if (this.extensionManager != null)
    {
        this.getEMExtensionList(callback);
    }
    else
    {
        this.getAMExtensionList(callback);
    }
},

getAMExtensionList: function(callback)
{
    AddonManager.getAllAddons(this.bind(this, function(addons) {
        try
        {
            var activeExtensions = addons.filter(function(addon)
            {
                return addon.type == "extension" && addon.isActive && addon.isCompatible;
            });
            
            var extensionDescs = activeExtensions.map(function(addon)
            {
                return addon.name + " [" + addon.version + "]";
            });
        }
        catch (ex)
        {
            var extensionDescs = ["Exception " + ex];
        }
        
        callback.call(this, extensionDescs);
    }));
},

getEMExtensionList: function(callback)
{
    try
    {
        var TYPE_EXTENSION = this.getCIConstant("nsIUpdateItem", "TYPE_EXTENSION");
        var extensionCount = {}; // Unused.
        var extensions = this.extensionManager.getItemList(TYPE_EXTENSION, extensionCount);
        var extensionDescs = extensions.map(function(ext) { return ext.name + " [" + ext.version + "]"; });
    }
    catch (ex)
    {
        var extensionDescs = ["Exception " + ex];
    }
    
    callback.call(this, extensionDescs);
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

getErrorInfo: function(internoteVersion, callback)
{
    try
    {
        this.getExtensionList(this.bind(this, function(extensionDescs)
        {
            var extensionText = extensionDescs.join(", ");
            
            var text = "";
            for (var i = 0; i < this.global.dumpData.length; i++)
            {
                text += this.global.dumpData[i];
            }
            
            text = text.replace(/\n\n\n+/g, "\n\n");
            text = this.trim(text);
            
            text = "Platform: "   + this.getPlatformString() + "\n" +
                   "Browser: "    + this.getBrowserString()  + "\n" +
                   "Internote: "  + internoteVersion         + "\n" +
                   "Extensions: " + extensionText            + "\n\n" +
                   "Internal Errors/Warnings/Messages: " + ((text == "") ? "None" : "\n\n") +
                   text;
            
            callback.call(this, text);
        }));
    }
    catch (ex)
    {
        this.handleException("Exception while trying to write dump data.", ex);
    }
},

});
