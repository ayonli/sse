"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSE = void 0;
const nanoid_1 = require("nanoid");
const MarkClosed = new Set();
const closed = Symbol("closed");
/**
 * Server-Sent Events based on HTML5 specs.
 *
 * @see https://html.spec.whatwg.org/multipage/server-sent-events.html
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
 */
class SSE {
    /**
     * @param retry The re-connection time to use when attempting to send the
     *  event.
     */
    constructor(req, res, retry = 0) {
        this.req = req;
        this.res = res;
        this.retry = retry;
        // Store the original functions in case they're being overridden.
        this._resWriteHead = res.writeHead.bind(res);
        this._resWrite = res.write.bind(res);
        this._resEnd = res.end.bind(res);
        let id;
        if (typeof req["query"] === "object" && req["query"]) {
            id = req["query"]["id"];
        }
        else {
            const searchParams = new URL(req.url, "http://localhost").searchParams;
            id = searchParams.get("id");
        }
        this.id = id || req.headers["last-event-id"] || nanoid_1.nanoid();
        this.isClosed && this.close();
    }
    /** Whether the connection is new. */
    get isNew() {
        return !this.req.headers["last-event-id"];
    }
    /**
     * Whether the connection is closed. This property is used to check whether
     * a re-connection has been marked closed, once closed, the server must
     * terminate the connection immediately.
     */
    get isClosed() {
        var _a;
        return (_a = this[closed]) !== null && _a !== void 0 ? _a : (this[closed] = MarkClosed.has(this.id));
    }
    /** Sends a response header to the client. */
    writeHead(code, headers) {
        this._resWriteHead(code, Object.assign({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }, headers));
        return this;
    }
    /** Sends data to the client. */
    send(data) {
        this.ensureHead();
        let frames;
        if (data === undefined) {
            frames = [""];
        }
        else if (typeof data !== "string") {
            frames = [JSON.stringify(data)];
        }
        else {
            frames = data.replace(/(\r\n|\r)/g, "\n").split("\n");
        }
        this._resWrite(`id: ${this.id}\n`);
        if (this.retry)
            this._resWrite(`retry: ${this.retry}\n`);
        for (let frame of frames) {
            this._resWrite(`data: ${frame}\n`);
        }
        return this._resWrite("\n");
    }
    /**
     * Emits an event to the client, the message will be dispatched on the
     * browser to the listener for the specified event name; the website source
     * code should use `addEventListener()` to listen for named events.
     */
    emit(event, data) {
        this.ensureHead();
        this._resWrite(`event: ${event}\n`);
        return this.send(data);
    }
    /** Closes the connection. */
    close(cb) {
        if (!MarkClosed.has(this.id)) {
            MarkClosed.add(this.id);
        }
        else {
            MarkClosed.delete(this.id);
        }
        this.ensureHead(204);
        this._resEnd(cb);
    }
    ensureHead(code = 200) {
        this.res.headersSent || this.writeHead(code);
        return this;
    }
}
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
exports.default = SSE;
//# sourceMappingURL=index.js.map