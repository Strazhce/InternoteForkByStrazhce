// Internote Extension
// Animation Framework & Specific Note Animations
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

// Uses: internote-ui-display.js, internote-ui-notes.js, internote-utils.js

// The animation system works in two parts.  You need to create an animation, and then an animation driver.
// There is only one animation driver, but many different animations to choose from.

// Compound animations can be built using sequential and parallel animation classes.

// The animation driver allows hurrying the animation (sending it to the end immediately) and
// abandoning it (stopping the animation without completion).

// Calls into an animation can come from the animation driver or a compound animation that includes it.
// Unless abandoned, the driver and animations must follow and expect the following rules:
// - The sequence of calls: exactly 1 indicateStart(), 1 or more doStep(), exactly 1 indicateComplete().
// - Each call to doStep() includes a ratio between 0 and 1 indicating how much time has passed since start.
// - A call into doStep is required immediately after indicateStart and immediately before indicateComplete.
//   Because of these immediate calls, there is no need to include any doStep code in the indicate* methods,
//   they are only for unique actions on start/complete.
// - The doStep() call before indicateComplete() MUST be doStep(1).
// - The doStep() call after indicateStart() will usually be doStep(0).  However for animations that are
//   in a sequence but not the first stage:
//   o it might be more than 0 due to the inaccuracy of ticks.
//   o when the sequence is hurried before the stage starts, the one and only call will be doStep(1).
//     In this case the doStep() calls after indicateStart() and before indicateComplete() will be
//     the same doStep(1) call.
// - These rules apply regardless of whether the animation is simple, sequential or parallel.  Thus
//   you can build compound animations consisting of other compound animations.

// For simple animations, you must incorporate your own doStep method via constructor or member assignment.

// For the reusable simple/compound animations, and you may incorporate onStart and onComplete methods
// of your own, which will be called by the appropriate indicateStart and indicateStop methods if present.

// There is also an animationCompleted event in the driver.

var internoteAnimation = {
    init: function(utils) { this.utils = utils; }
};

internoteAnimation.AnimationCompleteEvent = function(animation, data)
{
    this.animation = animation;
    this.data = data;
};

internoteUtilities.nameConstructor(internoteAnimation, "AnimationCompleteEvent");

////////////////////
// Basic Animation Class
////////////////////

internoteAnimation.Animation = function(type, doStep, onStart, onComplete)
{
    this.type       = type; // just for debugging
    
    this.doStep     = doStep;
    
    this.onStart    = onStart;
    this.onComplete = onComplete;
};

internoteAnimation.Animation.prototype.indicateStart = function()
{
    if (this.onStart != null)
    {
        this.onStart();
    }
};

internoteAnimation.Animation.prototype.indicateComplete = function()
{
    if (this.onComplete != null)
    {
        this.onComplete();
    }
};

internoteUtilities.nameConstructor(internoteAnimation, "Animation");

////////////////////////////
// Parallel Animation Class
////////////////////////////

internoteAnimation.ParallelAnimation = function(animations, onStart, onComplete)
{
    this.type = "parallel";
    this.animations = animations;
    
    this.onStart    = onStart;
    this.onComplete = onComplete;
};

internoteUtilities.nameConstructor(internoteAnimation, "ParallelAnimation");

internoteAnimation.ParallelAnimation.prototype.indicateStart = function()
{
    if (this.onStart != null)
    {
        this.onStart();
    }
    for each (var animation in this.animations)
    {
        animation.indicateStart();
    }
};

internoteAnimation.ParallelAnimation.prototype.doStep = function(ratioDone)
{
    //dump("internoteAnimation.ParallelAnimation.doStep RatioDone = " + ratioDone + "\n");
    for each (var animation in this.animations)
    {
        animation.doStep(ratioDone);
    }
};

internoteAnimation.ParallelAnimation.prototype.indicateComplete = function()
{
    for each (var animation in this.animations)
    {
        animation.indicateComplete();
    }
    if (this.onComplete != null)
    {
        this.onComplete();
    }
};

//////////////////////////////
// Sequential Animation Class
//////////////////////////////

internoteAnimation.SequentialAnimation = function(stages, proportions, onStart, onComplete)
{
    this.type = "multi";
    
    this.stages     = stages;
    this.stageCount = stages.length; // store the stage count because we add a sentinel
    this.stageNum   = 0;
    
    var sum = proportions.reduce(function(a,b) { return a+b; });
    
    this.startRatios = [];
    
    var currentStartRatio = 0;
    
    for (var i = 0; i < proportions.length; i++)
    {
        this.startRatios[i] = currentStartRatio;
        currentStartRatio += (proportions[i] / sum);
    }
    
    this.startRatios[i] = 1; // Sentinel value for simpler step code.
    
    this.onStart    = onStart;
    this.onComplete = onComplete;
};

internoteUtilities.nameConstructor(internoteAnimation, "SequentialAnimation");

internoteAnimation.SequentialAnimation.prototype.indicateStart = function()
{
    this.stageNum = 0;
    
    this.stageStart  = this.startRatios[this.stageNum];
    this.stageEnd    = this.startRatios[this.stageNum + 1];
    this.stageLength = this.stageEnd - this.stageStart;
    
    if (this.onStart != null)
    {
        this.onStart();
    }
    
    this.stages[0].indicateStart();
};

internoteAnimation.SequentialAnimation.prototype.doStep = function(ratioDone)
{
    //dump("internoteAnimation.SequentialAnimation.doStep RatioDone = " + ratioDone + "\n");
    
    internoteUtilities.assertError(this.stageNum < this.stageCount, "Animation already completed.");
    
    if (this.stageEnd <= ratioDone)
    {
        // First indicate any completed stages.
        while(true)
        {
            //dump("  Completing " + this.stageNum + "\n");
            
            var stage = this.stages[this.stageNum];
            
            stage.doStep(1);
            stage.indicateComplete();
            
            this.stageNum++;
            
            if (this.stageCount <= this.stageNum) return;
            
            //dump("  Starting " + this.stageNum + "\n");
            
            this.stages[this.stageNum].indicateStart();
            
            if (ratioDone < this.startRatios[this.stageNum + 1]) break;
        }
        
        // ... and update the stage info.
        this.stageStart  = this.startRatios[this.stageNum];
        this.stageEnd    = this.startRatios[this.stageNum + 1];
        this.stageLength = this.stageEnd - this.stageStart;
        
        //dump("  StageStart = " + this.stageStart + " StageEnd = " + this.stageEnd + " StageLength = " + this.stageLength + "\n");
    }
    
    // Then indicate a step for the appropriate stage.
    var animationDone = (ratioDone - this.stageStart) / this.stageLength;
    
    //dump("  AnimationDone = " + animationDone + "\n");
    
    this.stages[this.stageNum].doStep(animationDone);
};

internoteAnimation.SequentialAnimation.prototype.indicateComplete = function()
{
    // There no need to call anything on the last stage, because the previous
    // call to SequentialAnimation.doStep(1) should have done that.
    
    if (this.onComplete != null)
    {
        this.onComplete();
    }
};

//////////////////
// AnimationDriver
//////////////////

internoteAnimation.AnimationDriver = function(utils, animation)
{
    this.utils = utils;
    
    this.animation = animation;
    
    this.isStarted = false;
    
    this.initEventDispatcher();
    this.createEvent("animationCompleted");
};

internoteUtilities.nameConstructor(internoteAnimation, "AnimationDriver");

internoteAnimation.AnimationDriver.prototype.stepTime = 50;

internoteAnimation.AnimationDriver.prototype.start = function(animationTime)
{
    this.utils.assertError(this.utils.isPositiveNumber(animationTime), "Bad animation time.", animationTime);
    
    // We don't do this in the constructor because it's not relevant if hurry instead of start is called.
    this.animationTime = animationTime;
    
    // It's okay to start immediately if we have a delayed start pending, just kill it.
    if (this.delayTimeout != null)
    {
        clearTimeout(this.delayTimeout);
        this.delayTimeout = null;
    }
    
    this.utils.assertError(!this.isStarted, "Can't start an already started animation.");
    
    this.isStarted = true;
    
    this.animation.indicateStart();
    this.animation.doStep(0);
    
    this.startTime = new Date().getTime();
    this.interval = setInterval(this.utils.bind(this, this.animateStep), this.stepTime);
};

internoteAnimation.AnimationDriver.prototype.delayedStart = function(delayTime, animationTime)
{
    this.utils.assertError(!this.isStarted, "Can't delay start an already started animation.");
    
    this.delayTimeout = setTimeout(this.utils.bind(this, function()
    {
        this.delayTimeout = null;
        this.start(animationTime);
    }), delayTime);
};

internoteAnimation.AnimationDriver.prototype.animateStep = function()
{
    try
    {
        var currentTime = new Date().getTime();
        var timeElapsed = currentTime - this.startTime;
        var ratioDone   = timeElapsed / this.animationTime;
        
        //dump("Animation Ratio = " + ratioDone + " Time = " + this.animationTime + "\n");
        
        if (1 <= ratioDone)
        {
            this.abandonTimer();
            this.animation.doStep(1);
            this.animation.indicateComplete();
            this.dispatchEvent("animationCompleted", new internoteAnimation.AnimationCompleteEvent(this.animation) );
        }
        else
        {
            this.utils.assertError(this.utils.isFiniteNumber(ratioDone) && 0 <= ratioDone && ratioDone <= 1, "Bad ratio.", ratioDone);
            this.animation.doStep(ratioDone);
        }
        
        //var currentTime2 = new Date().getTime();
        //dump("DIFF = " + (currentTime - this.oldTime) + " RUN = " + (currentTime2 - currentTime) + " " + currentTime + " " + currentTime2 + "\n");
        //this.oldTime = currentTime2;
    }
    catch (ex)
    {
        this.utils.handleException("Exception caught during animation step.", ex);
        this.abandonTimer();
    }
};

internoteAnimation.AnimationDriver.prototype.abandonTimer = function()
{
    this.utils.assertWarn(this.delayTimeout == null || this.interval == null, "Both set when abandoning animation timer.");
    
    if (this.delayTimeout != null)
    {
        clearTimeout(this.delayTimeout);
        this.delayTimeout = null;
    }
    
    if (this.interval != null)
    {
        clearInterval(this.interval);
        this.interval = null;
    }
};

internoteAnimation.AnimationDriver.prototype.hurry = function()
{
    if (!this.isStarted)
    {
        this.isStarted = true;
        this.animation.indicateStart();
        this.animation.doStep(0);
    }
    
    this.animation.doStep(1);
    this.animation.indicateComplete();
    this.abandonTimer();
    this.dispatchEvent("animationCompleted", new internoteAnimation.AnimationCompleteEvent(this.animation) );
};

InternoteEventDispatcher.prototype.incorporateED(internoteAnimation.AnimationDriver.prototype);

//////////////////////
// Specific Animations
//////////////////////

internoteAnimation.getFadeAnimation = function(utils, element, shouldFadeIn)
{
    if (typeof(element) == "string")
    {
        element = document.getElementById(element);
    }
    
    var stepFunc = shouldFadeIn
       ? function(timeRatioDone) { element.style.opacity = timeRatioDone; }
       // We use quadratics so that most of the fade out happens quickly, then slows.
       : function(timeRatioDone) { element.style.opacity = Math.pow(timeRatioDone - 1, 2); };
    return new this.Animation("fade", stepFunc);
};

internoteAnimation.getFlipAnimation = function(utils, noteUI, displayUI, uiNote)
{
    var phase1 = new this.Animation("flip1");
    var phase2 = new this.Animation("flip2");
    
    var multiAnimation = new internoteAnimation.SequentialAnimation([phase1, phase2], [1, 1]);
    
    var startPos  = displayUI.getScreenPosition(uiNote);
    var startDims = noteUI.   getDims          (uiNote);
    
    phase1.onStart = phase2.onStart = function()
    {
        noteUI.makeStaticImage(uiNote, startDims);
        displayUI.flipStart(uiNote);
    };
    
    phase2.onStart = function()
    {
        noteUI.flipNote       (uiNote);
        noteUI.makeStaticImage(uiNote, startDims);
    }
    
    phase1.onComplete = function()
    {
        noteUI.makeDynamic    (uiNote)
    };
    
    phase2.onComplete = function()
    {
        noteUI.makeDynamic(uiNote);
        
        if (!uiNote.isFlipped)
        {
            // XXX Kludge!
            uiNote.textArea.focus();
        }
    };
    
    phase1.doStep = phase2.doStep = function(timeRatioDone)
    {
        internoteUtilities.assertWarn(timeRatioDone != null, "Oops");
        
        if (multiAnimation.stageNum == 1) timeRatioDone += 1; // get the second half of the cosine function
        
        // We wish to model a note going around in a circle in three dimensions.  So this function is
        // determined by considering a unit circle (which is an "overhead view" where the X axis of the
        // circle is the X axis of the screen and the Y axis of the circle is the Z axis of the screen.)
        // Hence we can use the cosine function to determine the length of the "adjacent side" as a
        // proportion of its maximum (the unit) and hence the note width.
        var widthProportion = Math.abs(Math.cos(timeRatioDone * Math.PI / 2));
        var width  = Math.round(startDims[0] * widthProportion);
        
        // Keep it with the same even/odd-ness so we always lose one pixel on both sides at the same
        // time and therefore it's nicely centred.
        if (width % 2 != startDims[0] % 2) width--;
        
        if (width < 2) width = 2;
        
        var widthLost = startDims[0] - width;
        var left = startPos[0] + (widthLost / 2);
        
        var noteElt = uiNote.noteElt;
        
        if (width != noteElt.style.width || left != noteElt.left)
        {
            displayUI.flipStep(uiNote, widthLost/2);
            //displayUI.moveNote  (uiNote, [left,  null]);
            noteUI.   adjustDims(uiNote, [width, null]);
        }
    };
    
    return multiAnimation;
};

// This expression uses the shape of the cosine function to model a movement that starts slowly,
// ends slowly, but is quicker in the middle, which is desirable for move & resize animations.
// The expression's transformations on cos are because it is necessary to translate a number
// between 0 and 1 to another number between 0 and 1, where "proportion of time complete"
// is the input, and "proportion of distance complete" is the output.
internoteAnimation.translateMovement = function(timeRatioDone)
{
    return (1 - Math.cos(timeRatioDone * Math.PI)) / 2;
};

// This moves between one 2D "coordinate" to another in a straight line.  The time/distance relationship is
// usually non-linear - it moves slower at the beginning and end.
// This can be used for moving or resizing, depending on whether the pairs are pos or dims.
internoteAnimation.getMoveOrResizeAnimation = function(utils, noteUI, displayUI, uiNote, endPair, isResize, shouldForceLinear)
{
    var animation = new this.Animation(isResize ? "resize" : "move");
    
    var startPair;
    
    animation.onStart = function()
    {
        // We delay this until start in case an existing animation on the note has not yet been hurried.
        startPair = isResize ? noteUI.getDims(uiNote) : displayUI.getScreenPosition(uiNote);
        displayUI.moveStart(uiNote);
    };
    
    animation.onComplete = function()
    {
        displayUI.moveEnd(uiNote);
    };
    
    animation.doStep = function(timeRatioDone)
    {
        var distanceDone = shouldForceLinear ? timeRatioDone : internoteAnimation.translateMovement(timeRatioDone);
        var interpolatedValue = utils.interpolateCoordPair(distanceDone, startPair, endPair);
        
        //dump("  MoveResize RatioDone = " + timeRatioDone + " " + distanceDone + "\n");
        
        if (isResize)
        {
            // Deal with noteUI before displayUI because the display UI might care.
            noteUI.adjustDims(uiNote, interpolatedValue);
            displayUI.adjustNote(uiNote, null, interpolatedValue);
        }
        else
        {
            displayUI.adjustNote(uiNote, interpolatedValue, null);
        }
    };
    
    return animation;
};

// A move and resize animation does both moving and resizing at the same time.  However such animations
// are suspectible to a "bouncing" effect on the bottom/right where the corner bounces back and forth
// between adjecent pixels.  To avoid this we use the bottomRight instead of the dims.
internoteAnimation.getMoveAndResizeAnimation = function(utils, noteUI, displayUI, uiNote, endNWPos, endDims)
{
    var animation = new this.Animation("moveresize");
    
    var startNWPos, startSEPos;
    var endSEPos   = utils.makeRectFromDims(endNWPos,   endDims)  .bottomRight;
    
    animation.onStart = function()
    {
        // We delay this until start in case an existing animation on the note has not yet been hurried.
        var startDims = noteUI.getDims(uiNote);
        
        startNWPos = displayUI.getScreenPosition(uiNote);
        startSEPos = utils.makeRectFromDims(startNWPos, startDims).bottomRight;
        
        displayUI.moveStart(uiNote);
    };
    
    animation.onComplete = function()
    {
        displayUI.moveEnd(uiNote);
    };
    
    animation.doStep = function(timeRatioDone)
    {
        var distanceDone = internoteAnimation.translateMovement(timeRatioDone);
        var interpolatedNWPos = utils.interpolateCoordPair(distanceDone, startNWPos, endNWPos);
        var interpolatedSEPos = utils.interpolateCoordPair(distanceDone, startSEPos, endSEPos);
        
        var roundedRect = utils.makeRoundedRect(interpolatedNWPos, interpolatedSEPos);
        
        var oldNWPos = displayUI.getScreenPosition(uiNote);
        var oldDims  = noteUI   .getDims(uiNote);
        
        if (!utils.areArraysEqual(oldNWPos, roundedRect.topLeft) || !utils.areArraysEqual(oldDims, roundedRect.dims) )
        {
            // Deal with noteUI before displayUI because the display UI might care.
            noteUI.   adjustDims(uiNote, roundedRect.dims);
            displayUI.adjustNote(uiNote, roundedRect.topLeft, roundedRect.dims);
        }
    };
    
    return animation;
};

internoteAnimation.getNullAnimation = function()
{
    var animation = new this.Animation("null");
    animation.doStep           = function() {};
    animation.indicateStart    = function() {};
    animation.indicateComplete = function() {};
    return animation;
};

internoteAnimation.getMinimizeAnimation = function(utils, noteUI, displayUI, uiNote, endPos, endDims)
{
    this.utils.assertError(this.utils.isCoordPair(endPos),        "Invalid pos.",  endPos );
    this.utils.assertError(this.utils.isNonNegCoordPair(endDims), "Invalid dims.", endDims);
    
    var moveResizeAnimation = this.getMoveAndResizeAnimation(utils, noteUI, displayUI, uiNote, endPos, endDims);
    
    var fadeLittleAnimation = this.getFadeAnimation(utils, uiNote.littleText, uiNote.note.isMinimized)
    var fadeBigAnimation    = this.getFadeAnimation(utils, uiNote.midBotBox,  !uiNote.note.isMinimized);
    
    var fadeAnimations = uiNote.note.isMinimized ? [fadeBigAnimation,    fadeLittleAnimation] :
                                                   [fadeLittleAnimation, fadeBigAnimation   ];
    
    var combinedAnimation = new this.SequentialAnimation(fadeAnimations, [1, 1]);
    
    var reminimizeFunc = function()
    {
        noteUI.adjustMinimizing(uiNote);
        noteUI.flipNote(uiNote, false);
    };
    
    var wholeAnimation = new this.ParallelAnimation([moveResizeAnimation, combinedAnimation]);
    
    fadeAnimations[0].onComplete = reminimizeFunc;
    
    return wholeAnimation;
};

internoteAnimation.getForeRecolorAnimation = function(utils, noteUI, uiNote, endColor)
{
    var animation = new this.Animation("forerecolor");
    
    var startColorArr, endColorArr;
    
    animation.onStart = function()
    {
        // We delay this until start in case an existing animation on the note has not yet been hurried.
        startColorArr = utils.parseHexColor(noteUI.getForeColor(uiNote));
        endColorArr   = utils.parseHexColor(endColor);
    };
    
    animation.doStep = function(timeRatioDone)
    {
        var interpolatedColor = utils.interpolateColor(timeRatioDone, startColorArr, endColorArr);
        var hexColor = utils.formatHexColor(interpolatedColor);
        noteUI.setForeColor(uiNote, hexColor);
    };
    
    return animation;
};

internoteAnimation.getBackRecolorAnimation = function(utils, noteUI, uiNote, endColor)
{
    var animation = new this.Animation("backrecolor");
    
    var startColorArr, endColorArr;
    
    animation.onStart = function()
    {
        // We delay this until start in case an existing animation on the note has not yet been hurried.
        startColorArr = utils.parseHexColor(uiNote.backColor);
        endColorArr   = utils.parseHexColor(endColor);
    };
    
    animation.doStep = function(timeRatioDone)
    {
        //var distanceDone = internoteAnimation.translateMovement(timeRatioDone);
        var interpolatedColor = utils.interpolateColor(timeRatioDone, startColorArr, endColorArr);
        var hexColor = utils.formatHexColor(interpolatedColor);
        noteUI.setBackColor(uiNote, hexColor, false);
    };
    
    return animation;
};
