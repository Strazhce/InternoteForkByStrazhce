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

// This file is used for determining the system info used by the about & bug-reporting dialogs.

Components.utils.import("resource://internotejs/internote-shared-global.jsm");

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils.incorporate("SysInfoUtils", {

// Initializes the Addon or Extension Manager, whichever is relevant to this FF version.
initSysInfo: function()
{
    var amExists = (this.addonManager     != null);
    var emExists = (this.extensionManager != null);
    
    // Make it idempotent.
    if (amExists || emExists)
    {
        return;
    }
    
    try
    {
        Components.utils.import("resource://gre/modules/AddonManager.jsm");
        this.assertError(typeof(AddonManager) != "undefined", "Addon manager doesn't exist.");
        this.addonManager = AddonManager;
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
            this.handleException("Exception caught when initializing addon/extension manager.", ex);
        }
    }
},

// Load the install.rdf file, returning it to the callback.
loadInstallRDF: function(callback)
{
    if (this.addonManager != null)
    {
        this.loadAMInstallRDF(callback);
    }
    else if (this.extensionManager != null)
    {
        this.loadEMInstallRDF(callback);
    }
    else
    {
        this.utils.assertErrorNotHere("Couldn't get AM/EM to load install.rdf.");
        callback(null);
    }
},

// Load the install.rdf file using the FF4 addon manager, asychronously returning it to the callback.
loadAMInstallRDF: function(callback)
{
    const MY_ID = this.consts.MY_ID;
    const INSTALL_RDF = "install.rdf";
    
    // XXX Rename .xml -> .installRDFXML
    if (this.xml != null)
    {
        // It's already been loaded previously.
        callback(this.xml);
    }
    else
    {
        // Asynchronously call the addon manager.
        this.addonManager.getAddonByID(MY_ID, this.bind(this, function(addon) {
            try
            {
                // Load the file, whether it is packed into an XPI or unpacked.
                var ioService = this.getCCService("@mozilla.org/network/io-service;1", "nsIIOService");
                var uri = addon.getResourceURI("install.rdf");
                var stream = ioService.newChannelFromURI(uri).open();
                this.xml = this.loadXMLFromStream(stream);
                callback(this.xml);
            }
            catch (ex)
            {
                this.handleException("Failed to get addon.", ex);
                callback(null);
            }
        }));
    }
},

// Load the install.rdf file using the FF3 extension manager, immediately returning it to the callback.
loadEMInstallRDF: function(callback)
{
    const MY_ID = this.consts.MY_ID;
    const INSTALL_RDF = "install.rdf";
    
    var file = this.extensionManager.getInstallLocation(MY_ID).getItemFile(MY_ID, INSTALL_RDF);
    
    if (file.exists())
    {
        try
        {
            var xml = this.loadXMLFromFile(file);
            callback(xml);
        }
        catch (ex)
        {
            this.handleException("Failed to load install.rdf.", ex);
            callback(null);
        }
    }
    else
    {
        this.assertWarnNotHere("Failed to find install.rdf.");
        callback(null);
    }
},

// Get the internote version from the supplied parsed "install.rdf".
getInternoteVersion: function(installRDF)
{
    var versionElt = installRDF.getElementsByTagName("em:version", this.MOZ_RDF_URL)[0];
    return versionElt.firstChild.data;
},

// Get the list of extensions that are installed and passed them to the callback.
// This is used to detect possible conflicts between extensions.
getExtensionList: function(callback)
{
    if (this.addonManager != null)
    {
        this.getAMExtensionList(callback);
    }
    else if (this.extensionManager != null)
    {
        this.getEMExtensionList(callback);
    }
    else
    {
        this.utils.assertErrorNotHere("Couldn't get AM/EM to get extension list.");
        return ["Couldn't get AM/EM."];
    }
},

// Gets the list of extensions that are installed from the FF4 addon manager and asychronously
// passes them to the callback. Only returns enabled & compatible extensions.
getAMExtensionList: function(callback)
{
    this.addonManager.getAllAddons(this.bind(this, function(addons) {
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

// Gets the list of extensions that are installed from the FF3 extension manager and immediately
// passes them to the callback. Will include disabled & incompatible extensions as there doesn't
// seem to be a way to exclude them in FF3.
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

// Get the user's platform.
getPlatformString: function()
{
    return this.navigator.platform + " (" + this.navigator.oscpu + ")";
},

// Get the user's browser.
getBrowserString: function()
{
    var xulAppInfo = this.getCCService("@mozilla.org/xre/app-info;1", "nsIXULAppInfo");
    return xulAppInfo.name + " " + xulAppInfo.version;
},

// Combine all the system info together into one string.
// XXX Rename -> getSystemInfo
getErrorInfo: function(internoteVersion, callback)
{
    try
    {
        this.getExtensionList(this.bind(this, function(extensionDescs)
        {
            var extensionText = extensionDescs.join(", ");
            
            var text = "";
            for (var i = 0; i < this.sharedGlobal.dumpData.length; i++)
            {
                text += this.sharedGlobal.dumpData[i];
            }
            
            text = text.replace(/\n\n\n+/g, "\n\n");
            text = this.trim(text);
            
            text = "Platform: "   + this.getPlatformString() + "\n" +
                   "Browser: "    + this.getBrowserString()  + "\n" +
                   "Internote: "  + internoteVersion         + "\n" +
                   "Locale: "     + this.getGeneralCharPref("general.useragent.locale") + "\n" +
                   "Theme: "      + this.getGeneralCharPref("general.skins.selectedSkin") + "\n" +
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
