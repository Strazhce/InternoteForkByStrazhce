// Internote Extension
// Rectangle Utilities
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

internoteUtilities.incorporate({

makeRectangle: function()
{
    // We put the constructor in here so getJSClassName works.
    function Rectangle() {}
    
    Rectangle.prototype.toString = function()
    {
        return "<(" + this.topLeft[0]     + "," + this.topLeft    [1] + "):(" +
                      this.bottomRight[0] + "," + this.bottomRight[1] + ")>";
    };
    
    return new Rectangle();
},

makeRoundedRect: function(topLeft, bottomRight)
{
    this.assertError(this.isCoordPair(topLeft),     "Invalid topLeft.");
    this.assertError(this.isCoordPair(bottomRight), "Invalid bottomRight.");
    var rect = new this.makeRectangle();
    rect.topLeft     = this.roundCoordPair(topLeft);
    rect.bottomRight = this.roundCoordPair(bottomRight);
    rect.dims        = this.coordPairAdd(this.coordPairSubtract(rect.bottomRight, rect.topLeft), [1, 1]);
    this.assertError(rect.dims[0] >= 0 && rect.dims[1] >= 0, "Negative dimensions.");
    return rect;
},

makeRectFromDims: function(topLeft, dims)
{
    this.assertError(this.isCoordPair(topLeft),    "Invalid topLeft.", topLeft);
    this.assertError(this.isNonNegCoordPair(dims), "Invalid dims.",    dims   );
    var rect = this.makeRectangle();
    rect.topLeft     = topLeft;
    rect.dims        = dims;
    rect.bottomRight = this.coordPairSubtract(this.coordPairAdd(topLeft, dims), [1, 1]);
    return rect;
},

makeRectFromCoords: function(topLeft, bottomRight)
{
    this.assertError(this.isCoordPair(topLeft),     "Invalid topLeft.");
    this.assertError(this.isCoordPair(bottomRight), "Invalid bottomRight.");
    var rect = new this.makeRectangle();
    rect.topLeft     = topLeft;
    rect.bottomRight = bottomRight;
    rect.dims        = this.coordPairAdd(this.coordPairSubtract(bottomRight, topLeft), [1, 1]);
    this.assertError(rect.dims[0] >= 0 && rect.dims[1] >= 0, "Negative dimensions.");
    return rect;
},

getRectIntersection: function(rect1, rect2)
{
    this.assertError(this.isRectangle(rect1),  "Invalid rect1.");
    this.assertError(this.isRectangle(rect2),  "Invalid rect2.");
    
    var xRange = this.getRangeIntersection([rect1.topLeft[0], rect1.bottomRight[0]],
                                           [rect2.topLeft[0], rect2.bottomRight[0]]);
    var yRange = this.getRangeIntersection([rect1.topLeft[1], rect1.bottomRight[1]],
                                           [rect2.topLeft[1], rect2.bottomRight[1]]);
    return this.makeRectFromCoords([xRange[0], yRange[0]], [xRange[1], yRange[1]]);
},

getRectTopRight: function(rect)
{
    this.assertError(this.isRectangle(rect),  "Invalid rect.");
    return [rect.bottomRight[0], rect.topLeft[1]];
},

getRectBottomLeft: function(rect)
{
    this.assertError(this.isRectangle(rect),  "Invalid rect.");
    return [rect.topLeft[0], rect.bottomRight[1]];
},

getRectCenter: function(rect)
{
    this.assertError(this.isRectangle(rect),  "Invalid rect.");
    return [(rect.topLeft[0] + rect.bottomRight[0]) / 2,
            (rect.topLeft[1] + rect.bottomRight[1]) / 2];
},

isRectangle: function(rect)
{
    return this.isSpecificJSClass(rect, "Rectangle") &&
           this.isCoordPair(rect.topLeft) &&
           this.isCoordPair(rect.bottomRight);
},

restrictPosToRect: function(pos, rect)
{
    this.assertError(this.isCoordPair(pos),  "Invalid pos.");
    this.assertError(this.isRectangle(rect), "Invalid rect.");
    
    return[this.clipToRange(pos[0], rect.topLeft[0], rect.bottomRight[0]),
           this.clipToRange(pos[1], rect.topLeft[1], rect.bottomRight[1])];
},

doRectsOverlap: function(rect1, rect2)
{
    this.assertError(this.isRectangle(rect1),  "Invalid rect1.");
    this.assertError(this.isRectangle(rect2),  "Invalid rect2.");
    var overlapRect = this.getRectIntersection(rect1, rect2);
    return (overlapRect.dims[0] > 0 && overlapRect.dims[1] > 0);    
},

isRectEmpty: function(rect)
{
    return rect.dims[0] == 0 || rect.dims[1] == 0;
},

makeScreenRectFromBoxObject: function(boxObject)
{
    this.assertError(boxObject != null, "Can't create screen rect from null boxObject.");
    return this.makeRectFromDims(this.getScreenPos(boxObject),
                                 [boxObject.width, boxObject.height]);
},

isInRect: function(pos, rect)
{
    return this.isBetween(pos[0], rect.topLeft[0], rect.bottomRight[0]) &&
           this.isBetween(pos[1], rect.topLeft[1], rect.bottomRight[1]);
},

/*
formatRect: function(left, top, right, bottom)
{
    var size = 5;
    var str;
    var SPACER = this.padAfter("", size, " ");
    str  = SPACER + top + "\n";
    str += this.padAfter(left, size, " ") + SPACER + this.padAfter(right, size, " ") + "\n";
    str += SPACER + bottom + "\n";
    return str;
},
*/

});
