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
    let actualTime = Date.now() - start_clock_secs - start_game_secs - (broadcastLatency * 1000);
    
    // Search initial buffer, find key within 1/key_frame_rate of the calculated keyTime
    // Target key frame should be the same as key time if we ignore the hundreds values (only the thousands are the seconds);
    for( let i = 0; i < initialBuffer.length-1; i++){
        // if(actualTime - initialBuffer[i].game_time < ((1/key_rate) * 1000)){
        if(actualTime - initialBuffer[i+1].game_time < 0){
            actualKeyPointer = i;
            break;
            // console.log("sync point found");
        }
    }

    if(actualKeyPointer == undefined){
        console.log("Error: no key pointer found");
        actualKeyPointer = initialBuffer.length-1;
    }
    //ToDo: Deal with the case where there are no tweens
    for( let i = 0; i < initialBuffer[actualKeyPointer].tweens.length-1; i++){
        // if(actualTime - initialBuffer[actualKeyPointer].tweens[i].game_time < (1/tween_rate * 1000)){
        if(actualTime - initialBuffer[actualKeyPointer].tweens[i+1].game_time < 0){
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
    keyFrameIndex = 1;
    lastKeyTime = Date.now() - (actualTime - initialBuffer[keyFrameIndex-1].game_time);
    lastTweenTime = Date.now() - (actualTime - initialBuffer[keyFrameIndex-1].tweens[tweenIndex].game_time);
    timeToNextKey = initialBuffer[keyFrameIndex+1].game_time - initialBuffer[keyFrameIndex].game_time; 
    if(initialBuffer[keyFrameIndex].tweens[tweenIndex+1]!=null){
        timeToNextTween = initialBuffer[keyFrameIndex].tweens[tweenIndex+1].game_time - initialBuffer[keyFrameIndex].tweens[tweenIndex].game_time - tweenOffset;
    }
    else{
        //todo use the key frame rate, cast to int
        timeToNextTween = 1000 * 1000;
    }
    updateWorldModelWithKey(initialBuffer[keyFrameIndex+1]);
    updateWorldModelWithTween(initialBuffer[keyFrameIndex].tweens[tweenIndex+1]);
    updateDraw();
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
var parentSvgDebug;
var parentSvgMaze;
var svgDebugElements;
var svgMazeElements;
var textSvg;



function updateDebugOverlayRects(){
    let xOffset = 0;
    let yOffset = 0;
    let width = 0;
    let height = 0;  
    let tooltipInfo;

    var gElement = document.getElementById("tooltip-group");
    if(!gElement){
        gElement = document.createElementNS("http://www.w3.org/2000/svg", "g");
    
        // Set the attributes of the g element
        gElement.setAttribute("id", "tooltip-group");
        gElement.setAttribute("visibility", "hidden");

        var textElement = document.createElementNS("http://www.w3.org/2000/svg", "text");

        // Set the attributes of the text element
        textElement.setAttribute("id", "tooltip");
        textElement.setAttribute("width", "50");
        textElement.setAttribute("height", "50");
        textElement.setAttribute("fill", "black");
        textElement.setAttribute("background-color", "#000000");
         // Create a <rect> element to serve as the background of the tooltip
         var rectElement = document.createElementNS("http://www.w3.org/2000/svg", "rect");
         rectElement.setAttribute("fill", "lightgray");
         rectElement.setAttribute("rx", 5);
         rectElement.setAttribute("ry", 5);
         rectElement.setAttribute("id", "tooltipBox");

        gElement.appendChild(rectElement);
        gElement.appendChild(textElement);
        parentSvgDebug.appendChild(gElement);
    }
    Object.entries(worldModel["key"]).forEach(([key, value]) => {
      if (key != null && value["screenRect"] != null) {
        xOffset = value["screenRect"].x/screen_width*100;
        yOffset = value["screenRect"].y/screen_height*100;
        width = value["screenRect"].w/screen_width*100;
        height = value["screenRect"].h/screen_height*100;

        var svgRect = svgDebugElements[key];
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
            svgRect.setAttribute("id", key + "-debug");
            svgRect.setAttribute("width", width.toString()+"%");
            svgRect.setAttribute("height", height.toString()+"%");
            svgRect.setAttribute("x", xOffset.toString()+"%");
            svgRect.setAttribute("y", yOffset.toString()+"%");
            svgRect.setAttribute("fill", "none");
            // svgRect.setAttribute("stroke", "red");
            svgRect.setAttribute("stroke-width", "2");
            svgRect.setAttribute("position", "absolute");
            svgRect.style.pointerEvents = "all"; // prevent stroke from triggering mouse events    
            svgRect.addEventListener("mousemove", (evt) => {
                // Set the text content of the text element
                var CTM = svgRect.getScreenCTM();
                var mouseX = (evt.clientX - CTM.e) / CTM.a;
                var mouseY = (evt.clientY - CTM.f) / CTM.d;

                tooltipInfo = Object.entries(value).map(function(entry) {
                    var key = entry[0];
                    var value = entry[1];
                    if (typeof value === "object") {
                        return key + ": " + JSON.stringify(value);
                    } else {
                        return key + ": " + value;
                    }
                }).join("\n");

                // Split the tooltip info into an array of lines
                var tooltipLines = tooltipInfo.split("\n");
            
                gElement.setAttribute("transform", `translate(${mouseX + 6 / CTM.a}, ${mouseY + 20 / CTM.d})`);
                gElement.setAttribute("class", "tooltip");
                if(!textElement){
                    textElement =  document.getElementById("tooltip");
                }
                textElement.textContent = "";
                
                var tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                tspan.setAttribute("x", 0);
                tspan.setAttribute("dy", "1.2em"); // Line spacing
                tspan.textContent = key.toString();
                textElement.appendChild(tspan);
                
                tooltipLines.forEach(function(line, index) {
                    var tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                    tspan.setAttribute("x", 0);
                    tspan.setAttribute("dy", "1.2em"); // Line spacing
                    tspan.textContent = line;
                    textElement.appendChild(tspan);
                });

                // Set the attributes of the rect element
                var bbox = textElement.getBBox();
                if(!rectElement){
                    rectElement = document.getElementById("tooltipBox");
                }
                rectElement.setAttribute("width", bbox.width + 10);
                rectElement.setAttribute("height", bbox.height + 10);
                rectElement.setAttribute("x", bbox.x - 5);
                rectElement.setAttribute("y", bbox.y - 5);
                if(isDebugVisible){
                    gElement.setAttribute("visibility", "visible");
                }
                else{
                    gElement.setAttribute("visibility", "hidden");
                }
                // console.log("mouse in");
            });            
            svgRect.addEventListener("mouseout", () => {
                gElement.setAttribute("visibility", "hidden");
                console.log("mouse out");
            });
            svgRect.addEventListener("click", (evt) => {
                evt.target.setAttribute("stroke", getRandomColor());
            });
            parentSvgDebug.appendChild(svgRect);
            svgDebugElements[key] = svgRect;
        }
      }
    });
    //First thing to do: if an item is in the svgElements list and is no longer in the worldModel. remove it
    Object.entries(svgDebugElements).forEach(([key, value]) => {
        if (!(key in worldModel["key"])) {
            if (parentSvg.contains(value)) {
                parentSvg.removeChild(value);
            }
            delete svgDebugElements[key];
        }
    });
}

function createPoint(x,y,radius,color,key){
    var svgPoint = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
    );
    svgPoint.setAttribute("id", key);
    svgPoint.setAttribute("r", radius.toString());
    svgPoint.setAttribute("cx", x.toString()+"%");
    svgPoint.setAttribute("cy", y.toString()+"%");
    svgPoint.setAttribute("position", "absolute");
    svgPoint.setAttribute("fill", color.toString());
    parentSvgMaze.appendChild(svgPoint);

    return svgPoint;
}

function createLine(x1,y1,x2,y2,color,key){
    var svgLine = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
    );
    svgLine.setAttribute("id", key);
    svgLine.setAttribute("x1", x1.toString()+"%");
    svgLine.setAttribute("y1", y1.toString()+"%");
    svgLine.setAttribute("x2", x2.toString()+"%");
    svgLine.setAttribute("y2", y2.toString()+"%");
    svgLine.setAttribute("position", "absolute");
    svgLine.setAttribute("stroke", color.toString());
    svgLine.setAttribute("stroke-width", "2");
    parentSvgMaze.appendChild(svgLine);

    return svgLine;
}

function updateLine(svgLine,x1,y1,x2,y2){
    svgLine.setAttribute("x1", x1.toString()+"%");
    svgLine.setAttribute("y1", y1.toString()+"%");
    svgLine.setAttribute("x2", x2.toString()+"%");
    svgLine.setAttribute("y2", y2.toString()+"%");

    return svgLine;
}

function updatePoint(svgPoint,x,y){
    svgPoint.setAttribute("cx", x.toString()+"%");
    svgPoint.setAttribute("cy", y.toString()+"%");

    return svgPoint;
}


function updateSVGMazeElements(){
    let xOffset = 0;
    let yOffset = 0;
    let width = 0;
    let height = 0;  
    Object.entries(worldModel["key"]).forEach(([key, value]) => {  
      if (key.includes("tile") && value["screenRect"] != null) {
        xOffset = value["screenRect"].x/screen_width*100;
        yOffset = value["screenRect"].y/screen_height*100;
        width = value["screenRect"].w/screen_width*100;
        height = value["screenRect"].h/screen_height*100;

        var svgRect = svgMazeElements[key];
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
            svgRect.setAttribute("position", "absolute");
            if(value["type"] == "Safe"){
                svgRect.setAttribute("fill", "rgba(255,255,0, 0.3)");
            }
            else{
                svgRect.setAttribute("fill", "none");
            }
            parentSvgMaze.appendChild(svgRect);
            svgMazeElements[key] = svgRect;
        }
    }
    else if(key.includes("Pedestal")){
        xOffset = value["screenRect"].x/screen_width*100;
        yOffset = value["screenRect"].y/screen_height*100;
        width = value["screenRect"].w/screen_width*100;
        height = value["screenRect"].h/screen_height*100;

        var pedX = xOffset + (width/2);
        var pedY = yOffset + (height/2);
        var targetGem = worldModel["key"][value["targetGem"]];
        var gemX = (targetGem["screenRect"].x + targetGem["screenRect"].w/2)/screen_width*100;
        var gemY = (targetGem["screenRect"].y + targetGem["screenRect"].h/2)/screen_height*100;
        var gemColor = targetGem["color"].toLowerCase();
        var gemPoint = svgMazeElements[gemColor+"-gem"];
        var pedPoint = svgMazeElements[gemColor+"-ped"];
        var gemLine = svgMazeElements[gemColor+"-line"];

        if(gemPoint){
            updatePoint(gemPoint, gemX, gemY);
        }
        else{
            gemPoint = createPoint(gemX, gemY, 5, gemColor, gemColor +"-gem");
            svgMazeElements[gemColor + "-gem"] = gemPoint;
        }
        if(pedPoint){
            updatePoint(pedPoint, pedX, pedY);
        }
        else{
            pedPoint = createPoint(pedX, pedY, 5, gemColor, gemColor +"-ped");
            svgMazeElements[gemColor + "-ped"] = pedPoint;
        }
        if(gemLine){
            updateLine(gemLine, gemX, gemY, pedX, pedY);
        }
        else{
            gemLine = createLine(gemX, gemY, pedX, pedY, gemColor, gemColor + "-line");
            svgMazeElements[gemColor + "-line"] = gemLine;
        }


        var svgRect = svgMazeElements[key + "-rect"];
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
            svgRect.setAttribute("position", "absolute");
            svgRect.setAttribute("fill", "none");
            if(value["correct"]){
                svgRect.setAttribute("stroke", "green");
                svgRect.setAttribute("stroke-width", "2");
            }
            else{
                svgRect.setAttribute("stroke", "red");
                svgRect.setAttribute("stroke-width", "2");
            }
            parentSvgMaze.appendChild(svgRect);
            svgMazeElements[key] = svgRect;
        }
    }
});
    //First thing to do: if an item is in the svgElements list and is no longer in the worldModel. remove it
    // Object.entries(svgMazeElements).forEach(([key, value]) => {
    //     if (!(key in worldModel["key"])) {
    //         if (parentSvg.contains(value)) {
    //             parentSvg.removeChild(value);
    //         }
    //         delete svgMazeElements[key];
    //     }
    // });
    
}

function getRandomColor() {
    const colors = ['#e6194b', '#3cb44b', '#ffe119', '#0082c8', '#f58231', '#911eb4'];
    return colors[Math.floor(Math.random() * colors.length)];
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
    if(tweenFrame){
        worldModel["game_time"] = JSON.parse(JSON.stringify(tweenFrame["game_time"]));
    }
}


function startGameLoop(){
    parentSvgDebug = document.getElementById("parent_svg_debug");
    parentSvgMaze = document.getElementById("parent_svg_maze");
    textSvg = document.getElementById("debugging");

    svgDebugElements = {};
    svgMazeElements = {};
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
    var string = "game time: " + worldModel["game_time"]+ "\n keyFrameIndex: " + keyFrameIndex + "/" + initialBuffer.length + " \n timeToNextKey: "+  timeToNextKey + "\n timeToNextTween:" + timeToNextTween+" \n Now time:" + nowTime + "\n broadcast latency: " + broadcastLatency;
    textSvg.textContent = string;
}
function updateDraw(){
    if(isDebugVisible){
        document.getElementById("offset_box").style.visibility="visible";
        document.getElementById("parent_svg_debug").style.visibility = "visible";
        updateDebugOverlayRects();
    }
    else{
        document.getElementById("offset_box").style.visibility="hidden";
        document.getElementById("parent_svg_debug").style.visibility = "hidden";

    }
    updateSVGMazeElements();
}

var counter;
var nowTime;
var tweenOffset = 0;
function gameLoop(){
    nowTime = Date.now();
    // if(keyFrameIndex < 0 || tweenIndex >= initialBuffer[keyFrameIndex].tweens.length-1){
    if(nowTime - lastKeyTime >= timeToNextKey){
        // console.log("key frame update");
        keyFrameIndex++;
        tweenIndex = -1;
        updateWorldModelWithKey(initialBuffer[keyFrameIndex]);
        updateDraw()
        lastKeyTime = nowTime;
        lastTweenTime = nowTime;
        console.log(initialBuffer[keyFrameIndex]);

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
        updateWorldModelWithTween(initialBuffer[keyFrameIndex].tweens[tweenIndex]);
        lastTweenTime = nowTime;
        updateDraw();
        if(initialBuffer[keyFrameIndex].tweens[tweenIndex+1]!=null){
            timeToNextTween = initialBuffer[keyFrameIndex].tweens[tweenIndex+1].game_time - initialBuffer[keyFrameIndex].tweens[tweenIndex].game_time - tweenOffset;
        }
        else{
            //todo use the key frame rate, cast to int
            timeToNextTween = 1000 * 1000;
        }
        timeToNextTween -= Date.now() - nowTime;
    }
    window.requestAnimationFrame(gameLoop);
}

function incrementTweenOffset() {
    tweenOffset++; // increment tweenOffset by 1
    document.getElementById("tween-offset").innerHTML = tweenOffset; // update the value displayed on the web page
}
function decrementTweenOffset() {
    tweenOffset--; // decrement tweenOffset by 1
    document.getElementById("tween-offset").innerHTML = tweenOffset; // update the value displayed on the web page
}

var isDebugVisible = false;
function displayDebugOverlay(){
    if(isDebugVisible == false){
        isDebugVisible = true;
    }
    else{
        isDebugVisible = false;
    }
    console.log(isDebugVisible);
}