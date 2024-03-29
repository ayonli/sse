# SSE

[Server-Sent Events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
implementation for Node.js with Session Support Enhancement.

## Install

```sh
npm install @ayonli/sse
```

## Example

```ts
import * as http from "http";
import { SSE } from "@ayonli/sse";

const store = new Map<string, SSE>();

// Sync server time to the clients every minute.
setTimeout(() => {
    const time = new Date().toISOString();

    store.forEach((sse) => {
        sse.emit("sync-time", time);
    })
}, 60_000);

const server = http.createServer((req, res) => {
    if (SSE.isEventSource(req)) {
        const sse = new SSE(req, res);

        if (sse.isClosed) { // Check if the the connection has been marked closed.
            return;
        } else {
            store.set(sse.id, sse); // Store the SSE instance for future use.

            sse.emit("connect"); // notify connection established.

            res.once("close", () => {
                // Remove the SSE instance once the connection is lost.
                store.delete(sse.id);
            });
        }
    } else {
        // do other stuffs
    }
});

server.listen(80);
```

**Client Side:**

```javascript
const es = new EventSource("http://localhost");

// Listen to server-sent event for data.
es.addEventListener("sync-time", event => {
    console.log("server time:", event.data);
});
```

## API

- `new SSE(req, res, retry?: number)`
    - `retry` The re-connection time to use when attempting to send the event.
- `sse.id: string` The unique ID of the SSE connection, also used as 
    `lastEventId` of the client EventSource, when the client reconnect, this ID 
    will be reused.
- `sse.isNew: boolean` Whether the connection is newly created.
- `sse.isClosed: boolean` Whether the connection is closed. This property is 
    used to check whether a re-connection has been marked closed, once closed, 
    the server must not do anything continuing.
- `writeHead(code: number, headers?: { [x: string]: string | string[] }): this`
    Sends a response header to the client.
- `send(data: any): boolean` Sends data to the client which will be received by
    the `es.onmessage` callback function. Data will be serialize via JSON if
    they're not string.
- `emit(event: string, data?: any): boolean` Emits an event to the client, the 
    message will be dispatched on the browser to the listener for the specified 
    event name; the website source code should use `es.addEventListener()` to 
    listen for named events.
- `close(cb?: () => void): void` Closes the connection.

## About `sse.id`

`sse.id` (AKA `lastEventId`) is generated by the server for each connection and
reused during reconnection, in real world, it can be used as a session ID of the
browser tab, meaning the server can identify each tab according to this ID, this
is useful when the server wish to send data to a specific browser tab.

Normally, this ID is generated by the server automatically, but the client can
provide it during the initial connection, this is useful when the client wish
to reused a historical ID stored locally. For example, we can store the
previous ID in the `sessionStorage,` and reuse it after the browser tab has been
refreshed, which guarantees each tab is memorable to the server (trust me, this
is very useful).

This is how:

```ts
const sseId = sessionStorage.getItem("sseId");
const es = new EventSource("http://localhost" + sseId ? `?id=${sseId}` : "");

es.addEventListener("connect", event => {
    sessionStorage.setItem("sseId", event.lastEventId);
});
```

NOTE: don't store the ID in `localStorage`, which is shared across all tabs of
the same site.

## About Closing

According to the
[Server-Sent Events](https://html.spec.whatwg.org/multipage/server-sent-events.html) 
protocol, the server cannot entirely close the connection without re-connection 
firing on the client, unless the server send a `204` status code telling the 
client not to, so this package provided an approach to handle this procedure 
internally.

Once `sse.close()` method is called, the server will close the current  HTTP
connection, and mark the `id` closed, so that when the client try to reconnect,
the server can identify it as a closed connection and send `204`  automatically
and immediately to prevent the client re-connecting.

That said, the server should check the property `isClosed` at the very beginning
of the request life cycle, to see if a connection has been marked closed, once
closed, the server must not do anything continuing.

Apart from closing the connection on the server side, the client can call
`es.close()` to close the connection positively, and no-reconnection will be
fired afterwards.
