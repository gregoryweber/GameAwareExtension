const redis = require("redis");

// Load environment variables
require('dotenv').config();


const redisPass = process.env.REDIS_PASSWORD;
const redisURI = process.env.REDIS_URI;
const redisPort = process.env.REDIS_PORT;
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
      const value = await client.get('latest');
      latestData = JSON.parse(value);
      return latestData; // Return the data so it can be directly used
    }
  }
  
async function fetchStartData(){
    if (isRedisConnected){
      const value = await client.get('start_frame');
      startData = JSON.parse(value);
      return startData; // Return the data so it can be directly used
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

module.exports = {
    fetchLatestData,
    fetchStartData,
    fetchFrames,
  };