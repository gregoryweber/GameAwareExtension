var parentSvg;
var svgFindObjectsElements = {};

const objectsSelectable = new Map();
const foundObjects = new Map();

// the specific game data pertaining to the viewer that would like to be sent back
const gameData = {};

// runs on the start of the extension
function startSvg() {

}

// runs on every animation frame of the extension
function updateSvg(worldModel, screen_width, screen_height, updateCallback){

  parentSvg = document.getElementById("parent_svg");

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

      var svgRect = svgFindObjectsElements[key];
      if (svgRect) {
          svgRect.setAttribute("width", width.toString()+"%");
          svgRect.setAttribute("height", height.toString()+"%");
          svgRect.setAttribute("x", xOffset.toString()+"%");
          svgRect.setAttribute("y", yOffset.toString()+"%");
          if (objectsSelectable.has(key) && objectsSelectable.get(key) != value["isSelectable"]) {
            svgRect.setAttribute("stroke", "red");
            objectsSelectable.set(key, value["isSelectable"]);
            svgRect.addEventListener("click", (evt) => {
                console.log(key, value["isSelectable"])
                foundObjects.set(key, true);                
                svgRect.setAttribute("fill", "rgba(255, 255, 255, 0.5)");
                gameData[key].selected = true;
                console.log(`Game data length: ${Object.keys(gameData).length}`);
                updateCallback();
            });
          }
      }
      else{
          objectsSelectable.set(key, false);

          gameData[key] = {selected: false};

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
          svgRect.setAttribute("stroke-width", "2");
          svgRect.setAttribute("position", "absolute");
          svgRect.style.pointerEvents = "all"; // prevent stroke from triggering mouse events           
      
          parentSvg.appendChild(svgRect);
          svgFindObjectsElements[key] = svgRect;
      }
    }
  });

  //First thing to do: if an item is in the svgElements list and is no longer in the worldModel. remove it
  Object.entries(svgFindObjectsElements).forEach(([key, value]) => {
      if (!(key in worldModel["key"])) {
          if (parentSvg.contains(value)) {
              parentSvg.removeChild(value);
          }
          delete svgFindObjectsElements[key];
          delete gameData[key];
      }
  });

}

export { gameData, startSvg, updateSvg };