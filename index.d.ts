import { IncomingMessage, ServerResponse } from "http";

/**
 * Server-Sent Events based on HTML5 specs.
 * 
 * @see https://html.spec.whatwg.org/multipage/server-sent-events.html
 */
declare class SSE {
    constructor(req: IncomingMessage, res: ServerResponse);

    /** Writes response head. */
    writeHead(code: number, headers?: {[field: string]: string | string[]}): this;

    /**
     * Sends data to the client.
     * @param id If set, the browser will read it as lastEventId, and when
     *  reconnecting after disconnection, the browser will send it as a header
     *  'Last-Event-ID' to help the server rebuild the connection.
     * @param retry Reconnection time in milliseconds.
     */
    send(data: any, id?: string, retry?: number): boolean;
    /**
     * @param event Event name.
     * @param data Usually this argument should be a string, but if not, it 
     *  will be transferred to JSON.
     */
    send(event: string, data: any, id?: string, retry?: number): boolean;

    /** 
     * Closes the connection.
     * 
     * Be noticed, the client will reconnect after the connection is closed, 
     * unless you send HTTP 204 No Content response code to tell it not to.
     */
    close(): void;
}

declare namespace SSE {
    /** 
     * Checks if the request comes from an EventSource. Will check the header
     * field `accept`, see if it's `text/event-stream`, some clients may not
     * set this right, so be careful to use.
     */
    export function isEventSource(req: IncomingMessage): boolean;
}

export = SSE;
// export default SSE;