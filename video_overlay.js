var token, userId;

// so we don't have to write this out everytime 
const twitch = window.Twitch.ext;

let isAuthed = false;
// callback called when context of an extension is fired 
twitch.onContext((context) => {
//   console.log(context.hlsLatencyBroadcaster);
});

var worldModel = {};

/** Listener for the metadata broadcast from EBS */
twitch.listen('broadcast', (target, contentType, message) => {
        if (isAuthed) {
            // console.log(message);
        } else {
            //ignore as not authed
        }
    }
);

// onAuthorized callback called each time JWT is fired
twitch.onAuthorized((auth) => {
  // save our credentials
  token = auth.token;  
  userId = auth.userId;
  isAuthed = true; 
 
  //ajax call that passes the JWT to the EBS along with authorized token and userId
  $.ajax({
      type: 'POST',
      url: location.protocol + '//localhost:3000/auth',
      data: JSON.stringify({authToken:token, userId: userId, channelId: auth.channelId}),
      contentType: 'application/json',
      headers: { authorization: 'Bearer ' + window.Twitch.ext.viewer.sessionToken },
  });
  setInterval(getMetaData, 1000);
});

// UNCOMMENT TO GET METADATA WITHOUT PUBSUB
function getMetaData(){
      //ajax call that passes the JWT to the EBS along with authorized token and userId
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

    // for (var i = 0; i < 24; i++){  // for the first 24 tweens
    //     if(frame["tweens"][i]!=null && frame["tweens"][i]["dt"] !=null){
    //         let timeout = frame["tweens"][i]["dt"]
    //         for (var tweenKey in frame["tweens"][i]){
    //             if(tweenKey != "game_time" && tweenKey !="dt"){
    //                 worldModel[tweenKey]["screenRect"] = frame["tweens"][i][tweenKey]["screenRect"];
    //             }
    //             console.log(worldModel)
    //             //    console.log(worldModel['BlueWalker']['screenRect']['x']+'px');
    //         }
    //         // console.log( worldModel['YellowWalker']['screenRect']['x']);
    //         root.render(<Rect />)
    //         // console.log(worldModel['YellowWalker']['screenRect']['x']/100);
    //     }
    // }
}

function gameLoop(){

    nowTime = Date.now();
    elapsedTime = nowTime - thenTime;

    if (elapsedTime > fpsInterval && counter < 24){
        thenTime = nowTime - (elapsedTime % fpsInterval);
        for (var tweenKey in frameHolder["tweens"][counter]){
            if(tweenKey != "game_time" && tweenKey !="dt"){
                worldModel[tweenKey]["screenRect"] = frameHolder["tweens"][counter][tweenKey]["screenRect"];
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
         if (worldModel['YellowWalker']['screenRect']['x'] != null){
            xOffset = worldModel['RedWalker']['screenRect']['x']/100;
            yOffset = worldModel['RedWalker']['screenRect']['y']/100;
        }
        // console.log(xOffset);
        // console.log(yOffset);

        return  <div style={{
            width:'50px', 
            height:'50px', 
            border:'5px solid red', 
            position:'absolute',
            top: --yOffset+'%',
            left: --xOffset +'%',
    
        }}></div>;
}
const domContainer = document.querySelector('#rect_container');
const root = ReactDOM.createRoot(domContainer);
