import { updateSVGTowerDefenseElements } from './towerDefence.js';
import { updateSvgMaze } from './invisibleMaze.js';
import {updateSVGBloomwoodElements} from './bloomwoodGame.js';
import { getRandomColor } from './svgUtils.js';
import {translateText, changeLanguage} from './languageSelectionUtil.js';

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
let globalWorldModel;

let isLiveDialog = true;
let noKeydown = true;
var dialogArray = [];
var dialogArrayIndex = 0;

let enableScreenRects = true; // Default value based on checkbox being initially checked


function startSvg() {
    parentSvgDebug = document.getElementById("parent_svg_debug");
    parentSvgMaze = document.getElementById("parent_svg_maze");
    parentSvgTowerDefense = document.getElementById("parent_svg_tower_defense");
    parentSvgBloomwood = document.getElementById("parent_svg_bloomwood");
    
    document.getElementById("debugCheckbox").addEventListener("change", changeOverlay);
    document.getElementById("mazeCheckbox").addEventListener("change", changeOverlay);
    document.getElementById("towerDefenseCheckbox").addEventListener("change", changeOverlay);

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
    const debugCheckbox = document.querySelector('input[value="debug"]');
    const mazeCheckbox = document.querySelector('input[value="maze"]');
    const towerDefenseCheckbox = document.querySelector('input[value="tower_defense"]');
    const bloomwoodCheckbox = document.querySelector('input[value="bloomwood"]');

  
    // Toggle the visibility of all the selected overlays
    isDebugVisible = debugCheckbox.checked;
    isMazeVisible = mazeCheckbox.checked;  
    isTowerDefenseVisible = towerDefenseCheckbox.checked;  

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
export { startSvg, updateSvg, increaseFontSize, decreaseFontSize, createDialogueChoiceSvg, dialogueNotification};
