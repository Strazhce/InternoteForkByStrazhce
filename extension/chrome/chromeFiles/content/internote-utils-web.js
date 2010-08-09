// Internote Extension
// Web Utilities
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

internoteUtilities.incorporate({

canonicalizeURL: function(url)
{
    this.assertError(typeof(url) == "string", "Bad URL type when canonicalizing URL.", url);
    
    if (this.parseURL(url) == null)
    {
        return url;
    }
    else
    {
        url = url.replace(/(index|home|default)\.(html|htm|asp|php|cgi|cfm|aspx)$/i, "");
        url = url.replace(/\/$/, "");
        return url;
    }
},

// This is fairly rudimentary, it may let thru some invalid URLs.
parseURL: function(url)
{
    this.assertError(typeof(url) == "string", "Bad URL type when parsing URL.", url);
    
    var protocolRegexp = "([^:]+)://";
    var userNameRegexp = "([^:@/]*:)?";
    var passwordRegexp = "([^@/]@)?";
    var siteRegexp     = "([^:/]*)";
    var portRegexp     = "(:[0-9]+)?";
    var pathRegexp     = "(/[^\\?#]*)?";
    var paramsRegexp   = "(\\?[^#]*)?";
    var anchorRegexp   = "(#.*)?";
    
    var regexp = "^" + protocolRegexp + userNameRegexp + passwordRegexp + siteRegexp + portRegexp + pathRegexp + paramsRegexp + anchorRegexp + "$";
    
    var regexpResults = new RegExp(regexp).exec(url);
    
    if (regexpResults == null)
    {
        return null;
    }
    else
    {
        return { protocol: regexpResults[1], userName: regexpResults[2], password: regexpResults[3], site: regexpResults[4],
                 port: regexpResults[5], path: regexpResults[6], params: regexpResults[7], anchor: regexpResults[8] };
    }
},

isValidURLSite: function(site, protocol)
{
    var compulsorySiteProtocols = ["http", "https", "ftp"];
    var siteIsCompulsory = (compulsorySiteProtocols.indexOf(protocol) != -1);
    if (!siteIsCompulsory && site == "")
    {
        return true;
    }
    else
    {
        return this.isValidSite(site);
    }
},

cleanUpURL: function(url, removeAnchor, removeParams)
{
    if (!removeAnchor && !removeParams)
    {
        return url;
    }

    var startRegexp  = "([^\\?#]+)";
    var paramsRegexp = "(\\?[^#]*)?";
    var anchorRegexp = "(#.*)?";
    
    var regexp = "^" + startRegexp + paramsRegexp + anchorRegexp + "$";
    
    var regexpResults = new RegExp(regexp).exec(url);
    
    if (regexpResults == null)
    {
        return null;
    }
    else
    {
        var result = regexpResults[1];
        
        if (!removeParams)
        {
            result += regexpResults[2];
        }
        
        if (!removeAnchor)
        {
            result += regexpResults[3];
        }
        
        return result;        
    }
},

removeAllChildNodes: function(elt)
{
    while (elt.hasChildNodes())
    {
        elt.removeChild(elt.firstChild);
    }
},

htmlEncode: function(unencodedText)
{
    var textNode = document.createTextNode(unencodedText);
    var element = this.createHTMLElement("textArea");
    element.appendChild(textNode);
    return element.innerHTML;
},

/*
htmlDecode: function(encodedText)
{
    var element = this.createHTMLElement("textarea");
    this.dumpTraceData(element);
    element.innerHTML = encodedText;
    return element.value;
},
*/

htmlDecode: function(encodedText)
{
    return encodedText.replace(/&lt;/g, "<")
                      .replace(/&gt;/g, ">")
                      .replace(/&amp;/g, "&")
                      .replace(/&grave;/g, "`");
},

getURLSite: function(url)
{
    var protocolRegexp = "([^:]*)://";
    var userNameRegexp = "([^:@]*:)?";
    var passwordRegexp = "([^@]@)?";
    var siteRegexp     = "([^:/]*)";
    var portRegexp     = "(:[0-9]+)?";
    var endRegexp      = "(/|$)";
    
    var regexp = "^" + protocolRegexp + userNameRegexp + passwordRegexp + siteRegexp + portRegexp + endRegexp;
    
    var regexpResults = new RegExp(regexp).exec(url);
    
    if (regexpResults == null)
    {
        this.assertWarnNotHere("Not a URL when parsing.", url);
        return null;
    }
    else
    {
        return regexpResults[4];
    }
},

isIPAddress: function(site)
{
    return site.match(/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/) != null;
},

isValidSite: function(site)
{
    // Domain names with diacritics exist, support them.
    var alpha = "A-Za-zÀ-ÖØ-öø-ÿ";
    var char  = alpha + "0-9";
    var regexp = "^[" + char + "][" + char + "\\.\\-]*$";
    
    if (site.match(regexp) == null)
    {
        return false;
    }
    
    // Not all country code domains are required to have at least three domains, eg ro isn't.
    // List those where we can exclude two domains, eg com.au.
    var threeComponentTLDs = ["au", "uk"];
    
    var firstPos = site.indexOf(".");
    var lastPos  = site.lastIndexOf(".");
    
    if (firstPos == -1)
    {
        // No dots.
        return false;
    }
    else if (firstPos != lastPos)
    {
        // At least two dots.
        return true;
    }
    else
    {
        // One dot, valid as long as it's not a country code that has subdomains.
        var possibleTLD = site.substr(lastPos + 1);
        return threeComponentTLDs.indexOf(possibleTLD) == -1;
    }
},

dumpXML: function(node, level)
{
    if (level == null) level = 0;
    
    if (level == 0) dump("--- BEGIN XML DUMP ---\n");
    
    var SPACER = "  ";
    
    for (var i = 0; i < level; i++)
    {
        dump(SPACER);
    }
    
    // Check it's an element
    if (node.nodeType == 1)
    {
        dump("* " + node.tagName + "\n");
        
        for (var i = 0; i < node.attributes.length; i++)
        {
            for (var j = 0; j < level + 1; j++)
            {
                dump(SPACER);
            }
            var attrNode = node.attributes[i];
            dump("/ " + attrNode.name + " = \"" + attrNode.value + "\"\n");
        }
        
        for (var i = 0; i < node.childNodes.length; i++)
        {
            if (node.childNodes[i] != null)
            {
                this.dumpXML(node.childNodes[i], level + 1);
            }
        }
    }
    else if (node.nodeType == 3)
    {
        if (node.nodeValue != "" && node.nodeValue.replace(/\n/g, "").trim() == "")
        {
            dump("@ Text Node (Whitespace)\n");
        }
        else
        {
            dump("@ Text Node \"" + node.nodeValue.replace(/\n/g, "\\n") + "\"\n");
        }
    }
    else if (node.nodeType == 9)
    {
        dump("@ Document Node\n");
        this.dumpXML(node.documentElement, level + 1);
    }
    else
    {
        dump("@ Node Type " + node.nodeType + "\n");
    }
    
    if (level == 0) dump("--- END XML DUMP ---\n");
},

cloneSubtreeWithoutIDs: function(node)
{
    var nodeClone = node.cloneNode(true);
    var nodesToClear = [nodeClone];
    
    while (nodesToClear.length > 0)
    {
        var currentNode = nodesToClear[0];
        var currentChildren = currentNode.childNodes;
        
        for (var i = 0; i < currentChildren.length; i++)
        {
            nodesToClear.push(currentChildren[i]);
        }
        
        currentNode.id = "";
        nodesToClear.shift();
    }
    
    return nodeClone;   
},

removePx : function(x) {
    this.assertError(x.match(/[0-9]+px/), "Bad px value");
    return parseInt(x, 10);
},

// Convenience function for using getBoundVersion with DOM event listeners.
addBoundDOMEventListener: function(elt, eventName, obj, propertyName, useCapture)
{
    // XXX Check elt
    this.assertError(typeof(eventName   ) == "string" , "abdel: eventName is invalid");
    this.assertError(typeof(obj         ) == "object" , "abdel: obj is invalid");
    this.assertError(typeof(propertyName) == "string" , "abdel: propertyName is invalid");
    this.assertError(typeof(useCapture  ) == "boolean", "abdel: useCapture is invalid");
    var fn = this.getBoundVersion(obj, propertyName);
    fn.obj          = obj;
    fn.propertyName = propertyName;
    elt.addEventListener(eventName, fn, useCapture);
},

// Convenience function for using getBoundVersion with DOM event listeners.
removeBoundDOMEventListener: function(elt, eventName, obj, propertyName, useCapture)
{
    // XXX Check elt
    this.assertError(typeof(eventName   ) == "string" , "abdel: eventName is invalid");
    this.assertError(typeof(obj         ) == "object" , "abdel: obj is invalid");
    this.assertError(typeof(propertyName) == "string" , "abdel: propertyName is invalid");
    this.assertError(typeof(useCapture  ) == "boolean", "abdel: useCapture is invalid");
    var fn = this.getBoundVersion(obj, propertyName);
    fn.obj          = obj;
    fn.propertyName = propertyName;
    elt.removeEventListener(eventName, fn, useCapture);
},

blockEvent: function(ev)
{
    ev.stopPropagation();
    ev.preventDefault();
},

isSpecificXULElement: function(obj, tagName)
{
    // XXX How to check it's XULElement?
    return obj.tagName == tagName;
},

isSpecificHTMLElement: function(obj, tagName)
{
    // XXX How to check it's HTMLElement?
    return obj.tagName == tagName;
},

getCurrentBrowser: function()
{
    var tabBrowser = getBrowser();
    return tabBrowser.getBrowserAtIndex(tabBrowser.mTabContainer.selectedIndex);
},

getBrowserURL: function(browser)
{
    if (browser == null) browser = this.getCurrentBrowser();
    return browser.contentWindow.location.href;
},

disableMultiple: function(fieldArray)
{
    for (var i = 0; i < fieldArray.length; i++)
    {
        var field = fieldArray[i];
        if (typeof(field) == "string")
        {
            field = document.getElementById(field);
        }
        field.setAttribute("disabled", "true");
    }
},

enableMultiple: function(fieldArray)
{
    for (var i = 0; i < fieldArray.length; i++)
    {
        var field = fieldArray[i];
        if (typeof(field) == "string")
        {
            field = document.getElementById(field);
        }
        field.removeAttribute("disabled");
    }
},

setEnabled: function(elts, enabled)
{
    var elts2 = this.isArray(elts) ? elts : [elts];
    
    for (var i = 0; i < elts2.length; i++)
    {
        var elt = elts2[i];
        if (typeof(elt) == "string")
        {
            var elt2 = document.getElementById(elt);
            if (elt2 == null)
            {
                this.assertWarnNotHere("Unable to find element " + elt + " in setDisplayed.");
                continue;
            }
        }
        else
        {
            var elt2 = elt;
        }
        
        if (enabled)
        {
            elt2.removeAttribute("disabled");
        }
        else
        {
            elt2.setAttribute("disabled", "true");
        }
    }
    
},

setDisplayed: function(elts, isDisplayed)
{
    var elts2 = this.isArray(elts) ? elts : [elts];
    
    for (var i = 0; i < elts2.length; i++)
    {
        var elt = elts2[i];
        if (typeof(elt) == "string")
        {
            var elt2 = document.getElementById(elt);
            if (elt2 == null)
            {
                this.assertWarnNotHere("Unable to find element " + elt + " in setDisplayed.");
                continue;
            }
        }
        else
        {
            var elt2 = elt;
        }
        
        elt2.style.display = isDisplayed ? "" : "none";
    }
    
},

fixDOMEltWidth: function(elt, width)
{
    elt.style.width     = width  + "px";
    elt.style.maxWidth  = width  + "px";
    elt.style.minWidth  = width  + "px";
},

fixDOMEltHeight: function(elt, height)
{
    elt.style.height    = height + "px";
    elt.style.maxHeight = height + "px";
    elt.style.minHeight = height + "px";
},

fixDOMEltDims: function(elt, dims)
{
    //this.assertError(this.isNonNegCoordPair(dims), "Invalid dims.", dims);
    if (dims[0] != null)
    {
        this.fixDOMEltWidth(elt, dims[0]);
    }
    if (dims[1] != null)
    {
        this.fixDOMEltHeight(elt, dims[1]);
    }
},

unfixDOMEltDims: function(elt)
{
    delete elt.style.width;
    delete elt.style.height;
    delete elt.style.maxWidth;
    delete elt.style.maxHeight;
    delete elt.style.minWidth;
    delete elt.style.minHeight;
},

getDims: function(obj)
{
    return [parseInt(obj.width, 10), parseInt(obj.height, 10)];
},

getPos: function(obj)
{
    return [parseInt(obj.left, 10), parseInt(obj.top, 10)];
},

setPos: function(obj, pos)
{
    //this.assertError(this.isCoordPair(pos), "Invalid pos.");
    if (pos[0] != null) obj.left = pos[0];
    if (pos[1] != null) obj.top  = pos[1];
},

setDims: function(obj, dims)
{
    //this.assertError(this.isNonNegCoordPair(dims), "Invalid dims.");
    if (dims[0] != null) obj.width  = dims[0];
    if (dims[1] != null) obj.height = dims[1];
},

getScreenPos: function(obj)
{
    return [obj.screenX, obj.screenY];
},

createHTMLElement: function(tagName, doc, id)
{
    if (doc == null) doc = document;
    var elt = doc.createElementNS(this.XHTML_NS, "html:" + tagName);
    if (id != null) elt.id = id;
    return elt;
},

createXULElement: function(tagName, doc, id)
{
    if (doc == null) doc = document;
    var elt = doc.createElementNS(this.XUL_NS, tagName);
    if (id != null) elt.id = id;
    return elt;
},

createHTMLCanvas: function(doc, id, width, height)
{
    var canvas = this.createHTMLElement("canvas", doc, id);
    canvas.width  = width;
    canvas.height = height;
    return canvas;
},

createXULSpacer: function(doc, width, height)
{
    var spacer = this.createXULElement("spacer", doc);
    this.fixDOMEltDims(spacer, [width, height]);
    return spacer;
},

// Tricky code ... easier to break.
getCanvasOfElement: function(iFrame, freshElement, dims)
{
    var doc = iFrame.contentDocument;
    var body = doc.documentElement.getElementsByTagName("body")[0];
    
    this.setDims(iFrame, dims);
    
    body.style.padding = "0px";
    body.style.border  = "none";
    body.style.margin  = "0px";
    this.setDims(body.style, dims);
    body.appendChild(freshElement);
    
    var canvas = this.createHTMLElement("canvas");
    var context = canvas.getContext("2d");
    this.setDims(canvas, dims);
    
    context.drawWindow(iFrame.contentWindow, 0, 0, dims[0], dims[1], "rgba(0,0,0,0)");
    
    return canvas;
},

// Tricky code ... easy to break.
getScratchIFrame: function(doc, src)
{
    if (doc == null) doc = document;
    if (src == null) src = "about:blank";
    
    var iFrame = doc.getElementById("internote-scratch-frame");
    this.assertError(iFrame != null, "Could not find scratch frame.");
    
    iFrame.contentDocument.location.reload(); 
    
    return iFrame;
},

// This finds the deepest element that takes up all of the browser window.
getDeepestMainElement: function(document)
{
    var elt = document.documentElement;
    do
    {
        var foundMainChild = false;
        for (var i = 0; i < elt.childNodes.length; i++)
        {
            dump("Look child " + elt.childNodes[i].tagName + " " + elt.offsetWidth + ":" + elt.offsetHeight + " " +
                                 elt.childNodes[i].offsetWidth + ":" + elt.childNodes[i].offsetHeight + "\n");
            if (elt.offsetWidth  <= elt.childNodes[i].offsetWidth &&
                elt.offsetHeight <= elt.childNodes[i].offsetHeight)
            {
                dump("Chosen\n");
                elt = elt.childNodes[i];
                foundMainChild = true;
                break;
            }
        }
    }
    while (foundMainChild);
    
    return elt;
},

calcScrollbarWidth: function()
{
    var scratchIFrame = this.getScratchIFrame();
    var doc = scratchIFrame.contentDocument;
    var body = doc.getElementsByTagName("body")[0];
    
    var textArea = this.createHTMLElement("div", doc);
    textArea.style.overflowY = "scroll";
    
    body.appendChild(textArea);
    
    return textArea.offsetWidth - textArea.clientWidth;
},

loadXML: function(file)
{
    var parser = new DOMParser();
    
    var stream = this.getCCInstance("@mozilla.org/network/file-input-stream;1", "nsIFileInputStream");
    stream.init(file, 0x01, 0444, 0);
    
    var doc = parser.parseFromStream(stream, null, stream.available(), "text/xml");
    stream.close();
    
    if (doc.documentElement.tagName == "parsererror")
    {
        throw new Error("XML parsing storage from file failed.");
    }
    else
    {
        return doc;
    }
},

loadXMLFromString: function(string)
{
    var parser = new DOMParser();
    
    var doc = parser.parseFromString(string, "text/xml");
    
    if (doc.documentElement.tagName == "parsererror")
    {
        throw new Error("XML parsing storage from string failed.");
    }
    else
    {
        return doc;
    }
},

getNoteNum: function(elementOrEvent)
{
    var element = (elementOrEvent.tagName != null) ? elementOrEvent : elementOrEvent.target;
    
    var ELEMENT_NODE = 1;
    while (element != null && element.nodeType == ELEMENT_NODE)
    {
        if (element.hasAttribute("id"))
        {
            var num = element.id.replace(/internote-[a-zA-Z]+([0-9]+)/, "$1");
            if (num.match(/^[0-9]+$/)) {
                return parseInt(num, 10);
            }
        }
        element = element.parentNode;
    }
    
    this.assertErrorNotHere("Could not find note num.");
},

getXMLAttr: function(element, attrName, defaultVal)
{
    if (element.hasAttribute(attrName))
    {
        return element.getAttribute(attrName);
    }
    else
    {
        return defaultVal;
    }
},

getXMLInt: function(element, attrName, defaultVal)
{
    if (element.hasAttribute(attrName))
    {
        return parseInt(element.getAttribute(attrName), 10);
    }
    else
    {
        return defaultVal;
    }
},

getXMLBoolean: function(element, attrName, defaultVal)
{
    if (element.hasAttribute(attrName))
    {
        return this.parseBoolean(element.getAttribute(attrName));
    }
    else
    {
        return defaultVal;
    }
},

clearAfterMenuSeparator: function(menuSeparator)
{
    while (menuSeparator.nextSibling != null && menuSeparator.nextSibling.tagName != "menuseparator")
    {
        menuSeparator.parentNode.removeChild(menuSeparator.nextSibling);
    }
},

});
