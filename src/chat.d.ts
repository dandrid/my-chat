export interface MessageDto {
    id: number;
    timeStamp: string;
    referenceTo: number; // 0: normal message, +: update, -: delete
    senderId: string;
    contentType: number;
    content: string;
}

export interface UserDto {
    id: string;
    displayName: string;
    tag: string;
    lastSeen: string;
}

export interface ConversationDto {
    channelId: string;
    parentChannelId: string;
    name: string;
    description: string;
    data: string;
    state: number; // disconnected, outgoingRequest, incomingRequest, accepted, group
    access: number; // none, read, write, admin
    notificationLevel: number; // none, gray, push
    unreadCount: number;
    memberIds: string[];
    lastMessages: MessageDto[];
}

export interface InboxDto {
    user: UserDto;
    contacts: UserDto[];
    conversations: ConversationDto[];
}

export type OutgoingPacket =
    { type: "login", email: string, password: string, staySignedIn: boolean } |
    { type: "loginWithToken", token: string } |
    { type: "register", email: string, password: string, displayName: string, staySignedIn: boolean } |
    { type: "contactRequest", email: string, firstMessage: string } |
    { type: "message", channelId: string, referenceTo: number, contentType: number, content: string };

export type IncomingPacket =
    { type: "error", message: string } |
    { type: "login", query: string, token: string, inbox: InboxDto } |
    { type: "message", channelId: string, message: MessageDto } |
    { type: "conversationAdded", conversation: ConversationDto } |
    { type: "conversationRemoved", channelId: string } |
    { type: "user", user: UserDto };

export interface ProxyEventMap {
    "login": () => void;
    "message": (channelId: string, message: MessageDto) => void;
    "conversation": (channelId: string) => void;
}

export class EventProducer<M> {
    private listeners: { type: string, listener, obj?: Object }[] = [];

    protected dispatch(type: string, ...args) {
        for (let listener of this.listeners.filter(x => x.type === type))
            listener.listener.call(listener.obj, ...args);
    }

    addEventListener<K extends keyof M>( type: K, listener: M[ K ], obj?: Object ) {
        this.listeners.push({ type, listener, obj });
    }

    removeEventListener<K extends keyof M>(type: K, listener: M[K]) {
        this.listeners.splice(this.listeners.findIndex(x => x.type === type && x.listener === listener), 1);
    }

    removeAllEventListener(obj: Object) {
        if (!obj)
            throw new Error("Must specify object");
        this.listeners = this.listeners.filter(x => x.obj !== obj);
    }
}


export class Proxy extends EventProducer<ProxyEventMap> {

    private ws: WebSocket;
    constructor() {
        super();
        this.ws = new WebSocket("wss://raja.aut.bme.hu/chat/");
        this.ws.addEventListener("message", e => {
            let p = <IncomingPacket>JSON.parse(e.data);
            switch (p.type) {
                case "error":
                    alert(p.message);
                    break;
                case "login":
                    this.inbox = p.inbox;
                    this.dispatch("login");
                    break;
                case "message":
                    let cid = p.channelId;
                    this.dispatch("message", cid, p.message);
                    this.inbox!.conversations.find(x => x.channelId === cid)?.lastMessages.push(p.message);
                    break;
                case "conversationAdded":
                    this.inbox!.conversations.push(p.conversation);
                    this.dispatch("conversation", p.conversation.channelId);
                    break;
            }
        });
    }

    sendPacket(packet: OutgoingPacket) {
        this.ws.send(JSON.stringify(packet));
    }

    inbox: InboxDto | null = null;
}

export var proxy = new Proxy();