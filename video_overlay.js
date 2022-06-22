var token, userId;

// so we don't have to write this out everytime 
const twitch = window.Twitch.ext;

let isAuthed = false;
// callback called when context of an extension is fired 
twitch.onContext((context) => {
//   console.log(context);
});


/** Listener for the metadata broadcast from EBS */
twitch.listen('broadcast', (target, contentType, message) => {
        if (isAuthed) {
            console.log(message);
        } else {
            //ignore as not authed
        }
    }
);

// onAuthorized callback called each time JWT is fired
twitch.onAuthorized((auth) => {
  // save our credentials
  token = auth.token;  
  userId = auth.userId;
  isAuthed = true; 
 
  //ajax call that passes the JWT to the EBS along with authorized token and userId
  $.ajax({
      type: 'POST',
      url: location.protocol + '//localhost:3000/auth',
      data: JSON.stringify({authToken:token, userId: userId, channelId: auth.channelId}),
      contentType: 'application/json',
      headers: { authorization: 'Bearer ' + window.Twitch.ext.viewer.sessionToken },
  });
//   setInterval(getMetaData, 1000/6);
});

// UNCOMMENT TO GET METADATA WITHOUT PUBSUB
// function getMetaData(){
//       //ajax call that passes the JWT to the EBS along with authorized token and userId
//       $.ajax({
//           type: 'GET',
//           url: location.protocol + '//localhost:3000/data',
//           contentType: 'application/json',
//           headers: { authorization: 'Bearer ' + window.Twitch.ext.viewer.sessionToken},
//           success: function(res) {
//               console.log(res);
//           } 
//       });

// }
