/* Importing Libraries */
var express = require("express");
var bodyParser = require("body-parser");
const cors = require("cors");
const dataRoutes = require('./routes/dataRoutes');
require('dotenv').config();


/* Express Step 1: Creating an express application */
var app = express();

// Set port for express app
var port = process.env.PORT;

// Use body-parser library to help parse incoming request bodies
app.use(bodyParser.json());


const corsOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [];

// Asking CORS to whitelist the URL that the front end is served from
app.use(
  cors({
    origin: corsOrigins, // Update this with front end server
  })
);

app.use(dataRoutes);

/* Express Start Server */
app.listen(port, () => {
  console.log("Server listening on port " + port);
});