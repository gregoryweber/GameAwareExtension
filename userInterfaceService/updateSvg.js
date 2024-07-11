import { updateSvgDebug } from "./overlayDebug.js";
import { updateSvgFindObjects } from "./findObjects.js";
import { updateSVGTowerDefenseElements } from './towerDefence.js';
import { updateSvgMaze } from './invisibleMaze.js';
import {updateSVGBloomwoodElements} from './bloomwoodGame.js';
import {translateText, changeLanguage} from './languageSelectionUtil.js';

var isDebugVisible = false;
var isMazeVisible = false;
var isTowerDefenseVisible = false;
var isBloomwoodVisible = false;
var isFindObjectsVisible = false;
let globalWorldModel;

let isLiveDialog = true;
let noKeydown = true;
var dialogArray = [];
var dialogArrayIndex = 0;

let enableScreenRects = true; // Default value based on checkbox being initially checked


function startSvg() {
  document.getElementById("debugCheckbox").addEventListener("change", changeOverlay);
  document.getElementById("mazeCheckbox").addEventListener("change", changeOverlay);
  document.getElementById("towerDefenseCheckbox").addEventListener("change", changeOverlay);
  document.getElementById("bloomwoodCheckbox").addEventListener("change", changeOverlay);
  document.getElementById("findObjectsCheckbox").addEventListener("change", changeOverlay);

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
}

function changeOverlay(){
    const debugCheckbox = document.querySelector('input[value="debug"]');
    const mazeCheckbox = document.querySelector('input[value="maze"]');
    const towerDefenseCheckbox = document.querySelector('input[value="tower_defense"]');
    const bloomwoodCheckbox = document.querySelector('input[value="bloomwood"]');
    const findObjectsCheckbox = document.querySelector('input[value="findobjects"]');
  
    // Toggle the visibility of all the selected overlays
    isDebugVisible = debugCheckbox.checked;
    isMazeVisible = mazeCheckbox.checked;  
    isTowerDefenseVisible = towerDefenseCheckbox.checked;  
    isBloomwoodVisible = bloomwoodCheckbox.checked;
    isFindObjectsVisible = findObjectsCheckbox.checked;
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
        updateSvgDebug(worldModel, screen_width, screen_height, enableScreenRects);
    }
    else{
        document.getElementById("parent_svg_debug").style.visibility = "hidden";
        document.getElementById("targetSetting").style.visibility = "hidden";
    }
    if (isFindObjectsVisible) {
      document.getElementById("parent_svg_find_objects").style.visibility = "visible";
      updateSvgFindObjects(worldModel, screen_width, screen_height, enableScreenRects);
    } else {
      document.getElementById("parent_svg_find_objects").style.visibility = "hidden";
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
  // console.log(e.key)
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
