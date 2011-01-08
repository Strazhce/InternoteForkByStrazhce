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

// This file contains various utilities for calculating with coordinates,
// represented as size-2 arrays (pairs) of numbers.

internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils.incorporate("CoordUtils", {

// PUBLIC: Add two coordinates.
coordPairAdd: function(a, b)
{
    return [a[0] + b[0], a[1] + b[1]];
},

// PUBLIC: Subtract two coordinates.
coordPairSubtract: function(a, b)
{
    return [a[0] - b[0], a[1] - b[1]];
},

// PUBLIC: Subtract two coordinates, clipping to zero if negative
// This prevents negative lengths causing issues in boundary cases.
coordPairSubtractNonNeg: function(a, b)
{
    return [Math.max(0, a[0] - b[0]), Math.max(0, a[1] - b[1])];
},

// PUBLIC: Multiply a coordinate by a constant.
coordPairMultiply: function(c, a)
{
    return [c * a[0], c * a[1]];
},

// PUBLIC: Take the pairwise minimum of two coordinates.
coordPairMin: function(a, b)
{
    return [Math.min(a[0], b[0]), Math.min(a[1], b[1])];
},

// PUBLIC: Take the pairwise maximum of two coordinates.
coordPairMax: function(a, b)
{
    return [Math.max(a[0], b[0]), Math.max(a[1], b[1])];
},

// PUBLIC: Check whether two coordinate pairs are equal.
areCoordPairsEqual: function(a, b)
{
    return a[0] == b[0] && a[1] == b[1];
},

// PUBLIC: Round off a coordinate.
roundCoordPair: function(pair)
{
    return [Math.round(pair[0]), Math.round(pair[1])];
},

// PUBLIC: Linear interpolator between two points.
// proportion = 0.0 => pair1, proportion = 1.0 => pair2
interpolateCoordPair: function(proportion, pair1, pair2)
{
    this.assertError(this.isCoordPair(pair1),  "Invalid pair1.", pair1);
    this.assertError(this.isCoordPair(pair2),  "Invalid pair2.", pair2);
    
    return [this.interpolate(proportion, pair1[0], pair2[0]),
            this.interpolate(proportion, pair1[1], pair2[1])];
},

// PUBLIC: Calculate distance between two coordinates.
coordPairDistance: function(pair)
{
    return Math.sqrt(pair[0] * pair[0] + pair[1] * pair[1]);
},

// PUBLIC: Check whether an object is a coordinate.
isCoordPair: function(pair)
{
    return this.isPair(pair) && this.isFiniteNumber(pair[0]) && this.isFiniteNumber(pair[1]);
},

// PUBLIC: Check whether an object is a non-negative coordinate in both dimensions.
isNonNegCoordPair: function(pair)
{
    return this.isCoordPair(pair) && pair[0] >= 0 && pair[1] >= 0;
},

// PUBLIC: Check whether an object is a positive coordinate in both dimensions.
isPositiveCoordPair: function(pair)
{
    return this.isCoordPair(pair) && pair[0] > 0 && pair[1] > 0;
},

// PUBLIC: Return the coordinate, clipped to zero in each dimension if negative.
clipNegativeCoordPair: function(pair)
{
    return this.coordPairMax([0, 0], pair);
},

});
