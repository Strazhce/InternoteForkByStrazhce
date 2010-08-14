// Internote Extension
// Preferences Dialog Controller
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

var internotePrefsDialog =
{

init: function()
{
    this.utils = internoteUtilities;
    this.prefs = internotePreferences;
    
    this.utils.init();
    this.prefs.init(this.utils);
    
    document.getElementById("saveFolderField").value = this.prefs.getSaveLocationPref();
    
    this.alternativeLocationCheckbox = document.getElementById("alternativeLocationCheckbox");
    this.saveFolderField             = document.getElementById("saveFolderField");
    this.chooseFolderButton          = document.getElementById("chooseFolder");
    
    this.alternativeLocationCheckbox.checked = this.prefs.shouldUseOtherSaveLoc();
    this.saveFolderField            .value   = this.prefs.getSaveLocationPref();
    
    this.utils.addBoundDOMEventListener(this.alternativeLocationCheckbox, "click",   this, "userTogglesLocationCheckbox", false);
    this.utils.addBoundDOMEventListener(this.chooseFolderButton,          "command", this, "userSetsSaveLocation",      false);
    
    var useAlternativeLocation = this.alternativeLocationCheckbox.checked;
    this.saveFolderField   .disabled = useAlternativeLocation ? "" : "true";
    this.chooseFolderButton.disabled = useAlternativeLocation ? "" : "true";
},

onAccept: function()
{
    try
    {
        if (!this.alternativeLocationCheckbox.checked || this.saveFolderField.value == "")
        {
            this.prefs.setSaveLocationPref(null);
            return true;
        }
        else
        {
            var dir = this.utils.getFile(this.saveFolderField.value);
            
            if (!dir.exists())
            {
                alert(this.utils.getLocaleString("DirDoesntExistError"));
                return false;
            }
            else
            {
                this.prefs.setSaveLocationPref(this.saveFolderField.value);
                return true;
            }
        }
    }
    catch (ex)
    {
        this.utils.handleException("Error validating storage directory.", ex);
        alert(this.utils.getLocaleString("DirDoesntExistError"));
        return false;
    }
},

userSetsSaveLocation: function ()
{
    try
    {
        const nsIFilePicker = this.utils.getCIInterface("nsIFilePicker");
        
        var picker = this.utils.getCCInstance("@mozilla.org/filepicker;1", "nsIFilePicker");
        var title = this.utils.getLocaleString("ChooseLocation");
        picker.init(window, title, nsIFilePicker.modeGetFolder);
        
        if (this.prefs.shouldUseOtherSaveLoc())
        {
            picker.displayDirectory = this.utils.getModifiedSaveLocation();
        }
        
        picker.appendFilters(nsIFilePicker.filterAll);
        
        if (picker.show() == nsIFilePicker.returnOK)
        {
            var saveDir = picker.file.QueryInterface(this.utils.getCIInterface("nsILocalFile"));
            this.saveFolderField.value = saveDir.path;
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when user attempts to set save location.", ex);
    }
},

userTogglesLocationCheckbox: function(ev)
{
    try
    {
        if (this.alternativeLocationCheckbox.checked)
        {
            this.saveFolderField.disabled = "";
            this.chooseFolderButton.disabled = "";
        }
        else
        {
            this.saveFolderField.value = "";
            this.saveFolderField.disabled = "true";
            this.chooseFolderButton.disabled = "true";
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when user attempts to toggle location checkbox.", ex);
    }
},

};
