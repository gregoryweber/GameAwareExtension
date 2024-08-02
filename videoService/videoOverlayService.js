import { TwitchService } from './twitchService.js';
import { DataService } from './dataService.js';
import { startSvg, updateSvg, gameData } from '../userInterfaceService/updateSvg.js';


const twitchService = new TwitchService(window.Twitch.ext);

let dataService;
let broadcastLatency;
let startGameSecs;
let startClockSecs;
let tweenRate = 24;
let keyRate = 1;
let target = 100;
let screenWidth;
let screenHeight;
let initialBuffer = [];


var worldModel = {};
let forwardBuffer = [];

// onAuthorized callback called each time viewer is authorized
twitchService.onAuthorized((auth) => {
    dataService = new DataService(window.Twitch.ext.viewer.sessionToken);
    getStartData(); // get the start frame and the accompanying variables
});

twitchService.onContext((context) => {
    broadcastLatency = twitchService.broadcastLatency;
});

async function getStartData(){
    try{
        const res = await dataService.getStartData();

        if (res) {
            // time from the start of the game to the system start in milliseconds
            startGameSecs = res.game_time;
            // current clock date when the system starts on the streamer's computer 
            startClockSecs = res.clock_mills;
            // amount of key frames in a second (should be 1)
            keyRate = res.key_frame_rate;
            // amount of tween frames in a key frame (should be 24)
            tweenRate = res.tween_frame_rate;
            screenWidth = res.screen_width;
            screenHeight = res.screen_height;

            setUpInitialBuffer(); // construct the  buffer that we will use to sync the data
        } else {
            console.error("Failed to receive start data from the server.");
        }
    } catch (error) {
        console.error("Error fetching start data:", error);
    }
}
// Initial latest frame get request to figure out current latest, used to build back buffer
async function setUpInitialBuffer(){
    try {
        let backPadding = parseInt(broadcastLatency)*(2/keyRate); // pad an extra few seconds
        const res = await dataService.setUpInitialBuffer(backPadding);
        if (res && res.length > 0) {
            initialBuffer = res;
            setInterval(getLatestData, 1/keyRate *1000);
            startGameLoop();

        }
    }  catch (error) {
        console.error("Error fetching start data:", error);
    }
}

async function getLatestData(){
    try {
        const latestData = await dataService.getLatestData();
        if (latestData) {
            forwardBuffer.push(latestData);
            // console.log("Latest data received and added to forward buffer:", latestData);
        } else {
            console.error("Failed to receive latest data or received empty data.");
        }
    } catch (error) {
        console.error("Error fetching latest data:", error);
    }


}

async function putViewerData() {
    try {
        const viewerID = window.Twitch.ext.viewer.opaqueId;
        const userID = window.Twitch.ext.viewer.id;
        await dataService.putViewerData(viewerID, userID, worldModel["game_time"], Date.now(), gameData);
    } catch (error) {
        console.log(error);
    }
}

function syncBuffer(){
    console.log("syncing!")
    let actualKeyPointer;
    let actualTweenPointer = 0;
    initialBuffer.push.apply(initialBuffer, forwardBuffer);
    forwardBuffer.length = 0;


    //Date.now() = current time in viewer's frame of reference
    //startClockSecs = local time stamp from the streamer's computer
    //startGameSecs = Unity's frame of reference of time (all future game times are from this frame of reference)
    //broadcastLatency = number from Twitch, latency from the streamer to the viewer
    let dateNow = Date.now();
    let actualTime = dateNow - startClockSecs - startGameSecs - (broadcastLatency * 1000);
    
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
        timeToNextKey = 1000/keyRate;

        
        
        if(initialBuffer[0].tweens && initialBuffer[0].tweens[tweenIndex+1]){
            timeToNextTween = initialBuffer[0].tweens[tweenIndex+1].game_time - initialBuffer[0].tweens[tweenIndex].game_time - tweenOffset;
            lastTweenTime = Date.now() - (actualTime - initialBuffer[0].tweens[tweenIndex].game_time);
        }
        else{
            timeToNextTween = Math.floor(1000/tweenRate);
            lastTweenTime = lastKeyTime;
        }
    }
    

    updateWorldModelWithKey(initialBuffer[keyFrameIndex]);
    if (initialBuffer[keyFrameIndex].tweens) {
        updateWorldModelWithTween(initialBuffer[keyFrameIndex].tweens[tweenIndex]);
    }
    // updateSvg(worldModel, screenWidth, screenHeight);
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

var debugKeyframe = document.getElementById("debug_keyframe");

function startGameLoop(){

    startSvg();

    lastKeyTime = 0;
    lastTweenTime = 0;
    keyFrameIndex = -1;
    tweenIndex = -1;
    timeToNextKey = 1000/keyRate;
    timeToNextTween = 0;
    syncBuffer();
    window.requestAnimationFrame(gameLoop);

}

var nowTime;
var tweenOffset = 0;
var catchUpTime = 0;
var timeDiff = 0;
var syncRange = 500;

function gameLoop(){
    nowTime = Date.now();

    if(nowTime - lastKeyTime >= timeToNextKey && forwardBuffer[keyFrameIndex]){
        // TODO: this assumes that the keyframe is 1 !
        keyFrameIndex = Math.max(0, forwardBuffer.length - Math.floor(broadcastLatency/keyRate));
        if (keyFrameIndex == forwardBuffer.length)
            keyFrameIndex = Math.max(0, forwardBuffer.length-1);
        debugKeyframe.innerHTML = forwardBuffer[keyFrameIndex].frame;
        // console.log(forwardBuffer[keyFrameIndex])
        catchUpTime += nowTime-lastKeyTime-timeToNextKey;
        
        // NOTE: no difference between nowTime and dateNow....
        let dateNow = Date.now();

        let actualTime = dateNow - startClockSecs - startGameSecs - (broadcastLatency * 1000);
        // console.log(`dateNow: ${dateNow}, startClockSecs: ${startClockSecs}, startGameSecs: ${startGameSecs}, broadcastLatency: ${broadcastLatency}, game_time: ${forwardBuffer[keyFrameIndex].game_time}`)
        timeDiff = actualTime - forwardBuffer[keyFrameIndex].game_time

        // hmm, actualTime is a second ahead of game time... 

        // console.log(`actualTime: ${actualTime} game time: ${forwardBuffer[keyFrameIndex].game_time}`)
        // console.log(`time difference [${keyFrameIndex}/${forwardBuffer.length-1}]: ${timeDiff}`);
        // console.log(forwardBuffer[keyFrameIndex])
        
        tweenIndex = 0;

        updateWorldModelWithKey(forwardBuffer[keyFrameIndex]);
        // updateSvg(worldModel, screenWidth, screenHeight);
        lastKeyTime = nowTime;
        lastTweenTime = nowTime;
 
        if (forwardBuffer[keyFrameIndex] && forwardBuffer[keyFrameIndex].tweens) {
            timeToNextTween = forwardBuffer[keyFrameIndex].tweens[0].game_time - forwardBuffer[keyFrameIndex].game_time - catchUpTime;
          } else {
            timeToNextTween = Math.floor(1000/tweenRate);
          }
        // let syncRange = 500;
        if (forwardBuffer.length > 2 && timeDiff >= syncRange){
            //TODO: Check for end frame
            // console.log("Need Syncing!")
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
    if (nowTime - lastTweenTime >= timeToNextTween && forwardBuffer[keyFrameIndex-1] && forwardBuffer[keyFrameIndex-1].tweens && tweenIndex < tweenRate){
        catchUpTime = nowTime-lastTweenTime-Math.max(timeToNextTween, 0);

        updateWorldModelWithTween(forwardBuffer[keyFrameIndex-1].tweens[tweenIndex]);
        lastTweenTime = nowTime;
        // updateSvg(worldModel, screenWidth, screenHeight);
        if(forwardBuffer[keyFrameIndex-1].tweens[tweenIndex+1]){
            timeToNextTween = forwardBuffer[keyFrameIndex-1].tweens[tweenIndex+1].game_time - forwardBuffer[keyFrameIndex-1].tweens[tweenIndex].game_time - catchUpTime;
        }
        else{
            timeToNextTween = Math.floor(1000/tweenRate);
        }
        tweenIndex++;
    }
    updateSvg(worldModel, screenWidth, screenHeight, putViewerData);
    window.requestAnimationFrame(gameLoop);
}

