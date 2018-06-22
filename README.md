# Auth0-import-users-from-custom-connection

Introduction
-------------

This document will explain how to import users to an Auth0 database, using custom scripts to connect to a different Application (and different connection) as the source of users.

For this guide, we will use two applications and two connections living under the same tenant, but they could be in different tenants as well. Furthermore, the process will show how to migrate from an Auth0 database to an Auth0 database, but it should work with Database, Active Directory/LDAP, Windows Azure AD and ADFS connections.

Scenario
--------

* Source Application uses Source Connection (an Auth0 database called **SourceDatabase**)
* Destination Application uses Destination Connection (an Auth database called **DestinationDatabase**)
* Source Connection has one or more users we need to migrate to the Destination Connection.

How Migration Will Work
-----------------------

When a user tries to login to the Destination Application (using the Destination Connection), Auth0 will ask if the user is already stored on the connection. If it is not, the custom database scripts will be used to try to login the user. The scripts will use **Resource Ownner** grant and **Client Credentials** grant to ask the Source Application if the user exists. If the user exists, it will be created in the Destination Connection. Next time the user tries to log in, the custom script and the Source Connection will not be used, since the user will already exist on the Destination Connection.

Setting up Source and Destination Applications (and Databases)
--------------------------------------------------------------

#### Setting up Source Application

The source application will be the one connected to the source database (an auth0 database containing the users). 
We need to set up a Source Application, allowing **Resource Owner** and **Client Credentials** grants.


1. In the Auth0 dashboard, under **Applications**, create a new **Machine to Machine Application**. We will call it "Source Application".

<kbd>![Grant Types](http://i64.tinypic.com/30clyxy.jpg)</kbd>

2. Go to Connections, and disable all the connections, with the exception of the **SourceDatabase** connection. Remember, in the example the source connection is an Auth0 database, but it could be, for instance, an Active Directory.

<kbd>![Grant Types](http://i67.tinypic.com/2jamhqh.jpg)</kbd>

3. Go to Settings -> Show Advanced Settings -> Grant Types, and enable: **Client Credentials** and **Password**. 

<kbd>![Grant Types](http://i65.tinypic.com/1tk56c.jpg)</kbd>

Make sure all the other grant types are disabled, and don't forget to save your changes.

4. Now we need to give the source application permission to use the Management API. Go to APIs -> Auth0 Management API -> Machine To Machine Applications. Find "SourceApplication" and enable it to be able to use the Management API. Expand the option, and check the **read:users** scope. Save your changes.

<kbd>![Grant Types](http://i64.tinypic.com/2ibhweb.jpg)</kbd>

#### Setting up Destination Database

The destination database will be an Auth0 database connection. This connection will use custom scripts to talk with the source application.

1. Go to Connections -> Database -> Create new DB Connection. We will call it "DestinationDatabase". 

2. Go to the **Custom Database** tab, and enable **Use my own database**. This will allow you to provide custom scripts. We are interested in **Login** and **Get User** scripts.

3. Go to the **Login** script tab, and paste the script provided in this repository. It will look like this:

```javascript
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
```
As you can see, the script uses **password-realm** grant type to get an id token for the logged user (if the username/password credentials are valid). The **realm** attribute specifies the name of the connection to be used. A profile based on the information from the id token is then returned. You could use rules to add additional information to the id token if needed. 

4. Now we neeed to configure the **Get User** script. Go to the Get User tab, and paste the script provided in this repository. It will look like something this:

```javascript
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
```
This script will use **Client Credentials** grants to get an access token, which is then used to get the user by email. The information provided is then returned.

5. Now enable the user import option for the connection. 

<kbd>![Grant Types](http://i68.tinypic.com/302t05g.jpg)</kbd>

#### Testing

We can now test if the configuration works. We will create a user on the source database, and we will try the destination connection. We should be able to log in to the destination connection using newly created user. Furthermore, afterwards we should see the user on the destination connection.

1. Go to Users -> Create New User. Enter a user email and password, and select **SourceDatabase** as connection.

<kbd>![Grant Types](http://i63.tinypic.com/kcba88.jpg)</kbd>

User should appear on the users dashboard, under the **SourceDatabase** connection.

<kbd>![Grant Types](http://i65.tinypic.com/552cl4.jpg)</kbd>


2. Go to Connections -> Database and select DestinationDatabase. Click on the **Try Connection** tab. Auth0 Login screen will be shown. Enter your newly created user credentials (in our example, user1@source.com).

3. If everything is correctly configured, you should see the **It Works!** page.

4. Go to the **Users Bashboard** page. You should now see the user listed under the **DestinationDatabase** as well.

<kbd>![Grant Types](http://i66.tinypic.com/2m338gi.jpg)</kbd>

