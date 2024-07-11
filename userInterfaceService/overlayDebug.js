import { getRandomColor } from './svgUtils.js';

var parentSvgDebug;
var svgDebugElements = {};

let objectsSelectable = new Map();

function updateSvgDebug(worldModel, screen_width, screen_height, enableScreenRects){
  parentSvgDebug = document.getElementById("parent_svg_debug");

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
            if (!svgRect.getAttribute("stroke"))
              svgRect.setAttribute("stroke", "red");
          }
          else{
            svgRect.removeAttribute("stroke");
          }
          // code for doing find objects
          if (objectsSelectable.has(key) && objectsSelectable.get(key) != value["isSelectable"]) {
            objectsSelectable.set(key, value["isSelectable"]);
            svgRect.addEventListener("click", (evt) => {
                console.log(key, value["isSelectable"])
                console.log("Found an Object!!!");
            });
          }
      }
      else{
          objectsSelectable.set(key, false);

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
            if (!svgRect.getAttribute("stroke"))
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
              // console.log("mouse out");
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

export { updateSvgDebug };