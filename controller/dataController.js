const redisClient = require('../redis/redisClient');
var startData;
var latestData;

exports.helloWorld = (req, res) => {
    // console.log("request received");
    res.send("Hello, World!"); // Add a response to send back to the client
};
  

exports.getStartData = async(req, res) =>{
    startData = await redisClient.fetchStartData();
    if(startData){
        res.send(startData);
    } 
    else{
        res.send("no data");
    }
};

/* This get request is a PubSub alternative, 
send the populated metadata variable as a response */

exports.getLatestData = async (req, res) => {
    latestData = await redisClient.fetchLatestData();
    if (latestData) {
      res.send(latestData);
    } else {
      res.send("no data");
    }
  };

// exports.getInitialBuffer = async(req, res) =>{
//     let latestIndex;
//     let padding = parseInt(req.query.padding);
//     await redisClient.fetchLatestData().then(()=>{latestIndex = latestData.frame});
//     if (latestIndex){
//         const range = [...Array(latestIndex - (latestIndex - padding) + 1).keys()].map(x => String(x + (latestIndex - padding)));
//         let initialBuffer = await redisClient.fetchFrames(range);
//         res.send(initialBuffer.map(item => JSON.parse(item)));
//     }
// };

exports.getInitialBuffer = async(req, res) => {
    let padding = parseInt(req.query.padding);
    try {
        latestData = await redisClient.fetchLatestData();
        if (latestData) {
            const latestIndex = latestData.frame;
            if (latestIndex) {
                const range = [...Array(latestIndex - (latestIndex - padding) + 1).keys()].map(x => String(x + (latestIndex - padding)));
                let initialBuffer = await redisClient.fetchFrames(range);
                res.send(initialBuffer.map(item => JSON.parse(item)));
            } else {
                res.send("No latest index found.");
            }
        } else {
            res.send("No latest data found.");
        }
    } catch (error) {
        console.error("Error in getInitialBuffer:", error);
        res.status(500).send("Server error.");
    }
};
