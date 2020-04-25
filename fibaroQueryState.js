module.exports = function (RED) {
    function FibaroQueryState(n) {
        RED.nodes.createNode(this, n);
        this.deviceID = n.deviceID;
        var serverConfig = RED.nodes.getNode(n.server);
        var fibaro = serverConfig.client;
        var node = this;

        node.status({});

        if (serverConfig) {
            if (!serverConfig.validateConfig(node)) {
                node.error("Node has invalid configuration");
                return
            }
        } else {
            node.error("Node configuration is not found!");
        }

        // get prop with name value
        // msg.topic = 123; msg.property = "value";

        // get history
        // msg.topic = 123; msg.events = "from=505952000&to=1508579311;
        // msg.topic = 123; msg.events = "last=10&type=id";

        // query devices
        // msg.topic = "visible=true&enabled=true&interface=light&property=[isLight,true]";
        node.on('input', function (msg) {
            var deviceID = this.deviceID;
            if (this.deviceID == 0) {
                deviceID = String(msg.topic);
            }

            if (msg.events) {
                fibaro.queryDeviceHistory(deviceID, msg.events, (result) => {
                    msg.currentState = result;
                    if (n.resultToPayload) {
                        msg.payload = result;
                    }
                    node.send(msg);
                    node.status({});
                }, (error) => node.status({ fill: "red", shape: "dot", text: error.text }));
            } else if (deviceID.includes("=")) {
                fibaro.queryDevices(deviceID, (currentState) => {
                    msg.currentState = currentState;
                    if (n.resultToPayload) {
                        msg.payload = currentState.value;
                    }
                    node.send(msg);
                    node.status({});
                }, (error) => node.status({ fill: "red", shape: "dot", text: error.text }));
            } else {
                var property = msg.property || 'value';
                fibaro.queryState(deviceID, property, (currentState) => {
                    msg.currentState = currentState;
                    if (property == "value") {
                        if (n.resultToPayload) {
                            msg.payload = currentState.value;
                        }
                    }
                    node.send(msg);
                    node.status({});
                }, (error) => node.status({ fill: "red", shape: "dot", text: error.text }));
            }
        });
    }

    RED.nodes.registerType("fibaroQuery", FibaroQueryState);
}