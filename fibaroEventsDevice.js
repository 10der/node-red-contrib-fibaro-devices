const BaseNode = require('./fibaroBaseNode.js');

module.exports = function (RED) {

    class EventsDevice extends BaseNode {
        constructor(n) {
            super(n, RED);

            this.devices = [];
            try {
                this.devices = JSON.parse(`[${n.devices}]`);
            } catch (err) {
                // nothing
            }
        }

        // respond to inputs....
        onInput(msg) {
            if (msg.topic === 'init') {
                if (this.devices) {
                    return;
                }

                let payload = msg.payload;
                try {
                    payload = JSON.parse(payload);
                } catch (e) {
                    // Ignore malformed
                }

                this.fibaro.removeDevice(this.id);
                if (Array.isArray(payload)) {
                    this.devices = payload;
                } else {
                    try {
                        this.devices = JSON.parse(`[${msg.payload}]`);
                    } catch (err) {
                        // nothing
                    }
                }
                this.devices.forEach(deviceID => {
                    if (deviceID != 0) {
                        this.fibaro.addDevice(this.id, String(deviceID));
                    }
                });
            }
            if (msg.topic.endsWith("DevicePropertyUpdatedEvent")) {
                if (MyMessage(msg, this.devices)) {
                    let payload = msg.payload;
                    try {
                        payload = JSON.parse(payload);
                    } catch (e) {
                        // Ignore malformed
                    }
                    let event = {};
                    event.topic = `${payload.id}`;
                    if (payload.property == "value") {
                        event.payload = payload.newValue;
                        this.node.send([event, null]);
                    } else {
                        event.payload = { property: payload.property, value: payload.newValue };
                        this.node.send([null, event]);
                    }
                }
            } else if (msg.topic.endsWith("CentralSceneEvent")) {
                let payload = msg.payload;
                try {
                    payload = JSON.parse(payload);
                } catch (e) {
                    // Ignore malformed
                }
                let event = {};
                event.topic = `${payload.deviceId}`;
                event.payload = { property: msg.topic, value: payload };
                this.node.send([null, event]);
            }
        }

        onEvent(msg) {
            this.node.status({ fill: 'yellow', shape: 'ring', text: 'event' });
            setTimeout(() => {
                this.node.status({});
            }, 1000);
            var event = {};
            event.topic = String(msg.topic);
            event.payload = msg.payload;
            try { event.payload = JSON.parse(event.payload); } // obj
            catch (e) {/* */ }
            if (typeof event.payload === 'object') {
                this.node.send([null, event]);
            } else {
                this.node.send([event, null]);
            }
        }

        // devices.forEach(deviceID => {
        //     if (deviceID != 0) {
        //         fibaro.addDevice(n.id, String(deviceID));
        //     }
        // });
    }

    function MyMessage(msg, devices) {
        for (var device in devices) {
            var deviceID = devices[device];
            if ((msg.payload.id == deviceID)) {
                return true;
            }
        }
        return false;
    }

    // Register the node by name. This must be called before overriding any of the
    // Node functions.
    RED.nodes.registerType("fibaroXDevice", EventsDevice);
}
