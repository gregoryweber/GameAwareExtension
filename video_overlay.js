import {startSvg, updateSvg, increaseFontSize, decreaseFontSize} from './update_svg.js';


const twitch = window.Twitch.ext;

let broadcastLatency;
let start_game_secs;
let start_clock_secs;
let tween_rate = 24;
let key_rate = 1;
let target = 50;
let screen_width;
let screen_height;
let initialBuffer = [];

twitch.onContext((context) => {
  broadcastLatency = context.hlsLatencyBroadcaster;
});

// TODO: change underscore variables to camelcase;
var worldModel = {};
let forwardBuffer = [];

// onAuthorized callback called each time viewer is authorized
twitch.onAuthorized((auth) => {
    getStartData(); // get the start frame and the accompanying variables
    setUpInitialBuffer(); // construct the  buffer that we will use to sync the data
});

function getStartData(){
    $.ajax({
        type: 'GET',
        // url: location.protocol + '//cmuctpawsec2.com/startData', // For remote, replace localhost with location.protocol + //cmuctpawsec2.com/startData
        url: location.protocol + '//localhost:3000/startData', 
        contentType: 'application/json',
        headers: { authorization: 'Bearer ' + window.Twitch.ext.viewer.sessionToken},
        success: function(res) {
            start_game_secs = res.game_time;
            start_clock_secs = res.clock_mills;
            key_rate = res.key_frame_rate;
            tween_rate = res.tween_frame_rate;
            screen_width = res.screen_width;
            screen_height = res.screen_height;
        } 
    });

}
// Initial latest frame get request to figure out current latest, used to build back buffer
function setUpInitialBuffer(){
    let backPadding = parseInt(broadcastLatency)*(2/key_rate); // pad an extra few seconds
    $.ajax({
        type: 'GET',
        // url: location.protocol + '//cmuctpawsec2.com/initialBuffer?padding='+backPadding, // For remote, replace localhost with location.protocol +//cmuctpawsec2.com/initialBuffer?padding=
        url: location.protocol + '//localhost:3000/initialBuffer?padding='+backPadding, // For remote, replace localhost with location.protocol +//cmuctpawsec2.com/initialBuffer?padding=
        async:true,
        contentType: 'application/json',
        headers: { authorization: 'Bearer ' + window.Twitch.ext.viewer.sessionToken},
        success: function(res) {
          initialBuffer = res;
        },
        complete: function(){
            setInterval(getLatestData, 1/key_rate *1000);
            startGameLoop();            
        } 
    });
}

function getLatestData(){
      $.ajax({
          type: 'GET',
        //   url: location.protocol + '//cmuctpawsec2.com/latestData', // For remote, replace localhost with location.protocol +//cmuctpawsec2.com/latestData
          url: location.protocol + '//localhost:3000/latestData', // For remote, replace localhost with location.protocol +//cmuctpawsec2.com/latestData
          headers: { authorization: 'Bearer ' + window.Twitch.ext.viewer.sessionToken},
          success: function(res) {        
            forwardBuffer.push(res);
          } 
      });

}

function syncBuffer(){
    let actualKeyPointer;
    let actualTweenPointer = 0;
    initialBuffer.push.apply(initialBuffer, forwardBuffer);
    forwardBuffer.length = 0;


    //Date.now() = current time in viewer's frame of reference
    //start_clock_secs = local time stamp from the streamer's computer
    //start_game_secs = Unity's frame of reference of time (all future game times are from this frame of reference)
    //broadcastLatency = number from Twitch, latency from the streamer to the viewer
    let dateNow = Date.now();
    let actualTime = dateNow - start_clock_secs - start_game_secs - (broadcastLatency * 1000);

    
    actualKeyPointer = initialBuffer.length-1;
    // console.log('initialBuffer: ', initialBuffer[actualKeyPointer])
    if (!initialBuffer[actualKeyPointer].tweens){
        console.log("Error: Tween object cannot be found");
    } else {
        for( let i = 0; i < initialBuffer[actualKeyPointer].tweens.length-1; i++){
            // console.log(`tween difference: ${actualTime} - ${initialBuffer[actualKeyPointer].tweens[i+1].game_time} = ${actualTime - initialBuffer[actualKeyPointer].tweens[i+1].game_time} `)
            if(actualTime - initialBuffer[actualKeyPointer].tweens[i+1].game_time < -target){
                actualTweenPointer = i;
                break;
            }
        }
    }

    
    initialBuffer.splice(0, initialBuffer.length-1);
    tweenIndex = actualTweenPointer;
    keyFrameIndex = 0;

    if (initialBuffer) {
        // lastKeyTime = Date.now() - (actualTime - initialBuffer[0].game_time);
        timeToNextKey = 1000/key_rate;

        
        
        if(initialBuffer[0].tweens && initialBuffer[0].tweens[tweenIndex+1]){
            timeToNextTween = initialBuffer[0].tweens[tweenIndex+1].game_time - initialBuffer[0].tweens[tweenIndex].game_time - tweenOffset;
            lastTweenTime = Date.now() - (actualTime - initialBuffer[0].tweens[tweenIndex].game_time);
        }
        else{
            timeToNextTween = Math.floor(1000/tween_rate);
            lastTweenTime = lastKeyTime;
        }
    }
    

    updateWorldModelWithKey(initialBuffer[keyFrameIndex]);
    if (initialBuffer[keyFrameIndex].tweens) {
        updateWorldModelWithTween(initialBuffer[keyFrameIndex].tweens[tweenIndex]);
    }
    updateSvg(worldModel, screen_width, screen_height, dialogArray, dialogArrayIndex);
}

var lastKeyTime;
var lastTweenTime;
var keyFrameIndex;
var tweenIndex;
var timeToNextKey;
var timeToNextTween;

function updateWorldModelWithKey(keyFrame){
    if (!keyFrame) {
        console.log("Error: No key frame found");
        return false;
    }
    worldModel = JSON.parse(JSON.stringify(keyFrame));
    return true
}

function updateWorldModelWithTween(tweenFrame){
    if (!tweenFrame) {
        console.log("Error: No tween frame found");
        return false;
    }
    for(let item in tweenFrame){
        for(let attribute in tweenFrame[item]){
            if (worldModel["key"][item]) {
                worldModel["key"][item][attribute] = JSON.parse(JSON.stringify(tweenFrame[item][attribute]));
            } else {
                console.log(`Error: Cannot find ${item} in key`)
            }
           
        }
    }
    worldModel["game_time"] = JSON.parse(JSON.stringify(tweenFrame["game_time"]));
    return true
}
let isLiveDialog = true;
var dialogArray = [];
var newDialog = "";
var dialogArrayIndex = 0;


function startGameLoop(){
    document.getElementById("dialogCheckbox").addEventListener("change", changeDialogSettings);
    document.getElementById("previous-dialog-button").addEventListener("click", previousDialogArray);
    document.getElementById("next-dialog-button").addEventListener("click", advanceDialogArray);
    document.getElementById("target").innerHTML = target;
    document.getElementById("plus").addEventListener("click", incrementTargetOffset);
    document.getElementById("minus").addEventListener("click", decrementTargetOffset);
    startSvg();
   

    lastKeyTime = 0;
    lastTweenTime = 0;
    keyFrameIndex = -1;
    tweenIndex = -1;
    timeToNextKey = 1000/key_rate;
    timeToNextTween = 0;
    syncBuffer();
    window.requestAnimationFrame(gameLoop);

}

var nowTime;
var tweenOffset = 0;
var catchUpTime = 0;
var timeDiff = 0;

function gameLoop(){
    nowTime = Date.now();
    var bloomwoodCheckbox = document.querySelector('input[value="bloomwood"]');
    var   isBloomwoodVisible = bloomwoodCheckbox.checked;
    if (forwardBuffer[keyFrameIndex]) {
      isBloomwoodVisible = forwardBuffer[keyFrameIndex].key.visualNovelText != undefined
    }

    if(nowTime - lastKeyTime >= timeToNextKey && forwardBuffer[keyFrameIndex]){
        keyFrameIndex = Math.max(0, forwardBuffer.length-2);
        // console.log(forwardBuffer[keyFrameIndex])
        catchUpTime += nowTime-lastKeyTime-timeToNextKey;

        let dateNow = Date.now();
        let actualTime = dateNow - start_clock_secs - start_game_secs - (broadcastLatency * 1000);
        // console.log(`dateNow: ${dateNow}, start_clock_secs: ${start_clock_secs}, start_game_secs: ${start_game_secs}, broadcastLatency: ${broadcastLatency}, game_time: ${forwardBuffer[keyFrameIndex].game_time}`)
        timeDiff = actualTime - forwardBuffer[keyFrameIndex].game_time
        // console.log(`time difference [${keyFrameIndex}/${forwardBuffer.length-1}]: ${timeDiff}`);

        
        tweenIndex = 0;

        updateWorldModelWithKey(forwardBuffer[keyFrameIndex]);
        updateSvg(worldModel, screen_width, screen_height, dialogArray, dialogArrayIndex);
        lastKeyTime = nowTime;
        lastTweenTime = nowTime;
        if(forwardBuffer[keyFrameIndex]["key"]["visualNovelText"]){
            newDialog = forwardBuffer[keyFrameIndex]["key"]["visualNovelText"]["dialogFull"].toString();

            if(!(dialogArray.includes(newDialog))){
                dialogArray.push(newDialog);
                
                if(isLiveDialog){
                dialogArrayIndex = dialogArray.length -1;
                }
                dialogueNotification();
            }    
        }
        if (forwardBuffer[keyFrameIndex] && forwardBuffer[keyFrameIndex].tweens) {
            timeToNextTween = forwardBuffer[keyFrameIndex].tweens[0].game_time - forwardBuffer[keyFrameIndex].game_time - tweenOffset - catchUpTime;
          } else {
            timeToNextTween = Math.floor(1000/tween_rate);
          }
        let syncRange = 500;
        if (forwardBuffer.length > 2 && Math.abs(timeDiff-target) >= syncRange){
            //TODO: Check for end frame
            // console.log("Syncing!")
            // syncBuffer();
        }
        //console.log("index ", keyFrameIndex, ": ", forwardBuffer[keyFrameIndex]);
        
        if (forwardBuffer.length >= 10) {
            forwardBuffer.shift()
        } else {
            keyFrameIndex++;
        }

    }
    //console.log(`tween ${tweenIndex}: ${nowTime-lastTweenTime} >= ${timeToNextTween}`);
    if (nowTime - lastTweenTime >= timeToNextTween && forwardBuffer[keyFrameIndex-1] && forwardBuffer[keyFrameIndex-1].tweens && tweenIndex < tween_rate){
        catchUpTime = nowTime-lastTweenTime-Math.max(timeToNextTween, 0);

        updateWorldModelWithTween(forwardBuffer[keyFrameIndex-1].tweens[tweenIndex]);
        lastTweenTime = nowTime;
        updateSvg(worldModel, screen_width, screen_height, dialogArray, dialogArrayIndex);
        if(forwardBuffer[keyFrameIndex-1].tweens[tweenIndex+1]){
            timeToNextTween = forwardBuffer[keyFrameIndex-1].tweens[tweenIndex+1].game_time - forwardBuffer[keyFrameIndex-1].tweens[tweenIndex].game_time - tweenOffset - catchUpTime;
        }
        else{
            timeToNextTween = Math.floor(1000/tween_rate) - tweenOffset;
        }
        tweenIndex++;
    }
    window.requestAnimationFrame(gameLoop);
}

function advanceDialogArray(){
  isLiveDialog = false;
  console.log("changed dialogCheckbox in next dialog array");
  document.getElementById("dialogCheckbox").checked = false;
    if(dialogArrayIndex < dialogArray.length-1){
        dialogArrayIndex++;
        if (dialogArrayIndex == dialogArray.length -1) {
          dialogueNotification();
        }
    }
}

function previousDialogArray(){
    document.getElementById("dialogCheckbox").checked = false;
    console.log("changed dialogCheckbox in previous dialog array");
    isLiveDialog = false;
    if(dialogArrayIndex > 0){
        dialogArrayIndex--;
    }
}
function changeDialogSettings(){
  isLiveDialog = document.getElementById("dialogCheckbox").checked;
  console.log("hello dialog settings are" + dialogArrayIndex);
  if(isLiveDialog){
    dialogArrayIndex = dialogArray.length-1;
    dialogueNotification();
  }
}

function dialogueNotification(){
  let nextButton = document.getElementById("next-dialog-button")
    if(dialogArrayIndex == dialogArray.length-1){
      nextButton.style.backgroundColor = '#FFFFFF';
    } else {
      nextButton.style.backgroundColor = '#FF0000';
    }
}

window.addEventListener('keydown', function (e) {
  console.log(e.key)

  function keyToFunction(key, func) {
    if (e.key == key) {
      func();
    }
  }
  keyToFunction("-", decreaseFontSize) 
  keyToFunction("=", increaseFontSize)
  keyToFunction("ArrowLeft", previousDialogArray) 
  keyToFunction("ArrowRight", advanceDialogArray)
}, false);

function incrementTargetOffset(){
    target+=5;
    document.getElementById("target").innerHTML = target;
}

function decrementTargetOffset(){
    target-=5;
    document.getElementById("target").innerHTML = target;
}