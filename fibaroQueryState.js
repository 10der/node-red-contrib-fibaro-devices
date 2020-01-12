module.exports = function (RED) {
    function FibaroQueryState(n) {
        RED.nodes.createNode(this, n);
        this.server = n.server;
        this.serverConfig = RED.nodes.getNode(this.server);
        var node = this;
        node.status({});
        var fibaro = this.serverConfig.client;        

        node.on('input', function (msg) {
            if (msg.payload) {
                var deviceID = msg.topic.split("/").reverse()[0];
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