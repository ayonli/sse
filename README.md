# SFN-SSE

Simple Friendly Node.js 
[Server-Sent Events](https://html.spec.whatwg.org/multipage/server-sent-events.html) 
implementation based on HTML5 API.

## Install

```sh
npm install sfn-sse
```

## Example

```javascript
import * as http from "http";
import SSE from "sfn-sse";

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

## API

- `new SSE(req, res, retry?: number)`
    - `retry` The re-connection time to use when attempting to send the event.
- `sse.id: string` The unique ID of the SSE connection, also used as 
    `lastEventId` of the client EventSource, when the client reconnect, this ID 
    will be reused.
- `sse.isNew: boolean` Whether the connection is new.
- `writeHead(code: number, headers?: { [x: string]: string | string[] }): this`
    Sends a response header to the client.
- `send(data: any): boolean` Sends data to the client.
- `emit(event: string, data?: any): boolean` Emits an event to the client, the 
    message will be dispatched on the browser to the listener for the specified 
    event name; the website source code should use `addEventListener()` to 
    listen for named events.
- `close(cb?: () => void): void` Closes the connection. Be noticed, the client 
    may reconnect after the connection is closed, unless you send HTTP
    `204 No Content` response code to tell it not to.

## Warning

`IE` and `Edge` does not support `EventSource`, you must use a 
[polyfill](https://github.com/Yaffle/EventSource) for them.  