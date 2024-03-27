// function getStartData(){
//     $.ajax({
//         type: 'GET',
//         // url: location.protocol + '//cmuctpawsec2.com/startData', // For remote, replace localhost with location.protocol + //cmuctpawsec2.com/startData
//         url: location.protocol + '//localhost:3000/startData', 
//         contentType: 'application/json',
//         headers: { authorization: 'Bearer ' + window.Twitch.ext.viewer.sessionToken},
//         success: function(res) {
//             start_game_secs = res.game_time;
//             start_clock_secs = res.clock_mills;
//             key_rate = res.key_frame_rate;
//             tween_rate = res.tween_frame_rate;
//             screen_width = res.screen_width;
//             screen_height = res.screen_height;
//         } 
//     });

// }
// // Initial latest frame get request to figure out current latest, used to build back buffer
// function setUpInitialBuffer(){
//     let backPadding = parseInt(broadcastLatency)*(2/key_rate); // pad an extra few seconds
//     $.ajax({
//         type: 'GET',
//         // url: location.protocol + '//cmuctpawsec2.com/initialBuffer?padding='+backPadding, // For remote, replace localhost with location.protocol +//cmuctpawsec2.com/initialBuffer?padding=
//         url: location.protocol + '//localhost:3000/initialBuffer?padding='+backPadding, // For remote, replace localhost with location.protocol +//cmuctpawsec2.com/initialBuffer?padding=
//         async:true,
//         contentType: 'application/json',
//         headers: { authorization: 'Bearer ' + window.Twitch.ext.viewer.sessionToken},
//         success: function(res) {
//           initialBuffer = res;
//         },
//         complete: function(){
//             setInterval(getLatestData, 1/key_rate *1000);
//             startGameLoop();            
//         } 
//     });
// }

// function getLatestData(){
//       $.ajax({
//           type: 'GET',
//         //   url: location.protocol + '//cmuctpawsec2.com/latestData', // For remote, replace localhost with location.protocol +//cmuctpawsec2.com/latestData
//           url: location.protocol + '//localhost:3000/latestData', // For remote, replace localhost with location.protocol +//cmuctpawsec2.com/latestData
//           headers: { authorization: 'Bearer ' + window.Twitch.ext.viewer.sessionToken},
//           success: function(res) {        
//             forwardBuffer.push(res);
//           } 
//       });

// }

// dataService.js
export class DataService {
    constructor(authToken) {
        this.authToken = authToken;
    }

    async getStartData() {
        const response = await fetch(`${location.protocol}//localhost:3000/startData`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.authToken
            }
        });
        return await response.json();
    }

    async setUpInitialBuffer(backPadding) {
        const response = await fetch(`${location.protocol}//localhost:3000/initialBuffer?padding=${backPadding}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.authToken
            }
        });
        return await response.json();
    }

    async getLatestData() {
        const response = await fetch(`${location.protocol}//localhost:3000/latestData`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.authToken
            }
        });
        return await response.json();
    }
}
