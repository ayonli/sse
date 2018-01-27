import { IncomingMessage, ServerResponse } from "http";

/**
 * Server-Sent Events based on HTML5 specs.
 * 
 * @see https://html.spec.whatwg.org/multipage/server-sent-events.html
 */
declare class SSE {
    constructor(req: IncomingMessage, res: ServerResponse);

    /** Writes response head. */
    writeHead(code: number, headers?: {[field: string]: string | string[]});

    /**
     * Sends data to the client.
     * @param id Last event ID.
     * @param retry Reconnection time in milliseconds.
     */
    send(data: any, id?: number, retry?: number): void;
    /**
     * @param event Event name.
     */
    send(event: string, data: any, id?: number, retry?: number): void;

    /** 
     * Closes the connection.
     * 
     * Be noticed, the client will reconnect after the connection is cloesd, 
     * unless you send HTTP 204 No Content response code to tell it not to.
     */
    close(): void;

    /** 
     * Check if the request comes from an EventSource. Will check the header
     * field `accept`, see if it's `text/event-stream`, some clients may not
     * set this right, so be careful to use.
     */
    static isEventSource(req: IncomingMessage): boolean;
}

export = SSE;