// Internote Extension
// General Utilities
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

Components.utils.import("resource://internotejs/internote-shared-global.jsm");

if (internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.BaseObject == null)
{
    internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.BaseObject =
        function() {};
    
    internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.BaseObject.prototype =
    {
        incorporate: function(name, obj)
        {
            // Don't incorporate again, for both perf reasons, and also
            // to avoid changing the scope of the methods which may matter
            // eg in finding globals like ImageDocument, etc.
            var alreadyIncorporated = this["incorporated" + name];
            if (!alreadyIncorporated)
            {
                for (var name in obj)
                {
                    this[name] = obj[name];
                }
                this["incorporated" + name] = true;
            }
        }
    };
}

if (internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils == null)
{

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils =
    new internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.BaseObject();

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils.incorporate("Utils", {

MAX_DUMP_DATA_SIZE: 10000,

areUtilsInitialized: false,

init: function(anyWindow)
{
    if (this.areUtilsInitialized)
    {
        return;
    }
    else
    {
        this.areUtilsInitialized = true;
    }

    // Firefox seems to have bugs where it just refuses to find all global variables, so ...
    this.Cc = Components.classes;
    this.Ci = Components.interfaces;
    this.Cu = Components.utils;
    this.Cr = Components.results;
    
    this.navigator = anyWindow.navigator;
    
    this.sharedGlobal = internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66;
    
    this.consts = this.sharedGlobal.consts;
},

ifNull: function(value, defaultVal)
{
    return (value == null) ? defaultVal : value;
},

getLocaleString: function(doc, strName)
{
    //dump("internoteUtilities.getLocaleString " + strName + "\n");
    
    if (strName.charAt(0) == ":")
    {
        // Bypass lookup.
        return strName.substr(1);
    }
    else
    {
        var str = doc.getElementById('internote-strings').getString(strName);
        this.assertError(str != null && str.length > 0, "Empty locale string.", strName);
        return str;
    }
},

getCIInterface: function(interfaceName)
{
    return this.Ci[interfaceName];
},

getCIConstant: function(interfaceName, constantName)
{
    return this.Ci[interfaceName][constantName];
},

getCCInstance: function(className, interfaceName)
{
    return this.Cc[className].createInstance(this.Ci[interfaceName]);
},

getCCService: function(className, interfaceName)
{
    return this.Cc[className].getService(this.Ci[interfaceName]);
},

getFile: function(path)
{
    this.assertError(path != null && path != "", "Empty file name.", path);
    
    var dir = this.getCCInstance("@mozilla.org/file/local;1", "nsILocalFile");
    dir.initWithPath(path);
    
    return dir;
},

getFileOrNull: function(path)
{
    try
    {
        if (path == "")
        {
            return null;
        }
        
        var file = this.getFile(path);
        
        if (file.exists())
        {
            return file;
        }
        else
        {
            return null;
        }
    }
    catch (ex)
    {
        if (ex.name != "NS_ERROR_FILE_UNRECOGNIZED_PATH")
        {
            this.utils.handleException("Exception caught while getting file.", ex);
        }
        return null;
    }
},

pushArray: function(target, source, targetIndex)
{
    if (targetIndex == null) targetIndex = target.length;
    
    // We need to apply because we have an array and need to pass multi-args to splice.
    // It should be quicker to splice them all at once rather than several inserts in the middle.
    target.splice.apply(target, [targetIndex, 0].concat(source));
},

// Used to open a URL from a dialog.
openURL: function(url)
{
    var mediator = this.getCCService("@mozilla.org/appshell/window-mediator;1", "nsIWindowMediator");
    var recentWindow = mediator.getMostRecentWindow("navigator:browser");
    
    this.assertError(recentWindow != null, "Could not find window.", recentWindow);
    recentWindow.delayedOpenTab(url);
},

saveStringToFilename : function(writeString, path)
{
    var stream     = this.getCCInstance("@mozilla.org/network/file-output-stream;1",   "nsIFileOutputStream");
    var convStream = this.getCCInstance("@mozilla.org/intl/converter-output-stream;1", "nsIConverterOutputStream");
    
    var localFile = this.getFile(path);
    stream.init(localFile, 0x02 | 0x08 | 0x20, 0664, 0); // XXX Demagic
    convStream.init(stream, "UTF8", 0, 0x0000);
    convStream.writeString(writeString);
    convStream.close();
    stream.close();
},

getProfileDir: function()
{
    return this.getCCService("@mozilla.org/file/directory_service;1", "nsIProperties")
               .get("ProfD", this.Ci.nsIFile);
},

// XXX Convert to line-at-a-time?
readStringFromFilename: function(path)
{
    var inputData = "";
    
    var stream   = this.getCCInstance("@mozilla.org/network/file-input-stream;1",   "nsIFileInputStream"     );
    var siStream = this.getCCInstance("@mozilla.org/intl/converter-input-stream;1", "nsIConverterInputStream");
    
    var file = this.getFile(path);
    if (file.exists())
    {
        stream.init(file, 0x01, 0, 0);
        siStream.init(stream, "UTF8", 1024, this.Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);
        
        var str = {};
        while (siStream.readString(4096, str) != 0)
        {
            inputData += str.value;
        }
    }
    
    return inputData;
},

clipToRange : function(x, min, max)
{
    this.assertError(min <= max, "Bad clip range");
    if      (x <= min) return min;
    else if (max <= x) return max;
    else               return x;
},

isBetween : function(x, min, max)
{
    return min <= x && x <= max;
},

logMessage: function(msg)
{
    if (this.logMessage.consoleService == null)
    {
        this.logMessage.consoleService = this.getCCService("@mozilla.org/consoleservice;1", "nsIConsoleService");
    }
    
    this.logMessage.consoleService.logStringMessage(msg);
    
    this.doubleDump(msg + "\n");
},

quietStackMessage: function(msg)
{
    msg = msg + "\n\n" + this.getStack();
    this.doubleDump(msg + "\n");
},

doubleDump: function(dumpMessage)
{
    dump(dumpMessage);
    if (this.sharedGlobal.dumpData.length < this.MAX_DUMP_DATA_SIZE)
    {
        this.sharedGlobal.dumpData.push(dumpMessage);
    }
},

getStack : function(toRemove)
{
    toRemove = Math.max(toRemove || 0, 0);
    toRemove += 2; // remove the header and the element for this function
    
    // XXX Is there a better way of getting the stack?
    try
    {
        throw new Error("FakeError");
    }
    catch (ex)
    {
        var splitStack = ex.stack.split("\n");
        splitStack.splice(0, toRemove);
        var joinedStr = splitStack.join("\n");
        return joinedStr.replace(/\[object /g, "\[");
    }
},

assertWarn: function(condition, msg, obj)
{
    if (condition == false)
    {
        var errorMsg = msg + "\n" +
                       this.getStack(1);
        this.Cu.reportError(errorMsg);
        
        this.doubleDump("\n\n" + errorMsg + "\n\n");
        
        if (obj != null)
        {
            this.doubleDump("Extra Data: ");
            this.doubleDumpTraceData(obj);
        }
        
        this.sharedGlobal.errorCount++;
        
        this.doubleDump("\n");
    }
},

assertError: function(condition, msg, obj)
{
    if (condition == false)
    {
        var errorMsg = msg + "\n" + this.getStack(1);
        this.Cu.reportError(errorMsg);
        
        this.doubleDump("\n\n" + errorMsg + "\n\n");
        
        this.doubleDump("Extra Data: ");
        this.doubleDumpTraceData(obj);
        
        this.doubleDump("\n");
        
        this.sharedGlobal.errorCount++;
        
        throw new Error(errorMsg);
    }
},

assertClassError: function(obj, className, msg)
{
    this.assertError(obj != null && this.isSpecificJSClass(obj, className), msg, obj);
},

assertWarnNotHere : function(msg, obj)
{
    var errorMsg = "Should not be here." + "\n" +
                   msg + "\n" +
                   this.getStack(1);
    this.Cu.reportError(errorMsg);
    
    this.doubleDump("\n\n" + errorMsg + "\n\n");
    
    this.doubleDump("Extra Data: ");
    this.doubleDumpTraceData(obj);
    
    this.sharedGlobal.errorCount++;
    
    this.doubleDump("\n");
},

assertErrorNotHere : function(msg, obj)
{
    var errorMsg = "Should not be here." + "\n" +
                   msg + "\n" +
                   this.getStack(1);
    this.Cu.reportError(errorMsg);

    this.doubleDump("\n\n" + errorMsg + "\n\n");
    
    this.doubleDump("Extra Data: ");
    this.doubleDumpTraceData(obj);
    
    this.doubleDump("\n");
    
    this.sharedGlobal.errorCount++;
    
    throw new Error(errorMsg);
},

handleException: function(msg, ex, obj)
{
    // We need to distinguish Javascript and XPConnect exceptions:
    // JS Exceptions have a "fileName" property, and a "stack" string property
    // XPConnect Exceptions have a "filename" property, and put stack frame info in a linked list called "location"

    // Check for XPConnect exception first, because we'll get an exception accessing a non-existent field.
    if (ex.location != null)
    {
        var location = ex.location;
        var stack = "";
        while (location != null)
        {
            stack += "@" + location.filename + ":" + location.lineNumber + "\n";
            location = location.caller;
        }
        
        var fileName = ex.filename;
    }
    else if (ex.stack != null)
    {
        var stack = ex.stack;
        var fileName = ex.fileName;
    }
    else
    {
        var stack = "No stack found!\n";
    }
    
    var errorMsg = "Exception Caught." + "\n" +
                   msg + "\n" +
                   "Exception: " + ex.message + "\n" +
                   "Stack:\n" + stack;
    
    this.Cu.reportError(errorMsg);
    
    this.doubleDump("\n\n" + errorMsg + "\n\n");
    
    this.doubleDump("Extra Data: ");
    this.doubleDumpTraceData(obj);
    
    this.sharedGlobal.errorCount++;
    
    this.doubleDump("\n");
},

hexDigit: function(i)
{
    return i.toString(16).toUpperCase();
},

// Creates a bound version of a callback with the correct "this" pointer.
bind: function(obj, method)
{
    this.assertError(obj    != null, "Empty object when binding.");
    this.assertError(method != null, "Empty method when binding.");
    return function() { return method.apply(obj, arguments); };
},

isWindowMinimized: function(win)
{
    return win.windowState == win.STATE_MINIMIZED;
},

// This creates a bound version of a function and places it inside the bound object.
// This is useful when you want to remove a bound callback later.
getBoundVersion: function(obj, propertyName)
{
    if (obj.boundVersions == null) obj.boundVersions = {};
    
    var boundVersion = obj.boundVersions[propertyName];
    
    if (boundVersion == null)
    {
        var method = obj[propertyName];
        boundVersion = this.bind(obj, method);
        obj.boundVersions[propertyName] = boundVersion;
    }
    
    return boundVersion;
},

getJSClassName: function(obj)
{
    if (obj == null)
    {
        return null;
    }
    else
    {
        var prototype = obj.__proto__;
        if (prototype == null)
        {
            return "";
        }
        else
        {
            return prototype.constructor.name;
        }
    }
},

isSpecificJSClass: function(obj, className)
{
    return typeof(obj) == "object" && this.getJSClassName(obj) == className;
},

isFiniteNumber: function(num)
{
    return typeof(num) == "number" && isFinite(num);
},

isOptionalFiniteNumber: function(num)
{
    return num == null || this.isFiniteNumber(num);
},

isNonNegativeNumber: function(num)
{
    return typeof(num) == "number" && num >= 0;
},

isPositiveNumber: function(num)
{
    return typeof(num) == "number" && num > 0;
},

isOptionalDate: function(num)
{
    return num == null || (typeof(num) == "number" && num > 0);
},

parseOptionalDate: function(numStr)
{
    if (numStr == "")
    {
        return null;
    }
    else
    {
        return parseInt(numStr, 10);
    }
},

isBoolean: function(num)
{
    return typeof(num) == "boolean";
},

// trim() not built in to FF3.0, added in 3.5, so we don't use it.
trim: function(line)
{
    line = line.replace(/^\s+/, "");
    line = line.replace(/\s+$/, "");
    return line;
},

innerTrim: function(line)
{
    return line.replace(/\s+/g, " ");
},

spliceFirstInstance: function(arr, data)
{
    var idx = arr.indexOf(data);
    this.assertError(idx != -1, "Could not find element in array to remove it.");
    arr.splice(idx, 1);
},

convertSecondsToDate: function(inDate)
{
    if (inDate == null)
    {
        return "";
    }
    else
    {
        var date = new Date();
        date.setTime(inDate);
        return date;
    }
},

startsWith: function(str, prefix)
{
    return str.indexOf(prefix) == 0;
},

endsWith: function(str, suffix)
{
    if (str.length < suffix.length)
    {
        return false;
    }
    else
    {
        return str.lastIndexOf(suffix) == (str.length - suffix.length);
    }
},

prefixAllLines: function(arr, prefix)
{
    for (var i in arr)
    {
        arr[i] = prefix + arr[i];
    }
},

formatStringsIntoLines: function(strings, maxLineLength, terminatorStr)
{
    var lines = [];
    var currentLine = "";
    
    for (var i in strings)
    {
        var newData = strings[i] + terminatorStr;
        
        if (currentLine == "")
        {
            currentLine = newData;
        }
        else
        {
            var extendedLine = currentLine + " " + newData;
            
            if (extendedLine.length <= maxLineLength)
            {
                currentLine = extendedLine;
            }
            else
            {
                lines.push(currentLine);
                currentLine = newData;
            }
        }
    }
    
    if (currentLine != "")
    {
        lines.push(currentLine);
    }
    
    return lines;
},

// This tool allows you to dump the contents of an object including referred objects recursively.
dumpTraceData: function(data, maxLevels, maxLineLength)
{
    var data = this.traceData(data, maxLevels, maxLineLength);
    for (var i = 0; i < data.length; i++)
    {
        dump(data[i] + "\n");
    }
},

doubleDumpTraceData: function(data, maxLevels, maxLineLength)
{
    var data = this.traceData(data, maxLevels, maxLineLength);
    for (var i = 0; i < data.length; i++)
    {
        this.doubleDump(data[i] + "\n");
    }
},

compactDumpString: function(data, levels)
{
    var data = this.traceData(data, levels, 1000);
    var str = "";
    for (var i = 0; i < data.length; i++)
    {
        str += data[i] + " ";
    }
    return this.innerTrim(str);
},

traceData: function(data, maxLevels, maxLineLength)
{
    try
    {
        var SPACER = "  ";
        
        if (maxLevels     == null) maxLevels     = 1;
        if (maxLineLength == null) maxLineLength = 120;
        
        if (data == null)
        {
            return ["NULL"];
        }
        else if (typeof(data) == "object")
        {
            if (maxLineLength < 0 || maxLevels < 1)
            {
                var dataText = "{...}";
                var className = this.getJSClassName(data);
                return [(className == "") ? dataText : className + " " + dataText];
            }
            
            var attributes = [];
            var complexSubobjects = {};
            var simpleSubobjects  = [];
            var hasSubobjects = false;
            
            /*
            if (typeof(data["namespaceURI"]) != "undefined")
            {
                return ["DOM OBJECT tag = \"" + data.tagName + "\" id = \"" + data.id + "\" class = \"" + data.class + "\""];
            }
            */
            
            // Build up the attributes and subobjects
            for (var idx in data)
            {
                var prefix = idx + ": ";
                
                var prop;
                try
                {
                    prop = data[idx]; // Certain DOM properties seem to trigger not-implemented errors upon access.
                }
                catch (ex)
                {
                    attributes.push(prefix + "<<<INTERNAL-ERROR:" + ex.name + ">>>");
                }
                
                if (prop == data)
                {
                    attributes.push(prefix + "SAME-OBJECT");
                }
                
                var elementData = this.traceData(prop, maxLevels - 1, maxLineLength - prefix.length - SPACER.length);
                
                this.assertError(this.isArray(elementData), "Element data not an array when dumping", elementData);
                
                if (elementData.length == 1)
                {
                    if (elementData[0].match(/^([A-Za-z_]+)?{\.\.\.}/))
                    {
                        attributes.push(prefix + elementData[0]);
                    }
                    else if (elementData[0].match(/^([A-Za-z_]+)?{/))
                    {
                        simpleSubobjects.push(prefix + elementData[0]);
                    }
                    else
                    {
                        attributes.push(prefix + elementData[0]);
                    }
                }
                else {
                    complexSubobjects[idx] = elementData;
                }
            }
            
            // First attempt to put it all on one line, if there are no subobjects.
            if (simpleSubobjects.length == 0 && complexSubobjects.length == 0)
            {
                var dataText = "{ " + attributes.join(", ") + " }";
                var className = this.getJSClassName(data);
                var combined = (className == "") ? dataText : className + " " + dataText;
                
                if (combined <= maxLineLength)
                {
                    return [combined];
                }
            }
            
            if (this.isArray(data))
            {
                attributes.sort(this.numericSort);
            }
            else
            {
                attributes.sort();
            }
            
            var allLines = this.formatStringsIntoLines(attributes, maxLineLength - SPACER.length, ", ");
            
            for (var idx = 0; idx < simpleSubobjects.length; idx++)
            {
                allLines.push(idx + ":" + simpleSubobjects[idx]);
            }
            
            for (var idx in complexSubobjects)
            {
                var complexSubobject = complexSubobjects[idx];
                allLines.push(idx + ":");
                allLines = allLines.concat(complexSubobject);
            }
            
            this.prefixAllLines(allLines, SPACER);
            allLines.unshift(this.getJSClassName(data) + " {");
            allLines.push   ("}");
            
            return allLines;
        }
        else
        {
            return [this.traceSimpleData(data)];
        }
    }
    catch (ex)
    {
        // Certain system objects seem to give errors when we try to loop over them.
        return ["<<<INTERNAL-ERROR:" + ex.name + ">>>"];
    }
},

traceSimpleData: function (data)
{
    if (typeof(data) == "undefined")
    {
        return "UNDEFINED";
    }
    else if (typeof(data) == "null")
    {
        return "NULL";
    }
    else if (typeof(data) == "function")
    {
        return "FUNCTION";
    }
    else if (typeof(data) == "number" || typeof(data) == "boolean")
    {
        return "" + data;
    }
    else if (typeof(data) == "string")
    {
        return "\"" + data.replace(/\\/g, "\\\\").replace(/\n/g, "\\n") + "\"";
    }
    else
    {
        return "UNKNOWN TYPE " + typeof(data);
    }
},

getSortedUniqueValues: function(arr, sortFunc)
{
    var values = {};
    
    for (var i = 0; i < arr.length; i++)
    {
        if (arr[i] != null)
        {
            values[arr[i]] = 1;
        }
    }
    
    return this.getSortedKeys(values, sortFunc);
},

getSortedKeys: function(object, sortFunc)
{
    var arr = [];
    for (var i in object)
    {
        arr.push(i);
    }
    
    if (typeof(sortFunc) == "undefined")
    {
        arr.sort();
    }
    else
    {
        arr.sort(sortFunc);
    }
    
    return arr;
},

getSortedValues: function(object, sortFunc)
{
    var arr = [];
    for each (var v in object)
    {
        arr.push(v);
    }
    
    if (typeof(sortFunc) == "undefined")
    {
        arr.sort();
    }
    else
    {
        arr.sort(sortFunc);
    }
    
    return arr;
},

numericSort: function(a, b)
{
    return a - b;
},

/*
getAttributeComparator: function()
{
    var fields = arguments;
    function lookup(x)
    {
        for (var i = 0; i < fields.length; i++)
        {
            if (x == null)
            {
                return null;
            }
            else
            {
                x = x[fields[i]];
            }
        }
        return x;
    }
    
    return function(a, b) { return lookup(a) - lookup(b); }
},
*/

padAfter: function(start, targetLength, padChar)
{
    var str = "" + start;
    while (str.length < targetLength)
    {
        str += padChar;
    }
    return str;
},

getRangeIntersection: function(range1, range2)
{
    if (range2[0] < range1[0])
    {
        [range1, range2] = [range2, range1];
    }
    
    if (range1[0] <= range2[0] && range2[1] <= range1[1])
    {
        return range2;
    }
    else if (range1[1] < range2[0])
    {
        return [0, -1];
    }
    else
    {
        return [range2[0], range1[1]];
    }
},

isArray: function(arr)
{
    return arr != null && typeof(arr) == "object" && typeof(arr.length) == "number";
},

callSuperconstructor: function(myThis, mySuperclass, argArray)
{
    mySuperclass.apply(myThis, argArray);
},

arrayToString: function(arr, fn)
{
    if (arr == null)
    {
        return "NULL";
    }
    else
    {
        var str = "[";
        
        if (arr.length > 0)
        {
            if (fn == null) fn = function(a) { return a.toString(); }
            
            str += fn(arr[0]);
            
            for (var i = 1; i < arr.length; i++)
            {
                str += ", " + fn(arr[i]);
            }
        }
        
        str += "]";
        
        return str;
    }
},

areArraysEqual: function(arr1, arr2)
{
    if (arr1.length != arr2.length)
    {
        return false;
    }
    else
    {
        for (var i = 0; i < arr1.length; i++)
        {
            if (arr1[i] != arr2[i])
            {
                return false;
            }
        }
        return true;
    }
},

map2: function(func, arr1, arr2)
{
    this.assertError(arr1.length == arr2.length, "Arrays different size in map2.");
    var result = [];
    for (var i = 0; i < arr1.length; i++)
    {
        result[i] = func(arr1[i], arr2[i]);
    }
    return result;
},

map3: function(func, arr1, arr2, arr3)
{
    this.assertError(arr1.length == arr2.length && arr2.length == arr3.length, "Arrays different size in map3.");
    var result = [];
    for (var i = 0; i < arr1.length; i++)
    {
        result[i] = func(arr1[i], arr2[i], arr3[i]);
    }
    return result;
},

filterMap: function(arr, func)
{
    var results = [];
    for (var i = 0; i < arr.length; i++)
    {
        var val = func(arr[i]);
        if (val != null)
        {
            results.push(val);
        }
    }
    return results;
},

filterSplit: function(arr, func)
{
    var trueResults  = [];
    var falseResults = [];
    
    for (var i = 0; i < arr.length; i++)
    {
        var passesTest = func(arr[i]);
        var resultsSet = passesTest ? trueResults : falseResults;
        resultsSet.push(arr[i]);
    }
    
    return [trueResults, falseResults];
},

sgn: function(x)
{
    if      (x < 0) return -1;
    else if (x > 0) return +1;
    else            return  0;
},

andFunc: function(a, b)
{
    return a && b;
},

orFunc: function(a, b)
{
    return a || b;
},

parseBoolean: function(str)
{
    if      (str == "true" ) return true;
    else if (str == "false") return false;
    else return null;
},

interpolate: function(proportion, a, b)
{
    if (a == b) return a;
    else        return (a * (1 - proportion)) + (b * proportion);
},

isPair: function(pair)
{
    return this.isArray(pair) && pair.length == 2;
},

generateIdentifier: function()
{
    if (this.guidGenerator == null)
    {
        this.guidGenerator = this.getCCService("@mozilla.org/uuid-generator;1", "nsIUUIDGenerator");
    }
    
    return this.guidGenerator.generateUUID();
},

// The limit parameter of JS split interprets separators after the limit and truncates fields.
// This function will not interpret a second separator in the text, so we use this if the separator
// character is normal for data in the second half, and splitting it would therefore be wrong.
simpleSplit: function(text, separator)
{
    var index = text.indexOf(separator);
    if (index == -1)
    {
        return [text];
    }
    else
    {
        return [text.substr(0, index), text.substr(index + 1)];
    }
},

getSingleElement: function(arr)
{
    this.assertError(this.isArray(arr) && arr.length == 1, "Not a single element array.", arr);
    return arr[0];
},

isValidRegexp: function(regexp)
{
    try
    {
        new RegExp(regexp);
        return true;
    }
    catch (ex)
    {
        if (ex.name == "SyntaxError")
        {
            return false;
        }
        else
        {
            throw ex;
        }
    }
},

getArrayNonNullCount: function(arr)
{
    var count = 0;
    for (var i = 0; i < arr.length; i++)
    {
        if (arr[i] != null)
        {
            count++;
        }
    }
    return count;
},

createTimer: function(callback, timeoutMS, timerType)
{
    var timer = this.getCCInstance("@mozilla.org/timer;1", "nsITimer");
    timer.init({ observe: callback }, timeoutMS, timer[timerType]);
    return timer;
},

createTimeout: function(callback, timeoutMS)
{
    return this.createTimer(callback, timeoutMS, "TYPE_ONE_SHOT");
},

createInterval: function(callback, timeoutMS)
{
    return this.createTimer(callback, timeoutMS, "TYPE_REPEATING_SLACK");
},

cancelTimer: function(timer)
{
    timer.cancel();
},

// This expression uses the shape of the cosine function to model a movement that starts slowly,
// ends slowly, but is quicker in the middle, which is desirable for move & resize animations.
// The expression's transformations on cos are because it is necessary to translate a number
// between 0 and 1 to another number between 0 and 1, where "proportion of time complete"
// is the input, and "proportion of distance complete" is the output.
translateMovement: function(timeRatioDone)
{
    return (1 - Math.cos(timeRatioDone * Math.PI)) / 2;
},

alert: function(window, messageName, titleName)
{
    var promptService = this.getCCService("@mozilla.org/embedcomp/prompt-service;1", "nsIPromptService");
    var messageText = this.getLocaleString(window.document, messageName);
    var titleText   = this.getLocaleString(window.document, titleName  );
    promptService.alert(window, titleText, messageText);
},

confirm: function(window, messageName, titleName)
{
    var promptService = this.getCCService("@mozilla.org/embedcomp/prompt-service;1", "nsIPromptService");
    var messageText = this.getLocaleString(window.document, messageName);
    var titleText   = this.getLocaleString(window.document, titleName  );
    return promptService.confirm(window, titleText, messageText);
},

confirmCheck: function(window, messageName, titleName, checkName, checkCallback)
{
    var promptService = this.getCCService("@mozilla.org/embedcomp/prompt-service;1", "nsIPromptService");
    var messageText = this.getLocaleString(window.document, messageName);
    var titleText   = this.getLocaleString(window.document, titleName  );
    var checkText   = this.getLocaleString(window.document, checkName  );
    
    var isChecked = {value: false};
    
    var result = promptService.confirmCheck(window, titleText, messageText, checkText, isChecked);
    
    if (isChecked.value)
    {
        checkCallback();
    }
    
    return result;
},

});

}
