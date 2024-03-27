

function syncBuffer(){
    let actualKeyPointer;
    let actualTweenPointer = 0;
    initialBuffer.push.apply(initialBuffer, forwardBuffer);
    forwardBuffer.length = 0;


    //Date.now() = current time in viewer's frame of reference
    //startClockSecs = local time stamp from the streamer's computer
    //startGameSecs = Unity's frame of reference of time (all future game times are from this frame of reference)
    //broadcastLatency = number from Twitch, latency from the streamer to the viewer
    let dateNow = Date.now();
    let actualTime = dateNow - startClockSecs - startGameSecs - (broadcastLatency * 1000);

    
    actualKeyPointer = initialBuffer.length-1;
    // console.log('initialBuffer: ', initialBuffer[actualKeyPointer])
    if (!initialBuffer[actualKeyPointer].tweens){
        console.log("Error: Tween object cannot be found");
    } else {
        for( let i = 0; i < initialBuffer[actualKeyPointer].tweens.length-1; i++){
            // console.log(`tween difference: ${actualTime} - ${initialBuffer[actualKeyPointer].tweens[i+1].game_time} = ${actualTime - initialBuffer[actualKeyPointer].tweens[i+1].game_time} `)
            if(actualTime - initialBuffer[actualKeyPointer].tweens[i+1].game_time < -target){
                actualTweenPointer = i;
                break;
            }
        }
    }

    
    initialBuffer.splice(0, initialBuffer.length-1);
    tweenIndex = actualTweenPointer;
    keyFrameIndex = 0;

    if (initialBuffer) {
        // lastKeyTime = Date.now() - (actualTime - initialBuffer[0].game_time);
        timeToNextKey = 1000/keyRate;

        
        
        if(initialBuffer[0].tweens && initialBuffer[0].tweens[tweenIndex+1]){
            timeToNextTween = initialBuffer[0].tweens[tweenIndex+1].game_time - initialBuffer[0].tweens[tweenIndex].game_time - tweenOffset;
            lastTweenTime = Date.now() - (actualTime - initialBuffer[0].tweens[tweenIndex].game_time);
        }
        else{
            timeToNextTween = Math.floor(1000/tweenRate);
            lastTweenTime = lastKeyTime;
        }
    }
    

    updateWorldModelWithKey(initialBuffer[keyFrameIndex]);
    if (initialBuffer[keyFrameIndex].tweens) {
        updateWorldModelWithTween(initialBuffer[keyFrameIndex].tweens[tweenIndex]);
    }
    // updateSvg(worldModel, screenWidth, screenHeight);
}