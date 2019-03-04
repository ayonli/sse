import { IncomingMessage, ServerResponse } from "http";
import { Http2ServerRequest, Http2ServerResponse } from "http2";
import shortid = require("shortid");

const MarkClosed: { [id: string]: boolean } = {};

/**
 * Server-Sent Events based on HTML5 specs.
 * 
 * @see https://html.spec.whatwg.org/multipage/server-sent-events.html
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
 */
export class SSE {
    /**
     * The unique ID of the SSE connection, also used as `lastEventId` of the
     * client EventSource, when the client reconnect, this ID will be reused.
     */
    readonly id: string;

    /**
     * @param retry The re-connection time to use when attempting to send the 
     *  event.
     */
    constructor(
        protected req: IncomingMessage | Http2ServerRequest,
        protected res: ServerResponse | Http2ServerResponse,
        readonly retry: number = 0
    ) {
        this.id = <string>req.headers["last-event-id"] || shortid.generate();
        MarkClosed[this.id] && this.close();
    }

    /** Whether the connection is new. */
    get isNew() {
        return !this.req.headers["last-event-id"];
    }

    /** Sends a response header to the client. */
    writeHead(code: number, headers?: { [x: string]: string | string[] }) {
        this.res.writeHead(code, Object.assign({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }, headers));

        return this;
    }

    /** Sends data to the client. */
    send(data: any) {
        this.ensureHead();

        let frames: string[];

        if (data === undefined) {
            frames = [];
        } else if (typeof data !== "string") {
            frames = [JSON.stringify(data)];
        } else {
            frames = data.replace(/(\r\n|\r)/g, "\n").split("\n");
        }

        this.res.write(`id: ${this.id}\n`);

        if (this.retry)
            this.res.write(`retry: ${this.retry}\n`);

        for (let frame of frames) {
            this.res.write(`data: ${frame}\n`);
        }

        return this.res.write("\n");
    }

    /**
     * Emits an event to the client, the message will be dispatched on the 
     * browser to the listener for the specified event name; the website source
     * code should use `addEventListener()` to listen for named events.
     */
    emit(event: string, data?: any) {
        this.ensureHead().res.write(`event: ${event}\n`);
        return this.send(data);
    }

    /** Closes the connection. */
    close(cb?: () => void) {
        if (!MarkClosed[this.id]) {
            MarkClosed[this.id] = true;
        } else {
            delete MarkClosed[this.id];
        }

        return this.ensureHead(204).res.end(cb);
    };

    private ensureHead(code: number = 200) {
        this.res.headersSent || this.writeHead(code);
        return this;
    }
}

export namespace SSE {
    /** 
     * Checks if the request comes from an EventSource. Will check the header 
     * field `accept`, see if it's `text/event-stream`.
     */
    export function isEventSource(req: IncomingMessage | Http2ServerRequest) {
        return req.method == "GET" && req.headers.accept == "text/event-stream";
    }
}

export default SSE;