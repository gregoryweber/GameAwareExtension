var token, userId;

// so we don't have to write this out everytime 
const twitch = window.Twitch.ext;

let isAuthed = false;

// callback called when context of an extension is fired 
twitch.onContext((context) => {
//   console.log(context.hlsLatencyBroadcaster);
});

var worldModel = {};


// onAuthorized callback called each time viewer is authorized
twitch.onAuthorized((auth) => {
  setInterval(getMetaData, 1000); // once the user is verified, start getting metadata from backend
});

function getMetaData(){
      $.ajax({
          type: 'GET',
          url: location.protocol + '//localhost:3000/data',
          contentType: 'application/json',
          headers: { authorization: 'Bearer ' + window.Twitch.ext.viewer.sessionToken},
          success: function(res) {
              updateWorldModel(res);
          } 
      });

}

var counter;
var frameHolder;
var thenTime;
var nowTime;
var startTime;
var elapsedTime;
var fps = 24.0; // TODO change this to number of items in tween array
var fpsInterval;

function updateWorldModel(frame){
    worldModel["game_time"] = frame["game_time"];
    for (var item in frame["key"]){
        worldModel[item] = frame["key"][item];
    }
    counter = 0;
    frameHolder = frame;
    fpsInterval = 1000/fps;
    thenTime = Date.now();
    startTime = thenTime;
    window.requestAnimationFrame(gameLoop);
    // console.log(worldModel);
}

function gameLoop(){
    nowTime = Date.now();
    elapsedTime = nowTime - thenTime;

    if (elapsedTime > fpsInterval && counter < 24){
        thenTime = nowTime - (elapsedTime % fpsInterval);
        // console.log(frameHolder);
        for (var tweenKey in frameHolder["tweens"][counter]){
            if(tweenKey != "game_time" && tweenKey !="dt"){
                worldModel[tweenKey]["screenRect"] = frameHolder["tweens"][counter][tweenKey]["screenRect"];
                // console.log(worldModel[tweenKey]);
            }
        }
        root.render(<Rect />)
        counter++;
    }
    else if (counter >= 24){
        counter = 0;
    }
    window.requestAnimationFrame(gameLoop);
}
function Rect() {
        let xOffset = 0;
        let yOffset = 0;
         if (worldModel['GreenWalker']['screenRect']['x'] != null){
            xOffset = worldModel['GreenWalker']['screenRect']['x']/100;
            yOffset = worldModel['GreenWalker']['screenRect']['y']/100;
        }
        return  <div style={{
            width:'50px', 
            height:'50px', 
            border:'5px solid red', 
            position:'absolute',
            bottom: --yOffset+'%',
            left: --xOffset +'%',
    
        }}></div>;
}
const domContainer = document.querySelector('#rect_container');
const root = ReactDOM.createRoot(domContainer);
