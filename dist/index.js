"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var shortid = require("shortid");
/**
 * Server-Sent Events based on HTML5 specs.
 *
 * @see https://html.spec.whatwg.org/multipage/server-sent-events.html
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
 */
var SSE = /** @class */ (function () {
    /**
     * @param retry The re-connection time to use when attempting to send the
     *  event.
     */
    function SSE(req, res, retry) {
        if (retry === void 0) { retry = 0; }
        this.req = req;
        this.res = res;
        this.retry = retry;
        this.id = req.headers["last-event-id"] || shortid.generate();
    }
    Object.defineProperty(SSE.prototype, "isNew", {
        /** Whether the connection is new. */
        get: function () {
            return !this.req.headers["last-event-id"];
        },
        enumerable: true,
        configurable: true
    });
    /** Sends a response header to the client. */
    SSE.prototype.writeHead = function (code, headers) {
        this.res.writeHead(code, Object.assign({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }, headers));
        return this;
    };
    /** Sends data to the client. */
    SSE.prototype.send = function (data) {
        this.ensureHead();
        var frames;
        if (data === undefined) {
            frames = [];
        }
        else if (typeof data !== "string") {
            frames = [JSON.stringify(data)];
        }
        else {
            frames = data.replace(/(\r\n|\r)/g, "\n").split("\n");
        }
        this.res.write("id: " + this.id + "\n");
        if (this.retry)
            this.res.write("retry: " + this.retry + "\n");
        for (var _i = 0, frames_1 = frames; _i < frames_1.length; _i++) {
            var frame = frames_1[_i];
            this.res.write("data: " + frame + "\n");
        }
        return this.res.write("\n");
    };
    /**
     * Emits an event to the client, the message will be dispatched on the
     * browser to the listener for the specified event name; the website source
     * code should use `addEventListener()` to listen for named events.
     */
    SSE.prototype.emit = function (event, data) {
        this.ensureHead().res.write("event: " + event + "\n");
        return this.send(data);
    };
    /**
     * Closes the connection.
     *
     * Be noticed, the client may reconnect after the connection is closed,
     * unless you send HTTP 204 No Content response code to tell it not to.
     */
    SSE.prototype.close = function (cb) {
        return this.ensureHead(204).res.end(cb);
    };
    ;
    SSE.prototype.ensureHead = function (code) {
        if (code === void 0) { code = 200; }
        this.res.headersSent || this.writeHead(code);
        return this;
    };
    return SSE;
}());
exports.SSE = SSE;
(function (SSE) {
    /**
     * Checks if the request comes from an EventSource. Will check the header
     * field `accept`, see if it's `text/event-stream`.
     */
    function isEventSource(req) {
        return req.method == "GET" && req.headers.accept == "text/event-stream";
    }
    SSE.isEventSource = isEventSource;
})(SSE = exports.SSE || (exports.SSE = {}));
exports.SSE = SSE;
exports.default = SSE;
//# sourceMappingURL=index.js.map