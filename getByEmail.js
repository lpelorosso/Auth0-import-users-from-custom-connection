function getByEmail (email, callback) {

  var ManagementClient = require('auth0@2.9.1').ManagementClient;
  var auth0 = new ManagementClient({
    domain: '<YOUR SOURCE APP DOMAIN>',
    clientId: '<YOUR SOURCE APP ID>',
    clientSecret: '<YOUR SOURCE APP SECRET>',
    scope: "read:users",
    audience: '<YOUR MANAGEMENT API AUDIENCE>',
    tokenProvider: {
      enableCache: true,
      cacheTTLInSeconds: 10
    }
  });
  
   auth0.users.getByEmail(email, function (error, users) {
     if (error) return callback(new Error(error));
     if(users.length === 0)  return callback(new Error("User does not exist"));
     return callback(null, users[0]); 
  });
     
}