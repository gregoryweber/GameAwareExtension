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
let forwardBuffer = [];


// onAuthorized callback called each time viewer is authorized
twitch.onAuthorized((auth) => {
    getStartData(); // get the start frame and the accompanying variables
    setUpInitialBuffer(); // construct the back buffer that we will use to sync the data
});

function getStartData(){
    $.ajax({
        type: 'GET',
        url: location.protocol + '//localhost:3000/startData',
        contentType: 'application/json',
        headers: { authorization: 'Bearer ' + window.Twitch.ext.viewer.sessionToken},
        success: function(res) {
            start_game_secs = res.game_time;
            start_clock_secs = res.clock_secs;
            key_rate = res.key_frame_rate;
            tween_rate = res.tween_frame_rate;
            screen_width = res.screen_width;
            screen_height = res.screen_height;
        } 
    });

}
// Initial latest frame get request to figure out current latest, used to build back buffer
function setUpInitialBuffer(){
    let backPadding = parseInt(broadcastLatency) + 4 // pad an extra few seconds
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
            setInterval(syncBuffer, 5000);
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
    let keyTime = Date.now() - start_clock_secs - start_game_secs
    // Search initial buffer, find key within 1 second (less than 1000 ms) of the calculated keyTime
    // Target key frame should be the same as key time if we ignore the hundreds values (only the thousands are the seconds);
    for( let i = 0; i < initialBuffer.length; i++){
        if(keyTime - initialBuffer[i].game_time > 0 && keyTime - initialBuffer[i].game_time < 1000){
            currentFramePointer = i;
        }
    }
    initialBuffer.push.apply(initialBuffer, forwardBuffer);
    forwardBuffer.length = 0;
    initialBuffer.splice(0, currentFramePointer);
    updateWorldModel();
}

// TODO: Be more consistent with var/let use
var counter;
var frameIndex;
var thenTime;
var nowTime;
var startTime;
var elapsedTime;
var fpsInterval;

function updateWorldModel(){
    frameIndex = 0;
    worldModel["game_time"] = initialBuffer[frameIndex]["game_time"];
    for (var item in initialBuffer[frameIndex]["key"]){
        worldModel[item] = initialBuffer[frameIndex]["key"][item];
    }
    counter = 0;
    fpsInterval = 1000/tween_rate;
    thenTime = Date.now();
    startTime = thenTime;
    window.requestAnimationFrame(gameLoop);
}

function gameLoop(){
    nowTime = Date.now();
    elapsedTime = nowTime - thenTime;
    if (elapsedTime > fpsInterval && counter < tween_rate){
        if (counter == 0){
            worldModel["game_time"] = initialBuffer[frameIndex]["game_time"];
            for (let item in initialBuffer[frameIndex]["key"]){
                worldModel[item] = initialBuffer[frameIndex]["key"][item];
            }
        }
        thenTime = nowTime - (elapsedTime % fpsInterval);
        for (let tweenKey in initialBuffer[frameIndex]["tweens"][counter]){
            if(tweenKey != "game_time" && tweenKey !="dt"){
                if(initialBuffer[frameIndex]["tweens"][counter][tweenKey]["screenRect"]!= null){
                    worldModel[tweenKey]["screenRect"] = initialBuffer[frameIndex]["tweens"][counter][tweenKey]["screenRect"];
                }
                // console.log(worldModel[tweenKey]);
            }
        }
        root.render(<Rect />)
        counter++;
    }
    else if (counter >= tween_rate){
        counter = 0;
        frameIndex++;
    }
    window.requestAnimationFrame(gameLoop);
}
function Rect() {
        let xOffset = 0;
        let yOffset = 0;
         if (worldModel['GreenWalker']['screenRect']['x'] != null){
            xOffset = worldModel['GreenWalker']['screenRect']['x']/screen_width *100; 
            yOffset = worldModel['GreenWalker']['screenRect']['y']/screen_height *100;
        }
        return  <div style={{
            width:'50px', 
            height:'50px', 
            border:'5px solid red', 
            position:'absolute',
            top: --yOffset+'%',
            left: --xOffset +'%',
    
        }}></div>;
}
const domContainer = document.querySelector('#rect_container');
const root = ReactDOM.createRoot(domContainer);
