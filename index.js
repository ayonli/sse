const util = require('util');
const EventEmitter = require('events');

/**
 * Server-Sent Events based on HTML5 specs.
 * 
 * @see https://html.spec.whatwg.org/multipage/server-sent-events.html
 */
class SSE extends EventEmitter {
    /**
     * Initiates an instance.
     * @param {ClientRequest} req 
     * @param {ServerResponse} res 
     */
    constructor(req, res) {
        super();
        this.req = req;
        this.res = res;

        this.req.socket.setNoDelay(true);
        this.res.once("close", (...args) => {
            this.emit("close", ...args);
        }).once("finish", (...args) => {
            this.emit("finish", ...args);
        });
    }

    /**
     * Writes response headers.
     * @param {Number} code 
     * @param {{[x: string]: string}} headers 
     */
    writeHead(code = 200, headers = null) {
        this.res.writeHead(code, Object.assign({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }, headers));
    }

    /**
     * Sends data to the client.
     * @param {String|{[x: string]: string}} event Event type/name. If `data` 
     *  is missing, this argument will replace it, and no event name will be 
     *  set. Alternatively you counld set this argument an object to set all 
     *  options.
     * @param {String} data Data buffer.
     * @param {Number} id Last event ID.
     * @param {Number} retry Reconnection time in milliseconds.
     */
    send(event, data = null, id = undefined, retry = undefined) {
        if (!this.res.headersSent)
            this.writeHead();

        var args = typeof event === "object" ? event : { event, data, id },
            opt = Object.assign({
                event: undefined,
                data: null,
                id: undefined,
                retry: undefined
            }, args);
        if (opt.event && opt.data === null) {
            opt.data = opt.event;
            opt.event = undefined;
        }
        opt.data = opt.data.replace(/(\r\n|\r|\n)/g, "\n").split("\n");

        if (opt.event) // Set the event type/name.
            this.res.write(`event: ${opt.event}\n`);
        if (opt.id) // Set last event ID
            this.res.write(`id: ${opt.id}\n`);
        if (opt.retry) // Set reconnection time in milliseconds.
            this.res.write(`retry: ${opt.retry}\n`);

        // Send data buffer.
        for (let line of opt.data) {
            this.res.write(`data: ${line}\n`);
        }
        this.res.write("\n");
    }

    /** 
     * Closes the connection.
     * 
     * Be noticed, the client will reconnect after the connection is cloesd, 
     * unless you send HTTP 204 No Content response code to tell it not to.
     */
    close() {
        if (!this.res.headersSent)
            this.writeHead();
        this.res.end();
    }

    /** An alias of close(). */
    end() {
        this.close();
    }

    /** 
     * See if the request come from an EventSource. Will check the header 
     * field `accept`, see if it's `text/event-stream`, some client may not 
     * set this field right, so be careful to use.
     * @param {ClientRequest} req
     */
    static isEventSource(req) {
        return req.headers.accept === "text/event-stream";
    }
}

module.exports = SSE;