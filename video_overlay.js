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

    //Date.now() = current time in viewer's frame of reference
    //start_clock_secs = local time stamp from the streamer's computer
    //start_game_secs = Unity's frame of reference of time (all future game times are from this frame of reference)
    //broadcastLatency = number from Twitch, latency from the streamer to the viewer


    console.log("now time: " + Date.now());
    console.log("start_clock_secs: " + start_clock_secs);
    console.log("start_game_secs: " + start_game_secs);
    console.log("broadcast latency: " + broadcastLatency)
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
    //ToDo: Deal with the case where there are no tweens
    for( let i = 0; i < initialBuffer[actualKeyPointer].tweens.length; i++){
        if(actualTime - initialBuffer[actualKeyPointer].tweens[i].game_time <= (1/tween_rate * 1000)){
            actualTweenPointer = i;
            break;
        }
    }

    if(actualTweenPointer == undefined){
        console.log("Error: no tween pointer found");
        actualTweenPointer = initialBuffer[actualKeyPointer].tweens.length-1;
    }

    console.log("actual game time: " + actualTime);
    console.log("time from the key: "+ initialBuffer[actualKeyPointer].game_time);
    console.log("time from the tweens: "+ initialBuffer[actualKeyPointer].tweens[actualTweenPointer].game_time);

    initialBuffer.splice(0, actualKeyPointer+1);
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
    updateWorldModelWithKey(initialBuffer[0]);
    updateWorldModelWithTween(initialBuffer[0].tweens[actualTweenPointer]);
    updateSvgRects();
    keyFrameIndex = -1;
    tweenIndex = actualTweenPointer-1;
}

// TODO: Be more consistent with var/let use
var frameIndex;
var thenTime;

var lastKeyTime;
var lastTweenTime;
var keyFrameIndex;
var tweenIndex;
var timeToNextKey;
var timeToNextTween;
var parentSvg;
var svgElements;
var textSvg;

function initializeSvgRects(){
    let xOffset = 0;
    let yOffset = 0;
    let width = 0;
    let height = 0;  
    parentSvg.innerHTML = '';
    Object.entries(worldModel["key"]).forEach(([key, value]) => {
        if (key != null && value["screenRect"] != null) {
            xOffset = value["screenRect"].x/screen_width*100;
            yOffset = value["screenRect"].y/screen_height*100;
            width = value["screenRect"].w/screen_width*100;
            height = value["screenRect"].h/screen_height*100;
          
            const svgRect = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "rect"
          );
          svgRect.setAttribute("id", key);
          svgRect.setAttribute("width", width.toString()+"%");
          svgRect.setAttribute("height", height.toString()+"%");
          svgRect.setAttribute("x", xOffset.toString()+"%");
          svgRect.setAttribute("y", yOffset.toString()+"%");
          svgRect.setAttribute("fill", "none");
          svgRect.setAttribute("stroke", "red");
          svgRect.setAttribute("stroke-width", "2");          
          svgRect.setAttribute("position", "absolute");
          parentSvg.appendChild(svgRect);
          svgElements[key] = svgRect;
        }
      });

}
function updateSvgRects(){
    // Update the SVG rects based on the updated values in the world model
    let xOffset = 0;
    let yOffset = 0;
    let width = 0;
    let height = 0;  
  
    Object.entries(worldModel["key"]).forEach(([key, value]) => {
      if (key != null && value["screenRect"] != null) {
        xOffset = value["screenRect"].x/screen_width*100;
        yOffset = value["screenRect"].y/screen_height*100;
        width = value["screenRect"].w/screen_width*100;
        height = value["screenRect"].h/screen_height*100;

        var svgRect = svgElements[key];
        if (svgRect) {
            svgRect.setAttribute("width", width.toString()+"%");
            svgRect.setAttribute("height", height.toString()+"%");
            svgRect.setAttribute("x", xOffset.toString()+"%");
            svgRect.setAttribute("y", yOffset.toString()+"%");
        }
        else{
            svgRect = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "rect"
              );
            svgRect.setAttribute("id", key);
            svgRect.setAttribute("width", width.toString()+"%");
            svgRect.setAttribute("height", height.toString()+"%");
            svgRect.setAttribute("x", xOffset.toString()+"%");
            svgRect.setAttribute("y", yOffset.toString()+"%");
            svgRect.setAttribute("fill", "none");
            svgRect.setAttribute("stroke", "red");
            svgRect.setAttribute("stroke-width", "2");
            // svgRect.setAttribute("title", "This is a tooltip for "+key);       
            svgRect.setAttribute("position", "absolute");
            parentSvg.appendChild(svgRect);
            svgElements[key] = svgRect;
        }
      }
    });
}
function updateWorldModelWithKey(keyFrame){
    worldModel = JSON.parse(JSON.stringify(keyFrame));

}

function updateWorldModelWithTween(tweenFrame){
    for(let item in tweenFrame){
        for(let attribute in tweenFrame[item]){
            worldModel["key"][item][attribute] = JSON.parse(JSON.stringify(tweenFrame[item][attribute]));
        }
    }
    worldModel["game_time"] = JSON.parse(JSON.stringify(tweenFrame["game_time"]));
}


function startGameLoop(){
    parentSvg = document.getElementById("parent_svg");
    textSvg = document.getElementById("debugging");

    svgElements = {};

    lastKeyTime = 0;
    lastTweenTime = 0;
    keyFrameIndex = -1;
    tweenIndex = -1;
    timeToNextKey = 0;
    timeToNextTween = 0;
    syncBuffer();

    window.requestAnimationFrame(gameLoop);

}

function displayOverLayDebug(){
    // <p>{worldModel["game_time"]}</p>
    //                 <p>keyFrameIndex: {keyFrameIndex} out of {initialBuffer.length}</p> 
    //                 {/* <p>TweenIndex: {tweenIndex} out of {initialBuffer[keyFrameIndex].tweens.length}</p>  */}
    //                 <p>timeToNextKey:{timeToNextKey} || {nowTime-lastKeyTime}</p>
    //                 <p>Counter:{counter}</p>
    //                 <p>timeToNextTween:{timeToNextTween} || {nowTime - lastTweenTime}</p>
    //                 <p>Now time:{nowTime}</p>
    var string = "game time: " + worldModel["game_time"]+ "<br/> keyFrameIndex: " + keyFrameIndex + "/" + initialBuffer.length + " <br/> timeToNextKey: "+  timeToNextKey + "<br/> timeToNextTween:" + timeToNextTween+" <br/> Now time:" + nowTime + "<br/> broadcast latency: " + broadcastLatency;
    textSvg.setAttribute("y", 30);
    textSvg.innerHTML = string;
}

var keyHolder;
var counter;
var nowTime;
var tweenOffset = 0;
function gameLoop(){
    nowTime = Date.now();
    if(keyFrameIndex < 0 || tweenIndex >= initialBuffer[keyFrameIndex].tweens.length-1){
        keyFrameIndex++;
        tweenIndex = -1;
        worldModel = JSON.parse(JSON.stringify(initialBuffer[keyFrameIndex]));
        updateSvgRects();
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
        updateSvgRects();

        if(initialBuffer[keyHolder].tweens[tweenIndex+1]!=null){
            timeToNextTween = initialBuffer[keyHolder].tweens[tweenIndex+1].game_time - initialBuffer[keyHolder].tweens[tweenIndex].game_time - tweenOffset;
        }
        else{
            //todo use the key frame rate, cast to int
            timeToNextTween = 1000 * 1000;
        }
    }
    // displayOverLayDebug();
    window.requestAnimationFrame(gameLoop);
}

// function Rect() {
//         let xOffset = 0;
//         let yOffset = 0;
//         let width = 0;
//         let height = 0;
//         const jsonArray = Object.entries(worldModel["key"]);
//         let tooltipInfo={};
//         const [colors, setColors] = React.useState(
//             Object.fromEntries(
//               Object.keys(worldModel["key"]).map((key) => [key, "red"])
//             )
//           );
          
//         const handleDivClick = (key) => {
//             // Create a copy of the current colors object
//             const newColors = { ...colors };
//             // Change the color of the rectangle with the given key to a random color using Math.random()
//             newColors[key] = `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`;
//             // Set the updated colors object as the new state
//             setColors(newColors);
//           };
          
//         return (
//             <div>
//                 <p>{worldModel["game_time"]}</p>
//                 <p>keyFrameIndex: {keyFrameIndex} out of {initialBuffer.length}</p> 
//                 {/* <p>TweenIndex: {tweenIndex} out of {initialBuffer[keyFrameIndex].tweens.length}</p>  */}
//                 <p>timeToNextKey:{timeToNextKey} || {nowTime-lastKeyTime}</p>
//                 <p>Counter:{counter}</p>
//                 <p>timeToNextTween:{timeToNextTween} || {nowTime - lastTweenTime}</p>
//                 <p>Now time:{nowTime}</p>
//                 {jsonArray.map(([key, value]) => {
//                     if(key!=null && value["screenRect"]!= null){
//                         tooltipInfo = Object.entries(value).map(([key, value]) => {
//                         if (typeof value === "object") {
//                             // For nested objects, use JSON.stringify to convert the object to a string
//                             // with the key-value pairs separated by a colon
//                             return `${key}: ${JSON.stringify(value)}`;
//                         } else {
//                             // For non-object values, simply use the key-value pair with a colon separator
//                             return `${key}: ${value}`;
//                         }
//                         }).join("\n");

//                         xOffset = value["screenRect"].x/screen_width*100;
//                         yOffset = value["screenRect"].y/screen_height*100;
//                         width = value["screenRect"].w/screen_width*100;
//                         height = value["screenRect"].h/screen_height*100;
//                         return <div onClick={()=> handleDivClick(key)} className = "tooltip"key ={key} style={{
//                                 width:--width+'%', 
//                                 height:--height+'%', 
//                                 border:'5px solid ' + colors[key], 
//                                 position:'absolute',
//                                 top: --yOffset+'%',
//                                 left: --xOffset +'%',

//                             }}>
//                                 <span key={value["secret_name"]}className = "tooltiptext">{tooltipInfo} </span>
//                             </div>;
//                     }
//                 })}
            
//             </div>
//         );
        
// }
// const domContainer = document.querySelector('#rect_container');
// const root = ReactDOM.createRoot(domContainer);
