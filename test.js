const http = require("http");
const SSE = require("./");

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

server.listen(80, () => {
    console.log("Server started, test in a browser via: new EventSource('http://localhost/').")
});