/* Importing Libraries */
var express = require("express");
var bodyParser = require('body-parser');


/* Express Step 1: Creating an express application */
var app = express();

// set port for express app
var port = 3000;

/* Express Step 2: Start Server */
app.listen(port, () => {
 console.log("Server listening on port (((((((((((((((()))))))))))))))) " + port);
});

// Express Step 3: Use body-parser library to help parse incoming request bodies
app.use(bodyParser.json());

/* The encoded key version and the decoded  version of the shared secret*/
const key ="2qh40Q1oWPqOPdIJYWEeppGPysCiDKZR42jMkjUJ8S8";
const secret = Buffer.from(key, 'base64');

//The start of the header string coming from the onAuthorized callback in the client
const bearerPrefix = 'Bearer ';

/** Function that takes the header from the post request and verifies that the JWT shares the same secret as the extension*/
function verifyAndDecode(header) {
  if (header.startsWith(bearerPrefix)) {
    try {
      const token = header.substring(bearerPrefix.length);
      return jsonwebtoken.verify(token, secret, { algorithms: ['HS256'] });
    }
    catch (e) {
      return console.log('Invalid JWT');
    }
  }
}

// POST: verify the auth token and header coming from client
app.post("/auth", (req, res) => {
     const payload = verifyAndDecode(req.headers.authorization);
     const { channel_id: channelId, opaque_user_id: opaqueUserId } = payload;
     console.log("Hello " + channelId);
    });
