// Internote Extension
// Event Dispatcher
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

// This differs from nsIObserverService in a couple of ways.
// (a) It's a part of the object rather than being a global service, so the callbacks
//     will automatically be deregistered when the object is garbage collected.
// (b) You must create events before registering observers, so typoes in the
//     event name will be detected rather than silently failing.
// (c) There are shorthand methods for using bound versions.

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.EventDispatcher =
    function() {};

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.EventDispatcher.prototype =
    new internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.BaseObject();

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.EventDispatcher.prototype.incorporate("EventDispatcher", {

initEventDispatcher: function()
{
    this.events = [];
    
    // The purpose of the event stack is to remember which events are
    // currently being dispatched.  This allows us to prevent adding
    // and removing listeners in this time - this makes things a little
    // slower, but it could prevent a difficult to reproduce and find bug.
    // We use a stack because a dispatch could lead to a listener that
    // leads to another dispatch.
    this.eventStack = [];
},

addEventListener: function(eventName, callback)
{
    //dump("InternoteEventDispatcher.addEventListener " + eventName + " " + this.utils.getJSClassName(this) + "\n");
    
    this.utils.assertError(typeof(eventName) == "string" ,  "EventName is invalid",    eventName);
    this.utils.assertError(typeof(callback ) == "function", "Callback not a function", callback);
    
    if (this.isEventBeingDispatched(eventName))
    {
        this.assertWarnNotHere("Can't add listener while event being dispatched.", eventName);
        return;
    }
    
    var listeners = this.events[eventName];
    if (listeners != null)
    {
        var index = listeners.indexOf(callback);
        if (index == -1)
        {
            listeners.push(callback);
            this.utils.assertError(listeners.length > 0, "Add callback failed.");
        }
        else {
            this.utils.assertWarnNotHere("Callback already added to event.");
        }
    }
    else {
        this.utils.assertWarnNotHere("Event does not exist when adding event listener.");
    }
},

removeEventListener: function(eventName, callback)
{
    //dump("InternoteEventDispatcher.removeEventListener " + eventName + " " + this.utils.getJSClassName(this) + "\n");
    
    this.utils.assertError(typeof(eventName) == "string" ,  "EventName is invalid",    eventName);
    this.utils.assertError(typeof(callback ) == "function", "Callback not a function", callback);
    
    if (this.isEventBeingDispatched(eventName))
    {
        this.utils.assertWarnNotHere("Can't remove listener while event being dispatched.", eventName);
        return;
    }
    
    var listeners = this.events[eventName];
    if (listeners != null)
    {
        var index = listeners.indexOf(callback);
        if (index == -1)
        {
            this.utils.assertWarnNotHere("Callback not present when attempting to remove from event.");
        }
        else {
            // XXX Check this
            listeners.splice(index, 1);
        }
    }
    else {
        this.utils.assertWarnNotHere("Event does not exist when removing event listener.");
    }
},

addBoundEventListener: function(eventName, obj, propertyName)
{
    this.utils.assertError(typeof(obj         ) == "object" , "Obj is invalid",          obj);
    this.utils.assertError(typeof(propertyName) == "string" , "PropertyName is invalid", propertyName);
    
    var fn = this.utils.getBoundVersion(obj, propertyName);
    fn.obj          = obj;
    fn.propertyName = propertyName;
    this.addEventListener(eventName, fn);
},

removeBoundEventListener: function(eventName, obj, propertyName)
{
    this.utils.assertError(typeof(obj         ) == "object" , "Obj is invalid",          obj);
    this.utils.assertError(typeof(propertyName) == "string" , "PropertyName is invalid", propertyName);
    
    var fn = this.utils.getBoundVersion(obj, propertyName);
    fn.obj          = obj;
    fn.propertyName = propertyName;
    this.removeEventListener(eventName, fn);
},

isEventBeingDispatched: function(eventName)
{
    return this.eventStack.indexOf(eventName) != -1;
},

createEvent: function(eventName)
{
    var listeners = this.events[eventName];
    if (listeners == null)
    {
        this.events[eventName] = [];
    }
    else {
        this.utils.assertWarnNotHere("Event already exists when creating event.");
    }
},

dispatchEvent: function(eventName, eventObj)
{
    //dump("InternoteEventDispatcher.dispatchEvent " + eventName + "\n");
    
    this.utils.assertError(eventObj.name == null || eventObj.name == eventName, "Tried to dispatch an already used event object.", eventObj);
    
    // We're overwriting .name, but we just checked it wasn't already there, so that's cool.
    // This ensures "immutability" is preserved, since the object goes out to multiple places.
    eventObj.name = eventName;
    
    this.eventStack.push(eventName);
    
    var listeners = this.events[eventName];
    if (listeners != null)
    {
        for (var i = 0; i < listeners.length; i++)
        {
            var listener = listeners[i];
            try
            {
                listener(eventObj);
            }
            catch (ex)
            {
                this.utils.handleException("Exception while dispatching event.", ex);
            }
        }
    }
    else {
        this.utils.assertWarnNotHere("Event does not exist when dispatching.");
    }
    
    if (this.eventStack[this.eventStack.length - 1] == eventName)
    {
        this.eventStack.pop();
    }
    else
    {
        this.assertWarnNotHere("Event stack corrupted when popping.");
    }
},

});
