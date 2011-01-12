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

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils.incorporate("WebUtils", {

XHTML_NS: "http://www.w3.org/1999/xhtml",
XUL_NS:   "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",

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

getDefaultPort: function(protocol)
{
    if      (protocol == "http" ) return 80;
    else if (protocol == "https") return 443;
    else if (protocol == "ftp"  ) return 21;
    else return null;
},

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

// This is fairly rudimentary, it may let thru some invalid URLs.
parseURL: function(url)
{
    this.assertError(typeof(url) == "string", "Bad URL type when parsing URL.", url);
    
    try
    {
        var protocolRegexp = "([A-Za-z]+)://";
        var userPassRegexp = "[^:@/]*";
        var userNPassRegexp= "(" + userPassRegexp + "(\\:" + userPassRegexp + ")?\\@)?";
        var siteRegexp     = "([^:/]*)";
        var portRegexp     = "(:[0-9]+)?";
        var pathRegexp     = "(/[^\\?#]*)?";
        var paramsRegexp   = "(\\?[^#]*)?";
        var anchorRegexp   = "(#.*)?";
        
        var regexp = "^" + protocolRegexp + userNPassRegexp + siteRegexp + portRegexp + pathRegexp + paramsRegexp + anchorRegexp + "$";
        
        var regexpResults = new RegExp(regexp).exec(url);
        
        if (regexpResults == null)
        {
            return null;
        }
        else
        {
            var userName = (regexpResults[2] == null)
                         ? null
                         : regexpResults[2].replace(/[:@].*$/, "");
            
            var password = (regexpResults[3] == null)
                         ? null
                         : regexpResults[3].replace(/^:/, "");
            
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

isValidPortString: function(port)
{
    const MAX_PORT = 65535;
    if (port.match(/^\d+$/).length > 0)
    {
        return this.isBetween(parseInt(port), 0, MAX_PORT);
    }
    else
    {
        return false;
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

removeAllChildNodes: function(elt)
{
    while (elt.hasChildNodes())
    {
        elt.removeChild(elt.firstChild);
    }
},

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

getCurrentBrowser: function(tabBrowser)
{
    return tabBrowser.getBrowserAtIndex(tabBrowser.mTabContainer.selectedIndex);
},

getBrowserURL: function(browser)
{
    return browser.contentWindow.location.href;
},

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

setEnabledIDs: function(doc, eltNames, isEnabled)
{
    var eltNames2 = this.isArray(eltNames) ? eltNames : [eltNames];
    var elts = eltNames2.map(function(eltName) { return doc.getElementById(eltName); });
    this.setEnabledElts(elts, isEnabled);
},

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

setDisplayedElts: function(elts, isDisplayed)
{
    var elts2 = this.isArray(elts) ? elts : [elts];
    
    for (var i = 0; i < elts2.length; i++)
    {
        var elt = elts2[i];
        elt.style.display = isDisplayed ? "" : "none";
    }
},

setDisplayedIDs: function(doc, eltNames, isDisplayed)
{
    var eltNames2 = this.isArray(eltNames) ? eltNames : [eltNames];
    var elts = eltNames2.map(function(eltName) { return doc.getElementById(eltName); });
    this.setDisplayedElts(elts, isDisplayed);
},

fixDOMEltWidth: function(elt, width)
{
    this.assertWarn(this.isNonNegativeNumber(width), "Can't set width to bad number.", width);
    elt.style.width     = width  + "px";
    elt.style.maxWidth  = width  + "px";
    elt.style.minWidth  = width  + "px";
},

fixDOMEltHeight: function(elt, height)
{
    this.assertWarn(this.isNonNegativeNumber(height), "Can't set height to bad number.", height);
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
    elt.style.width     = "";
    elt.style.height    = "";
    elt.style.maxWidth  = "";
    elt.style.maxHeight = "";
    elt.style.minWidth  = "";
    elt.style.minHeight = "";
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
    var elt = doc.createElementNS(this.XHTML_NS, "html:" + tagName);
    if (id != null) elt.id = id;
    return elt;
},

createXULElement: function(tagName, doc, id)
{
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

// getWindowCanvas is usually called after setScratchElement, but we don't put them
// in one function, because certain things can only be determined when the element is in
// a document, eg scrollHeight, and this might affect what we do to the element.
getWindowCanvas: function(win, doc, dims)
{
    var canvas = this.createHTMLElement("canvas", doc);
    var context = canvas.getContext("2d");
    this.setDims(canvas, dims);
    context.drawWindow(win, 0, 0, dims[0], dims[1], "rgba(0,0,0,0)");
    
    return canvas;
},

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

// Tricky code ... easy to break.
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

loadXMLFromFile: function(file)
{
    var stream = this.getCCInstance("@mozilla.org/network/file-input-stream;1", "nsIFileInputStream");
    stream.init(file, 0x01, 0444, 0);
    return this.loadXMLFromStream(stream);
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

// Ridiculous but seemingly necessary.  Don't replace without wide testing
// on a variety of sites.
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

getViewportRect: function(chromeWin, browser)
{
    var contentWin = browser.contentWindow;
    
    var viewportDims = this.getViewportDims(chromeWin, browser);
    var scrollPos = [contentWin.scrollX, contentWin.scrollY];
    return this.makeRectFromDims(scrollPos, viewportDims);
},

getPageDims: function(chromeWin, browser)
{
    var contentDoc = browser.contentDocument;
    if (contentDoc.documentElement == null)
    {
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

drawCanvasCenteredIntoCanvas: function(destCanvas, srcCanvas)
{
    var diffX = destCanvas.width  - srcCanvas.width;
    var diffY = destCanvas.height - srcCanvas.height;
    
    var destContext = destCanvas.getContext("2d");
    
    destContext.clearRect(0, 0, destCanvas.width, destCanvas.height);
    destContext.drawImage(srcCanvas, diffX / 2, diffY / 2);
},

});
