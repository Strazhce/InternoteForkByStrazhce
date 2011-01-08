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

// Various utilities for manipulating HTML, XML, XUL, URLs, etc.

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils.incorporate("WebUtils", {

XHTML_NS: "http://www.w3.org/1999/xhtml",
XUL_NS:   "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",

// Canonicalize a URL. No change upon failure to parse.
canonicalizeURL: function(url)
{
    this.assertError(typeof(url) == "string", "Bad URL type when canonicalizing URL.", url);
    
    var parsedURL = this.parseURL(url);
    
    if (parsedURL == null)
    {
        return url;
    }
    else
    {
        this.canonicalizeParsedURL(parsedURL);
        return this.formatURL(parsedURL);
    }
},

// Default port for a protocol.
getDefaultPort: function(protocol)
{
    if      (protocol == "http" ) return 80;
    else if (protocol == "https") return 443;
    else if (protocol == "ftp"  ) return 21;
    else return null;
},

// Check whether a site ends with a specific site suffix (leading dot optional).
isSiteSuffix: function(site, suffix)
{
    if (site == suffix)
    {
        return true;
    }
    else
    {
        if (suffix.charAt(0) != ".")
        {
            suffix = "." + suffix;
        }
        
        return this.endsWith(site, suffix);
    }
},

// Canonicalize a parsed URL.
canonicalizeParsedURL: function(parsedURL)
{
    if (parsedURL.path.length > 0)
    {
        var lastPathComponent = parsedURL.path[parsedURL.path.length - 1];
        if (lastPathComponent.match(/^(index|home|default)\.(html|htm|asp|php|cgi|cfm|aspx)$/i))
        {
            parsedURL.path.pop();
        }
    }
    
    var index = parsedURL.path.indexOf(".");
    while (index != -1)
    {
        parsedURL.path.splice(index, 1);
        index = parsedURL.path.indexOf(".");
    }
    
    index = parsedURL.path.lastIndexOf("..");
    while (index > 0) // Don't handle .. in first component.
    {
        parsedURL.path.splice(index - 1, 2);
        index = parsedURL.path.lastIndexOf("..");
    }
    
    index = parsedURL.path.indexOf("");
    while (index != -1)
    {
        parsedURL.path.splice(index, 1);
        index = parsedURL.path.indexOf("");
    }    
    
    if (parsedURL.params == "")
    {
        parsedURL.params = null;
    }
    
    if (parsedURL.params != null)
    {
        parsedURL.params.sort(function(param1, param2)
        {
            if (param1[0] < param2[0])
            {
                return -1;
            }
            else if (param1[0] > param2[0])
            {
                return +1;
            }
            else
            {
                return 0;
            }
        });
    }
    
    if (parsedURL.port == this.getDefaultPort(parsedURL.protocol))
    {
        parsedURL.port = null;
    }
    
    parsedURL.protocol = parsedURL.protocol.toLowerCase();
    parsedURL.site     = parsedURL.site.    toLowerCase();
},

// Format a parsed URL to a string.
formatURL: function(parsedURL)
{
    var userNameComponent = (parsedURL.userName != null) ? (parsedURL.userName + ":") : "";
    var passwordComponent = (parsedURL.password != null) ? (parsedURL.password + "@") : "";
    var portComponent     = (parsedURL.port     != null) ? (":" + parsedURL.port    ) : "";
    var paramsComponent   = (parsedURL.params   != null) ? ("?" + parsedURL.params.map(this.formatParam, this).join("&")) : "";
    var anchorComponent   = (parsedURL.anchor   != null) ? ("#" + encodeURIComponent(parsedURL.anchor)) : "";
    var pathComponent     = "/" + parsedURL.path.map(encodeURIComponent).join("/");
    
    return parsedURL.protocol + "://" + userNameComponent + passwordComponent +
           parsedURL.site + portComponent + pathComponent +
           paramsComponent + anchorComponent;
},

// Parse a URL string to an object. Fairly rudimentary & may let thru some invalid URLs.
parseURL: function(url)
{
    this.assertError(typeof(url) == "string", "Bad URL type when parsing URL.", url);
    
    try
    {
        var protocolRegexp = "([A-Za-z]+)://";
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
            var userName = (regexpResults[2] == null)
                         ? null
                         : regexpResults[2].replace(/:$/, "");
            
            var password = (regexpResults[3] == null)
                         ? null
                         : regexpResults[3].replace(/@$/, "");
            
            var port     = (regexpResults[5] == null)
                         ? null
                         : regexpResults[5].replace(/^:/, "");
            
            var path     = (regexpResults[6] == null)
                         ? "/"
                         : regexpResults[6];
            
            var params   = (regexpResults[7] == null)
                         ? null
                         : regexpResults[7].replace(/^\?/, "");
            
            var anchor   = (regexpResults[8] == null)
                         ? null
                         : decodeURIComponent(regexpResults[8].replace(/^#/, ""));
            
            var site     = regexpResults[4];
            var protocol = regexpResults[1];
            
            var isValidPath = (path.charAt(0) == "/");
            var isValidPort = (port == null) || this.isValidPortString(port);
            var isValidSite = this.isValidURLSite(site, protocol);
            
            if (params != null)
            {
                params = params.split(/[&;]/)
                               .filter(function(param) { return param != ""; })
                               .map(this.parseParam, this);
            }
            
            if (isValidPath && isValidPort && isValidSite)
            {
                path = (path == "/") ? [] : (path.replace(/^\//, "").split("/").map(decodeURIComponent));
                port = (port == null) ? null : parseInt(port, 10);
                return { protocol: protocol, userName: userName, password: password, site: site,
                         port: port, path: path, params: params, anchor: anchor };
            }
            else
            {
                return null;
            }
        }
    }
    catch (ex)
    {
        if (ex.name == "URIError")
        {
            return null;
        }
        else
        {
            this.handleException("Unknown error when parsing URL.", ex);
            return null;
        }
    }
},

// Parse a URL parameter.
parseParam: function(param)
{
    if (this.paramRegexp == null)
    {
        this.paramRegexp = new RegExp(/^([^=]+)=([^=]*)$/);
    }
    
    var regexpResults = this.paramRegexp.exec(param);
    
    if (regexpResults == null)
    {
        return [decodeURIComponent(param)];
    }
    else
    {
        return [decodeURIComponent(regexpResults[1]), decodeURIComponent(regexpResults[2])];
    }
},

// Format a URL parameter.
formatParam: function(param)
{
    if (param[1] != null)
    {
        return encodeURIComponent(param[0]) + "=" + encodeURIComponent(param[1]);
    }
    else
    {
        return encodeURIComponent(param[0]);
    }
},

// Checks the "site" part of the URL is valid, where this is relevant for the protocol.
isValidURLSite: function(site, protocol)
{
    var checkSiteProtocols = ["http", "https", "ftp"]; // Don't check file, chrome, resource, etc.
    var shouldCheckSite = (checkSiteProtocols.indexOf(protocol) != -1);
    if (!shouldCheckSite)
    {
        return true;
    }
    else
    {
        return this.isValidSite(site);
    }
},

/*
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
            result += this.ifNull(regexpResults[2], "");
        }
        
        if (!removeAnchor)
        {
            result += this.ifNull(regexpResults[3], "");
        }
        
        return result;
    }
},
*/

// Remove all child notes from an XML/HTML element.
removeAllChildNodes: function(elt)
{
    while (elt.hasChildNodes())
    {
        elt.removeChild(elt.firstChild);
    }
},

// HTML encode text.
htmlEncode: function(aDoc, unencodedText)
{
    var textNode = aDoc.createTextNode(unencodedText);
    var element = this.createHTMLElement("textArea", aDoc);
    element.appendChild(textNode);
    return element.innerHTML;
},

/*
htmlDecode: function(aDoc, encodedText)
{
    var element = this.createHTMLElement("textarea", aDoc);
    element.innerHTML = encodedText;
    return element.value;
},
*/

// HTML decode text.
htmlDecode: function(encodedText)
{
    return encodedText.replace(/&lt;/g, "<")
                      .replace(/&gt;/g, ">")
                      .replace(/&amp;/g, "&")
                      .replace(/&grave;/g, "`");
},

// Get the site part out of a URL string.
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

// Checks whether a site is an IP address.
isIPAddress: function(site)
{
    return site.match(/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/) != null;
},

// Checks whether a site is a valid DNS name. Tries to exclude too short
// sites depending on country code, but errs on the side of validity.
isValidSite: function(site)
{
    // Domain names with diacritics exist, support them.
    var alpha = "A-Za-z\u0080-\uffff";
    var char  = alpha + "0-9";
    var regexp = "^[" + char + "][" + char + "\\.\\-]*$";
    
    if (site.match(regexp) == null)
    {
        return false;
    }
    
    // Not all country code domains are required to have at least three domains, eg ro isn't.
    // List those where we can exclude two domains, eg com.au.
    var threeComponentTLDs = ["au", "uk"];
    
    var components = site.split(/\./);
    
    var hasEmptyStringComponent = components.some(function(component) { return component == ""; });
    
    if (hasEmptyStringComponent)
    {
        return false;
    }
    else if (components.length == 1)
    {
        return false;
    }
    else if (components.length >= 3)
    {
        return true;
    }
    else
    {
        // One dot, valid as long as it's not a country code that has subdomains.
        var possibleTLD = components[components.length - 1];
        return threeComponentTLDs.indexOf(possibleTLD) == -1;
    }
},

// Recursively dumps an XML node or document, with indentation.
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

// Deep clones an XML element without IDs, so no ID clashes occur.
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

// Removes the "px" suffix off CSS values.
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

// Prevent an event from continuing.
blockEvent: function(ev)
{
    ev.stopPropagation();
    ev.preventDefault();
},

// Checks that an element is a specific XUL element.
isSpecificXULElement: function(obj, tagName)
{
    // XXX How to check it's XULElement?
    return obj.tagName == tagName;
},

// Checks that an element is a specific HTML element.
isSpecificHTMLElement: function(obj, tagName)
{
    // XXX How to check it's HTMLElement?
    return obj.tagName == tagName;
},

// Gets the current browser of this window.
getCurrentBrowser: function(tabBrowser)
{
    return tabBrowser.getBrowserAtIndex(tabBrowser.mTabContainer.selectedIndex);
},

// Gets the current URL of this window.
getBrowserURL: function(browser)
{
    return browser.contentWindow.location.href;
},

// Passed an element or array of elements, sets whether they're enabled.
setEnabledElts: function(elts, isEnabled)
{
    var elts2 = this.isArray(elts) ? elts : [elts];
    
    for (var i = 0; i < elts2.length; i++)
    {
        var elt = elts2[i];
        
        if (isEnabled)
        {
            elt.removeAttribute("disabled");
        }
        else
        {
            elt.setAttribute("disabled", "true");
        }
    }
    
},

// Passed an ID or array of IDs, sets whether they're enabled.
setEnabledIDs: function(doc, eltNames, isEnabled)
{
    var eltNames2 = this.isArray(eltNames) ? eltNames : [eltNames];
    var elts = eltNames2.map(function(eltName) { return doc.getElementById(eltName); });
    this.setEnabledElts(elts, isEnabled);
},

// Passed an element or array of elements, sets whether they're checked.
setCheckedElts: function(elts, isChecked)
{
    var elts2 = this.isArray(elts) ? elts : [elts];
    
    for (var i = 0; i < elts2.length; i++)
    {
        var elt = elts2[i];
        
        if (isChecked)
        {
            elt.setAttribute("checked", "true");
        }
        else
        {
            elt.removeAttribute("checked");
        }
    }
    
},

// Passed an element or array of elements, sets whether they're displayed.
setDisplayedElts: function(elts, isDisplayed)
{
    var elts2 = this.isArray(elts) ? elts : [elts];
    
    for (var i = 0; i < elts2.length; i++)
    {
        var elt = elts2[i];
        elt.style.display = isDisplayed ? "" : "none";
    }
},

// Passed an ID or array of IDs, sets whether they're displayed.
setDisplayedIDs: function(doc, eltNames, isDisplayed)
{
    var eltNames2 = this.isArray(eltNames) ? eltNames : [eltNames];
    var elts = eltNames2.map(function(eltName) { return doc.getElementById(eltName); });
    this.setDisplayedElts(elts, isDisplayed);
},

// Force an element to a specific width.
fixDOMEltWidth: function(elt, width)
{
    this.assertWarn(this.isNonNegativeNumber(width), "Can't set width to bad number.", width);
    elt.style.width     = width  + "px";
    elt.style.maxWidth  = width  + "px";
    elt.style.minWidth  = width  + "px";
},

// Force an element to a specific height.
fixDOMEltHeight: function(elt, height)
{
    this.assertWarn(this.isNonNegativeNumber(height), "Can't set height to bad number.", height);
    elt.style.height    = height + "px";
    elt.style.maxHeight = height + "px";
    elt.style.minHeight = height + "px";
},

// Forces an element to specific dimensions. When one dimension is null, it'll be ignored.
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

// Undo the fix DOM element calls above.
unfixDOMEltDims: function(elt)
{
    elt.style.width     = "";
    elt.style.height    = "";
    elt.style.maxWidth  = "";
    elt.style.maxHeight = "";
    elt.style.minWidth  = "";
    elt.style.minHeight = "";
},

// Gets an element's dimensions as a pair.
getDims: function(obj)
{
    return [parseInt(obj.width, 10), parseInt(obj.height, 10)];
},

// Gets an element's top-left coordinate as a pair.
getPos: function(obj)
{
    return [parseInt(obj.left, 10), parseInt(obj.top, 10)];
},

// Sets an element's top-left coordinate properties. When one dimension is null, it'll be ignored.
setPos: function(obj, pos)
{
    //this.assertError(this.isCoordPair(pos), "Invalid pos.");
    if (pos[0] != null) obj.left = pos[0];
    if (pos[1] != null) obj.top  = pos[1];
},

// Sets an element's dimensions properties. When one dimension is null, it'll be ignored.
setDims: function(obj, dims)
{
    //this.assertError(this.isNonNegCoordPair(dims), "Invalid dims.");
    if (dims[0] != null) obj.width  = dims[0];
    if (dims[1] != null) obj.height = dims[1];
},

// Gets an element's screen top-left coordinate as a pair.
getScreenPos: function(obj)
{
    return [obj.screenX, obj.screenY];
},

// Create a HTML element, in the correct namespace so it will work with XUL documents.
createHTMLElement: function(tagName, doc, id)
{
    var elt = doc.createElementNS(this.XHTML_NS, "html:" + tagName);
    if (id != null) elt.id = id;
    return elt;
},

// Create an XUL element. Must be in an XUL document.
createXULElement: function(tagName, doc, id)
{
	// XXX Should assert document type, or add namespace if adding to HTML document.
    var elt = doc.createElementNS(this.XUL_NS, tagName);
    if (id != null) elt.id = id;
    return elt;
},

// Create a specific-sized HTML canvas with given ID.
createHTMLCanvas: function(doc, id, width, height)
{
    var canvas = this.createHTMLElement("canvas", doc, id);
    canvas.width  = width;
    canvas.height = height;
    return canvas;
},

// Create a specific-sized XUL spacer.
createXULSpacer: function(doc, width, height)
{
    var spacer = this.createXULElement("spacer", doc);
    this.fixDOMEltDims(spacer, [width, height]);
    return spacer;
},

// Creates a canvas that is a "screenshot" of a specific window.
// Usually you should call this right after setScratchElement, but we don't put them
// in one function, because certain things can only be determined after the element is in
// a document, eg scrollHeight, and so we might wish to do intermediate actions.
// XXX Choose better name.
getWindowCanvas: function(win, doc, dims)
{
    var canvas = this.createHTMLElement("canvas", doc);
    var context = canvas.getContext("2d");
    this.setDims(canvas, dims);
    context.drawWindow(win, 0, 0, dims[0], dims[1], "rgba(0,0,0,0)");
    
    return canvas;
},

// This sets the element that displays inside a scratch IFRAME.
// This can then be screenshot using getWindowCanvas, or printed.
setScratchElement: function(iFrame, freshElement, dims)
{
    // Configure.
    var doc = iFrame.contentDocument;
    var body = doc.documentElement.getElementsByTagName("body")[0];
    
    // Clear the IFrame.
    this.removeAllChildNodes(body);
    body.style.padding = "0px";
    body.style.border  = "none";
    body.style.margin  = "0px";
    
    // Set the sizes.
    this.setDims(iFrame, dims);
    this.setDims(body.style, dims);
    
    // Add the element.
    body.appendChild(freshElement);
},

// Gets the hidden scratch IFRAME that our overlay inserted into the browser window.
getScratchIFrame: function(anyScratchWindowDoc)
{
    var iFrame = anyScratchWindowDoc.getElementById("internote-scratch-frame");
    this.assertError(iFrame != null, "Could not find scratch frame.");
    return iFrame;
},

// This finds the deepest element that takes up all of the browser window.
getDeepestMainElement: function(doc)
{
    var elt = doc.documentElement;
    do
    {
        var foundMainChild = false;
        for (var i = 0; i < elt.childNodes.length; i++)
        {
            //dump("Look child " + elt.childNodes[i].tagName + " " + elt.offsetWidth + ":" + elt.offsetHeight + " " +
            //                     elt.childNodes[i].offsetWidth + ":" + elt.childNodes[i].offsetHeight + "\n");
            if (elt.offsetWidth  <= elt.childNodes[i].offsetWidth &&
                elt.offsetHeight <= elt.childNodes[i].offsetHeight)
            {
                //dump("Chosen\n");
                elt = elt.childNodes[i];
                foundMainChild = true;
                break;
            }
        }
    }
    while (foundMainChild);
    
    return elt;
},

// Calculates the width of scrollbars on this platform. This is used to calculate
// this size of the viewport minus scrollbars, so notes don't go on the bars.
calcScrollbarWidth: function(anyScratchWindowDoc)
{
    var scratchIFrame = this.getScratchIFrame(anyScratchWindowDoc);
    var scratchDoc = scratchIFrame.contentDocument;
    var body = scratchDoc.getElementsByTagName("body")[0];
    
    var textArea = this.createHTMLElement("div", scratchDoc);
    textArea.style.overflowY = "scroll";
    
    body.appendChild(textArea);
    
    return textArea.offsetWidth - textArea.clientWidth;
},

// Parses XML from a stream.
loadXMLFromStream: function(stream)
{
    var parser = this.getCCInstance("@mozilla.org/xmlextras/domparser;1", "nsIDOMParser");
    
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

// Parses XML from a file.
loadXMLFromFile: function(file)
{
    var stream = this.getCCInstance("@mozilla.org/network/file-input-stream;1", "nsIFileInputStream");
    stream.init(file, 0x01, 0444, 0);
    return this.loadXMLFromStream(stream);
},

// Parses XML from a string.
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

// This gets a note's number by looking at the numeric suffix at the end of IDs of elements
// within the note. This is used by event handling code to discover the note we're working with.
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

// Gets an XML attribute, or a default value if it doesn't exist.
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

// Gets & parses an XML integer attribute, or a default value if it doesn't exist.
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

// Gets & parses an XML boolean attribute (a "false" or "true" string), or a default value if it doesn't exist.
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

// Removes all the elements after a specific XUL menu separator, up to the end or another separator.
clearAfterMenuSeparator: function(menuSeparator)
{
    while (menuSeparator.nextSibling != null && menuSeparator.nextSibling.tagName != "menuseparator")
    {
        menuSeparator.parentNode.removeChild(menuSeparator.nextSibling);
    }
},

// Updates the viewport dims for an image document, removing any scrollbars.
updateViewportDimsForImage: function(contentDoc, startDims)
{
    if (contentDoc.body.clientHeight < contentDoc.body.scrollHeight)
    {
        startDims[0] -= this.scrollbarSize;
    }
    
    if (contentDoc.body.clientWidth < contentDoc.body.scrollWidth)
    {
        startDims[1] -= this.scrollbarSize;
    }
},

// Updates the viewport dims for a HTML document, removing any scrollbars.
// It is ridiculously complex but seemingly necessary.
// Don't replace without wide testing on a variety of sites.
updateViewportDimsForHTML: function(browser, contentDoc, startDims)
{
    var horzScrollbarDetected = false;
    var vertScrollbarDetected = false;
    
    if (contentDoc.documentElement != null && contentDoc.body != null) // During loading ...
    {
        var bodyStyle = browser.contentWindow.getComputedStyle(contentDoc.body,            null);
        var htmlStyle = browser.contentWindow.getComputedStyle(contentDoc.documentElement, null);
        
        // Determine horizontal scrollbar.
        if (htmlStyle.overflowX == "hidden" || bodyStyle.overflowX == "hidden")
        {
            horzScrollbarDetected = false;
        }
        else if (htmlStyle.overflowX == "scroll" || bodyStyle.overflowX == "scroll")
        {
            horzScrollbarDetected = true;
        }
        else
        {
            horzScrollbarDetected = contentDoc.body           .clientWidth < contentDoc.body           .scrollWidth ||
                                    contentDoc.documentElement.clientWidth < contentDoc.documentElement.scrollWidth;
        }
        
        // Determine vertical scrollbar.
        var docWidth = contentDoc.width + parseInt(bodyStyle.marginLeft,  10) +
                                        + parseInt(bodyStyle.marginRight, 10);
        vertScrollbarDetected = docWidth < browser.contentWindow.innerWidth;
        
        if (horzScrollbarDetected) startDims[1] -= this.scrollbarSize;
        if (vertScrollbarDetected) startDims[0] -= this.scrollbarSize;
    }
    
},

// Updates the viewport dims for an XML document, removing any scrollbars.
updateViewportDimsForXML: function(contentDoc, startDims)
{
    if (contentDoc.documentElement.clientHeight < contentDoc.documentElement.scrollHeight)
    {
        //dump("Remove X\n");
        startDims[0] -= this.scrollbarSize;
    }
    
    if (contentDoc.documentElement.clientWidth < contentDoc.documentElement.scrollWidth)
    {
        //dump("Remove Y\n");
        startDims[1] -= this.scrollbarSize;
    }
},

// We attempt to calculate the size of the viewport minus any scrollbars.
// In particular we can't just take the minimums of viewport and page because a page might
// have less height than the viewport, and also image URLs might have less width and height.
// There seems to be no easy way to do this in Firefox, and lots of bugs to work around, so
// be careful with any changes.
getViewportDims: function(chromeWin, browser)
{
    this.assertError(browser != null, "Null browser", browser);
    
    if (this.scrollbarSize == null)
    {
        this.scrollbarSize = this.calcScrollbarWidth(chromeWin.document);
    }        
    
    var contentDoc = browser.contentDocument;
    
    var viewportDims = this.getDims(browser.boxObject);
    
    this.assertError(this.isCoordPair(viewportDims), "Bad original viewport dims", viewportDims);
    
    try
    {
        // We sometimes get height == 0, in particular temporarily when dragging tabs into new windows ...
        if (contentDoc.documentElement != null && viewportDims[1] > 0)
        {
            if (contentDoc instanceof chromeWin.ImageDocument)
            {
                this.updateViewportDimsForImage(contentDoc, viewportDims);
            }
            else if (contentDoc instanceof chromeWin.HTMLDocument)
            {
                //dump("PRE  = " + viewportDims[0] + " " + viewportDims[1] + "\n");
                this.updateViewportDimsForHTML(browser, contentDoc, viewportDims);
                //dump("POST = " + viewportDims[0] + " " + viewportDims[1] + "\n");
            }
            else if (contentDoc instanceof chromeWin.XMLDocument)
            {
                this.updateViewportDimsForXML(contentDoc, viewportDims);
            }
            else if (contentDoc instanceof chromeWin.XULDocument)
            {
                // XXX Should possibly do something.
                // Do nothing.
            }
            else if (contentDoc instanceof chromeWin.SVGDocument)
            {
                // Need to do something but can't figure out how.
            }
            else
            {
                this.assertWarnNotHere("Unhandled document type.", this.getJSClassName());
                this.dumpXML(contentDoc);
            }
        }
    }
    catch (ex)
    {
        this.handleException("Exception caught when trying to compensate for scrollbars.", ex);
    }
    
    this.assertError(this.isCoordPair(viewportDims), "Bad modified viewport dims", viewportDims);
    
    //this.dumpTraceData(viewportDims);
    
    // Next we handle really small windows, where the window is smaller than the browser box!
    // In this case we calculate the biggest the viewport could be, given the window dimensions.
    // If this is smaller than what we've already calculated, truncate it.
    var windowTopLeft = this.getScreenPos(chromeWin.document.documentElement.boxObject);
    //dump("  WTopLeft      = " + this.compactDumpString(windowTopLeft) + "\n");
    var windowDims = [chromeWin.innerWidth, chromeWin.innerHeight];
    //dump("  WindowDims    = " + this.compactDumpString(windowDims) + "\n");
    var viewportTopLeft = this.getScreenPos(browser.boxObject);
    //dump("  VTopLeft      = " + this.compactDumpString(viewportTopLeft) + "\n");
    var viewportTopLeftOnWindow = this.coordPairSubtract(viewportTopLeft, windowTopLeft);
    //dump("  VWTopLeft     = " + this.compactDumpString(viewportTopLeftOnWindow) + "\n");
    var viewportPotentialDims = this.coordPairSubtractNonNeg(windowDims, viewportTopLeftOnWindow);
    //dump("  PotentialDims = " + this.compactDumpString(viewportPotentialDims) + "\n\n\n");
    
    // Now restrict the earlier calculated dimensions.
    viewportDims = this.coordPairMin(viewportDims, viewportPotentialDims);
    
    this.assertError(this.isCoordPair(viewportDims), "Bad adjusted viewport dims", viewportDims);
    
    //dump("  ViewportDims  = " + this.compactDumpString(viewportDims) + "\n");
    
    return viewportDims;
},

// Gets a rectangle for the viewport minus any scrollbars.
getViewportRect: function(chromeWin, browser)
{
    var contentWin = browser.contentWindow;
    
    var viewportDims = this.getViewportDims(chromeWin, browser);
    var scrollPos = [contentWin.scrollX, contentWin.scrollY];
    return this.makeRectFromDims(scrollPos, viewportDims);
},

// Gets a dimensions pair for the page.
getPageDims: function(chromeWin, browser)
{
    var contentDoc = browser.contentDocument;
    if (contentDoc.documentElement == null)
    {
        // This seems to happen during page load for certain versions of Firefox.
        return [0, 0];
    }
    else if (contentDoc instanceof chromeWin.ImageDocument)
    {
        return [contentDoc.body.scrollWidth, contentDoc.body.scrollHeight];
    }
    else
    {
        return [contentDoc.documentElement.scrollWidth, contentDoc.documentElement.scrollHeight];
    }
},

// Changes all the pixels in a canvas to a specific color, but leaves alpha unchanged.
colorCanvas: function(canvas, color)
{
    var context = canvas.getContext("2d");
    
    var [w, h] = [canvas.width, canvas.height];
    
    var imageData = context.getImageData(0, 0, w, h);
    
    for (var x = 0; x < w; x++) {
        for (var y = 0; y < h; y++) {
            var i = 4 * (y * w + x);
            imageData.data[i + 0] = color[0];
            imageData.data[i + 1] = color[1];
            imageData.data[i + 2] = color[2];
            // Keep alpha the same.
        }
    }
    
    context.putImageData(imageData, 0, 0);
},

// Scrolls page the smallest amount to show a specific rectangle in page coordinates
// with a small amount of extra spacing from edge. Does nothing if already on-screen.
// It shouldn't cry if the rectangle is bigger than the viewport.
scrollToShowRect: function(chromeWin, browser, noteRect)
{
    //dump("internoteUtilities.scrollToShowRect\n");
    
    var viewportRect = this.getViewportRect(chromeWin, browser);
    
    function findNewPos(noteRectMin, noteRectMax, viewportSize, viewportRectMin, viewportRectMax)
    {
        var SPACING = 5;
        
        if (noteRectMax < viewportRectMin)
        {
            return noteRectMin - 5;
        }
        else if (viewportRectMax < noteRectMin)
        {
            return noteRectMax + 5 - viewportSize;
        }
        else
        {
            return viewportRectMin;
        }
    }
    
    //dump("  Checking InRect\n");
    if (!this.isRectInRect(noteRect, viewportRect))
    {
        //dump("  InRect\n");
        var newScrollX = findNewPos(noteRect.topLeft[0], noteRect.bottomRight[0],
                                    viewportRect.dims[0], viewportRect.topLeft[0], viewportRect.bottomRight[0]);
        var newScrollY = findNewPos(noteRect.topLeft[1], noteRect.bottomRight[1],
                                    viewportRect.dims[1], viewportRect.topLeft[1], viewportRect.bottomRight[1]);
        var contentWin = browser.contentWindow;
        
        //dump("  Checking Changed ScrollPos\n");
        if (contentWin.scrollX != newScrollX || contentWin.scrollY != newScrollY)
        {
            //dump("  Changed ScrollPos\n");
            contentWin.scrollTo(newScrollX, newScrollY);
            return true;
        }
        else
        {
            return false;
        }
    }
},

// Draws a canvas into the center of a larger canvas.
drawCanvasCenteredIntoCanvas: function(destCanvas, srcCanvas)
{
    var diffX = destCanvas.width  - srcCanvas.width;
    var diffY = destCanvas.height - srcCanvas.height;
    
    var destContext = destCanvas.getContext("2d");
    
    destContext.clearRect(0, 0, destCanvas.width, destCanvas.height);
    destContext.drawImage(srcCanvas, diffX / 2, diffY / 2);
},

});
