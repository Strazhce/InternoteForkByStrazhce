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

var internoteAboutDlg =
{

init: function()
{
    this.utils = internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils;
    
    try
    {
        this.utils.init(window);
        this.utils.initSysInfo();
        
        var installRDF = this.utils.loadInstallRDF();
        
        if (installRDF != null)
        {
            var internoteVersion = this.utils.getInternoteVersion(installRDF);
            this.fixVersionNumber(internoteVersion);
            this.insertContributors(installRDF);
            this.fixDescription(installRDF);
        }
        else
        {
            this.removeContributors();
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when showing about dialog.", ex);
    }
},

getLocaleString: function(messageName)
{
    return this.utils.getLocaleString(document, messageName);
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

removeContributors: function()
{
    var contributorsBox = document.getElementById("contributors-group");
    
    this.utils.removeAllChildNodes(contributorsBox);
    
    var newNode = document.createElement("description");
    newNode.appendChild(document.createTextNode(this.getLocaleString("DataLoadError")));
    
    contributorsBox.appendChild(newNode);
},

openHomePage: function()
{
    this.utils.openURL("http://internote.sf.net/");
    document.getElementById("internoteAbout").acceptDialog();
},

};
