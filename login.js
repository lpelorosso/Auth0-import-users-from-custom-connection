function login (email, password, callback) {

  var jwt = require('jsonwebtoken');
  var request = require("request");

  // Options we will use to call the oauth/token endpoint to retrieve an id_token.
  var options = { 
    method: 'POST',
    url: 'https://<SOURCE APP TENANT>.auth0.com/oauth/token',
    headers: { 'content-type': 'application/json' },
    body: { 
      grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
      realm: 'SourceDatabase', // or the name of your source connection
      username: email,
      password: password,
      response_type: 'token_id',
      client_id: '<YOUR SOURCE APP ID>',
      client_secret: '<YOUR SOURCE APP SECRET>' },
      json: true
  };
  
  // Call the endpoint to retrieve the id token.
  request(options, function (error, response, body) {
      if (error) return callback(new Error(error));
      if (body.error) return callback(new Error(body.error_description));
    
      var decoded = jwt.decode(body.id_token);
      
      // Create the profile we will return, from the id_token.
      // You could eventually call the user_info endpoint to retrieve
      // additional user information if needed.
      var profile = {
        user_id: decoded.sub,
        name: decoded.name,
        nickname: decoded.nickname,
        picture: decoded.picture,
        email: decoded.email,
        email_verified: decoded.email_verified
      };
       return callback(null, profile);
  });
}