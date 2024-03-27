import { createDialogueChoiceSvg, dialogueNotification} from "./updateSvg.js";
import { changeLanguage } from "./languageSelectionUtil.js";
var newDialog = "";
var svgBloomwoodElements = {};


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

  export {updateSVGBloomwoodElements};