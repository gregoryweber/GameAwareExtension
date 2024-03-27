// twitchService.js
export class TwitchService {
    constructor(twitch) {
      this.twitch = twitch;
      this.broadcastLatency = null;
      //console.log(twitch); // Check the twitch object
      //const twitchService = new TwitchService(twitch);

    }
  
    onContext(callback) {
      this.twitch.onContext((context) => {
        this.broadcastLatency = context.hlsLatencyBroadcaster;
        callback(context);
      });
    }
  
    onAuthorized(callback) {
      this.twitch.onAuthorized(callback);
    }

    getBroadcastLatency() {
        return this.broadcastLatency;
    }
  }
//  module.exports = { TwitchService };