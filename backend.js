/* Importing Libraries */
var express = require("express");
var bodyParser = require("body-parser");
var request = require("request");
const redis = require("redis");
const jwt = require("jsonwebtoken");
const compressJson = require("compress-json");
const cors = require("cors");
const { json } = require("body-parser");

/* Express Step 1: Creating an express application */
var app = express();

// set port for express app
var port = 3000;

// // Unique Client ID of the extension. This can be found on the Twitch Developer Console onling
// var clientId = "jri29ztrostnximn6n29nnypngtdm6";

// // ID of the streamer's channel that has the extension installed. This is populated after authentication
// var channelId;

/* The encoded key version and the decoded  version of the shared secret. This is needed to sign the 
JWT in the request headers*/
// const key = "2Jrgbi6BRo56wJVSZJ3wDr3mveeaNe1uscDNRB4IlEE=";
// secret = Buffer.from(key, "base64");

// Asking CORS to whitelist the URL that the front end is served from
app.use(
  cors({
    origin: "http://127.0.0.1:8080", // Update this with front end server
  })
);

/* Express Start Server */
app.listen(port, () => {
  console.log("Server listening on port " + port);
});

// Use body-parser library to help parse incoming request bodies
app.use(bodyParser.json());

//The start of the header string coming from the onAuthorized callback in the client
// const bearerPrefix = "Bearer ";

/** Function that takes the header from the post request and verifies that the JWT shares the same secret as the extension*/
// function verifyAndDecode(header) {
//   if (header.startsWith(bearerPrefix)) {
//     try {
//       let [type, auth] = header.split(" ");
//       return jwt.verify(auth, secret, { algorithms: ["HS256"] });
//     } catch (e) {
//       return console.log("Invalid JWT" + e);
//     }
//   }
// }

// /* Create and return a JWT for use by PubSub.*/
// function makeAndSignServerToken(channelId) {
//   const payload = {
//     exp: Math.floor(Date.now() / 1000) + 30,
//     channel_id: channelId,
//     user_id: "Noor_hammad", // extension owner ID for the call to Twitch PubSub
//     role: "external",
//     pubsub_perms: {
//       send: ["*"],
//     },
//   };
//   return jwt.sign(payload, secret, { algorithm: "HS256" });
// }

// /*Function that uses PubSub to broadcast value to all viewers of a channel */
// function broadcastMessage(value) {
//   // Set the HTTP headers required by the Twitch API.
//   const headers = {
//     "Client-Id": clientId,
//     "Content-Type": "application/json",
//     "Authorization": bearerPrefix + makeAndSignServerToken(channelId),
//   };

//   // Create the POST body for the Twitch API request.
//   const body = JSON.stringify({
//     message: value,
//     broadcaster_id: channelId,
//     target: ["broadcast"]
//   });
//   // Send the broadcast request to the Twitch API.
//   request(
//     `https://api.twitch.tv/helix/extensions/pubsub`,
//     {
//       method: "POST",
//       headers,
//       body
//     },
//     (err, res) => {
//       if (err) {
//         console.log("ERROR WITH API POST" + err);
//       } else {
//         // console.log(res.statusCode);
//       }
//     }
//   );
// }

// POST: verify the auth token and header coming from client
// app.post("/auth", (req, res) => {
//   const payload = verifyAndDecode(req.headers.authorization);
//   channelId = payload.channel_id; // Get the channel ID after verifying the JWT is coming from a Twitch user
//   broadcastMessage("ping"); // PubSub initial ping message
// });

/* This get request is a PubSub alternative, after decoding the JWT, 
send the populated metadata variable as a response */
app.get("/data", (req, res) =>{
  // const payload = verifyAndDecode(req.headers.authorization);
  if(metaData){
    res.send(metaData);
  } 
  else{
    res.send("no data");
  }
});

//REDIS STUFF
const redisPass = "cmuludolab";
const redisURI = "3.16.44.172";
const redisPort = 6379;
let isRedisConnected = false;
var client;

// Note that the redis module recommends using JS Promises and async syntax to communicate with the database
(async () => {
  client = redis.createClient({
    url: `redis://default:${redisPass}@${redisURI}:${redisPort}`,
  });

  client.on("error", (err) => console.log("Redis Client Error", err));
  await client.connect();
  console.log("Redis Connected!")
  isRedisConnected = true; // After await is finished, confirm reddis connection
  setInterval(fetchMetadata, 1000) // After authentication is done, fetch metadata from Redis every second

})();

var metaData;
async function fetchMetadata(){
  if (isRedisConnected){
    await client.get('latest').then((value) =>{
      metaData = JSON.parse(value);
      var jsonSubset = {"game_secs": metaData["game_secs"],"frame_num":metaData["frame_num"],
      "key":metaData["key"]} // This variable only takes the keyframes from the metadata since PubSub has a limited message size
      // broadcastMessage(JSON.stringify(jsonSubset));
      });
  }
}

