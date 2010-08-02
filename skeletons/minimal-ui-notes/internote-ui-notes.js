// Internote Extension
// Testing Skeleton - Note UI
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

// This is a basic replacement for Note UI that does not include many
// features.  Its use is in testing and developing reduced test cases.

// You just click anywhere to close a note.

var internoteNoteUI =
{
NOTE_BORDER_SIZE: 3,
NOTE_OUTER_SIZE:  9,

init: function(prefs, utils, consts)
{
    this.utils   = utils;
},

makeUINote: function(note)
{
    var utils = this.utils;

    function UINote(utils, note)
    {
        this.note           = note;
        this.num            = note.num;
        this.isFlipped      = false;
        this.backColor      = note.backColor;
        this.backColorArray = utils.parseHexColor(note.backColor);
    }

    return new UINote(this.utils, note);
},

waitForImageLoad: function(onLoad)
{
	onLoad();
},

areImagesLoaded: function()
{
	return true;
},

addFocusListener: function(uiNote, func)
{
},

destroy: function(uiNote)
{
},

createNewNote: function(note, callbacks, doc)
{
    this.utils.assertClassError(note, "InternoteNote", "Note is not correct class when creating new note.")

    if (doc == null) doc = document;

    var uiNote = this.makeUINote(note);

    var noteElt = uiNote.noteElt = this.utils.createXULElement("stack", doc, "internote-note" + note.num);
    var background  = uiNote.background  = this.createBackground(doc, uiNote)

    noteElt.appendChild(background);

    if (callbacks.onClose != null)
    {
        noteElt.addEventListener("mousedown", callbacks.onClose, false);
    }

    this.adjustDims(uiNote, note.getDims());

    this.drawNoteBackground(uiNote);
    return uiNote;
},

disableUI: function(uiNote)
{
},

setIsEnabled: function(uiNote, newIsEnabled)
{
},

adjustDims: function(uiNote, dims)
{
    if (!this.utils.areArraysEqual(this.getDims(uiNote), dims))
    {
        this.utils.fixDOMEltDims(uiNote.noteElt,    dims);
        this.utils.setDims      (uiNote.background, dims);
        this.drawNoteBackground (uiNote);
    }
},

getDims: function(uiNote)
{
    return [uiNote.noteElt.boxObject.width, uiNote.noteElt.boxObject.height];
},

flipNote: function(uiNote, newIsFlipped)
{
},

focusNote: function(uiNote)
{
},

updateFontSize: function(uiNote)
{
},

updateScrollbar: function(uiNote)
{
},

isMinimized: function(uiNote)
{
  return false;
},

setText: function(uiNote, newText)
{
},

createBackground: function(doc, uiNote)
{
    return this.utils.createHTMLElement("canvas", doc, "internote-background" + uiNote.num);
},

drawNoteBackground: function(uiNote)
{
    this.utils.assertClassError(uiNote, "UINote", "Note is not a UINote when drawing note background.");
    var w = uiNote.background.width;
    var h = uiNote.background.height;

    var context = uiNote.background.getContext("2d");
    context.clearRect(0, 0, w, h);

    context.lineJoin = "round";
    context.strokeStyle = "black";
    context.lineWidth = this.NOTE_BORDER_SIZE;

    context.strokeRect(this.NOTE_BORDER_SIZE / 2, this.NOTE_BORDER_SIZE / 2,
                       w - this.NOTE_BORDER_SIZE, h - this.NOTE_BORDER_SIZE);

    context.fillStyle = "#FFFF99";

    context.fillRect(this.NOTE_BORDER_SIZE, this.NOTE_BORDER_SIZE,
                     w - 2 * this.NOTE_BORDER_SIZE,
                     h - 2 * this.NOTE_BORDER_SIZE);
},

makeStaticImage: function(uiNote, dims)
{
},

makeDynamic: function(uiNote)
{
},


};

