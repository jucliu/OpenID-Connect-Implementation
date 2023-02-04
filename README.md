# Auth Server

## Configuration

**REQUIRED**

This web server port is 8000 and running against Node.js v.18.12.1(latest LTS version) and Express framework.

The config file `src/oidc-config.json` is added to the client folder `oidc-tester`.

## Running and Building

Running the attached client code - `oidc-tester` and attached backend code - `oauth`. The auth flow works as expected.

### **Server (oauth)**

#### Local Node

In the oauth project directory, run:

```bash
$ npm install
$ npm start
```

or
```bash
$ npm install
$ npm run devStart
```

### **Client (oidc-tester)**
Either docker or local Node

## How to read this code

### **Dependencies**
```js
  "dependencies": {
    // express middlewares
    "body-parser": "^1.20.1", // parser post request
    "cors": "^2.8.5", // bypass cors error

    // web framework
    "express": "^4.18.2",

    // generate JWT
    "jose": "^4.11.1",

    // server cache to store authorization code and code challenge
    "node-cache": "^5.1.2",

    // verify the code challenge
    "pkce-challenge": "^3.0.0",

    // generate authorization code
    "short-uuid": "^4.2.2"
  },
```

### **Project Folders Structure**

```
./cache/cache-provider.js - The server cache provider and initilize the cache with TTL.
./config - Includes openid config and the private key.
./public - Includes the static json file of public key.
./routes - Includes all the routing handlers.
./server.js - Set up the server.
```

Thanks for reviewing the code. The result works well in my local environment. Please feel free to let me know if you have any questions or feedback.
