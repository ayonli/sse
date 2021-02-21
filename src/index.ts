import { IncomingMessage, ServerResponse } from "http";
import { Http2ServerRequest, Http2ServerResponse } from "http2";
import { nanoid } from "nanoid";

const MarkClosed = new Set<string>();
const closed = Symbol("closed");

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
    private _resWriteHead: ServerResponse["writeHead"] | Http2ServerResponse["writeHead"];
    private _resWrite: ServerResponse["write"];
    private _resEnd: ServerResponse["end"];

    /**
     * @param retry The re-connection time to use when attempting to send the 
     *  event.
     */
    constructor(
        protected req: IncomingMessage | Http2ServerRequest,
        protected res: ServerResponse | Http2ServerResponse,
        readonly retry: number = 0
    ) {
        // Store the original functions in case they're being overridden.
        this._resWriteHead = res.writeHead.bind(res);
        this._resWrite = res.write.bind(res);
        this._resEnd = res.end.bind(res);

        this.id = <string>req.headers["last-event-id"] || nanoid();
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
        return this[closed] ?? (this[closed] = MarkClosed.has(this.id));
    }

    /** Sends a response header to the client. */
    writeHead(code: number, headers?: { [x: string]: string | string[]; }) {
        this._resWriteHead(code, Object.assign({
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
    emit(event: string, data?: any) {
        this.ensureHead();
        this._resWrite(`event: ${event}\n`);
        return this.send(data);
    }

    /** Closes the connection. */
    close(cb?: () => void) {
        if (!MarkClosed.has(this.id)) {
            MarkClosed.add(this.id);
        } else {
            MarkClosed.delete(this.id);
        }

        this.ensureHead(204);
        this._resEnd(cb);
    }

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
