// Internote Extension
// About Dialog
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

Components.utils.import("resource://internotejs/internote-shared-global.jsm");

var internoteAboutDlg =
{

init: function()
{
    this.utils  = internoteUtilities;
    this.global = internoteSharedGlobal;
    
    internoteUtilities.init();
    
    this.em = this.utils.getCCService("@mozilla.org/extensions/manager;1", "nsIExtensionManager");
    
    var MY_ID = "{e3631030-7c02-11da-a72b-0800200c9a66}";
    var file = this.em.getInstallLocation(MY_ID).getItemFile(MY_ID, "install.rdf");
    
    if (file.exists())
    {
        var internoteVersion = null;
        
        try
        {
            var installRDF = this.utils.loadXML(file);
            internoteVersion = this.getInternoteVersion(installRDF);
            
            this.fixVersionNumber(internoteVersion);
            this.insertContributors(installRDF);
            this.fixDescription(installRDF);
        }
        catch (ex)
        {
            this.utils.handleException("Failure to load install.rdf for about dialog.", ex);
            this.removeContributors();
        }
        
        this.adjustErrorInfo(internoteVersion);
    }
    else
    {
        this.removeContributors();
    }
},

insertContributors: function(installRDF)
{
    this.insertContributorsSection(installRDF, "creator",     "creators"  );
    this.insertContributorsSection(installRDF, "developer",   "developers"  );
    this.insertContributorsSection(installRDF, "contributor", "contributors");
    this.insertContributorsSection(installRDF, "translator",  "translators" );
},

insertContributorsSection: function(installRDF, tagName, sectionID)
{
    const MOZ_RDF_URL = "http://www.mozilla.org/2004/em-rdf#";
    var developersElt = document.getElementById(sectionID);
    var peopleElts = installRDF.getElementsByTagName("em:" + tagName, MOZ_RDF_URL);
    
    for (var i = 0; i < peopleElts.length; i++)
    {
        var label = document.createElement("label");
        label.setAttribute("value", this.utils.trim(peopleElts[i].firstChild.data));
        label.setAttribute("class", "plain");
        label.setAttribute("style", "font-size: 0.8em;");
        developersElt.appendChild(label);
    }
},

fixVersionNumber: function(internoteVersion)
{
    document.getElementById("version-number").setAttribute("value", internoteVersion);
},

fixDescription: function(installRDF)
{
    var descElt = installRDF.getElementsByTagName("em:description", this.MOZ_RDF_URL)[0];
    var descText = descElt.firstChild.data;
    
    document.getElementById("app-description").setAttribute("value", descText);
},

getInternoteVersion: function(installRDF)
{
    var versionElt = installRDF.getElementsByTagName("em:version", this.MOZ_RDF_URL)[0];
    return versionElt.firstChild.data;
},

getExtensionList: function()
{
    try
    {
        var TYPE_EXTENSION = this.utils.getCIConstant("nsIUpdateItem", "TYPE_EXTENSION");
        var extensionCount = {};
        var extensions = this.em.getItemList(TYPE_EXTENSION, extensionCount);
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
    var xulAppInfo = this.utils.getCCService("@mozilla.org/xre/app-info;1", "nsIXULAppInfo");
    return xulAppInfo.name + " " + xulAppInfo.version;
},

adjustErrorInfo: function(internoteVersion)
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
        text = this.utils.trim(text);
        
        text = "Platform: "   + this.getPlatformString()           + "\n" +
               "Browser: "    + this.getBrowserString()            + "\n" +
               "Internote: "  + internoteVersion                   + "\n" +
               "Extensions: " + this.getExtensionList().join(", ") + "\n" +
               "Internal Errors/Warnings/Messages: " + ((text == "") ? "None" : "\n\n") +
               text;
        
        textBox.value = text;
    }
    catch (ex)
    {
        this.utils.handleException("Exception while trying to write dump data.", ex);
    }
},

removeContributors: function()
{
    var contributorsBox = document.getElementById("contributors-group");
    
    this.utils.removeAllChildNodes(contributorsBox);
    
    var newNode = document.createElement("description");
    newNode.appendChild(document.createTextNode(this.utils.getLocaleString("DataLoadError")));
    
    contributorsBox.appendChild(newNode);
},

copy: function()
{
    var text = document.getElementById("errors-text").value;
    var clipboardHelper = this.utils.getCCService("@mozilla.org/widget/clipboardhelper;1", "nsIClipboardHelper");
    clipboardHelper.copyString(text.replace(/\n/g, "\r\n"));
},

openHomePage: function()
{
    this.utils.openURL("http://internote.sf.net/");
    document.getElementById("internoteAbout").acceptDialog();
},

};
