var http = require("http");
var SSE = require("./");
var EventSource = require("eventsource");
var assert = require("assert");

var count = 0;
var jsonData = [
    "this is a string",
    ["this is an array"],
    { obj: "this is an object" },
    123456,
    null,
];

var server = http.createServer(function (req, res) {
    if (!SSE.isEventSource(req)) {
        res.end();
        return;
    }

    if (req.url == "/timer") {
        var sse = new SSE(req, res);
        var timer = setInterval(function () {
            count += 1;
            sse.send("This is message " + count + "."); // Send message every seconds.
            if (count === 10) {
                clearInterval(timer);

                sse.close(); // Close the connection.
                if (sse2) sse2.close();
                if (sse3) sse3.close();
                server.close();
                console.log("#### OK ####");
                process.exit(0);
            }
        }, 100);
    } else if (req.url == "/json") {
        var sse2 = new SSE(req, res);

        for (var i in jsonData) {
            sse2.send(jsonData[i]);
        }
    } else if (req.url == "/to-event") {
        var sse3 = new SSE(req, res);
        sse3.send("my-event", "This message will be sent to a certain event");
        sse3.send("with-id", "This message is with a lastEventId", "my-event");
    }
});

server.listen(3000, function () {
    var client = new EventSource("http://localhost:3000/timer");
    client.onopen = function (e) {
        assert.equal(e.constructor.name, "Event");
        assert.deepStrictEqual(Object.assign({}, e), { type: "open" });
    };
    client.onmessage = function (e) {
        assert.equal(e.constructor.name, "MessageEvent");
        assert.deepStrictEqual(Object.assign({}, e), {
            type: "message",
            data: "This is message " + count + ".",
            lastEventId: "",
            origin: "http://localhost:3000"
        });
    };
    client.onerror = function (e) {
        client.close();
        server.close();
        console.log(e);
        process.exit(1);
    };

    var client2 = new EventSource("http://localhost:3000/json");
    client2.onmessage = function (e) {
        var res;
        try {
            res = JSON.parse(e.data);
        } catch (error) {
            res = e.data
        }

        if (typeof res == "string") {
            assert.equal(res, jsonData[0]);
        } else if (res instanceof Array) {
            assert.deepStrictEqual(res, jsonData[1]);
        } else if (typeof res == "object" && res) {
            assert.deepStrictEqual(res, jsonData[2]);
        } else if (typeof res == "number") {
            assert.strictEqual(res, jsonData[3]);
        } else if (res === null) {
            assert.ok(true);
        }
    };

    var client3 = new EventSource("http://localhost:3000/to-event");
    client3.addEventListener("my-event", function (e) {
        assert.equal(e.constructor.name, "MessageEvent");
        assert.deepStrictEqual(Object.assign({}, e), {
            type: "my-event",
            data: "This message will be sent to a certain event",
            lastEventId: "",
            origin: "http://localhost:3000"
        });
    });
    client3.addEventListener("with-id", function (e) {
        assert.equal(e.data, "This message is with a lastEventId");
        assert.equal(e.lastEventId, "my-event");
    });
});
