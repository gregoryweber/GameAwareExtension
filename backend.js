/* Importing Libraries */
var express = require("express");
var bodyParser = require("body-parser");
const redis = require("redis");
const cors = require("cors");
var https = require('https');
var fs = require('fs');

// Replace cert file and key paths if needed, make sure you know where these are stored on the server
// var options = {
//   cert: fs.readFileSync('/etc/letsencrypt/live/cmuctpawsec2.com/fullchain.pem'),
//   key: fs.readFileSync('/etc/letsencrypt/live/cmuctpawsec2.com/privkey.pem')
// };

/* Express Step 1: Creating an express application */
var app = express();

// Set port for express app
var port = 3000;

//REMOTE CORS SETTINGS, UNCOMMENT TO USE
// Asking CORS to whitelist the URL that the front end is served from
// app.use(
//   cors({
//     origin: "https://e1w80fk5x0z2uvkrzqorkp4ajn2zf0.ext-twitch.tv", // Update this with the proper extension id
//   })
// );


// Asking CORS to whitelist the URL that the front end is served from
app.use(
  cors({
    origin: ["http://localhost:8080", "http://127.0.0.1"], // Update this with front end server
  })
);

/* Express Start Server */
app.listen(port, () => {
  console.log("Server listening on port " + port);
});

// Use body-parser library to help parse incoming request bodies
app.use(bodyParser.json());


app.get("/", (req, res) => {
  console.log("request received");
  res.send("Hello, World!"); // Add a response to send back to the client
});


 app.get("/startData", async(req, res) =>{
  await fetchStartData();
  if(startData){
    res.send(startData);
  } 
  else{
    res.send("no data");
  }
});

/* This get request is a PubSub alternative, 
send the populated metadata variable as a response */
app.get("/latestData", async(req, res) =>{
  await fetchLatestData();
  if(latestData){
    res.send(latestData);
  } 
  else{
    res.send("no data");
  }
});


app.get("/initialBuffer", async(req, res) =>{
  let latestIndex;
  let padding = parseInt(req.query.padding);
  await fetchLatestData().then(()=>{latestIndex = latestData.frame});
  if (latestIndex){
    const range = [...Array(latestIndex - (latestIndex - padding) + 1).keys()].map(x => String(x + (latestIndex - padding)));
    let initialBuffer = await fetchFrames(range);
    res.send(initialBuffer.map(item => JSON.parse(item)));
  }
});

// REDIS STUFF
const redisPass = "cmuludolab";
const redisURI = "3.130.126.51"; // replace with correct IP from AWS server
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
  setInterval(fetchLatestData, 1000) // Fetch metadata from Redis every second

})();

var startData;
var latestData;
async function fetchLatestData(){
  if (isRedisConnected){
    await client.get('latest').then((value) =>{
      latestData = JSON.parse(value);
      });
  }
}
async function fetchStartData(){
  if (isRedisConnected){
    await client.get('start_frame').then((value) =>{
      startData = JSON.parse(value);
      });
  }
}

// TODO: Function to get particular frame frame 
async function fetchFrames(range){
  let frames;
  if (isRedisConnected){
    frames = await client.mGet(range);
    if(frames){
      return frames;
    };
  };
}


