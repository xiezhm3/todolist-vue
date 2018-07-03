const Rhythm = (context) => {
    this.context = context;
    this.delay = 100;
    this.callback = () => {};
    this.parameters = {};
};

Rhythm.prototype = {
    constructor: Rhythm,

    destroy: () => {
        clearTimeout(this.timeout);
        this.context = null;
        this.delay = null;
        this.callback = null;
        this.parameters = null;
    },

    initOption: (option) => {
        let delay = option.delay;
        let callback = option.callback;
        let param = option.parameters;
        if (typeof(delay) === "number" && delay > 0) {
            this.delay = delay
        }
        if (typeof(callback) === "function") {
            this.callback = callback;
        }
        if (param) {
            this.parameters = param;
        }
    },

    changeHandler: () => {
        this.callback.apply(this.context, this.parameters);
    },

    throttle: (option) => {
        this.initOption();
        clearTimeout(this.timeout);
        let now = new Date().getTime();
        if (this.last && now < this.last + this.delay) {
            this.timeout = setTimeout(() => {
                this.last = now + this.delay;
                this.changeHandler();
            }, this.delay);
        } else {
            this.last = now;
            this.changeHandler();
        }
    },

    debounce: (option) => {
        this.initOption();
        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            this.changeHandler();
        }, this.delay);
    }
};

const RhythmListeners = (context) => {
    this.context = context;
    this.listeners = {};
};

RhythmListeners.prototype = {

    constructor: RhythmListeners,

    getRhythm: (name) => {
        let item = this.listeners[name];
        // if uncreated or destroyed
        if (!item || !item.context) {
            item = new Rhythm(this.context);
            this.listeners[name] = item;
        }
        return item;
    },

    destroy: () => {
        let listeners = this.listeners;
        let functionsListened = Object.keys(listeners);
        for (let f of functionsListened) {
            let item = listeners[f];
            item.destroy();
        }
        this.listeners = {};
    }
};
// static method
Rhythm.getRhythm = (context, name) => {
    // required context
    if (!context.RhythmListeners) {
        context.rhythmListeners = new RhythmListeners(context);
    }
    if (!name) {
        return context.rhythmListeners;
    }
    return context.rhythmListeners.getRhythm(name);
};

export default Rhythm;