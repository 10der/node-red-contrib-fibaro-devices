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

        node.on('input', function (msg) {
            var deviceID = msg.topic.split("/").reverse()[0];
            if (isNaN((parseInt(deviceID)))) {
                fibaro.queryDevices(msg.topic, (result) => {
                    msg.currentState = result;
                    node.send(msg);
                    node.status({});
                }, (error) => node.status({ fill: "red", shape: "dot", text: error.text }));
            } else {
                var property = msg.property || 'value';
                fibaro.queryState(deviceID, property, (currentState) => {
                    msg.currentState = currentState;
                    node.send(msg);
                    node.status({});
                }, (error) => node.status({ fill: "red", shape: "dot", text: error.text }));
            }
        });
    }

    RED.nodes.registerType("fibaroQuery", FibaroQueryState);
}