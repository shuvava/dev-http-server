# simple-http-server
`simple-http-server` a simple HTTP server is based on NodeJS implemented base features need for debugging and testing javascript files.
## Installing globally:

Installation via `npm`:

     npm install dev-http-server -g
## Usage
```javascript
// add reference to the module
const HttpSrv = require('dev-http-server');
// create instance
const httpSrv = new HttpSrv();
// add route
httpSrv.onPost('/page', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Page Two');
});
// run server
HttpSrv.run({ httpSrv });
```
If server run correctly, you see following message:
> Http Server started on 127.0.0.1:1337
## Available Options
HttpSrv.run method has following options
```javascript
const option = {
    httpSrv: new HttpSrv(), // instance of HttpSrv object
    address: '127.0.0.1', // IP address of server
    port = 1337, // Port of server 
};
```
## Examples
### Static REST response
[rest-static-response example](https://github.com/shuvava/dev-http-server/tree/master/examples/rest-static-response)
```javascript
// add reference to the module
const HttpSrv = require('dev-http-server');
// create instance
const httpSrv = new HttpSrv();
// add static get response for select2 javascript component
httpSrv.onGet('/select2', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const obj = {
        results: [{
            text: 'Group 1',
            children: [
                { id: 1, text: 'element 1' },
                { id: 2, text: 'element 2' },
            ],
        }, {
            text: 'Group 2',
            children: [
                { id: 3, text: 'element 3' },
                { id: 4, text: 'element 4' },
            ],
        },
        { id: 5, text: 'element 5' },
        ],
    };
    res.end(JSON.stringify(obj));
});

httpSrv.onPost('/page', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Page Two');
});
// run server
HttpSrv.run({ httpSrv });
```
### Dynamic REST response
[rest-dynamic-response](https://github.com/shuvava/dev-http-server/tree/master/examples/rest-dynamic-response)
```javascript
// add reference to the module
const HttpSrv = require('dev-http-server');
// create instance
const httpSrv = new HttpSrv();

// add for url /test all possible CRUD operation
// GET, POST PUT DELETE
// for GET /test server will return all content of file db.json
// GET /test/1 return object with id=1
// PUT add new object into db
// POST update exist record in db.json
httpSrv.setJson('/test', 'src/db.json', 'id', false);

// run server
HttpSrv.run({ httpSrv });
```