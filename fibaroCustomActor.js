module.exports = function (RED) {
    function fibaroCustomActor(n) {
        RED.nodes.createNode(this, n);
        this.deviceID = n.deviceID;
        var serverConfig = RED.nodes.getNode(n.server);
        var fibaro = serverConfig.client;
        var node = this;

        var events = n.events;
        var customActions = n.payload ? JSON.parse(n.payload) : {};

        node.status({});

        if (this.serverConfig) {
            if (!fibaro.validateConfig(this.serverConfig, node)) {
                node.error("Node has invalid configuration");
                n.server = null;
                return
            }
        }

        this.on("close", function () {
            fibaro.emit('done', n.id);
        });

        node.on('event', function (msg) {
            if (MyMessage(msg, n.deviceID)) {

                node.status({ fill: 'yellow', shape: 'ring', text: 'event' });
                setTimeout(() => {
                    node.status({});
                }, 1000);

                if (events) {
                    var event = {};
                    event.topic = msg.topic;
                    event.payload = msg.payload;
                    try { event.payload = JSON.parse(msg.payload); } // obj
                    catch (e) {/* */ }
                    event.passthrough = true; // mark message
                    if (typeof event.payload === 'object') {
                        node.send([null, event]);
                    } else {
                        node.send([event, null]);
                    }
                }
            }
        });

        node.on('input', function (msg) {
            node.status({ fill: 'yellow', shape: 'ring', text: 'event' });
            setTimeout(() => {
                node.status({});
            }, 1000);

            if (n.deviceID == 0) {
                n.deviceID = msg.topic.split("/").reverse()[0];
            }

            var payload = msg.payload;
            try {
                payload = JSON.parse(payload);
            } catch (e) {
                // Ignore malformed
            }

            if (typeof payload === 'object') {
                // customAction from payload
                // console.debug(payload);
                payload.deviceID = n.deviceID;
                fibaro.callAPI("callAction", payload);
            } else if (typeof payload === 'string') {
                // custom action by name
                if (customActions) {
                    var command = customActions[payload];
                    if (command) {
                        command.deviceID = n.deviceID;
                        // console.debug(command);
                        fibaro.callAPI("callAction", command);
                    } else {
                        console.debug("unknown action", payload);
                    }
                } else {
                    // unknown action
                    console.debug("no actions");
                }
            } else {
                // error action
                console.debug("error action!");
            }
        });

        // statup initialization
        fibaro.queryState(n.deviceID, 'value', (currentState) => {
            let event = {};
            event.topic = `${n.deviceID}`;
            event.payload = currentState.value;
            node.emit('event', event);
            node.status({ fill: 'yellow', shape: 'ring', text: 'init' });
        }, (error) => node.status({ fill: "red", shape: "dot", text: error.text }));

        // register device
        fibaro.emit('init', n.id, n.deviceID);
    }

    function MyMessage(msg, deviceID) {
        return (msg.topic.split("/").reverse()[0] == deviceID);
    }

    RED.nodes.registerType("fibaroXActor", fibaroCustomActor);
}