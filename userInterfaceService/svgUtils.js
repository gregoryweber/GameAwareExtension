
function updatePoint(svgPoint, x, y) {
    svgPoint.setAttribute("cx", x.toString() + "%");
    svgPoint.setAttribute("cy", y.toString() + "%");

    return svgPoint;
}

function updateLine(svgLine, x1, y1, x2, y2) {
    svgLine.setAttribute("x1", x1.toString() + "%");
    svgLine.setAttribute("y1", y1.toString() + "%");
    svgLine.setAttribute("x2", x2.toString() + "%");
    svgLine.setAttribute("y2", y2.toString() + "%");

    return svgLine;
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

export { updatePoint, updateLine, createLine, createPoint, getRandomColor};
