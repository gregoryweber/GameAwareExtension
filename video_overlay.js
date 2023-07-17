var token, userId;

// so we don't have to write this out everytime
const twitch = window.Twitch.ext;

let isAuthed = false;
let broadcastLatency;
let start_game_secs;
let start_clock_secs;
let latest_game_secs;
let tween_rate = 24;
let key_rate = 1;
let target = 300;
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

function getStartData() {
  $.ajax({
    type: "GET",
    url: location.protocol + "//localhost:3000/startData",
    contentType: "application/json",
    headers: {
      authorization: "Bearer " + window.Twitch.ext.viewer.sessionToken,
    },
    success: function (res) {
      start_game_secs = res.game_time;
      start_clock_secs = res.clock_mills;
      key_rate = res.key_frame_rate;
      tween_rate = res.tween_frame_rate;
      screen_width = res.screen_width;
      screen_height = res.screen_height;
    },
  });
}
// Initial latest frame get request to figure out current latest, used to build back buffer
function setUpInitialBuffer(){
    let backPadding = parseInt(broadcastLatency)*(2/key_rate); // pad an extra few seconds
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

function getLatestData() {
  $.ajax({
    type: "GET",
    url: location.protocol + "//localhost:3000/latestData",
    contentType: "application/json",
    headers: {
      authorization: "Bearer " + window.Twitch.ext.viewer.sessionToken,
    },
    success: function (res) {
      forwardBuffer.push(res);
    },
  });
}

function syncBuffer(){
    //console.log("sync called");
    let actualKeyPointer;
    let actualTweenPointer;
    initialBuffer.push.apply(initialBuffer, forwardBuffer);
    forwardBuffer.length = 0;


    //Date.now() = current time in viewer's frame of reference
    //start_clock_secs = local time stamp from the streamer's computer
    //start_game_secs = Unity's frame of reference of time (all future game times are from this frame of reference)
    //broadcastLatency = number from Twitch, latency from the streamer to the viewer
    let dateNow = Date.now();
    let actualTime = dateNow - start_clock_secs - start_game_secs - (broadcastLatency * 1000);

    
    // Search initial buffer, find key within 1/key_frame_rate of the calculated keyTime
    // Target key frame should be the same as key time if we ignore the hundreds values (only the thousands are the seconds);
    // console.log("pre-initialBuffer: ", initialBuffer);
    actualKeyPointer = initialBuffer.length-1;
    // for(let i = 0; i < initialBuffer.length; i++){
    //     // if(actualTime - initialBuffer[i].game_time < ((1/key_rate) * 1000)){
    //     // console.log(`actual:    ${actualTime}`);
    //     // console.log(`game_time: ${initialBuffer[i].game_time}`);
    //     //console.log(`actual - game_time = ${actualTime-initialBuffer[i].game_time}`)
    //     if(actualTime - initialBuffer[i].game_time < target + 1000){ 
    //         console.log("synced within " + (actualTime - initialBuffer[i].game_time) + "ms")
    //         actualKeyPointer = i;
    //         break;
    //         // console.log("sync point found");
    //     }
    // }
    // console.log(`sync point at ${actualKeyPointer}/${initialBuffer.length-1}:`)
    //ToDo: Deal with the case where there are no tweens

    console.log(initialBuffer[actualKeyPointer])
    actualTweenPointer = 0;
    if (!initialBuffer[actualKeyPointer].tweens){
        console.log("Error: Tween object cannot be found");
        return;
    } else {
      for( let i = 0; i < initialBuffer[actualKeyPointer].tweens.length-1; i++){
        // if(actualTime - initialBuffer[actualKeyPointer].tweens[i].game_time < (1/tween_rate * 1000)){
        // console.log(`tween difference: ${actualTime} - ${initialBuffer[actualKeyPointer].tweens[i+1].game_time} = ${actualTime - initialBuffer[actualKeyPointer].tweens[i+1].game_time} `)
        if(actualTime - initialBuffer[actualKeyPointer].tweens[i+1].game_time < -target){
            actualTweenPointer = i;
            break;
        }
      }
    }

    
    
    // if(!actualTweenPointer){
    //     console.log("Error: no tween pointer found");
    //     actualTweenPointer = initialBuffer[actualKeyPointer].tweens.length-1;
    // }
    initialBuffer.splice(0, initialBuffer.length-1);
    tweenIndex = actualTweenPointer;
    keyFrameIndex = 0;

    if (initialBuffer) {
        console.log(initialBuffer[0])
        lastKeyTime = Date.now() - (actualTime - initialBuffer[0].game_time);
        lastTweenTime = Date.now() - (actualTime - initialBuffer[0].tweens[tweenIndex].game_time);
        timeToNextKey = 1000/key_rate;
        if(initialBuffer[0].tweens[tweenIndex+1]){
            timeToNextTween = initialBuffer[0].tweens[tweenIndex+1].game_time - initialBuffer[0].tweens[tweenIndex].game_time - tweenOffset;
        }
        else{
            timeToNextTween = Math.floor(1000/tween_rate);
        }
    }
    

    updateWorldModelWithKey(initialBuffer[keyFrameIndex]);
    //updateWorldModelWithTween(initialBuffer[keyFrameIndex].tweens[tweenIndex]);
    updateWorldModelWithTween(initialBuffer[keyFrameIndex].tweens[tweenIndex]);
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
var parentSvgBloomwood;
var svgDebugElements;
var svgMazeElements;
var svgBloomwoodElements;
var textSvg;

function updateDebugOverlayRects() {
  let xOffset = 0;
  let yOffset = 0;
  let width = 0;
  let height = 0;
  let tooltipInfo;

  var gElement = document.getElementById("tooltip-group");
  if (!gElement) {
    gElement = document.createElementNS("http://www.w3.org/2000/svg", "g");

    // Set the attributes of the g element
    gElement.setAttribute("id", "tooltip-group");
    gElement.setAttribute("visibility", "hidden");

    var textElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );

    // Set the attributes of the text element
    textElement.setAttribute("id", "tooltip");
    textElement.setAttribute("width", "50");
    textElement.setAttribute("height", "50");
    textElement.setAttribute("fill", "black");
    textElement.setAttribute("background-color", "#000000");
    // Create a <rect> element to serve as the background of the tooltip
    var rectElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
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
      xOffset = (value["screenRect"].x / screen_width) * 100;
      yOffset = (value["screenRect"].y / screen_height) * 100;
      width = (value["screenRect"].w / screen_width) * 100;
      height = (value["screenRect"].h / screen_height) * 100;

      var svgRect = svgDebugElements[key];
      if (svgRect) {
        svgRect.setAttribute("width", width.toString() + "%");
        svgRect.setAttribute("height", height.toString() + "%");
        svgRect.setAttribute("x", xOffset.toString() + "%");
        svgRect.setAttribute("y", yOffset.toString() + "%");
      } else {
        svgRect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect"
        );
        svgRect.setAttribute("id", key + "-debug");
        svgRect.setAttribute("width", width.toString() + "%");
        svgRect.setAttribute("height", height.toString() + "%");
        svgRect.setAttribute("x", xOffset.toString() + "%");
        svgRect.setAttribute("y", yOffset.toString() + "%");
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

          tooltipInfo = Object.entries(value)
            .map(function (entry) {
              var key = entry[0];
              var value = entry[1];
              if (typeof value === "object") {
                return key + ": " + JSON.stringify(value);
              } else {
                return key + ": " + value;
              }
            })
            .join("\n");

          // Split the tooltip info into an array of lines
          var tooltipLines = tooltipInfo.split("\n");

          gElement.setAttribute(
            "transform",
            `translate(${mouseX + 6 / CTM.a}, ${mouseY + 20 / CTM.d})`
          );
          gElement.setAttribute("class", "tooltip");
          if (!textElement) {
            textElement = document.getElementById("tooltip");
          }
          textElement.textContent = "";

          var tspan = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "tspan"
          );
          tspan.setAttribute("x", 0);
          tspan.setAttribute("dy", "1.2em"); // Line spacing
          tspan.textContent = key.toString();
          textElement.appendChild(tspan);

          tooltipLines.forEach(function (line, index) {
            var tspan = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "tspan"
            );
            tspan.setAttribute("x", 0);
            tspan.setAttribute("dy", "1.2em"); // Line spacing
            tspan.textContent = line;
            textElement.appendChild(tspan);
          });

          // Set the attributes of the rect element
          var bbox = textElement.getBBox();
          if (!rectElement) {
            rectElement = document.getElementById("tooltipBox");
          }
          rectElement.setAttribute("width", bbox.width + 10);
          rectElement.setAttribute("height", bbox.height + 10);
          rectElement.setAttribute("x", bbox.x - 5);
          rectElement.setAttribute("y", bbox.y - 5);
          if (isDebugVisible) {
            gElement.setAttribute("visibility", "visible");
          } else {
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

function createPoint(x, y, radius, color, key) {
  var svgPoint = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle"
  );
  svgPoint.setAttribute("id", key);
  svgPoint.setAttribute("r", radius.toString());
  svgPoint.setAttribute("cx", x.toString() + "%");
  svgPoint.setAttribute("cy", y.toString() + "%");
  svgPoint.setAttribute("position", "absolute");
  svgPoint.setAttribute("fill", color.toString());
  parentSvgMaze.appendChild(svgPoint);

  return svgPoint;
}

function createLine(x1, y1, x2, y2, color, key) {
  var svgLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
  svgLine.setAttribute("id", key);
  svgLine.setAttribute("x1", x1.toString() + "%");
  svgLine.setAttribute("y1", y1.toString() + "%");
  svgLine.setAttribute("x2", x2.toString() + "%");
  svgLine.setAttribute("y2", y2.toString() + "%");
  svgLine.setAttribute("position", "absolute");
  svgLine.setAttribute("stroke", color.toString());
  svgLine.setAttribute("stroke-width", "2");
  parentSvgMaze.appendChild(svgLine);

  return svgLine;
}

function updateLine(svgLine, x1, y1, x2, y2) {
  svgLine.setAttribute("x1", x1.toString() + "%");
  svgLine.setAttribute("y1", y1.toString() + "%");
  svgLine.setAttribute("x2", x2.toString() + "%");
  svgLine.setAttribute("y2", y2.toString() + "%");

  return svgLine;
}

function updatePoint(svgPoint, x, y) {
  svgPoint.setAttribute("cx", x.toString() + "%");
  svgPoint.setAttribute("cy", y.toString() + "%");

  return svgPoint;
}

function updateSVGMazeElements() {
  let xOffset = 0;
  let yOffset = 0;
  let width = 0;
  let height = 0;
  Object.entries(worldModel["key"]).forEach(([key, value]) => {
    if (key.includes("tile") && value["screenRect"] != null) {
      xOffset = (value["screenRect"].x / screen_width) * 100;
      yOffset = (value["screenRect"].y / screen_height) * 100;
      width = (value["screenRect"].w / screen_width) * 100;
      height = (value["screenRect"].h / screen_height) * 100;

      var svgRect = svgMazeElements[key];
      if (svgRect) {
        svgRect.setAttribute("width", width.toString() + "%");
        svgRect.setAttribute("height", height.toString() + "%");
        svgRect.setAttribute("x", xOffset.toString() + "%");
        svgRect.setAttribute("y", yOffset.toString() + "%");
      } else {
        svgRect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect"
        );
        svgRect.setAttribute("id", key);
        svgRect.setAttribute("width", width.toString() + "%");
        svgRect.setAttribute("height", height.toString() + "%");
        svgRect.setAttribute("x", xOffset.toString() + "%");
        svgRect.setAttribute("y", yOffset.toString() + "%");
        svgRect.setAttribute("position", "absolute");
        if (value["type"] == "Safe") {
          svgRect.setAttribute("fill", "rgba(255,255,0, 0.3)");
        } else {
          svgRect.setAttribute("fill", "none");
        }
        parentSvgMaze.appendChild(svgRect);
        svgMazeElements[key] = svgRect;
      }
    } else if (key.includes("Pedestal")) {
      xOffset = (value["screenRect"].x / screen_width) * 100;
      yOffset = (value["screenRect"].y / screen_height) * 100;
      width = (value["screenRect"].w / screen_width) * 100;
      height = (value["screenRect"].h / screen_height) * 100;

      var pedX = xOffset + width / 2;
      var pedY = yOffset + height / 2;
      var targetGem = worldModel["key"][value["targetGem"]];
      var gemX =
        ((targetGem["screenRect"].x + targetGem["screenRect"].w / 2) /
          screen_width) *
        100;
      var gemY =
        ((targetGem["screenRect"].y + targetGem["screenRect"].h / 2) /
          screen_height) *
        100;
      var gemColor = targetGem["color"].toLowerCase();
      var gemPoint = svgMazeElements[gemColor + "-gem"];
      var pedPoint = svgMazeElements[gemColor + "-ped"];
      var gemLine = svgMazeElements[gemColor + "-line"];

      if (gemPoint) {
        updatePoint(gemPoint, gemX, gemY);
      } else {
        gemPoint = createPoint(gemX, gemY, 5, gemColor, gemColor + "-gem");
        svgMazeElements[gemColor + "-gem"] = gemPoint;
      }
      if (pedPoint) {
        updatePoint(pedPoint, pedX, pedY);
      } else {
        pedPoint = createPoint(pedX, pedY, 5, gemColor, gemColor + "-ped");
        svgMazeElements[gemColor + "-ped"] = pedPoint;
      }
      if (gemLine) {
        updateLine(gemLine, gemX, gemY, pedX, pedY);
      } else {
        gemLine = createLine(
          gemX,
          gemY,
          pedX,
          pedY,
          gemColor,
          gemColor + "-line"
        );
        svgMazeElements[gemColor + "-line"] = gemLine;
      }

      var svgRect = svgMazeElements[key + "-rect"];
      if (svgRect) {
        svgRect.setAttribute("width", width.toString() + "%");
        svgRect.setAttribute("height", height.toString() + "%");
        svgRect.setAttribute("x", xOffset.toString() + "%");
        svgRect.setAttribute("y", yOffset.toString() + "%");
      } else {
        svgRect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect"
        );
        svgRect.setAttribute("id", key);
        svgRect.setAttribute("width", width.toString() + "%");
        svgRect.setAttribute("height", height.toString() + "%");
        svgRect.setAttribute("x", xOffset.toString() + "%");
        svgRect.setAttribute("y", yOffset.toString() + "%");
        svgRect.setAttribute("position", "absolute");
        svgRect.setAttribute("fill", "none");
        if (value["correct"]) {
          svgRect.setAttribute("stroke", "green");
          svgRect.setAttribute("stroke-width", "2");
        } else {
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

function updateSVGBloomwoodElements() {
  let xOffset = 0;
  let yOffset = 0;
  let width = 0;
  let height = 0;
  Object.entries(worldModel["key"]).forEach(([key, value]) => {
    if (key.includes("visualNovelText") && value["screenRect"] != null) {
      xOffset = (value["screenRect"].x / screen_width) * 100 - 0.5;
      yOffset = (value["screenRect"].y / screen_height) * 100;
      width = (value["screenRect"].w / screen_width) * 100;
      height = (value["screenRect"].h / screen_height) * 100;
      var dialogContainer = document.getElementById("dialog_container");
      var svgRect = svgBloomwoodElements[key];
      if (svgRect) {
        dialogContainer.setAttribute("width", width.toString() + "%");
        dialogContainer.setAttribute("height", height.toString() + "%");
        dialogContainer.setAttribute("x", xOffset.toString() + "%");
        dialogContainer.setAttribute("y", yOffset.toString() + "%");

        var foreignObject = dialogContainer.getElementById(key + "-text");
        var textContainer = foreignObject.querySelector(
          "#" + key + "-text-container"
        );
        translateText(dialogArray[dialogArrayIndex], langTarget)
        .then((translatedText) => {
          textContainer.innerHTML = translatedText;
        })
        .catch((error) => {
          console.error(error);
        });
        textContainer.style.fontSize = 12 + fontSizeChange + "px";
        textContainer.style.color = fontColor.toString();
        textContainer.style.fontFamily = fontType.toString();
      } else {
        svgRect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect"
        );
        svgRect.setAttribute("id", key);

        dialogContainer.setAttribute("width", width.toString() + "%");
        dialogContainer.setAttribute("height", height.toString() + "%");
        dialogContainer.setAttribute("x", xOffset.toString() + "%");
        dialogContainer.setAttribute("y", yOffset.toString() + "%");
        
        svgRect.setAttribute("width", "100%");
        svgRect.setAttribute("height", "100%");
        svgRect.setAttribute("x", "0%");
        svgRect.setAttribute("y", "0%");
        svgRect.setAttribute("fill", "white");

        var foreignObject = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "foreignObject"
        );
        foreignObject.setAttribute("id", key + "-text");
        foreignObject.setAttribute("width", "100%");
        foreignObject.setAttribute("height", "100%");
        foreignObject.setAttribute("x", "1px");
        foreignObject.setAttribute("y", "1px");

        foreignObject.innerHTML = `
            <div style="width:100%; height:100%;"><div id="${key}-text-container" style="width:100%; height:100%; font-size:12px; color:red; overflow-wrap: break-word; overflow:auto;">${value["dialogRendered"]}</div></div>`;

        var textContainer = foreignObject.querySelector(
          "#" + key + "-text-container"
        );
        textContainer.innerHTML = value["dialogFull"];
        textContainer.style.fontSize = 12 + fontSizeChange + "px";
        textContainer.style.color = fontColor.toString();
        textContainer.style.fontFamily = fontType.toString();
        dialogContainer.appendChild(svgRect);
        dialogContainer.appendChild(foreignObject);
        svgBloomwoodElements[key] = svgRect;
        
        var previousButton = document.getElementById("previous-dialog-buttton");
        var nextButton = document.getElementById("next-dialog-button");
        nextButton.style.position = "absolute";
        nextButton.style.top = yOffset + height/2 + "%";
        nextButton.style.left = xOffset + width + 1+ "%";

        previousButton.style.position = "absolute";
        previousButton.style.top = yOffset + height/2 + "%";
        previousButton.style.left = xOffset - 3 + "%";
      }
    }
  });
}

function getRandomColor() {
    const colors = ['#e6194b', '#3cb44b', '#ffe119', '#0082c8', '#f58231', '#911eb4'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  

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

function startGameLoop() {
  parentSvgDebug = document.getElementById("parent_svg_debug");
  parentSvgMaze = document.getElementById("parent_svg_maze");
  parentSvgBloomwood = document.getElementById("parent_svg_bloomwood");
  textSvg = document.getElementById("debugging");

  svgDebugElements = {};
  svgMazeElements = {};
  svgBloomwoodElements = {};
  lastKeyTime = 0;
  lastTweenTime = 0;
  keyFrameIndex = -1;
  tweenIndex = -1;
  timeToNextKey = 0;
  timeToNextTween = 0;
  syncBuffer();
  window.requestAnimationFrame(gameLoop);
}

function displayOverLayDebug() {
  var string =
    "game time: " +
    worldModel["game_time"] +
    "\n keyFrameIndex: " +
    keyFrameIndex +
    "/" +
    initialBuffer.length +
    " \n timeToNextKey: " +
    timeToNextKey +
    "\n timeToNextTween:" +
    timeToNextTween +
    " \n Now time:" +
    nowTime +
    "\n broadcast latency: " +
    broadcastLatency;
  textSvg.textContent = string;
}
function updateDraw() {
  if (isDebugVisible) {
    document.getElementById("offset_box").style.visibility = "visible";
    document.getElementById("parent_svg_debug").style.visibility = "visible";
    updateDebugOverlayRects();
  } else {
    document.getElementById("offset_box").style.visibility = "hidden";
    document.getElementById("parent_svg_debug").style.visibility = "hidden";
  }
  if (isMazeVisible) {
    document.getElementById("parent_svg_maze").style.visibility = "visible";
    updateSVGMazeElements();
  } else {
    document.getElementById("parent_svg_maze").style.visibility = "hidden";
  }
  if (isBloomwoodVisible) {
    document.getElementById("accessibility_container").style.visibility = "visible";
    document.getElementById("parent_svg_bloomwood").style.visibility =
      "visible";
    document.getElementById("dialog_browser_container").style.visibility = "visible";
    updateSVGBloomwoodElements();
  } else {
    document.getElementById("accessibility_container").style.visibility = "hidden";
    document.getElementById("parent_svg_bloomwood").style.visibility = "hidden";
    document.getElementById("dialog_browser_container").style.visibility = "hidden";
  }
}

var counter = 0;
var nowTime;
var tweenOffset = 0;
var catchUpTime = 0;
var timeDiff = 0;
var dialogArray = []
var newDialog = "";
function gameLoop(){
    nowTime = Date.now();

    if(nowTime - lastKeyTime >= timeToNextKey && forwardBuffer[keyFrameIndex]){
        catchUpTime += nowTime-lastKeyTime-timeToNextKey;
        let dateNow = Date.now();
        let actualTime = dateNow - start_clock_secs - start_game_secs - (broadcastLatency * 1000);
        timeDiff = actualTime - forwardBuffer[keyFrameIndex].game_time
        let range = 200;
        if (Math.abs(timeDiff-target) > range) {
            timeToNextKey -= timeDiff - target
        } else {
            timeToNextKey = 1000/key_rate
        }
        tweenIndex = 0;
        //console.log(`key ${keyFrameIndex}`)
        updateWorldModelWithKey(forwardBuffer[keyFrameIndex]);
        //updateWorldModelWithTween(forwardBuffer[keyFrameIndex].tweens[0]);
        updateDraw()
        lastKeyTime = nowTime;
        lastTweenTime = nowTime;
        if(forwardBuffer[keyFrameIndex]["key"]["visualNovelText"]){
            if(!(forwardBuffer[keyFrameIndex]["key"]["visualNovelText"]["dialogFull"] === newDialog)){
                newDialog = forwardBuffer[keyFrameIndex]["key"]["visualNovelText"]["dialogFull"].toString();
                if(!(dialogArray.includes(newDialog))){
                  dialogArray.push(newDialog);
                 
                  if(isLiveDialog){
                    dialogArrayIndex = dialogArray.length -1;
                  }
                  dialogueNotification();
                }    
            }
        }
        timeToNextTween = forwardBuffer[keyFrameIndex].tweens[0].game_time - forwardBuffer[keyFrameIndex].game_time - tweenOffset - catchUpTime;
        
        
        let syncRange = 500;
        if (forwardBuffer.length > 2 && Math.abs(timeDiff-target) >= syncRange){
            //TODO: Check for end frame
            // console.log("Syncing!")
            //syncBuffer();
        }
        //console.log("index ", keyFrameIndex, ": ", forwardBuffer[keyFrameIndex]);
        keyFrameIndex++;        
    }
    //console.log(`tween ${tweenIndex}: ${nowTime-lastTweenTime} >= ${timeToNextTween}`);
    if (nowTime - lastTweenTime >= timeToNextTween && forwardBuffer[keyFrameIndex-1] && tweenIndex < tween_rate){
        catchUpTime = nowTime-lastTweenTime-Math.max(timeToNextTween, 0);
        //console.log(`${nowTime}-${lastTweenTime}-${Math.max(timeToNextTween, 0)}=${catchUpTime}`)
        
        //console.log(`${keyFrameIndex-1}[${tweenIndex}]: ${nowTime-lastTweenTime} >= ${timeToNextTween} (-${catchUpTime})`);
        // if (!updateWorldModelWithTween(forwardBuffer[keyFrameIndex-1].tweens[tweenIndex])) {
        //     console.log(tweenIndex ,forwardBuffer[keyFrameIndex-1].tweens)
        // }
        
        // updateWorldModelWithTween(forwardBuffer[keyFrameIndex-1].tweens[tweenIndex]);
        lastTweenTime = nowTime;
        updateDraw();
        if(forwardBuffer[keyFrameIndex-1].tweens[tweenIndex+1]){
            timeToNextTween = forwardBuffer[keyFrameIndex-1].tweens[tweenIndex+1].game_time - forwardBuffer[keyFrameIndex-1].tweens[tweenIndex].game_time - tweenOffset - catchUpTime;
        }
        else{
            timeToNextTween = Math.floor(1000/tween_rate);
        }
        timeToNextTween -= Date.now() - nowTime;
        tweenIndex++;
    }
    // displayOverLayDebug();
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
var isMazeVisible = false;
var isBloomwoodVisible = false;
function displayDebugOverlay() {
  if (isDebugVisible == false) {
    isDebugVisible = true;
  } else {
    isDebugVisible = false;
  }
  console.log(isDebugVisible);
}

function changeOverlay() {
  const debugCheckbox = document.querySelector('input[value="debug"]');
  // const mazeCheckbox = document.querySelector('input[value="maze"]');
  const bloomwoodCheckbox = document.querySelector('input[value="bloomwood"]');

  // Toggle the visibility of all the selected overlays
  isDebugVisible = debugCheckbox.checked;
  // isMazeVisible = mazeCheckbox.checked;
  isBloomwoodVisible = bloomwoodCheckbox.checked;
}

function getSelectedOptions(selectElement) {
  var selectedOptions = [];
  var options = selectElement.options;
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    if (option.selected) {
      selectedOptions.push(option.value);
    }
  }
  return selectedOptions;
}
var fontSizeChange = 0;
function increaseFontSize() {
    if(fontSizeChange <= 50){
        fontSizeChange +=2;
    }
  }
  
function decreaseFontSize() {
    if(fontSizeChange >= 0){
        fontSizeChange-=2;
    }
}

var fontColor = "black";
function changeFontColor() {
    var fontColorSelect = document.getElementById("font-color-select");
    fontColor = fontColorSelect.value;
  }
  
var fontType = "Arial";
function changeFontType() {
    var fontTypeSelect = document.getElementById("font-type-select");
    fontType = fontTypeSelect.value;
    
}

function translateText(text, target) {
    const source = 'en';
    const encodedText = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&ie=UTF-8&oe=UTF-8&otf=2&q=${encodedText}`;
  
    return fetch(url)
      .then(response => response.json())
      .then(result => {
        let translatedText = '';
        for (let i = 0; i < result[0].length; i++) {
          translatedText += result[0][i][0];
        }
        return translatedText.trim();
      })
      .catch(error => console.error(error));
  }

var langTarget = "en";
function changeLanguage(){
    var languageSelect = document.getElementById("language-select");
    langTarget = languageSelect.value;
}

var dialogArrayIndex = 0;
let isLiveDialog = true;
function advanceDialogArray(){
  isLiveDialog = false;
  document.getElementById("dialogCheckbox").checked = false;;
    console.log(dialogArrayIndex);
    if(dialogArrayIndex < dialogArray.length-1){
        dialogArrayIndex++;
        console.log(dialogArrayIndex);
        if (dialogArrayIndex == dialogArray.length -1) {
          dialogueNotification();
        }
    }
}

function previousDialogArray(){
    console.log(dialogArrayIndex);
    document.getElementById("dialogCheckbox").checked = false;;
    isLiveDialog = false;
    if(dialogArrayIndex > 0){
        dialogArrayIndex--;
        console.log(dialogArrayIndex);
        console.log(dialogArray[dialogArrayIndex]);
    }
}

function changeDialogSettings(){
  isLiveDialog = document.getElementById("dialogCheckbox").checked;
  if(isLiveDialog){
    dialogArrayIndex = dialogArray.length-1;
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