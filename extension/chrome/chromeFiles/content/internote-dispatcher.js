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

function InternoteEventDispatcher() {}

InternoteEventDispatcher.prototype.incorporateED = function(newPrototype)
{
    // XXX Study inheritance more.
    var dispatcherPrototype = InternoteEventDispatcher.prototype;
    for (var prop in dispatcherPrototype)
    {
        newPrototype[prop] = dispatcherPrototype[prop];
    }
};

InternoteEventDispatcher.prototype.initEventDispatcher = function()
{
    this.events = [];
};

InternoteEventDispatcher.prototype.addEventListener = function(eventName, callback)
{
    //dump("InternoteEventDispatcher.addEventListener " + eventName + " " + this.utils.getJSClassName(this) + "\n");
    
    this.utils.assertError(typeof(callback) == "function", "addEventListener: callback not a function", typeof(callback));
    
    var listeners = this.events[eventName];
    if (listeners != null)
    {
        var index = listeners.indexOf(callback);
        if (index == -1)
        {
            listeners.push(callback);
            this.utils.assertError(listeners.length > 0, "addEventListener: add callback failed");
        }
        else {
            this.utils.assertWarnNotHere("Callback already added to event.");
        }
    }
    else {
        this.utils.assertWarnNotHere("Event does not exist when adding event listener.");
    }
};

InternoteEventDispatcher.prototype.removeEventListener = function(eventName, callback)
{
    //dump("InternoteEventDispatcher.removeEventListener " + eventName + " " + this.utils.getJSClassName(this) + "\n");
    
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
};

InternoteEventDispatcher.prototype.addBoundEventListener = function(eventName, obj, propertyName)
{
    this.utils.assertError(typeof(eventName   ) == "string" , "abel: eventName is invalid");
    this.utils.assertError(typeof(obj         ) == "object" , "abel: obj is invalid");
    this.utils.assertError(typeof(propertyName) == "string" , "abel: propertyName is invalid");
    var fn = this.utils.getBoundVersion(obj, propertyName);
    fn.obj          = obj;
    fn.propertyName = propertyName;
    this.addEventListener(eventName, fn);
};

InternoteEventDispatcher.prototype.removeBoundEventListener = function(eventName, obj, propertyName)
{
    this.utils.assertError(typeof(eventName   ) == "string" , "abdel: eventName is invalid");
    this.utils.assertError(typeof(obj         ) == "object" , "abdel: obj is invalid");
    this.utils.assertError(typeof(propertyName) == "string" , "abdel: propertyName is invalid");
    var fn = this.utils.getBoundVersion(obj, propertyName);
    fn.obj          = obj;
    fn.propertyName = propertyName;
    this.removeEventListener(eventName, fn);
};

InternoteEventDispatcher.prototype.createEvent = function(eventName)
{
    var listeners = this.events[eventName];
    if (listeners == null)
    {
        this.events[eventName] = [];
    }
    else {
        this.utils.assertWarnNotHere("Event already exists when creating event.");
    }
};

InternoteEventDispatcher.prototype.dispatchEvent = function(eventName, eventObj)
{
    //dump("InternoteEventDispatcher.dispatchEvent " + eventName + "\n");
    
    this.utils.assertError(eventObj.name == null || eventObj.name == eventName, "Tried to dispatch an already used event object.", eventObj);
    
    // We're overwriting .name, but we just checked it wasn't already there, so that's cool.
    // This ensures "immutability" is preserved, since the object goes out to multiple places.
    eventObj.name = eventName;
    
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
};
