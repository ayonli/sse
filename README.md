# SFN-SSE

Sugar Featured Node.js 
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

    var sse = new SSE(req, res);

    if (sse.isClosed) { // check if the the connection has been marked closed.
        return;
    } else {
        let i = 0,
        timer = setInterval(() => {
            i += 1;
            sse.send(`This is msg ${i}.`); // Send message every seconds.
            if (i === 10) {
                sse.close(); // Close the connection.
                clearInterval(timer);
            }
        }, 1000);
    }
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
- `sse.isClosed: boolean` Whether the connection is closed. This property is 
    used to check whether a re-connection has been marked closed, once closed, 
    the server must not do anything continuing.
- `writeHead(code: number, headers?: { [x: string]: string | string[] }): this`
    Sends a response header to the client.
- `send(data: any): boolean` Sends data to the client.
- `emit(event: string, data?: any): boolean` Emits an event to the client, the 
    message will be dispatched on the browser to the listener for the specified 
    event name; the website source code should use `addEventListener()` to 
    listen for named events.
- `close(cb?: () => void): void` Closes the connection.

### About Closing

According to the
[Server-Sent Events](https://html.spec.whatwg.org/multipage/server-sent-events.html) 
protocol, the server cannot entirely close the connection without re-connection 
firing on the client, unless the server send a `204` status code telling the 
client not to, so SFN-SSE provided an approach to handle this procedure 
internally. Once `close()` method is called, the server will close the current 
HTTP connection, and mark the `id` closed, so that when the client try to 
reconnect, the server can identify it as a closed connection and send `204` 
automatically and immediately to prevent the client re-connecting. That said, 
the server should check the property `isClosed` at the very beginning of the 
request life cycle, to see if a connection has been marked closed, once closed,
the server must not do anything continuing.

## Warning

`IE` and `Edge` does not support `EventSource`, you must use a 
[polyfill](https://github.com/Yaffle/EventSource) for them.  