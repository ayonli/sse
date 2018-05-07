/**
 * Server-Sent Events based on HTML5 specs.
 * 
 * @see https://html.spec.whatwg.org/multipage/server-sent-events.html
 */
class SSE {
    /**
     * Initiates an instance.
     * @param {IncommingRequest} req 
     * @param {ServerResponse} res 
     */
    constructor(req, res) {
        this.req = req;
        this.res = res;
        req.socket.setNoDelay(true);
    }

    /**
     * Writes response head.
     * @param {number} code 
     * @param {{[x: string]: string}} headers 
     */
    writeHead(code, headers = null) {
        this.res.writeHead(code, Object.assign({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }, headers));
    }

    /**
     * Sends data to the client.
     * @param {string} event Event type/name. If `data` is missing, this 
     *  argument will replace it, and no event name will be set.
     * @param {any} data Data buffer.
     * @param {number} id Last event ID.
     * @param {number} retry Reconnection time in milliseconds.
     */
    send(event, data = undefined, id = undefined, retry = undefined) {
        if (!this.res.headersSent)
            this.writeHead(200);

        if (data === undefined) {
            data = event;
            event = undefined;
        }

        if (typeof data !== "string") {
            data = [JSON.stringify(data)];
        } else {
            data = data.replace(/(\r\n|\r|\n)/g, "\n").split("\n");
        }

        if (event) // Set the event type/name.
            this.res.write(`event: ${event}\n`);
        if (id) // Set last event ID
            this.res.write(`id: ${id}\n`);
        if (retry) // Set reconnection time in milliseconds.
            this.res.write(`retry: ${retry}\n`);

        // Send data buffer.
        for (let line of data) {
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
            this.writeHead(200);
        this.res.end();
    }

    /** 
     * Checks if the request comes from an EventSource. Will check the header 
     * field `accept`, see if it's `text/event-stream`, some clients may not 
     * set this right, so be careful to use.
     * @param {IncommingRequest} req
     */
    static isEventSource(req) {
        return req.method == "GET" && req.headers.accept == "text/event-stream";
    }
}

module.exports = SSE;