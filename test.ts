import SSE  from ".";
import * as http from "http";
import * as assert from "assert";

global["EventSource"] ||= require("eventsource");
var count = 0;

var server = http.createServer((req, res) => {
    if (!SSE.isEventSource(req)) {
        res.end();
        return;
    }

    if (req.url == "/string") {
        let sse = new SSE(req, res);
        sse.send("Hello, World!");
    } else if (req.url == "/json") {
        let sse = new SSE(req, res);
        sse.send({ foo: "hello", bar: "world" });
    } else if (req.url == "/event") {
        let sse = new SSE(req, res);
        sse.emit("my-event", "Hello, World!");
    } else if (req.url == "/timer") {
        let sse = new SSE(req, res);
        let timer = setInterval(() => {
            count += 1;
            sse.send("This is message " + count + ".");
            if (count === 3) {
                clearInterval(timer);
            }
        }, 100);
    } else if (req.url.startsWith("/customId")) {
        let sse = new SSE(req, res);
        sse.send(sse.id);
    }
});

describe("SSE Tests", () => {
    before(done => {
        server.listen(3000, done);
    });

    after(done => {
        server.close(done);
    });

    it("should connect to the server and receive string data as expected", done => {
        var client = new EventSource("http://localhost:3000/string");

        client.onmessage = (e) => {
            assert.strictEqual(e.type, "message");
            assert.strictEqual(!!e.lastEventId, true);
            assert.strictEqual(e.data, "Hello, World!");

            client.close();
            done();
        };
    });

    it("should connect to the server and receive JSON data as expected", done => {
        var client = new EventSource("http://localhost:3000/json");

        client.onmessage = (e) => {
            assert.strictEqual(!!e.lastEventId, true);
            assert.deepStrictEqual(JSON.parse(e.data), { foo: "hello", bar: "world" });

            client.close();
            done();
        };
    });

    it("should connect to the server and receive an event as expected", done => {
        var client = new EventSource("http://localhost:3000/event");

        client.addEventListener("my-event", (e) => {
            assert.strictEqual(e.type, "my-event");
            assert.strictEqual(!!e.lastEventId, true);
            assert.strictEqual(e.data, "Hello, World!");

            client.close();
            done();
        });
    });

    it("should connect to the server and receive multiple times of data as expected", done => {
        var client = new EventSource("http://localhost:3000/timer");

        client.onmessage = (e) => {
            assert.strictEqual(e.type, "message");
            assert.strictEqual(!!e.lastEventId, true);
            assert.strictEqual(e.data, "This is message " + count + ".");

            if (count === 3) {
                client.close();
                done();
            }
        };
    });

    it("should connect to the server with a custom ID as expected", done => {
        var client = new EventSource("http://localhost:3000/customId?id=abc");

        client.onmessage = (e) => {
            assert.strictEqual(e.type, "message");
            assert.strictEqual(e.lastEventId, "abc");
            assert.strictEqual(e.data, "abc");

            client.close();
            done();
        };
    });
});
