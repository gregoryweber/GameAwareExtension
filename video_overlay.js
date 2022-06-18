var token, userId;

// so we don't have to write this out everytime 
const twitch = window.Twitch.ext;

// callback called when context of an extension is fired 
twitch.onContext((context) => {
//   console.log(context);
});


// onAuthorized callback called each time JWT is fired
twitch.onAuthorized((auth) => {
  // save our credentials
  token = auth.token;  
  userId = auth.userId; 
  
  //ajax call that passes the JWT to the EBS along with authorized token and userId
  $.ajax({
      type: 'POST',
      url: location.protocol + '//localhost:3000/auth',
      data: JSON.stringify({authToken:token, userId: userId}),
      contentType: 'application/json',
      headers: { "Authorization": 'Bearer ' + token },
  });

});
