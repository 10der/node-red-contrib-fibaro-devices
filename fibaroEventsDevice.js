module.exports = function (RED) {
    "use strict";

    // The main node definition - most things happen in here
    function EventsDevice(n) {
        // Create a RED node
        RED.nodes.createNode(this, n);

        var serverConfig = RED.nodes.getNode(n.server);
        var fibaro = serverConfig.client;

        // copy "this" object in case we need it in context of callbacks of other functions.
        var node = this;
        var devices = [];
        try {
            devices = JSON.parse(`[${n.devices}]`);
        } catch (err) {
            // nothing
        }

        // respond to inputs....
        this.on('input', function (msg) {
            if (msg.topic === 'init') {
                if (n.devices) {
                    return;
                }

                let payload = msg.payload;
                try {
                    payload = JSON.parse(payload);
                } catch (e) {
                    // Ignore malformed
                }

                fibaro.removeDevice(n.id);
                if (Array.isArray(payload)) {
                    devices = payload;
                } else {
                    try {
                        devices = JSON.parse(`[${msg.payload}]`);
                    } catch (err) {
                        // nothing
                    }
                }
                devices.forEach(deviceID => {
                    if (deviceID != 0 && !isNaN(deviceID)) {
                        fibaro.addDevice(n.id, String(deviceID));
                    }
                });
            }
            if (msg.topic.endsWith("DevicePropertyUpdatedEvent")) {
                if (MyMessage(msg, devices)) {
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
                        node.send([event, null]);
                    } else {
                        event.payload = { property: payload.property, value: payload.newValue };
                        node.send([null, event]);
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
                node.send([null, event]);
            }
        });

        node.on('event', function (msg) {
            node.status({ fill: 'yellow', shape: 'ring', text: 'event' });
            setTimeout(() => {
                node.status({});
            }, 1000);
            var event = {};
            event.topic = String(msg.topic);
            event.payload = msg.payload;
            try { event.payload = JSON.parse(event.payload); } // obj
            catch (e) {/* */ }
            if (typeof event.payload === 'object') {
                node.send([null, event]);
            } else {
                node.send([event, null]);
            }
        });

        this.on("close", function () {
        });

        devices.forEach(deviceID => {
            if (deviceID != 0 && !isNaN(deviceID)) {
                fibaro.addDevice(n.id, String(deviceID));
            }
        });
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
