# SFN-SSE

Simple Friendly Node.js 
[Server-Sent Events](https://html.spec.whatwg.org/multipage/server-sent-events.html) 
implementation based on HTML5 API.

Unlike other implementations, this module binds `req` and `res` directly, so 
you can use it anywhere in your code. 

## Install

```sh
npm install sfn-sse
```

## Example

```javascript
const http = require("http");
const SSE = require("sfn-sse");

const server = http.createServer((req, res) => {
    if (!SSE.isEventSource(req)) {
        res.end();
        return;
    }

    var sse = new SSE(req, res),
        i = 0,
        timer = setInterval(() => {
            i += 1;
            sse.send(`This is msg ${i}.`); // Send message every seconds.
            if (i === 10) {
                sse.close(); // Close the connection.
                clearInterval(timer);
            }
        }, 1000);
});

server.listen(80);
```

**Client Side:**

```javascript
const source = new EventSource("http://localhost");

source.onmessage = (event) => {
    console.log(event.data);
    if (event.data.match(/10/)) {
        // Must close connection here, otherwise the client will reconnect.
        source.close();
    }
};
```

## Warning

`IE` and `Edge` does not support `EventSource`, you must use a 
[polyfill](https://github.com/Yaffle/EventSource) for them.  