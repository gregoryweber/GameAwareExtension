import { updatePoint, updateLine, createPoint, createLine } from './svgUtils.js';

var svgMazeElements = {};
var parentSvgMaze;

function updateSvgMaze(worldModel, screen_width, screen_height){
    parentSvgMaze = document.getElementById("parent_svg_maze");
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

export { updateSvgMaze };