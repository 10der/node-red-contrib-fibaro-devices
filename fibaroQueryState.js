module.exports = function (RED) {
    function FibaroQueryState(n) {
        RED.nodes.createNode(this, n);
        this.server = n.server;
        this.serverConfig = RED.nodes.getNode(this.server);
        var node = this;
        var fibaro = this.serverConfig.client;
        node.status({});

        if (this.serverConfig) {
            if (!fibaro.validateConfig(this.serverConfig, node)) {
                node.error("Node has invalid configuration");
                n.server = null;
                return
            }
        }

        node.on('input', function (msg) {
            var deviceID = msg.topic.split("/").reverse()[0];
            var property = msg.property || 'value';
            fibaro.queryState(deviceID, property, (currentState) => {
                msg.currentState = currentState;
                node.send(msg);
                node.status({});
            }, (error) => node.status({ fill: "red", shape: "dot", text: error.text }));
        });
    }

    RED.nodes.registerType("fibaroQuery", FibaroQueryState);
}