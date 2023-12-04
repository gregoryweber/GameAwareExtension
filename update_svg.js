
var parentSvgDebug;
var parentSvgMaze;
var parentSvgTowerDefense;
var parentSvgBloomwood;
var svgDebugElements;
var svgMazeElements;
var svgTowerDefenseElements;
var svgBloomwoodElements;

var isDebugVisible = false;
var isMazeVisible = false;
var isTowerDefenseVisible = false;
var isBloomwoodVisible = false;
var currentEnemyArray = [];
let globalWorldModel;

let isLiveDialog = true;
let noKeydown = true;
var dialogArray = [];
var newDialog = "";
var dialogArrayIndex = 0;

let enableScreenRects = true; // Default value based on checkbox being initially checked


function startSvg() {
    parentSvgDebug = document.getElementById("parent_svg_debug");
    parentSvgMaze = document.getElementById("parent_svg_maze");
    parentSvgTowerDefense = document.getElementById("parent_svg_tower_defense");
    parentSvgBloomwood = document.getElementById("parent_svg_bloomwood");
    // document.getElementById("debugCheckbox").addEventListener("change", changeOverlay);
    // document.getElementById("mazeCheckbox").addEventListener("change", changeOverlay);
    // document.getElementById("towerDefenseCheckbox").addEventListener("change", changeOverlay);
    document.getElementById("bloomwoodCheckbox").addEventListener("change", changeOverlay);
    document.getElementById("increase-font-size-button").addEventListener("click", increaseFontSize);
    document.getElementById("decrease-font-size-button").addEventListener("click", decreaseFontSize);
    document.getElementById("font-color-select").addEventListener("change", changeFontColor);
    document.getElementById("font-type-select").addEventListener("change", changeFontType);
    document.getElementById("language-select").addEventListener("change", changeLanguage);
    
    document.getElementById("dialogCheckbox").addEventListener("change", changeDialogSettings);
    document.getElementById("keyboard").addEventListener("change", changeKeyboardSettings);
    document.getElementById("previous-dialogue-button").addEventListener("click", previousDialogArray);
    document.getElementById("next-dialogue-button").addEventListener("click", advanceDialogArray);

    const screenRectVisibleCheckbox = document.querySelector('input[value="colored"]');
    // Add an event listener to the checkbox to update the boolean variable
    screenRectVisibleCheckbox.addEventListener("change", function () {
      enableScreenRects = screenRectVisibleCheckbox.checked;
    });
    svgDebugElements = {};
    svgMazeElements = {};
    svgTowerDefenseElements = {};
    svgBloomwoodElements = {};

}

function changeOverlay(){
    // const debugCheckbox = document.querySelector('input[value="debug"]');
    // const mazeCheckbox = document.querySelector('input[value="maze"]');
    // const towerDefenseCheckbox = document.querySelector('input[value="tower_defense"]');
    const bloomwoodCheckbox = document.querySelector('input[value="bloomwood"]');

  
    // Toggle the visibility of all the selected overlays
    // isDebugVisible = debugCheckbox.checked;
    // isMazeVisible = mazeCheckbox.checked;  
    // isTowerDefenseVisible = towerDefenseCheckbox.checked;  
    isBloomwoodVisible = bloomwoodCheckbox.checked;

}

var s_width = 0;
var s_height = 0;
function updateSvg(worldModel, screen_width, screen_height){
  s_width = screen_width;
  s_height = screen_height;
    globalWorldModel = worldModel;
    if(isDebugVisible){
        document.getElementById("parent_svg_debug").style.visibility = "visible";
        document.getElementById("targetSetting").style.visibility = "visible";
        updateSvgDebug(worldModel, screen_width, screen_height);
    }
    else{
        document.getElementById("parent_svg_debug").style.visibility = "hidden";
        document.getElementById("targetSetting").style.visibility = "hidden";
    }
    if(isMazeVisible){
        document.getElementById("parent_svg_maze").style.visibility = "visible";
        updateSvgMaze(worldModel, screen_width, screen_height);
    }
    else{
        document.getElementById("parent_svg_maze").style.visibility = "hidden";
    }
    if(isTowerDefenseVisible){
        document.getElementById("parent_svg_tower_defense").style.visibility = "visible";
        document.getElementById("upcoming_enemy_container").style.visibility = "visible";
        updateSVGTowerDefenseElements(worldModel, screen_width, screen_height);
    }
    else{
        document.getElementById("parent_svg_tower_defense").style.visibility = "hidden";
        document.getElementById("upcoming_enemy_container").style.visibility = "hidden";
    }
    // isBloomwoodVisible = worldModel["key"].visualNovelText != undefined
    if (isBloomwoodVisible && worldModel["key"].visualNovelText != undefined) {
      document.getElementById("accessibility_container").style.visibility = "visible";
      document.getElementById("parent_svg_bloomwood").style.visibility = "visible";
      // document.getElementById("dialog_browser_container").style.visibility = "visible";
      // document.getElementById("dialog_choices_container").style.visibility = "visible";
      // document.getElementById("dialog_choices_container2").style.visibility = "visible";
      updateSVGBloomwoodElements(worldModel, screen_width, screen_height);
    } else {
      document.getElementById("accessibility_container").style.visibility = "hidden";
      document.getElementById("parent_svg_bloomwood").style.visibility = "hidden";
      // document.getElementById("dialog_browser_container").style.visibility = "hidden";
      // document.getElementById("dialog_choices_container").style.visibility = "hidden";
      // document.getElementById("dialog_choices_container2").style.visibility = "hidden";
    }
}

function updateSvgDebug(worldModel, screen_width, screen_height){
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
            if (enableScreenRects){
              svgRect.setAttribute("stroke", "red");
            }
            else{
              svgRect.removeAttribute("stroke");
            }
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
            svgRect.setAttribute("class", "debugTooltip");
            if (enableScreenRects){
              svgRect.setAttribute("stroke", "red");
            }
            else{
              svgRect.removeAttribute("stroke");
            }
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

                gElement.setAttribute("visibility", "visible");
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
            if (parentSvgDebug.contains(value)) {
                parentSvgDebug.removeChild(value);
            }
            delete svgDebugElements[key];
        }
    });
    

}

function advanceDialogArray(){
  isLiveDialog = false;
  console.log("changed dialogCheckbox in next dialog array");
  document.getElementById("dialogCheckbox").checked = false;
    if(dialogArrayIndex < dialogArray.length-1){
        dialogArrayIndex++;
        changeLanguage();
        createDialogueChoiceSvg();
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
        changeLanguage();
        createDialogueChoiceSvg();

    }
}
function changeDialogSettings(){
  isLiveDialog = document.getElementById("dialogCheckbox").checked;
  console.log("hello dialog settings are" + dialogArrayIndex);
  if(isLiveDialog){
    dialogArrayIndex = dialogArray.length-1;
    changeLanguage();
    createDialogueChoiceSvg();
    dialogueNotification();
  }
}

function changeKeyboardSettings() {
  noKeydown = !noKeydown
  console.log("noKeydown",noKeydown)
}

function dialogueNotification(){
  let nextButton = document.getElementById("next-dialogue-button")
    if(dialogArrayIndex == dialogArray.length-1){
      nextButton.style.backgroundColor = '#FFFFFF';
      nextButton.getElementsByClassName('notification')[0].classList.add("hidden")
      nextButton.setAttribute("aria-label","Next dialogue")
    } else {
      nextButton.style.backgroundColor = '#FF0000';
      nextButton.getElementsByClassName('notification')[0].classList.remove("hidden")
      nextButton.setAttribute("aria-label","Next dialogue, has new dialogue")
    }
}

window.addEventListener('keydown', function (e) {
  console.log(e.key)
  if (noKeydown) {
    return
  }
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

let dialogueChoices  = document.getElementById("choices_container");

function createDialogueChoiceSvg(){
  let xOffset = 0;
  let yOffset = 0;
  let width = 0;
  let height = 0;
  let choiceSvg;
console.log(dialogArray[dialogArrayIndex]["currentChoices"])
  // Delete all previous dialogue choices
  while (dialogueChoices.firstChild) {
    dialogueChoices.removeChild(dialogueChoices.firstChild);
  }

  if(globalWorldModel["key"]["visualNovelText"] && dialogArray[dialogArrayIndex]){
    for(const [index, choice] of dialogArray[dialogArrayIndex]["currentChoices"].entries()){
        // Calculate choice dialogue rect values
      xOffset = (choice["screenRect"].x / s_width) * 100;
      yOffset = (choice["screenRect"].y / s_height) * 100;
      width = (choice["screenRect"].w / s_width) * 100;
      height = (choice["screenRect"].h / s_height) * 100;

      // Create a new SVG 
      choiceSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      choiceSvg.setAttribute("width", width.toString() + "%");
      choiceSvg.setAttribute("height", height.toString() + "%");
      choiceSvg.setAttribute("x", xOffset.toString() + "%");
      choiceSvg.setAttribute("y", yOffset.toString() + "%");

      var svgRectDialogue = document.createElementNS("http://www.w3.org/2000/svg","rect");
      svgRectDialogue.setAttribute("width", "100%");
      svgRectDialogue.setAttribute("height", "100%");
      svgRectDialogue.setAttribute("x", "0%");
      svgRectDialogue.setAttribute("y", "0%");
      svgRectDialogue.setAttribute("fill", "white");

      
      // Using a foreignObject tag instead of text because the text from the worldModel contains <a> tags. 
      let divContainer = document.createElementNS("http://www.w3.org/2000/svg","foreignObject");
      divContainer.setAttribute("width", "100%");
      divContainer.setAttribute("height", "100%");
      divContainer.setAttribute("x", "1px");
      divContainer.setAttribute("y", "1px");
      divContainer.innerHTML = `<div style="width:100%; height:100%;"><div id="choice-${index}-container" style="width:100%; height:100%; font-size:12px; color:red; overflow-wrap: break-word; overflow:auto;"></div></div>`;
      let dialogueText = divContainer.querySelector("#choice-" + index + "-container");

      translateText(choice.text, langTarget)
              .then((translatedText) => {
                dialogueText.innerHTML = translatedText;
              })
              .catch((error) => {
                console.error(error);
              });

      dialogueText.style.fontSize = 12 + fontSizeChange + "px";
      dialogueText.style.color = fontColor.toString();
      dialogueText.style.fontFamily = fontType.toString();

      choiceSvg.appendChild(svgRectDialogue);
      choiceSvg.appendChild(divContainer);
      dialogueChoices.appendChild(choiceSvg);

    }
  }
}

function updateSVGBloomwoodElements(worldModel, screen_width, screen_height){
  let xOffset = 0;
  let yOffset = 0;
  let width = 0;
  let height = 0;
  if(worldModel["key"]["visualNovelText"]){
    let key = "visualNovelText";
    let value = worldModel["key"][key];
   
    // Check to see if the dialogue in the world model is new and must be added to the dialogue array
    newDialog = value["dialogFull"].toString();
    // Check if the dialogFull value is not already in the array.
    if (!dialogArray.some((item) => item["dialogFull"].toString() === newDialog)) {
      // Add the entire visualNovelText object to the array.
      console.log("new dialogue added")
      dialogArray.push(value);

      if (isLiveDialog) {
        dialogArrayIndex = dialogArray.length - 1;
        changeLanguage();
        createDialogueChoiceSvg(worldModel, screen_width, screen_height);
        console.log(dialogArrayIndex);
      }
      dialogueNotification();
    }
    // Calculate main character dialogue rect values
    xOffset = (value["screenRect"].x / screen_width) * 100 - 0.5;
    yOffset = (value["screenRect"].y / screen_height) * 100;
    width = (value["screenRect"].w / screen_width) * 100;
    height = (value["screenRect"].h / screen_height) * 100;

    // we should be using native HTML for text, since foreignObject in SVG is inaccessible to screen readers
    var dialogueContainer = document.getElementById("dialogue_container");
    dialogueContainer.setAttribute("width", width.toString() + "%");
    dialogueContainer.setAttribute("height", height.toString() + "%");
    dialogueContainer.setAttribute("x", xOffset.toString() + "%");
    dialogueContainer.setAttribute("y", yOffset.toString() + "%");

    
    var svgRectDialogue = svgBloomwoodElements[key];
    if (svgRectDialogue) {
      let dialogueText = dialogueContainer.getElementById(key + "-text-container");
      dialogueText.innerHTML = langSelectText;
      dialogueText.style.fontSize = 12 + fontSizeChange + "px";
      dialogueText.style.color = fontColor.toString();
      dialogueText.style.fontFamily = fontType.toString();
    } 
    else {
      svgRectDialogue = document.createElementNS("http://www.w3.org/2000/svg","rect");
      svgRectDialogue.setAttribute("id", key);
      svgRectDialogue.setAttribute("width", "100%");
      svgRectDialogue.setAttribute("height", "100%");
      svgRectDialogue.setAttribute("x", "0%");
      svgRectDialogue.setAttribute("y", "0%");
      svgRectDialogue.setAttribute("fill", "white");

      
      // Using a foreignObject tag instead of text because the text from the worldModel contains <a> tags. 
      let divContainer = document.createElementNS("http://www.w3.org/2000/svg","foreignObject");
      divContainer.setAttribute("id", key + "-text");
      divContainer.setAttribute("width", "100%");
      divContainer.setAttribute("height", "100%");
      divContainer.setAttribute("x", "1px");
      divContainer.setAttribute("y", "1px");
      divContainer.innerHTML = `<div style="width:100%; height:100%;"><div id="${key}-text-container" style="width:100%; height:100%; font-size:12px; color:red; overflow-wrap: break-word; overflow:auto;"></div></div>`;
      
      let dialogueText = divContainer.querySelector("#" + key + "-text-container");
      dialogueText.innerHTML = langSelectText;

      dialogueText.style.fontSize = 12 + fontSizeChange + "px";
      dialogueText.style.color = fontColor.toString();
      dialogueText.style.fontFamily = fontType.toString();

      dialogueContainer.appendChild(svgRectDialogue);
      dialogueContainer.appendChild(divContainer);
      svgBloomwoodElements[key] = svgRectDialogue;
  }    
  }
}


var fontSizeChange = 0;
function increaseFontSize() {
  console.log("increase font size");
    if(fontSizeChange <= 50){
        fontSizeChange +=2;
        createDialogueChoiceSvg();
    }
  }
  
function decreaseFontSize() {
  console.log("decrease font size");
    if(fontSizeChange >= 0){
        fontSizeChange-=2;
        createDialogueChoiceSvg();
    }
}

var fontColor = "black";
function changeFontColor() {
  console.log("change font color")
    var fontColorSelect = document.getElementById("font-color-select");
    fontColor = fontColorSelect.value;
    createDialogueChoiceSvg();
  }
  
var fontType = "Arial";
function changeFontType() {
  console.log("change font type");
    var fontTypeSelect = document.getElementById("font-type-select");
    fontType = fontTypeSelect.value;
    createDialogueChoiceSvg();

    
}
var langSelectText = "";
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
  console.log("change language");
  var languageSelect = document.getElementById("language-select");
  langTarget = languageSelect.value;

  // Call translateText to update the translated text
  translateText(dialogArray[dialogArrayIndex].dialogFull, langTarget)
    .then((translatedText) => {
      langSelectText = translatedText;
    })
    .catch((error) => {
      console.error(error);
    });
  
    createDialogueChoiceSvg();

}


function getRandomColor() {
    const colors = ['#e6194b', '#3cb44b', '#ffe119', '#0082c8', '#f58231', '#911eb4'];
    return colors[Math.floor(Math.random() * colors.length)];
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


function updateSvgMaze(worldModel, screen_width, screen_height){
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
    
}
function updateSVGTowerDefenseElements(worldModel, screen_width, screen_height){
    let xOffset = 0;
    let yOffset = 0;
    let width = 0;
    let height = 0;  
    var upcomingEnemiesContainer = document.getElementById("upcoming_enemy_container");
    var upcomingEnemiesRect = document.getElementById("upcoming_enemy_rect");
    let tooltipData;
    // Create a new text element and set its content to enemyInfo
    // Select all elements with class "enemy-info" inside the container
    var rectBox = upcomingEnemiesRect.getBBox();
    var startY = rectBox.y + 20;
    while (upcomingEnemiesContainer.childElementCount > 1) {
      upcomingEnemiesContainer.removeChild(upcomingEnemiesContainer.lastChild);
    }
    for(let i = 0; i < currentEnemyArray.length; i++){
      var enemyInfo = buildEnemyInformation(currentEnemyArray[i]);
      var textElementEnemy = document.createElementNS("http://www.w3.org/2000/svg", "text");
      // Set the attributes of the text element
      textElementEnemy.setAttribute("id", enemyInfo.Name);
      textElementEnemy.setAttribute("width", "50");
      textElementEnemy.setAttribute("height", "50");
      textElementEnemy.setAttribute("fill", "whitesmoke");
      textElementEnemy.setAttribute("background-color", "#000000");
      textElementEnemy.setAttribute("font-size", "14px");
      textElementEnemy.setAttribute("class", "enemy-info");
      textElementEnemy.textContent = "";
      // Get the bounding box of the rectangle

      // Set the position of the text elements
      textElementEnemy.setAttribute("x", rectBox.x + 50); // 10px padding from left edge of rectangle
      textElementEnemy.setAttribute("y", startY); // 20px padding from top edge of rectangle

      Object.keys(enemyInfo).forEach(function(key, index) {
        var tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
        tspan.setAttribute("x", 9);
        tspan.setAttribute("dy", "1.4em"); // Line spacing
        if(!(key.includes("Name"))){
          tspan.textContent = key + ": " + enemyInfo[key];
        }
        else{
          tspan.textContent = enemyInfo[key];
        }
        textElementEnemy.appendChild(tspan);
        startY +=20;
      });

      // Append the text element to the upcomingEnemiesContainer
      upcomingEnemiesContainer.appendChild(textElementEnemy);

    }
    var gElement = document.getElementById("tooltip-tower-svg");
    if(!gElement){
        gElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    
        // Set the attributes of the g element
        gElement.setAttribute("id", "tooltip-tower-svg");
        gElement.setAttribute("visibility", "hidden");

        var textElement = document.createElementNS("http://www.w3.org/2000/svg", "text");

        // Set the attributes of the text element
        textElement.setAttribute("id", "tooltip-tower-text");
        // textElement.setAttribute("x",5);
        // textElement.setAttribute("y",5);
        textElement.setAttribute("width", "18%");
        textElement.setAttribute("height", "18%");
        textElement.setAttribute("fill", "whitesmoke");
        textElement.setAttribute("background-color", "#000000");
        textElement.setAttribute("font-size", "14px");
         
        // Create a <rect> element to serve as the background of the tooltip
         var rectElement = document.createElementNS("http://www.w3.org/2000/svg", "rect");
         rectElement.setAttribute("fill", "rgb(40,40,40)");
         rectElement.setAttribute("stroke", "darkgrey");
         rectElement.setAttribute("stroke-width", "10px");
         rectElement.setAttribute("rx", 5);
         rectElement.setAttribute("width", "20%");
         rectElement.setAttribute("height", "25%");
         rectElement.setAttribute("ry", 200);
         rectElement.setAttribute("id", "tooltip-tower-rect");

        gElement.appendChild(rectElement);
        gElement.appendChild(textElement);
        parentSvgTowerDefense.appendChild(gElement);
    }
    // console.log(worldModel);
    currentEnemyArray = []
    Object.entries(worldModel["key"]).forEach(([key, value]) => {
      if (key.includes("WaveManager")){
        currentEnemyArray = value.currentWave.enemies.map(function(e){ return e.enemyType }).filter((item, i, ar) => ar.indexOf(item) === i);
      }
      if (key != null && value["screenRect"] != null) {
        xOffset = value["screenRect"].x/screen_width*100;
        yOffset = value["screenRect"].y/screen_height*100;
        width = value["screenRect"].w/screen_width*100;
        height = value["screenRect"].h/screen_height*100;
        var svgRect = svgTowerDefenseElements[key];
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
            svgRect.setAttribute("id", key + "-tower");
            svgRect.setAttribute("width", width.toString()+"%");
            svgRect.setAttribute("height", height.toString()+"%");
            svgRect.setAttribute("x", xOffset.toString()+"%");
            svgRect.setAttribute("y", yOffset.toString()+"%");
            svgRect.setAttribute("fill", "none");
            // svgRect.setAttribute("stroke", "blue");
            // svgRect.setAttribute("stroke-width", "2");
            svgRect.setAttribute("position", "absolute");
            if(value["stats"]){
              tooltipData = buildTooltip(key);
              svgRect.style.pointerEvents = "all"; // prevent stroke from triggering mouse events
              svgRect.addEventListener("mousemove", function(evt){
                console.log(globalWorldModel)
                  tooltipData = buildTooltip(key);
                  var towerX = parseFloat(svgRect.getAttribute("x")) + parseFloat(svgRect.getAttribute("width"))/2;
                  var towerY = parseFloat(svgRect.getAttribute("y")) + parseFloat(svgRect.getAttribute("height"))/2;
                  var anchorTower = document.getElementById("tooltip-tower-circle");
                  if(!anchorTower){
                    anchorTower =  createPointTowerDefense(towerX, towerY, 5, "black", "tooltip-tower");
                    anchorTower.setAttribute("visibility", "hidden");
                    anchorTower.pointerEvents = "none";
                  }
                  else{
                    updatePoint(anchorTower, towerX, towerY);
                  }
                  var anchorTooltip = document.getElementById("tooltip-anchor-circle");
                  if(!anchorTooltip){
                    anchorTooltip = createPointTowerDefense(towerX, towerY - 30, 5, "darkgrey", "tooltip-anchor");
                  }
                  else{
                    updatePoint(anchorTooltip, towerX, towerY - 8);
                  }                 
                  var anchorLine = document.getElementById("tooltip-anchor-line");
                  if(!anchorLine){
                    anchorLine = createLineTowerDefense(towerX, towerY, towerX, towerY-8, "darkgrey", "tooltip-anchor");
                    anchorLine.setAttribute("stroke-width", "4");
                  }
                  else{
                    updateLine(anchorLine, towerX, towerY, towerX, towerY-8);
                  }
                
                  gElement.setAttribute("class", "tooltip");
                  
                  if(!textElement){
                    textElement =  document.getElementById("tooltip-tower-text");
                  }
                  textElement.textContent = "";
                  
                  Object.keys(tooltipData).forEach(function(key, index) {
                    var tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                    tspan.setAttribute("x", 10);
                    tspan.setAttribute("dy", "1.4em"); // Line spacing
                    if(!(key.includes("Name"))){
                      tspan.textContent = key + ": " + tooltipData[key];
                    }
                    else{
                      tspan.textContent = tooltipData[key];
                    }
                    textElement.appendChild(tspan);
                  });
                  
                  // Set the attributes of the rect element
                  var toolTipBox = gElement.getBBox();
                  var anchorBBox = anchorTooltip.getBBox();
                  if(!rectElement){
                    rectElement = document.getElementById("tooltip-tower-rect");
                  }
                  // rectElement.setAttribute("width", bbox.width + 20);
                  // rectElement.setAttribute("height", bbox.height + 10);
                  // rectElement.setAttribute("x", bbox.x-10);
                  // rectElement.setAttribute("y", bbox.y);
                  // towerX -= bbox.width/2;
                  // towerY -= bbox.height;


                  gElement.setAttribute("x", anchorBBox.x - toolTipBox.width / 2);
                  gElement.setAttribute("y", anchorBBox.y - toolTipBox.height);
                  if(isTowerDefenseVisible){
                    gElement.setAttribute("visibility", "visible");
                    anchorTower.setAttribute("visibility", "visible");
                    anchorTooltip.setAttribute("visibility", "visible");
                    anchorLine.setAttribute("visibility", "visible");
                  }
                  else{
                    gElement.setAttribute("visibility", "hidden");
                    anchorTower.setAttribute("visibility", "hidden");
                    anchorTooltip.setAttribute("visibility", "hidden");
                    anchorLine.setAttribute("visibility", "hidden");
                  }
              });            
              svgRect.addEventListener("mouseout", () => {
                  gElement.setAttribute("visibility", "hidden");
                  document.getElementById("tooltip-tower-circle").setAttribute("visibility", "hidden");
                  document.getElementById("tooltip-anchor-circle").setAttribute("visibility", "hidden");
                  document.getElementById("tooltip-anchor-line").setAttribute("visibility", "hidden");
                  // console.log("mouse out");
              });
            }    
            parentSvgTowerDefense.appendChild(svgRect);
            svgTowerDefenseElements[key] = svgRect;
        }
      }
    });
    //First thing to do: if an item is in the svgElements list and is no longer in the worldModel. remove it
    Object.entries(svgTowerDefenseElements).forEach(([key, value]) => {
        if (!(key in worldModel["key"])) {
            if (parentSvgTowerDefense.contains(value)) {
              parentSvgTowerDefense.removeChild(value);
            }
            delete svgTowerDefenseElements[key];
        }
    });
    
}

function buildEnemyInformation(enemy){
  var enemyName;
  var enemyDamage;
  var enemyHealth;
  switch(enemy){
    case "Hoverbuggy":
      enemyName = "Hover Buggy";
      enemyDamage = 2;
      enemyHealth = 5;
      break;
    case "Hovercopter":
      enemyName = "Hover Copter";
      enemyDamage = 6;
      enemyHealth = 10;
      break;
    case "Hovertank":
      enemyName = "Hover Tank";
      enemyDamage = 7;
      enemyHealth = 15;
      break;
    case "Hoverboss":
      enemyName = "Hover Boss";
      enemyDamage = 9;
      enemyHealth = 20;
      break;
    case "Super Hovertank":
      enemyName = "Super Hovertank";
      enemyDamage = -1; // What should these values be?
      enemyHealth = -1;
      break;
    case "Super Hoverbuggy":
        enemyName = "Super Hoverbuggy";
        enemyDamage = -1; // What should these values be?
        enemyHealth = -1;
        break;
    default:
      console.log("unknown:", enemy)
      enemyName = "unknown enemy";
      enemyDamage = 0;
      enemyHealth = 0;
      break;
  }
  var reConstructedObject = {"Name": enemyName, "Damage": enemyDamage, "Health": enemyHealth};
  return reConstructedObject;
}

function buildTooltip(key){
  let data = globalWorldModel["key"][key];
  let towerName;
  let towerDps;
  let towerHealth;
  let towerFireRate;
  let level;

  towerName = data.type
  level = data.stats.level
  towerDps = data.stats.dps;
  towerFireRate = data.stats["effectDetails"][0].fireRate;
  towerHealth = data["currentHealth"].toString() + "/" + data.stats.startingHealth.toString();

  return {"Name": towerName, "DPS": towerDps, "Fire Rate": towerFireRate, "Health": towerHealth, "Level": level};
  
}
function createPointTowerDefense(x,y,radius,color,key){
    var svgPoint = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
    );
    svgPoint.setAttribute("id", key + "-circle");
    svgPoint.setAttribute("r", radius.toString());
    svgPoint.setAttribute("cx", x.toString()+"%");
    svgPoint.setAttribute("cy", y.toString()+"%");
    svgPoint.setAttribute("position", "absolute");
    svgPoint.setAttribute("fill", color.toString());
    parentSvgTowerDefense.appendChild(svgPoint);
  
    return svgPoint;
}
function createLineTowerDefense(x1,y1,x2,y2,color,key){
    var svgLine = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
    );
    svgLine.setAttribute("id", key + "-line");
    svgLine.setAttribute("x1", x1.toString()+"%");
    svgLine.setAttribute("y1", y1.toString()+"%");
    svgLine.setAttribute("x2", x2.toString()+"%");
    svgLine.setAttribute("y2", y2.toString()+"%");
    svgLine.setAttribute("position", "absolute");
    svgLine.setAttribute("stroke", color.toString());
    svgLine.setAttribute("stroke-width", "2");
    parentSvgTowerDefense.appendChild(svgLine);
  
    return svgLine;
}
export { startSvg, updateSvg, increaseFontSize, decreaseFontSize};
