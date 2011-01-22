// Internote Extension
// Color Utilities
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

// These support custom color picker fields.

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils.incorporate("ColorUIUtils", {

getColorCanvas: function(color)
{
    var CANVAS_SIZE = 16;
    
    var canvas = this.createHTMLCanvas(document, null, CANVAS_SIZE, CANVAS_SIZE);
    var context = canvas.getContext("2d");
    
    context.fillStyle = color;
    context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    context.strokeStyle = "black";
    context.lineWidth = 2;
    context.strokeRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    return canvas;
},

fillColorField: function(doc, id, colors)
{
    var menuList = doc.getElementById(id);
    var menuPopup = menuList.childNodes[0];
    
    var selectedColorIndex = null;
    var value = menuList.getAttribute("value");
    
    /*
    var hBox = doc.createElement("hbox");
    
    for (var i = 0; i < COLOR_COLUMNS; i++)
    {
        var vBox = doc.createElement("vbox");
        
        for (var j = i; j < colors.length; j += COLOR_COLUMNS)
        {
            ...
        }
        
        hBox.appendChild(vBox);
    }
    */
    
    for (var i = 0; i < colors.length; i++)
    {
        var menuItem = doc.createElement("menuitem");
        
        var color = colors[i];
        this.assertWarn(this.isHexColor(color), "Not hex color.", color);
        
        var colorName = this.consts.COLOR_NAMES[color];
        this.assertWarn(typeof(colorName) == "string", "Bad color name.", color);
        
        if (color == value)
        {
            selectedColorIndex = i;
        }
        
        menuItem.setAttribute("value", color);
        menuItem.setAttribute("class", "menuitem-iconic");
        menuItem.setAttribute("label", colorName);
        menuItem.setAttribute("image", this.getColorCanvas(color).toDataURL());
        
        menuPopup.appendChild(menuItem);
    }
    
    menuPopup.appendChild(doc.createElement("menuseparator"));
    
    var customItem = doc.createElement("menuitem");
    customItem.setAttribute("value", value);
    customItem.setAttribute("class", "menuitem-iconic");
    customItem.setAttribute("label", this.getLocaleString(doc, "CustomColor"));
    menuPopup.appendChild(customItem);
    
    this.adjustFieldCustomColor(id, value, colors);
    
    // We can't call selectedItem yet, so set selectedIndex instead.
    menuList.selectedIndex = this.ifNull(selectedColorIndex, 0);
},

adjustFieldCustomColor: function(id, value, colors)
{
    var menuItem = document.getElementById(id);
    var menuPopup = menuItem.childNodes[0];
    var customItem = menuPopup.childNodes[menuPopup.childNodes.length-1];
    
    value = this.ifNull(value, menuItem.getAttribute("value"));
    
    if (colors.indexOf(value) != -1)
    {
        customItem.removeAttribute("image");
        customItem.setAttribute("value", "");
    }
    else
    {
        customItem.setAttribute("image", this.getColorCanvas(value).toDataURL());
        customItem.setAttribute("value", value);
    }
},

});

