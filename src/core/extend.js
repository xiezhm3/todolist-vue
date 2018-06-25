const Extend = () => {};

Extend.extend = (protoProps, staticProps) => {

    // constructor
    const Sub = () => {
        return this.apply(this, arguments);
    };

    // if has custom constructor
    if (protoProps && protoProps.hasOwnProperty("constructor") && typeof(protoProps.constructor) === "function") {
        Sub = protoProps.constructor;
    }

    // add static properties to the constructor
    mergeProps(Sub, [Sub, staticProps]);

    // prototype properties handler
    const parentProto = Object.create(this.prototype);
    parentProto.constructor = Sub;

    mergeProps(Sub.prototype, [parentProto, protoProps]);

    return Sub;
};

Extend.mixin = () => {
    let protoProps = mergeProps({}, arguments);
    return Extend.extend.call(this, protoProps);
};

const mergeProps = (target, propertyList) => {
    for (let p of propertyList) {
        if (!p) {
            continue;
        }
        for (let k in p) {
            if (target[k] !== p[k]) {
                target[k] = p[k];
            }
        }
    }
    return target;
};

export default Extend;