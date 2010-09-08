// Internote Extension
// Bug Reporting Dialog
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

// XXX Any way to initialise near startup to handle the mysterious Firefox failures?

var internoteBugReportDlg =
{

init: function()
{
    this.utils  = internoteUtilities;
    this.consts = internoteConstants;
    
    try
    {
        this.utils.init();
        this.utils.initSysInfo();
        
        var installRDF = this.utils.loadInstallRDF();
        
        if (installRDF != null)
        {
            this.internoteVersion = this.utils.getInternoteVersion(installRDF);
            this.adjustErrorInfo(this.internoteVersion);
        }

        var textBox = document.getElementById("errors-text");
        textBox.readOnly = true;
        
        var extraInfo = document.getElementById("extra-info");
        extraInfo.focus();
        
        addEventListener("message", this.utils.bind(this, function(event) {
            if (event.origin == "chrome://browser" && event.data == "reload")
            {
                this.adjustErrorInfo(this.internoteVersion);
            }
        }), true);        
    }
    catch (ex)
    {
        try
        {
            internoteUtilities.handleException("The bug reporting dialog failed to initialise.", ex);
            alert("The bug reporting dialog failed to initialise."); // XXX Fix
        }
        catch (ex2)
        {
            alert("The bug reporting dialog failed to initialise.");
        }
    }
},

adjustErrorInfo: function(internoteVersion)
{
    var textBox = document.getElementById("errors-text");
    
    this.utils.getErrorInfo(internoteVersion, function(errorInfo)
    {
        textBox.value = errorInfo;
    });
},

openBugPage: function()
{
    try
    {
        this.utils.openURL(this.consts.BUGS_PAGE);
    }
    catch (ex)
    {
        alert(ex);
        this.utils.handleException("Caught exception while opening URL.", ex);
    }
},

openDisclosure: function()
{
    var disclosure = document.getElementById("disclosure");
    var expanded   = document.getElementById("expanded");
    
    var isOpen = (disclosure.getAttribute("open") == "true");
    disclosure.setAttribute("open",      isOpen ? "false" : "true" );
    expanded  .setAttribute("collapsed", isOpen ? "true"  : "false");
},

copy: function()
{
    //var email = this.utils.trim(document.getElementById("email").value);
    var info  = this.utils.trim(document.getElementById("extra-info").value);
    var auto  = this.utils.trim(document.getElementById("errors-text").value);
    
    var combinedText = 
                       /* ((email != "") ? ("Email: " + email + "\n\n") : "No Email\n\n") + */
                       ((info != "") ? ("Info:\n" + info + "\n\n") : "No Extra Info\n\n") +
                       ("Auto Info:\n" + auto + "\n");
        
    var clipboardHelper = this.utils.getCCService("@mozilla.org/widget/clipboardhelper;1", "nsIClipboardHelper");
    clipboardHelper.copyString(combinedText.replace(/\n/g, "\r\n"));
},

};
