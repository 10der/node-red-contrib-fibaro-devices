module.exports = function (RED) {
    function fibaroCustomActor(n) {
        RED.nodes.createNode(this, n);
        this.server = n.server;
        this.serverConfig = RED.nodes.getNode(this.server);
        var node = this;
        var fibaro = this.serverConfig.client;
        var events = n.events;
        var customActions = n.payload ? JSON.parse(n.payload) : {};

        // do not SPAM ZWave packets!
        // var checkState = function (value, deviceID, property, func) {
        //     fibaro.queryState(deviceID, property, (currentState) => {
        //         // console.debug(msg.payload, currentState.value, msg.payload != currentState.value);
        //         if (value != currentState.value) {
        //             func();
        //         }
        //     });
        // }
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
    }

    function MyMessage(msg, deviceID) {
        return (msg.topic.split("/").reverse()[0] == deviceID);
    }

    RED.nodes.registerType("fibaroXActor", fibaroCustomActor);
}