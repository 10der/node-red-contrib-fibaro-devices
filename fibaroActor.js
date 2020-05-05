module.exports = function (RED) {
    function FibaroActor(n) {
        RED.nodes.createNode(this, n);
        this.deviceID = n.deviceID.trim();
        if (this.deviceID === "") {
            this.deviceID = "0";
        }
        var serverConfig = RED.nodes.getNode(n.server);
        var fibaro = serverConfig.client;
        var node = this;
        var events = n.events;
        this.currentStatus = "...";

        node.status({});

        if (serverConfig) {
            if (!serverConfig.validateConfig(node)) {
                node.error("Node has invalid configuration");
                return
            }
        } else {
            node.error("Node configuration is not found!");
        }

        this.on("close", function () {
            fibaro.emit('done', n.id);
        });

        node.on('event', function (msg) {
            if (MyMessage(msg, this.deviceID)) {
                node.status({ fill: 'yellow', shape: 'ring', text: 'event' });

                var event = {};
                event.topic = String(n.deviceID);
                if (n.deviceID == 0) {
                    event.topic = String(msg.topic);
                }
                event.payload = msg.payload;
                try { event.payload = JSON.parse(msg.payload); } // obj
                catch (e) {/* */ }
                if (events) {
                    event.passthrough = true; // mark message
                    if (typeof event.payload === 'object') {
                        node.send([null, event]);
                    } else {
                        node.send([event, null]);
                    }
                }

                if (typeof event.payload === 'object') {
                    // node.status({});
                } else {
                    this.currentStatus = event.payload;
                }
                node.status({ fill: 'gray', shape: 'ring', text: `${this.currentStatus}` });
            }
        });

        node.on('input', function (msg) {
            // it's my own message
            if (msg.passthrough) return;

            node.status({ fill: 'yellow', shape: 'ring', text: 'in' });
            setTimeout(() => {
                node.status({ fill: 'gray', shape: 'ring', text: `${this.currentStatus}` });
            }, 1000);

            var deviceID = this.deviceID;
            if (this.deviceID == 0) {
                deviceID = String(msg.topic);
            }

            var payload = msg.payload;
            try {
                payload = JSON.parse(payload);
            } catch (e) {
                // Ignore malformed
            }

            var orgDeviceID = fibaro.translateDeviceID(deviceID);
            if (orgDeviceID) deviceID = orgDeviceID;

            if (typeof payload == "boolean") {
                // binarySwitch
                var action = payload ? "turnOn" : "turnOff";
                fibaro.callAPI("callAction", { deviceID: deviceID, name: action });
            } else if (typeof msg.payload == "number") {
                // multiLevelSwitch
                fibaro.callAPI("callAction", { deviceID: deviceID, name: "setValue", arg1: payload });
            } else if (typeof payload === 'string') {
                // callAction name as string
                payload.deviceID = deviceID
                fibaro.callAPI("callAction", { deviceID: deviceID, name: payload });
            } else if (typeof payload === 'object') {
                payload.deviceID = deviceID
                fibaro.callAPI("callAction", payload);
            } else {
                // error action
                console.debug("error action!");
            }
        });

        // register device
        if (this.deviceID != 0) {
            fibaro.addDevice(n.id, n.deviceID);
        }
    }

    function MyMessage(msg, deviceID) {
        if ((String(msg.topic) == deviceID)) {
            // TODO
        }
        return true;
    }

    RED.nodes.registerType("fibaroActor", FibaroActor);
}