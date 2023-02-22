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
    let backPadding = parseInt(broadcastLatency) + 3; // pad an extra few seconds
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
            setInterval(getLatestData, 1/key_rate *1000);
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
            // console.log("sync point found");
            break;
        }
    }

    if(actualKeyPointer == undefined){
        console.log("Error: no key pointer found");
        actualKeyPointer = initialBuffer.length-1;
    }
    // console.log(initialBuffer[actualKeyPointer]);
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
    if(initialBuffer[0].tweens[tweenIndex+1]!=null){
        timeToNextTween = initialBuffer[0].tweens[tweenIndex+1].game_time - initialBuffer[0].tweens[tweenIndex].game_time - tweenOffset;
    }
    else{
        //todo use the key frame rate, cast to int
        timeToNextTween = 1000 * 1000;
    }
    keyFrameIndex = -1;
    tweenIndex = actualTweenPointer-1;
}

// TODO: Be more consistent with var/let use
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
var counter;
var nowTime;
var tweenOffset = 0;
function gameLoop(){
    nowTime = Date.now();
    counter++;
    if(keyFrameIndex < 0 || tweenIndex >= initialBuffer[keyFrameIndex].tweens.length-1){
        keyFrameIndex++;
        counter = 0;
        tweenIndex = -1;
        worldModel = JSON.parse(JSON.stringify(initialBuffer[keyFrameIndex]));
        lastKeyTime = nowTime;
        lastTweenTime = nowTime;

        timeToNextTween = initialBuffer[keyFrameIndex].tweens[0].game_time - initialBuffer[keyFrameIndex].game_time - tweenOffset;

        if(initialBuffer[keyFrameIndex+1] != null){
            timeToNextKey = initialBuffer[keyFrameIndex+1].game_time - initialBuffer[keyFrameIndex].game_time; 
        }
        else{
            //TODO: Check for end frame
            syncBuffer();
        }
    }    
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
            timeToNextTween = initialBuffer[keyHolder].tweens[tweenIndex+1].game_time - initialBuffer[keyHolder].tweens[tweenIndex].game_time - tweenOffset;
        }
        else{
            //todo use the key frame rate, cast to int
            timeToNextTween = 1000 * 1000;
        }
    }

    // draw();
    window.requestAnimationFrame(gameLoop);

}

function draw(){
    root.render(<Rect/>)
}

function Rect() {
        let xOffset = 0;
        let yOffset = 0;
        let width = 0;
        let height = 0;
        const jsonArray = Object.entries(worldModel["key"]);
        let tooltipInfo={};
        const [colors, setColors] = React.useState(
            Object.fromEntries(
              Object.keys(worldModel["key"]).map((key) => [key, "red"])
            )
          );
          
        const handleDivClick = (key) => {
            // Create a copy of the current colors object
            const newColors = { ...colors };
            // Change the color of the rectangle with the given key to a random color using Math.random()
            newColors[key] = `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`;
            // Set the updated colors object as the new state
            setColors(newColors);
          };
          
        return (
            <div>
                <p>{worldModel["game_time"]}</p>
                <p>keyFrameIndex: {keyFrameIndex} out of {initialBuffer.length}</p> 
                {/* <p>TweenIndex: {tweenIndex} out of {initialBuffer[keyFrameIndex].tweens.length}</p>  */}
                <p>timeToNextKey:{timeToNextKey} || {nowTime-lastKeyTime}</p>
                <p>Counter:{counter}</p>
                <p>timeToNextTween:{timeToNextTween} || {nowTime - lastTweenTime}</p>
                <p>Now time:{nowTime}</p>
                {jsonArray.map(([key, value]) => {
                    if(key!=null && value["screenRect"]!= null){
                        tooltipInfo = Object.entries(value).map(([key, value]) => {
                        if (typeof value === "object") {
                            // For nested objects, use JSON.stringify to convert the object to a string
                            // with the key-value pairs separated by a colon
                            return `${key}: ${JSON.stringify(value)}`;
                        } else {
                            // For non-object values, simply use the key-value pair with a colon separator
                            return `${key}: ${value}`;
                        }
                        }).join("\n");

                        xOffset = value["screenRect"].x/screen_width*100;
                        yOffset = value["screenRect"].y/screen_height*100;
                        width = value["screenRect"].w/screen_width*100;
                        height = value["screenRect"].h/screen_height*100;
                        return <div onClick={()=> handleDivClick(key)} className = "tooltip"key ={key} style={{
                                width:--width+'%', 
                                height:--height+'%', 
                                border:'5px solid ' + colors[key], 
                                position:'absolute',
                                top: --yOffset+'%',
                                left: --xOffset +'%',

                            }}>
                                <span key={value["secret_name"]}className = "tooltiptext">{tooltipInfo} </span>
                            </div>;
                    }
                })}
            
            </div>
        );
        
}
const domContainer = document.querySelector('#rect_container');
const root = ReactDOM.createRoot(domContainer);
