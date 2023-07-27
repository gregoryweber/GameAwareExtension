import {startSvg, updateSvg} from './update_svg.js';


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
        url: location.protocol + '//localhost:3000/startData', // For remote, replace localhost with https://cmuctpawsec2.com:3000/startData
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
        url: location.protocol + '//localhost:3000/initialBuffer?padding='+backPadding, // For remote, replace localhost with https://cmuctpawsec2.com:3000/initialBuffer?padding=
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
          url: location.protocol + '//localhost:3000/latestData', // For remote, replace localhost with https://cmuctpawsec2.com:3000/latestData
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
    console.log('initialBuffer: ', initialBuffer[actualKeyPointer])
    if (!initialBuffer[actualKeyPointer].tweens){
        console.log("Error: Tween object cannot be found");
    } else {
        for( let i = 0; i < initialBuffer[actualKeyPointer].tweens.length-1; i++){
            console.log(`tween difference: ${actualTime} - ${initialBuffer[actualKeyPointer].tweens[i+1].game_time} = ${actualTime - initialBuffer[actualKeyPointer].tweens[i+1].game_time} `)
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
        console.log(initialBuffer[0])
        lastKeyTime = Date.now() - (actualTime - initialBuffer[0].game_time);
        // timeToNextKey = 1000/key_rate;

        
        
        if(initialBuffer[0].tweens && initialBuffer[0].tweens[tweenIndex+1]){
            // timeToNextTween = initialBuffer[0].tweens[tweenIndex+1].game_time - initialBuffer[0].tweens[tweenIndex].game_time - tweenOffset;
            lastTweenTime = Date.now() - (actualTime - initialBuffer[0].tweens[tweenIndex].game_time);
        }
        else{
            // timeToNextTween = Math.floor(1000/tween_rate);
            lastTweenTime = lastKeyTime;
        }
    }
    

    updateWorldModelWithKey(initialBuffer[keyFrameIndex]);
    if (initialBuffer[keyFrameIndex].tweens) {
        updateWorldModelWithTween(initialBuffer[keyFrameIndex].tweens[tweenIndex]);
    }
    updateSvg(worldModel, screen_width, screen_height);
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


function startGameLoop(){
    startSvg();


    lastKeyTime = 0;
    lastTweenTime = 0;
    keyFrameIndex = -1;
    tweenIndex = -1;
    timeToNextKey = 0;
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

    if(nowTime - lastKeyTime >= timeToNextKey && forwardBuffer[keyFrameIndex]){
        catchUpTime += nowTime-lastKeyTime-timeToNextKey;
        // console.log("key frame: " + keyFrameIndex);
        let dateNow = Date.now();
        let actualTime = dateNow - start_clock_secs - start_game_secs - (broadcastLatency * 1000);
        timeDiff = actualTime - forwardBuffer[keyFrameIndex].game_time
        console.log(`time difference: ${timeDiff}`);
        let range = 200;
        if (Math.abs(timeDiff-target) > range) {
            timeToNextKey -= timeDiff - target
            console.log(`timeToNextKey: ${timeToNextKey}`)
        } else {
            timeToNextKey = 1000/key_rate
        }
        tweenIndex = 0;
        //console.log(`key ${keyFrameIndex}`)
        updateWorldModelWithKey(forwardBuffer[keyFrameIndex]);
        updateSvg(worldModel, screen_width, screen_height);;
        lastKeyTime = nowTime;
        lastTweenTime = nowTime;
        
        if (forwardBuffer[keyFrameIndex] && forwardBuffer[keyFrameIndex].tweens) {
            timeToNextTween = forwardBuffer[keyFrameIndex].tweens[0].game_time - forwardBuffer[keyFrameIndex].game_time - tweenOffset - catchUpTime;
          } else {
            timeToNextTween = Math.floor(1000/tween_rate);
          }
        let syncRange = 500;
        if (forwardBuffer.length > 2 && Math.abs(timeDiff-target) >= syncRange){
            //TODO: Check for end frame
            console.log("Syncing!")
            syncBuffer();
        }
        //console.log("index ", keyFrameIndex, ": ", forwardBuffer[keyFrameIndex]);
        keyFrameIndex++;        
    }
    //console.log(`tween ${tweenIndex}: ${nowTime-lastTweenTime} >= ${timeToNextTween}`);
    if (nowTime - lastTweenTime >= timeToNextTween && forwardBuffer[keyFrameIndex-1] && forwardBuffer[keyFrameIndex-1].tweens && tweenIndex < tween_rate){
        catchUpTime = nowTime-lastTweenTime-Math.max(timeToNextTween, 0);
        //console.log(`${nowTime}-${lastTweenTime}-${Math.max(timeToNextTween, 0)}=${catchUpTime}`)
        
        //console.log(`${keyFrameIndex-1}[${tweenIndex}]: ${nowTime-lastTweenTime} >= ${timeToNextTween} (-${catchUpTime})`);
        if (!updateWorldModelWithTween(forwardBuffer[keyFrameIndex-1].tweens[tweenIndex])) {
            console.log(tweenIndex ,forwardBuffer[keyFrameIndex-1].tweens)
        }
        
        // updateWorldModelWithTween(forwardBuffer[keyFrameIndex-1].tweens[tweenIndex]);
        lastTweenTime = nowTime;
        updateSvg(worldModel, screen_width, screen_height);
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
