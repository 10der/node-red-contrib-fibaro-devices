module.exports = function (RED) {
    function FibaroActor(n) {
        RED.nodes.createNode(this, n);
        this.server = n.server;
        this.serverConfig = RED.nodes.getNode(this.server);
        var node = this;
        var fibaro = this.serverConfig.client;
        var events = n.events;
        var customActions = n.payload ? JSON.parse(n.payload) : {};
        var defautProperty = 'value';

        // do not SPAM ZWave packets!
        var checkState = function (msg, deviceID, property, func) {
            fibaro.queryState(deviceID, property, (currentState) => {
                // console.debug(msg.payload, currentState.value, msg.payload != currentState.value);
                if ((msg.payload != currentState.value)) {
                    func();
                }
            });
        }

        fibaro.on('event', function (msg) {
            if (MyMessage(msg, n.deviceID)) {
                node.status({ fill: 'yellow', shape: 'ring', text: 'event' });
                setTimeout(() => {
                    node.status({});
                }, 1000);

                if (events) {
                    try {
                        var event = {};
                        event.topic = msg.topic;
                        event.payload = JSON.parse(msg.payload);
                        node.send([event]);
                    } catch (e) {
                        // Ignore malformed
                    }
                }
            }
        });

        node.on('input', function (msg) {
            node.status({ fill: 'yellow', shape: 'ring', text: 'event' });
            setTimeout(() => {
                node.status({});
            }, 1000);

            var payload = msg.payload;
            try {
                payload = JSON.parse(payload);
            } catch (e) {
                // Ignore malformed
            }

            if (typeof payload == "boolean") {
                // console.debug('binarySwitch');
                var action = payload ? "turnOn" : "turnOff";
                checkState(msg, n.deviceID, defautProperty, 
                    () => fibaro.callAPI("callAction", { deviceID: n.deviceID, name: action }));
            } else if (typeof msg.payload == "number") {
                // console.debug('multiLevelSwitch');
                checkState(msg, n.deviceID, defautProperty, 
                    () => fibaro.callAPI("callAction", { deviceID: n.deviceID, name: "setValue", arg1: payload }));
            }
            else if (typeof payload === 'object') {
                // console.debug('customAction from payload');
                payload.deviceID = n.deviceID;
                fibaro.callAPI("callAction", payload);
            } else {
                // custom action by name
                // console.debug('customActions');
                if (customActions) {
                    // console.debug(`pre-defined customAction ${payload}`);
                    payload = customActions[payload];
                    if (payload) {
                        payload.deviceID = n.deviceID;
                        fibaro.callAPI("callAction", payload);
                    } else {
                        console.debug(`action not found ${payload}`);
                    }
                } else {
                    // unknown action
                    console.debug("unknown action");
                }
            }
        });
    }

    function MyMessage(msg, deviceID) {
        return (msg.topic.split("/").reverse()[0] == deviceID);
    }

    RED.nodes.registerType("fibaroActor", FibaroActor);
}