// twitchService.js
export class TwitchService {
    constructor(twitch) {
      this.twitch = twitch;
      this.broadcastLatency = null;
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