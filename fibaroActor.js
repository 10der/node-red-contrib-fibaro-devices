module.exports = function (RED) {
    function FibaroActor(n) {
        RED.nodes.createNode(this, n);
        this.deviceID = n.deviceID;
        var serverConfig = RED.nodes.getNode(n.server);
        var fibaro = serverConfig.client;
        var node = this;

        var events = n.events;

        node.status({});

        if (serverConfig) {
            if (!serverConfig.validateConfig(node)) {
                node.error("Node has invalid configuration");
                return
            }
        } else {
            node.error("Node configuration is not found!");
        }

        // do not SPAM ZWave packets!
        var checkState = function (value, deviceID, property, func) {
            fibaro.queryState(deviceID, property, (currentState) => {
                // console.debug(msg.payload, currentState.value, msg.payload != currentState.value);
                if (value != currentState.value) {
                    func();
                }
            });
        }

        this.on("close", function () {
            fibaro.emit('done', n.id);
        });

        node.on('event', function (msg) {
            if (MyMessage(msg, this.deviceID)) {

                node.status({ fill: 'yellow', shape: 'ring', text: 'event' });
                setTimeout(() => {
                    node.status({});
                }, 1000);

                if (events) {
                    var event = {};
                    event.topic = String(msg.topic);
                    event.payload = msg.payload;
                    try { event.payload = JSON.parse(msg.payload); } // obj
                    catch (e) {/* */ }
                    event.passthrough = true; // mark message
                    if (typeof event.payload === 'object') {
                        node.send([null, event]);
                    } else {
                        let value = event.payload;
                        node.send([event, null]);
                        setTimeout(() => {
                            node.status({ fill: 'green', shape: 'ring', text: `${value}` });
                        }, 1000);
                    }
                }
            }
        });

        node.on('input', function (msg) {
            // it's my own message
            if (msg.passthrough) return;

            node.status({ fill: 'yellow', shape: 'ring', text: 'event' });
            setTimeout(() => {
                node.status({});
            }, 1000);

            var deviceID = this.deviceID;
            if (this.deviceID == 0) {
                deviceID = String(msg.topic).split("/").reverse()[0];
            }

            var payload = msg.payload;
            try {
                payload = JSON.parse(payload);
            } catch (e) {
                // Ignore malformed
            }

            if (typeof payload == "boolean") {
                // binarySwitch
                var action = payload ? "turnOn" : "turnOff";
                checkState(Number(msg.payload), deviceID, 'value',
                    () => fibaro.callAPI("callAction", { deviceID: deviceID, name: action }));
            } else if (typeof msg.payload == "number") {
                // multiLevelSwitch
                checkState(msg.payload, deviceID, 'value',
                    () => fibaro.callAPI("callAction", { deviceID: deviceID, name: "setValue", arg1: payload }));
            } else if (typeof payload === 'string') {
                // callAction name as string
                payload.deviceID = deviceID
                fibaro.callAPI("callAction", { deviceID: deviceID, name: payload });
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
        return (String(msg.topic).split("/").reverse()[0] == deviceID);
    }

    RED.nodes.registerType("fibaroActor", FibaroActor);
}