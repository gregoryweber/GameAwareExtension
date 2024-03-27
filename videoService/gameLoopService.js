import {startSvg, updateSvg} from '../userInterfaceService/updateSvg.js';

export class GameLoop {
    constructor(initialBuffer, forwardBuffer, screenWidth, screenHeight, startClockSecs,
        startGameSecs, broadcastLatency, keyRate) {

        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;

        this.initialBuffer = initialBuffer;
        this.forwardBuffer = forwardBuffer;
        this.worldModel = {};

        this.broadcastLatency = broadcastLatency;

        this.lastKeyTime = 0;
        this.startClockSecs = startClockSecs;
        this.startGameSecs = startGameSecs;
        this.lastTweenTime = 0;
        this.keyFrameIndex = -1;
        this.tweenIndex = -1;
        this.keyRate = keyRate;
        this.timeToNextKey = 0;
        this.timeToNextTween = 0;
        this.target = 100;
        this.tweenRate = 24;
        this.tweenOffset = 0;
        this.catchUpTime = 0;
        this.timeDiff = 0;
        this.syncRange = 500;

        // Bind methods
        this.gameLoop = this.gameLoop.bind(this);
    }

    startGameLoop(){
        // Get references to the input field and the target span
        const targetInput = document.getElementById("targetInput");
        const targetSpan = document.getElementById("target");
        targetSpan.innerHTML = this.target;
        targetInput.value = this.target;
        // Add an event listener to the input field to listen for Enter key presses
        targetInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
            // Get the user's input from the input field
            const userInput = parseInt(targetInput.value);
        
            // Check if the user's input is a valid number
            if (!isNaN(userInput)) {
                // Update the target span with the user's input
                targetSpan.textContent = userInput;
               
                this.target = userInput;
                this.syncBuffer();
            } else {
                // Handle invalid input (e.g., display an error message)
                console.error("Invalid input. Please enter a valid number.");
            }
        
            // Clear the input field
            targetInput.value = "";
            }
        });
    
        startSvg();
       
        this.timeToNextKey = 1000/this.keyRate;
        this.syncBuffer();
        window.requestAnimationFrame(this.gameLoop);
    }



    syncBuffer(){
        let actualKeyPointer;
        let actualTweenPointer = 0;
        this.initialBuffer.push.apply(this.initialBuffer, this.forwardBuffer);
        this.forwardBuffer.length = 0;

        this.initialBuffer = [];
        this.forwardBuffer = [];
        this.worldModel = {};
        //Date.now() = current time in viewer's frame of reference
        //startClockSecs = local time stamp from the streamer's computer
        //startGameSecs = Unity's frame of reference of time (all future game times are from this frame of reference)
        //broadcastLatency = number from Twitch, latency from the streamer to the viewer
        let dateNow = Date.now();
        let actualTime = dateNow - this.startClockSecs - this.startGameSecs - (this.broadcastLatency * 1000);

        
        actualKeyPointer = this.initialBuffer.length-1;
        // console.log('initialBuffer: ', initialBuffer[actualKeyPointer])
        if (!this.initialBuffer[actualKeyPointer].tweens){
            console.log("Error: Tween object cannot be found");
        } else {
            for( let i = 0; i < this.initialBuffer[actualKeyPointer].tweens.length-1; i++){
                // console.log(`tween difference: ${actualTime} - ${initialBuffer[actualKeyPointer].tweens[i+1].game_time} = ${actualTime - initialBuffer[actualKeyPointer].tweens[i+1].game_time} `)
                if(actualTime - this.initialBuffer[actualKeyPointer].tweens[i+1].game_time < -target){
                    actualTweenPointer = i;
                    break;
                }
            }
        }

        
        this.initialBuffer.splice(0, initialBuffer.length-1);
        this.tweenIndex = actualTweenPointer;
        this.keyFrameIndex = 0;

        if (this.initialBuffer) {
            // lastKeyTime = Date.now() - (actualTime - initialBuffer[0].game_time);
            this.timeToNextKey = 1000/this.keyRate;

            
            
            if(this.initialBuffer[0].tweens && this.initialBuffer[0].tweens[this.tweenIndex+1]){
                this.timeToNextTween = this.initialBuffer[0].tweens[this.tweenIndex+1].game_time - this.initialBuffer[0].tweens[this.tweenIndex].game_time - this.tweenOffset;
                this.lastTweenTime = Date.now() - (actualTime - this.initialBuffer[0].tweens[this.tweenIndex].game_time);
            }
            else{
                this.timeToNextTween = Math.floor(1000/this.tweenRate);
                this.lastTweenTime = this.lastKeyTime;
            }
        }
        

        this.updateWorldModelWithKey(this.initialBuffer[this.keyFrameIndex]);
        if (this.initialBuffer[this.keyFrameIndex].tweens) {
            this.updateWorldModelWithTween(this.initialBuffer[this.keyFrameIndex].tweens[this.tweenIndex]);
        }
        // updateSvg(worldModel, screenWidth, screenHeight);
    }



    updateWorldModelWithKey(keyFrame){
        if (!keyFrame) {
            console.log("Error: No key frame found");
            return false;
        }
        this.worldModel = JSON.parse(JSON.stringify(keyFrame));
        return true
    }

    updateWorldModelWithTween(tweenFrame){
        if (!tweenFrame) {
            console.log("Error: No tween frame found");
            return false;
        }
        for(let item in tweenFrame){
            for(let attribute in tweenFrame[item]){
                if (this.worldModel["key"][item]) {
                    this.worldModel["key"][item][attribute] = JSON.parse(JSON.stringify(tweenFrame[item][attribute]));
                } else {
                    console.log(`Error: Cannot find ${item} in key`)
                }
               
            }
        }
        this.worldModel["game_time"] = JSON.parse(JSON.stringify(tweenFrame["game_time"]));
        return true
    }



    gameLoop = () => {
        let nowTime = Date.now();


        if(nowTime - this.lastKeyTime >= this.timeToNextKey && this.forwardBuffer[this.keyFrameIndex]){
            this.keyFrameIndex = Math.max(0, this.forwardBuffer.length-2);
            // console.log(forwardBuffer[keyFrameIndex])
            this.catchUpTime += this.nowTime-this.lastKeyTime-this.timeToNextKey;

            let dateNow = Date.now();
            let actualTime = dateNow - this.startClockSecs - this.startGameSecs - (this.broadcastLatency * 1000);
            // console.log(`dateNow: ${dateNow}, startClockSecs: ${startClockSecs}, startGameSecs: ${startGameSecs}, broadcastLatency: ${broadcastLatency}, game_time: ${forwardBuffer[keyFrameIndex].game_time}`)
            this.timeDiff = actualTime - this.forwardBuffer[this.keyFrameIndex].game_time
            // console.log(`time difference [${keyFrameIndex}/${forwardBuffer.length-1}]: ${timeDiff}`);

            
            this.tweenIndex = 0;

            this.updateWorldModelWithKey(this.forwardBuffer[this.keyFrameIndex]);
            // updateSvg(worldModel, screenWidth, screenHeight);
            this.lastKeyTime = nowTime;
            this.lastTweenTime = nowTime;
    
            if (this.forwardBuffer[this.keyFrameIndex] && this.forwardBuffer[this.keyFrameIndex].tweens) {
                this.timeToNextTween = this.forwardBuffer[this.keyFrameIndex].tweens[0].game_time - this.forwardBuffer[this.keyFrameIndex].game_time - this.catchUpTime;
            } else {
                this.timeToNextTween = Math.floor(1000/this.tweenRate);
            }
            // let syncRange = 500;
            if (this.forwardBuffer.length > 2 && Math.abs(timeDiff-this.target) >= this.syncRange){
                //TODO: Check for end frame
                console.log("Need Syncing!")
                // syncBuffer();
            }
            //console.log("index ", keyFrameIndex, ": ", forwardBuffer[keyFrameIndex]);
            
            if (this.forwardBuffer.length >= 10) {
                this.forwardBuffer.shift()
            } else {
                this.keyFrameIndex++;
            }
            
        }
        //console.log(`tween ${tweenIndex}: ${nowTime-lastTweenTime} >= ${timeToNextTween}`);
        if (nowTime - this.lastTweenTime >= this.timeToNextTween && this.forwardBuffer[this.keyFrameIndex-1] 
            && this.forwardBuffer[this.keyFrameIndex-1].tweens && this.tweenIndex < this.tweenRate){
            this.catchUpTime = nowTime-this.lastTweenTime-Math.max(this.timeToNextTween, 0);

            this.updateWorldModelWithTween(this.forwardBuffer[this.keyFrameIndex-1].tweens[this.tweenIndex]);
            this.lastTweenTime = nowTime;
            // updateSvg(worldModel, screenWidth, screenHeight);
            if(this.forwardBuffer[this.keyFrameIndex-1].tweens[this.tweenIndex+1]){
                this.timeToNextTween = this.forwardBuffer[this.keyFrameIndex-1].tweens[this.tweenIndex+1].game_time - this.forwardBuffer[this.keyFrameIndex-1].tweens[this,tweenIndex].game_time - this.catchUpTime;
            }
            else{
                this.timeToNextTween = Math.floor(1000/this.tweenRate);
            }
            this.tweenIndex++;
        }
        updateSvg(this.worldModel, this.screenWidth, this.screenHeight);
        window.requestAnimationFrame(this.gameLoop);
    }



}