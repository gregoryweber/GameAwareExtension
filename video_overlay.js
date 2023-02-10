var token, userId;

// so we don't have to write this out everytime 
const twitch = window.Twitch.ext;

let isAuthed = false;
let broadcastLatency;
let start_game_secs;
let start_clock_secs;
let latest_game_secs;
let tween_rate;
let key_rate;
let screen_width;
let screen_height;
let initialBuffer = [];
let currentFramePointer;
// callback called when context of an extension is fired 
twitch.onContext((context) => {
  broadcastLatency = context.hlsLatencyBroadcaster;
});

// TODO: change underscore variables to camelcase;
var worldModel = {};
var isTimeToSync = false;
let forwardBuffer = [];


// onAuthorized callback called each time viewer is authorized
twitch.onAuthorized((auth) => {
    getStartData(); // get the start frame and the accompanying variables
    setUpInitialBuffer(); // construct the  buffer that we will use to sync the data
});

function getStartData(){
    $.ajax({
        type: 'GET',
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
    let backPadding = parseInt(broadcastLatency) + 3 // pad an extra few seconds
    $.ajax({
        type: 'GET',
        url: location.protocol + '//localhost:3000/initialBuffer?padding='+backPadding,
        async:true,
        contentType: 'application/json',
        headers: { authorization: 'Bearer ' + window.Twitch.ext.viewer.sessionToken},
        success: function(res) {
          initialBuffer = res;
        },
        complete: function(){
            setInterval(getLatestData, 1000);
            startGameLoop();            
        } 
    });
}


function getLatestData(){
      $.ajax({
          type: 'GET',
          url: location.protocol + '//localhost:3000/latestData',
          contentType: 'application/json',
          headers: { authorization: 'Bearer ' + window.Twitch.ext.viewer.sessionToken},
          success: function(res) {        
            forwardBuffer.push(res);
          } 
      });

}


function syncBuffer(){
    console.log("sync called");
    let actualKeyPointer;
    let actualTweenPointer;
    initialBuffer.push.apply(initialBuffer, forwardBuffer);
    forwardBuffer.length = 0;
    // ToDO: check if broadcast latency has changed

    let actualTime = Date.now() - start_clock_secs - start_game_secs - (broadcastLatency * 1000);
    // Search initial buffer, find key within 1/key_frame_rate of the calculated keyTime
    // Target key frame should be the same as key time if we ignore the hundreds values (only the thousands are the seconds);
    for( let i = 0; i < initialBuffer.length; i++){
        if(Math.abs(actualTime - initialBuffer[i].game_time) <= ((1/key_rate) * 1000)){
            actualKeyPointer = i;
            console.log("sync point found");
            break;
        }
    }

    if(actualKeyPointer == undefined){
        console.log("Error: no key pointer found");
        actualKeyPointer = initialBuffer.length-1;
    }
    console.log(initialBuffer[actualKeyPointer]);
    //ToDo: Deal with the case where there are no tweens
    for( let i = 0; i < initialBuffer[actualKeyPointer].tweens.length; i++){
        if(Math.abs(actualTime - initialBuffer[actualKeyPointer].tweens[i].game_time) <= (1/tween_rate * 1000)){
            actualTweenPointer = i;
            break;
        }
    }

    if(actualTweenPointer == undefined){
        console.log("Error: no tween pointer found");
        actualTweenPointer = initialBuffer[actualKeyPointer].tweens.length-1;
    }

    
    initialBuffer.splice(0, actualKeyPointer);
    
    tweenIndex = actualTweenPointer;
    lastKeyTime = actualTime - initialBuffer[0].game_time;
    lastTweenTime = actualTime - initialBuffer[0].tweens[tweenIndex].game_time;
    timeToNextKey = initialBuffer[1].game_time - initialBuffer[0].game_time; 
    timeToNextTween = initialBuffer[0].tweens[tweenIndex+1].game_time - initialBuffer[0].tweens[tweenIndex].game_time;

    keyFrameIndex = -1;
    tweenIndex = actualTweenPointer-1;
}

// TODO: Be more consistent with var/let use
var counter;
var frameIndex;
var thenTime;
var nowTime;
var startTime;
var elapsedTime;
var fpsInterval;

var lastKeyTime;
var lastTweenTime;
var keyFrameIndex;
var tweenIndex;
var timeToNextKey;
var timeToNextTween;

function updateWorldModelWithTween(tweenFrame){
    for(let item in tweenFrame){
        for(let attribute in tweenFrame[item]){
            worldModel["key"][item][attribute] = JSON.parse(JSON.stringify(tweenFrame[item][attribute]));
        }
    }
    worldModel["game_time"] = JSON.parse(JSON.stringify(tweenFrame["game_time"]));
}

function startGameLoop(){
    lastKeyTime = 0;
    lastTweenTime = 0;
    keyFrameIndex = -1;
    tweenIndex = -1;
    timeToNextKey = 0;
    timeToNextTween = 0;
    syncBuffer();

    window.requestAnimationFrame(gameLoop);

// // New Game Loop Behavior (main game loop that calls functions)
// track last key frame time (based on local scope) = 0
// track last tween frame time = 0
// track last resync time = 0 (not needed anymore)
// current keyFrameIndex = 0
// nextFrame (keyFrameIndex + 1)
// current tween = -1
// nextTween (current tween +1)
// timeToNextKey = 0
// timeToNextTween = 0

}
var keyHolder;

function gameLoop(){
    let nowTime = Date.now();

    if (nowTime - lastKeyTime >= timeToNextKey){
        keyFrameIndex++;
        tweenIndex = -1;
        console.log(keyFrameIndex);
        worldModel = JSON.parse(JSON.stringify(initialBuffer[keyFrameIndex]));
        lastKeyTime = nowTime;
        lastTweenTime = nowTime;

        timeToNextTween = initialBuffer[keyFrameIndex].tweens[0].game_time - initialBuffer[keyFrameIndex].game_time;

        if(initialBuffer[keyFrameIndex+1] != null){
            timeToNextKey = initialBuffer[keyFrameIndex+1].game_time - initialBuffer[keyFrameIndex].game_time; 
        }
        else{
            //TODO: Check for end frame
            syncBuffer();
        }
    }

    // if nowTime - lastKeyTime is greater than or equal to timeToNextKey
    // //advance frame data: advance to next key
    // current key = next key
    // current tween = -1
    // update world model with key data (world model = key basically)
    // lastKeyTime = nowTime
    // lastTweenTime = nowTime
    // timeToNextTween = dt of the first element in the list (or tween time - key frame time)

    // If there is no next key frame:
    //     check for an end frame (if there is an end frame console log a message about end of stream)
    //     trigger resync
    // else:
    //     timeToNextKey = next keyframe time - current key frame time
    if (nowTime - lastTweenTime >= timeToNextTween){
        tweenIndex++;
        if(keyFrameIndex == -1){
            keyHolder = 0;
        }
        else{
            keyHolder = keyFrameIndex;
        }
        updateWorldModelWithTween(initialBuffer[keyHolder].tweens[tweenIndex]);
        lastTweenTime = nowTime;

        if(initialBuffer[keyHolder].tweens[tweenIndex+1]!=null){
            timeToNextTween = initialBuffer[keyHolder].tweens[tweenIndex+1].game_time - initialBuffer[keyHolder].tweens[tweenIndex].game_time
        }
        else{
            //todo use the key frame rate, cast to int
            timeToNextTween = 1000 * 1000;
        }
    }
// if nowtime - lastTweenTime is greater than or equal to timeToNextTween   
//     //advance frame data: advance to next tween within current key
//     current tween = next tween
//     update worldmodel with tween data
//     lastTweenTime = nowTime
    
//     if there is a next tween:
//         timeToNextTween = current tween dt (or next tween game time - current tween game time)
//     else:
//         timeToNextTween = really big number

    draw();
    window.requestAnimationFrame(gameLoop);

}

function draw(){
    root.render(<Rect />)
}

function Rect() {
        let xOffset = 0;
        let yOffset = 0;
        let width = 0;
        let height = 0;
        const jsonArray = Object.entries(worldModel["key"]);
        // console.log(jsonArray);
        return (
            <div>
                <p>{worldModel["game_time"]}</p>
                {jsonArray.map(([key, value]) => {
                    if(key!=null && value["screenRect"]!= null){
                        xOffset = value["screenRect"].x/screen_width*100;
                        yOffset = value["screenRect"].y/screen_height*100;
                        width = value["screenRect"].w/screen_width*100;
                        height = value["screenRect"].h/screen_height*100;
                        return <div key ={key} style={{
                            width:--width+'%', 
                            height:--height+'%', 
                            border:'5px solid red', 
                            position:'absolute',
                            top: --yOffset+'%',
                            left: --xOffset +'%',

                        }}></div>;
                    }
                })}
            
            </div>
        );
        
}
const domContainer = document.querySelector('#rect_container');
const root = ReactDOM.createRoot(domContainer);
