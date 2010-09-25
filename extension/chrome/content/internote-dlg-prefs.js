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
    this.utils = internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils;
    this.prefs = internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.prefs;
    
    this.utils.init(window);
    this.prefs.init();
    
    this.alternativeLocationCheckbox = document.getElementById("alternativeLocationCheckbox");
    this.saveLocationField           = document.getElementById("saveLocationField");
    this.chooseFolderButton          = document.getElementById("chooseFolder");
    
    this.utils.addBoundDOMEventListener(this.alternativeLocationCheckbox, "click",   this, "userTogglesLocationCheckbox", false);
    this.utils.addBoundDOMEventListener(this.chooseFolderButton,          "command", this, "userBrowsesSaveLocation",     false);
    
    this.userTogglesLocationCheckbox();
    this.checkSaveLocation();
},

getLocaleString: function(messageName)
{
    return this.utils.getLocaleString(document, messageName);
},

onAccept: function()
{
    try
    {
        if (!this.alternativeLocationCheckbox.checked)
        {
            return true;
        }
        else
        {
            var saveLocation = this.saveLocationField.value;
            var dir = this.utils.getFileOrNull(saveLocation);
            var dirExists = (dir != null && dir.exists());
            
            if (!dirExists)
            {
				this.utils.alert(window, "DirDoesntExistError", "DirDoesntExistTitle");
            }
            
            return dirExists;
        }
    }
    catch (ex)
    {
        this.utils.handleException("Error validating storage directory.", ex);
        return false;
    }
},

checkSaveLocation: function()
{
    try
    {
        if (this.alternativeLocationCheckbox.checked)
        {
            var saveLocation = this.saveLocationField.value;
            var dir = this.utils.getFileOrNull(saveLocation);
            var dirExists = (dir != null && dir.exists());
            
            var notificationBox = document.getElementById("saveLocationWarning");
            var warningExists = (notificationBox.currentNotification != null);
            
            if (dirExists && warningExists)
            {
                notificationBox.removeAllNotifications();
            }
            else if (!dirExists && !warningExists)
            {
                var message = this.getLocaleString("DirDoesntExistError");
                notificationBox.appendNotification(message, "direrror", null, notificationBox.PRIORITY_WARNING_HIGH);
            }
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when user changed save location.", ex);
    }
},

changeSaveLocation: function(path)
{
    this.saveLocationField.value = path;
    
    // Let the preference system know about the change.
    var ev = document.createEvent("Event");
    ev.initEvent("change", true, false);
    this.saveLocationField.dispatchEvent(ev);
},

userBrowsesSaveLocation: function ()
{
    try
    {
        const nsIFilePicker = this.utils.getCIInterface("nsIFilePicker");
        
        var picker = this.utils.getCCInstance("@mozilla.org/filepicker;1", "nsIFilePicker");
        var title = this.getLocaleString("ChooseLocation");
        picker.init(window, title, nsIFilePicker.modeGetFolder);
        
        if (this.prefs.shouldUseOtherSaveLoc())
        {
            picker.displayDirectory = this.prefs.getModifiedSaveLocation();
        }
        
        picker.appendFilters(nsIFilePicker.filterAll);
        
        if (picker.show() == nsIFilePicker.returnOK)
        {
            var saveDir = picker.file.QueryInterface(this.utils.getCIInterface("nsILocalFile"));
            this.changeSaveLocation(saveDir.path);
        }
        
        this.checkSaveLocation();
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
        var isEnabled = this.alternativeLocationCheckbox.checked;
        this.utils.setEnabledElts([this.saveLocationField, this.chooseFolderButton], isEnabled);
        this.utils.setEnabledElts(document.getElementsByClassName("storagelabel"), isEnabled);
        
        if (!isEnabled)
        {
            this.changeSaveLocation(this.utils.getProfileDir().path);
        }
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught when user attempts to toggle location checkbox.", ex);
    }
},

};
