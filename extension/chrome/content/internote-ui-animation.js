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

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.AnimationCompleteEvent = 
function AnimationCompleteEvent(animation, data)
{
    this.animation = animation;
    this.data = data;
};

////////////////////
// Simple Animation Class
////////////////////

// This is for a simple animation that adjusts something depending
// on an animation proportion between 0 and 1.

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.Animation =
function Animation(type, doStep, onStart, onComplete)
{
    this.type       = type; // just for debugging
    
    this.doStep     = doStep;
    
    this.onStart    = onStart;
    this.onComplete = onComplete;
};

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.Animation.prototype =
{

// PUBLIC: Called on an animation when it starts.
indicateStart: function()
{
    if (this.onStart != null)
    {
        this.onStart();
    }
},

// PUBLIC: Called on an animation when it completes.
indicateComplete: function()
{
    if (this.onComplete != null)
    {
        this.onComplete();
    }
},

};

////////////////////////////
// Parallel Animation Class
////////////////////////////

// This class can be used to perform multiple other animations in parallel.

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.ParallelAnimation =
function ParallelAnimation(animations, onStart, onComplete)
{
    this.type = "parallel";
    this.animations = animations;
    
    this.onStart    = onStart;
    this.onComplete = onComplete;
};

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.ParallelAnimation.prototype =
{

// PUBLIC: Called on an animation when it starts.
indicateStart: function()
{
    if (this.onStart != null)
    {
        this.onStart();
    }
    for each (var animation in this.animations)
    {
        animation.indicateStart();
    }
},

// PUBLIC: Called on an animation when a step in done.
doStep: function(ratioDone)
{
    //dump("internoteAnimation.ParallelAnimation.doStep RatioDone = " + ratioDone + "\n");
    for each (var animation in this.animations)
    {
        animation.doStep(ratioDone);
    }
},

// PUBLIC: Called on an animation when it completes.
indicateComplete: function()
{
    for each (var animation in this.animations)
    {
        animation.indicateComplete();
    }
    if (this.onComplete != null)
    {
        this.onComplete();
    }
},

};

//////////////////////////////
// Sequential Animation Class
//////////////////////////////

// This class can be used to perform multiple other animations in sequence.

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.SequentialAnimation =
function SequentialAnimation(stages, proportions, onStart, onComplete)
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

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.SequentialAnimation.prototype =
{

// PUBLIC: Called on an animation when it starts.
indicateStart: function()
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
},

// PUBLIC: Called on an animation when a step in done.
doStep: function(ratioDone)
{
    //dump("internoteAnimation.SequentialAnimation.doStep RatioDone = " + ratioDone + "\n");

    var utils = internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils;
    utils.assertError(this.stageNum < this.stageCount, "Animation already completed.");
    
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
},

// PUBLIC: Called on an animation when it completes.
indicateComplete: function()
{
    // There no need to call anything on the last stage, because the previous
    // call to SequentialAnimation.doStep(1) should have done that.
    
    if (this.onComplete != null)
    {
        this.onComplete();
    }
},

};

//////////////////
// AnimationDriver
//////////////////

// This is the driver class. Given an animation (which can be simple, parallel or sequential),
// it drives it on a timer from start through to end.

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.AnimationDriver =
function AnimationDriver(windowGlobal, animation)
{
    this.utils     = windowGlobal.sharedGlobal.utils;
    
    this.AnimationCompleteEvent = windowGlobal.AnimationCompleteEvent;
    
    this.animation = animation;
    
    this.isStarted = false;
    
    this.initEventDispatcher();
    this.createEvent("animationCompleted");
};

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.AnimationDriver.prototype =
    new internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.EventDispatcher();

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.AnimationDriver.prototype.incorporate("AnimationDriver", {

stepTime: 50,

// PUBLIC: Starts the animation.
start: function(animationTime)
{
    this.utils.assertError(this.utils.isPositiveNumber(animationTime), "Bad animation time.", animationTime);
    
    // We don't do this in the constructor because it's not relevant if hurry instead of start is called.
    this.animationTime = animationTime;
    
    // It's okay to start immediately if we have a delayed start pending, just kill it.
    if (this.delayTimeout != null)
    {
        this.utils.cancelTimer(this.delayTimeout);
        this.delayTimeout = null;
    }
    
    this.utils.assertError(!this.isStarted, "Can't start an already started animation.");
    
    this.isStarted = true;
    
    this.animation.indicateStart();
    this.animation.doStep(0);
    
    this.startTime = new Date().getTime();
    this.interval = this.utils.createInterval(this.utils.bind(this, this.animateStep), this.stepTime);
},

// PUBLIC: Starts the animation after a delay.
delayedStart: function(delayTime, animationTime)
{
    this.utils.assertError(!this.isStarted, "Can't delay start an already started animation.");
    
    this.delayTimeout = this.utils.createTimeout(this.utils.bind(this, function()
    {
        this.delayTimeout = null;
        this.start(animationTime);
    }), delayTime);
},

// PRIVATE: This calculates where in time we currently are, and passes the proportion
// done to the animation so it can update itself. This ensures that a slow computer
// will do less frames.
animateStep: function()
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
            this.dispatchEvent("animationCompleted", new this.AnimationCompleteEvent(this.animation) );
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
},

// PUBLIC: Abandons the animation, for example if we leave the page where the note is.
abandonTimer: function()
{
    this.utils.assertWarn(this.delayTimeout == null || this.interval == null, "Both set when abandoning animation timer.");
    
    if (this.delayTimeout != null)
    {
        this.utils.cancelTimer(this.delayTimeout);
        this.delayTimeout = null;
    }
    
    if (this.interval != null)
    {
        this.utils.cancelTimer(this.interval);
        this.interval = null;
    }
},

// PUBLIC: Moves the animation immediately to its end state, for example if another animation is starting!
hurry: function()
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
    this.dispatchEvent("animationCompleted", new this.AnimationCompleteEvent(this.animation) );
},

});

//////////////////////
// Specific Animations
//////////////////////

// Simple animation to fade an element in or out.

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.getFadeAnimation =
function(windowGlobal, element, shouldFadeIn)
{
    var utils = windowGlobal.sharedGlobal.utils;
    
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

// Animation to flip a note, by in sequence first reducing the size to 0
// and then increasing it back to its original size.

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.getFlipAnimation =
function(windowGlobal, uiNote)
{
    var utils     = windowGlobal.sharedGlobal.utils;
    
    var noteUI    = windowGlobal.noteUI;
    var displayUI = windowGlobal.displayUI;

    var phase1 = new this.Animation("flip1");
    var phase2 = new this.Animation("flip2");
    
    var multiAnimation = new windowGlobal.SequentialAnimation([phase1, phase2], [1, 1]);
    
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
        var utils = internoteSharedGlobal_e3631030_7c02_11da_a72b_0800200c9a66.utils;
        utils.assertWarn(timeRatioDone != null, "Oops");
        
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
            displayUI.flipStep(uiNote, widthLost/2, width);
            noteUI.   adjustDims(uiNote, [width, null]);
        }
    };
    
    return multiAnimation;
};

// Simple animation to move or resize an element. It changes slower at the beginning and end
// and faster in the middle, for a nicer animation.

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.getMoveOrResizeAnimation =
function(windowGlobal, uiNote, endPair, isResize, shouldForceLinear)
{
    var utils     = windowGlobal.sharedGlobal.utils;
    
    var noteUI    = windowGlobal.noteUI;
    var displayUI = windowGlobal.displayUI;
    
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
        var distanceDone = shouldForceLinear ? timeRatioDone : utils.translateMovement(timeRatioDone);
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

// A parallel animation that both moves and resizes at once. Such animations are suspectible
// to a "bouncing" effect on the bottom/right where the corner bounces back and forth
// between adjecent pixels.  To avoid this we use the bottomRight instead of the dims.

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.getMoveAndResizeAnimation =
function(windowGlobal, uiNote, endNWPos, endDims)
{
    var utils     = windowGlobal.sharedGlobal.utils;
    
    var noteUI    = windowGlobal.noteUI;
    var displayUI = windowGlobal.displayUI;
    
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
        var distanceDone = utils.translateMovement(timeRatioDone);
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

// A simple animation that does nothing. This is mostly useful when you have a parallel animation
// of sequential animations, and some of the sequences will sometimes be doing nothing.

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.getNullAnimation =
function()
{
    var animation = new this.Animation("null");
    animation.doStep           = function() {};
    animation.indicateStart    = function() {};
    animation.indicateComplete = function() {};
    return animation;
};

// A minimize animation that does move, resize and fade animations in parallel and sequence.

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.getMinimizeAnimation =
function(windowGlobal, uiNote, endPos, endDims)
{
    var utils     = windowGlobal.sharedGlobal.utils;
    
    var noteUI    = windowGlobal.noteUI;
    var displayUI = windowGlobal.displayUI;
    
    utils.assertError(utils.isCoordPair(endPos),        "Invalid pos.",  endPos );
    utils.assertError(utils.isNonNegCoordPair(endDims), "Invalid dims.", endDims);
    
    var moveResizeAnimation = this.getMoveAndResizeAnimation(windowGlobal, uiNote, endPos, endDims);
    
    var fadeLittleAnimation = this.getFadeAnimation(windowGlobal, uiNote.littleText, uiNote.note.isMinimized)
    var fadeBigAnimation    = this.getFadeAnimation(windowGlobal, uiNote.midBotBox,  !uiNote.note.isMinimized);
    
    var fadeAnimations = uiNote.note.isMinimized ? [fadeBigAnimation,    fadeLittleAnimation] :
                                                   [fadeLittleAnimation, fadeBigAnimation   ];
    
    var combinedAnimation = new this.SequentialAnimation(fadeAnimations, [1, 1]);
    
    var reminimizeFunc = function()
    {
        noteUI.setMinimizedVisibility(uiNote);
        noteUI.flipNote(uiNote, false);
    };
    
    var wholeAnimation = new this.ParallelAnimation([moveResizeAnimation, combinedAnimation]);
    
    fadeAnimations[0].onComplete = reminimizeFunc;
    
    return wholeAnimation;
};

// A simple animation that changes a note UI's foreground text color.

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.getForeRecolorAnimation =
function(windowGlobal, uiNote, endColor)
{
    var utils     = windowGlobal.sharedGlobal.utils;
    
    var noteUI    = windowGlobal.noteUI;
    
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

// A simple animation that changes a note UI's background note color.

internoteWindowGlobal_e3631030_7c02_11da_a72b_0800200c9a66.getBackRecolorAnimation =
function(windowGlobal, uiNote, endColor)
{
    var utils     = windowGlobal.sharedGlobal.utils;
    
    var noteUI    = windowGlobal.noteUI;
    
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
        var interpolatedColor = utils.interpolateColor(timeRatioDone, startColorArr, endColorArr);
        var hexColor = utils.formatHexColor(interpolatedColor);
        noteUI.setBackColor(uiNote, hexColor, false);
    };
    
    return animation;
};
