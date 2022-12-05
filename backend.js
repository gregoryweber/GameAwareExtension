/* Importing Libraries */
var express = require("express");
var bodyParser = require("body-parser");
const redis = require("redis");
const cors = require("cors");
const { json } = require("body-parser");

/* Express Step 1: Creating an express application */
var app = express();

// Set port for express app
var port = 3000;

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

/* This get request is a PubSub alternative, 
send the populated metadata variable as a response */
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

pp.get("/frameData", async(req, res) =>{
  let index = req.body.data.index;
  await fetchFrameAt(index);
  if(indexFrameData){
    res.send(indexFrameData);
  } 
  else{
    res.send("no data");
  }
});

// REDIS STUFF
const redisPass = "cmuludolab";
const redisURI = "52.15.129.209";
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
var indexFrameData;
async function fetchFrameAt(index){
  if (isRedisConnected){
    await client.get('index').then((value) =>{
      indexFrameData = JSON.parse(value);
      });
  }
}


