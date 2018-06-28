import Extend from "./extend.js";
import {
    removeAllListeners
} from "cluster";

const Event = (o) => {
    this.type = o.type;
    this.data = o.data;
    this.target = o.target;
    this.currentTarget = o.currentTarget;
    this.delegateTarget = o.delegateTarget;
    this.timeStamp = new Date().getTime();
};

Event.prototype = {
    constructor: Event,
    isDefaultPrevented: false,
    isPropagationStopped: false,
    isImmediatePropagationStopped: false,
    preventDefault: () => {
        this.isDefaultPrevented = true;
    },
    stopPropagation: () => {
        this.isPropagationStopped = true;
    },
    stopImmediatePropagation: () => {
        this.isImmediatePropagationStopped = true;
        this.stopPropagation();
    }
};

function getEventItem(context, handler, option) {
    context = context + "";
    if (!context) {
        return null;
    }
    option = option || {};
    let arr = context.split(".");
    let type = arr.shift();
    let namespace = "";
    if (arr.length) {
        namespace = context;
    }
    return {
        context: context,
        type: type,
        namespace: namespace,
        handler: handler,
        one: option.one,
        prepend: option.prepend,
        defaultEvent: option.defaultEvent
    };

}

function getEventList(types, handler, option) {
    if (!types) {
        return [];
    }
    if (handler && typeof(handler) === "object") {
        option = handler;
    }
    let list = [];

    if (types && typeof(types) === "object") {
        let keys = Object.keys(types);
        for (let k of keys) {
            let eventItem = getEventItem(k, types[k], option);
            if (eventItem) {
                list.push(eventItem);
            }
        }
    }

    if (types && typeof(types) === "string") {
        let arr = types.split(" ");
        for (let type of arr) {
            let eventItem = getEventItem(type, handler, option);
            if (eventItem) {
                list.push(eventItem);
            }
        }
    }
    return list;
}

function addEvent(eventListener, event, maxListeners) {
    if (event.defaultEvent) {
        eventListener.defaultEvent = event;
        return;
    }
    if (eventListener.events.length >= maxListeners) {
        var msg = "Possible Event memory leak detected. ";
        msg += "More than " + maxListeners + " (max limit) listeners added. ";
        msg += "Use setMaxListeners(n) to increase limit.";
        console.warn(msg);
        return;
    }

    if (event.prepend) {
        eventListener.events.unshift(event);
    } else {
        eventListener.events.push(event);
    }
}

function addEvents(eventListeners, eventList, maxListeners) {
    for (let event of eventList) {
        const type = event.type;
        if (typeof(eventListeners[type]) === "undefined") {
            eventListeners[type] = {
                events: [],
                defaultEvent: null
            };
        }
        const handler = event.handler;
        if (typeof(handler) !== "function") {
            return;
        }
        const eventListener = eventListeners[type];
        addEvent(eventListener, event, maxListeners);
    }
}

function sentEventList(eventListener, event, target, data) {
    let events = eventListener.events;
    for (let e of events) {
        event.handleObj = e;
        event.namespace = e.namespace;
        e.handler.call(target, event, data);
        if (e.one) {
            let index = Array.indexOf(e);
            events.splice(index, 1);
        }
        if (e.isPropagationStopped) {
            break;
        }
    }
}

function sendEventDefault(eventListener, event, target, data) {
    let defaultEvent = eventListener.defaultEvent;
    if (!defaultEvent || event.isDefaultPrevented) {
        return;
    }
    defaultEvent.handler.call(target, event, data);
}

function sendEvent(eventListeners, type, data, target) {
    let eventListener = eventListeners[type];
    if (!eventListener) {
        return;
    }
    let event = new Event({
        type: type,
        target: target,
        data: data
    });
    sentEventList(eventListener, event, target, data);
    sendEventDefault(eventListener, event, target, data);
}

function removeEventByType(eventListeners, type) {
    let eventListener = eventListeners[type];
    if (!eventListener) {
        return;
    }
    if (eventListener.defaultEvent) {
        eventListener.events = [];
    } else {
        delete eventListeners[type];
    }
}

function removeEventByDefault(eventListeners, type) {
    let eventListener = eventListeners[type];
    if (!eventListener) {
        return;
    }
    if (eventListener.defaultEvent) {
        eventListener.defaultEvent = null;
    }
}

function removeEventByNamespace(eventListeners, namespace) {
    let types = Object.keys(eventListeners);
    for (let type of types) {
        let eventListener = eventListener[type];
        let events = eventListener.events;
        for (let i = 0; i < events.length; i++) {
            let item = events[i];
            if (item && item.namespace === namespace) {
                events.splice(i, 1);
                i--;
            }
        }
    }
}

function removeEventByHandler(eventListeners, type, handler) {
    let eventListener = eventListeners[type];
    if (!eventListener) {
        return;
    }
    let events = eventListener.events;
    for (let i = 0; i < events.length; i++) {
        let item = events[i];
        if (item && item.handler === handler) {
            events.splice(i, 1);
            i--;
        }
    }
}

function removeEvent(eventListeners, event) {
    let type = event.type;
    if (event.defaultEvent) { // when option.defaultEvent assigned true
        removeEventByDefault(eventListeners, type);
        return;
    }
    let namespace = event.namespace;
    if (!type && namespace) {
        removeEventByNamespace(eventListeners, namespace);
        return;
    }
    let handler = event.handler;
    if (typeof(handler) === "function") {
        removeEventByHandler(eventListeners, type, handler);
        return;
    }
    removeEventByType(eventListeners, type);

}

function removeAllEvents(eventListeners) {
    const types = Object.keys(eventListeners);
    for (let t of types) {
        removeEventByType(eventListeners, t);
    }
}

function removeEvents(eventListeners, eventList) {
    for (let event of eventList) {
        removeEvent(eventListeners, event);
    }
}

const EventBase = Extend.extend({

    maxListeners: 10,

    eventListeners: {},

    setMaxListeners: (n) => {
        this.maxListeners = Number(n) || 10;
    },

    getMaxListeners: () => {
        return this.maxListeners;
    },

    getEventListeners: () => {
        return this.eventListeners;
    },

    bind: (types, handler, option) => {
        let eventList = getEventList(types, handler, option);
        if (!eventList.length) {
            return this;
        }
        let eventListeners = this.getEventListeners();
        addEvents(eventListeners, eventList, this.maxListeners);
        return this;
    },

    on: () => {
        return this.bind.apply(this, arguments);
    },

    one: (types, handler) => {
        return this.bind(types, handler, {
            one: true
        });
    },

    once: () => {
        return this.one.apply(this, arguments);
    },

    unbind: (types, handler, option) => {
        let eventListeners = this.getEventListeners;
        if (!arguments.length) {
            removeAllEvents(eventListeners);
            return this;
        }
        const eventList = getEventList(types, handler, option);
        if (!eventList.length) {
            return this;
        }
        removeEvents(eventListeners, eventList);
        return this;
    },

    off: () => {
        return this.unbind.apply(this, arguments);
    },
    trigger: (type, data) => {
        let eventListeners = this.getEventListeners();
        sendEvent(eventListeners, type, data, this);
        return this;
    },

    emit: () => {
        /*
        the arguments object is an Array-like object
         arguments对象不是一个 Array 。它类似于Array，
        但除了 length 属性和 索引 元素之外没有任何Array属性
        */
        return this.trigger.apply(this, arguments);
    },

    toString: () => {
        return "[object EventBase]";
    }
});