// Internote Extension
// Coordinate Utilities
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

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils.incorporate("CoordUtils", {

coordPairAdd: function(a, b)
{
    return [a[0] + b[0], a[1] + b[1]];
},

coordPairSubtract: function(a, b)
{
    return [a[0] - b[0], a[1] - b[1]];
},

coordPairSubtractNonNeg: function(a, b)
{
    return [Math.max(0, a[0] - b[0]), Math.max(0, a[1] - b[1])];
},

coordPairMultiply: function(c, a)
{
    return [c * a[0], c * a[1]];
},

coordPairMin: function(a, b)
{
    return [Math.min(a[0], b[0]), Math.min(a[1], b[1])];
},

coordPairMax: function(a, b)
{
    return [Math.max(a[0], b[0]), Math.max(a[1], b[1])];
},

areCoordPairsEqual: function(a, b)
{
    return a[0] == b[0] && a[1] == b[1];
},

roundCoordPair: function(pair)
{
    return [Math.round(pair[0]), Math.round(pair[1])];
},

// Linear interpolator between two points.
interpolateCoordPair: function(proportion, pair1, pair2)
{
    this.assertError(this.isCoordPair(pair1),  "Invalid pair1.", pair1);
    this.assertError(this.isCoordPair(pair2),  "Invalid pair2.", pair2);
    
    return [this.interpolate(proportion, pair1[0], pair2[0]),
            this.interpolate(proportion, pair1[1], pair2[1])];
},

coordPairDistance: function(pair)
{
    return Math.sqrt(pair[0] * pair[0] + pair[1] * pair[1]);
},

isCoordPair: function(pair)
{
    return this.isPair(pair) && this.isFiniteNumber(pair[0]) && this.isFiniteNumber(pair[1]);
},

isNonNegCoordPair: function(pair)
{
    return this.isCoordPair(pair) && pair[0] >= 0 && pair[1] >= 0;
},

isPositiveCoordPair: function(pair)
{
    return this.isCoordPair(pair) && pair[0] > 0 && pair[1] > 0;
},

clipNegativeCoordPair: function(pair)
{
    return this.coordPairMax([0, 0], pair);
},

});
