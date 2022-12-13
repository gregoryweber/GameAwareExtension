var token, userId;

// so we don't have to write this out everytime 
const twitch = window.Twitch.ext;

let isAuthed = false;
let broadcastLatency;
let game_secs;
let clock_secs;
let tween_rate;
let key_rate;
let screen_width;
let screen_height;
let backBuffer = [];
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
    setUpBackBuffer(); // construct the back buffer that we will use to sync the data
    // setInterval(getMetaData, 1000); // once the user is verified, start getting metadata from backend
});

function getStartData(){
    $.ajax({
        type: 'GET',
        url: location.protocol + '//localhost:3000/startData',
        contentType: 'application/json',
        headers: { authorization: 'Bearer ' + window.Twitch.ext.viewer.sessionToken},
        success: function(res) {
            game_secs = res.game_secs;
            clock_secs = res.clock_secs;
            key_rate = res.key_frame_rate;
            tween_rate = res.tween_frame_rate;
            screen_width = res.screen_width;
            screen_height = res.screen_height;
            // setInterval(getLatestData, 1000);
        } 
    });

}
// Initial latest frame get request to figure out current latest, used to build back buffer
function setUpBackBuffer(){
    let backPadding = parseInt(broadcastLatency) + 4 // pad an extra few seconds
    let latestIndex;
    $.ajax({
        type: 'GET',
        url: location.protocol + '//localhost:3000/latestData',
        async:true,
        contentType: 'application/json',
        headers: { authorization: 'Bearer ' + window.Twitch.ext.viewer.sessionToken},
        success: function(res) {
          latestIndex = res.frame;
        },
        complete: function(){
            buildBackBuffer(latestIndex, backPadding);
        } 
    });
}

async function buildBackBuffer(latestIndex, padding){
    var async_requests=[];

    for(var i = latestIndex - padding; i < latestIndex; i++)
    {
        // Push all the async requests into an array
        async_requests.push($.ajax({
            type: 'GET',
            url: location.protocol + '//localhost:3000/frameData?index='+i,
            success: function(res) {
                backBuffer.push(res);
            } 
        }).then(response => response.json()));
    }
    
    // when all these async requests are done, push them into the back buffer
    $.when.apply(null, async_requests).done( function(){
        console.log(backBuffer);
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

function getIndexFrameData(index){
    let urlParam = '//localhost:3000/frameData?index='+index
    $.ajax({
        type: 'GET',
        url: location.protocol + urlParam ,
        success: function(res) {
            backBuffer.push(res);
        } 
    });

}

// function syncBuffer()
// 1. Calculate elapsed game time
// 2. Go through buffer array and find the correct key frame game time (based on the whole number)
// 3. Delete everything before that index so that the synchronized index is at index 0
// 4. Call updateWorldModel starting from index 0, will need another interval to be set so that updateWorldModel is called at key frame rate and moves on to the next index each time
// 5. Create another five second interval call for syncBuffer so that the buffer is resynced/cleared every five seconds

// TODO: Be more consistent with var/let use
var counter;
var frameHolder;
var thenTime;
var nowTime;
var startTime;
var elapsedTime;
var fps = 24.0; // TODO change this to number of items in tween array
var fpsInterval;

function updateWorldModel(frame){
    worldModel["game_time"] = frame["game_time"];
    for (var item in frame["key"]){
        worldModel[item] = frame["key"][item];
    }
    counter = 0;
    frameHolder = frame;
    fpsInterval = 1000/fps;
    thenTime = Date.now();
    startTime = thenTime;
    window.requestAnimationFrame(gameLoop);
    console.log(worldModel);
}

function gameLoop(){
    nowTime = Date.now();
    elapsedTime = nowTime - thenTime;

    if (elapsedTime > fpsInterval && counter < 24){
        thenTime = nowTime - (elapsedTime % fpsInterval);
        // console.log(frameHolder);
        for (var tweenKey in frameHolder["tweens"][counter]){
            if(tweenKey != "game_time" && tweenKey !="dt"){
                worldModel[tweenKey]["screenRect"] = frameHolder["tweens"][counter][tweenKey]["screenRect"];
                // console.log(worldModel[tweenKey]);
            }
        }
        root.render(<Rect />)
        counter++;
    }
    else if (counter >= 24){
        counter = 0;
    }
    window.requestAnimationFrame(gameLoop);
}
function Rect() {
        let xOffset = 0;
        let yOffset = 0;
         if (worldModel['GreenWalker']['screenRect']['x'] != null){
            xOffset = worldModel['GreenWalker']['screenRect']['x']/screen_width *100; //TODO divide by screen width from start frame
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
