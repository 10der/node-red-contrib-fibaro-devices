module.exports = function (RED) {
    function FibaroSensor(n) {
        RED.nodes.createNode(this, n);
        this.server = n.server;
        this.serverConfig = RED.nodes.getNode(this.server);
        var node = this;
        var fibaro = this.serverConfig.client;

        fibaro.on('event', function (msg) {
            if (MyMessage(msg, n.deviceID)) {
                node.status({ fill: 'yellow', shape: 'ring', text: 'event' });
                setTimeout(() => {
                    node.status({});
                }, 1000);

                try {
                    var event = {};
                    event.topic = msg.topic;
                    event.payload = JSON.parse(msg.payload);
                    if (typeof event.payload === 'object') {
                        node.send([null, event]);
                    } else {
                        node.send([event, null]);
                    }
                } catch (e) {
                    // Ignore malformed
                }
            }
        });
    }

    function MyMessage(msg, deviceID) {
        return (msg.topic.split("/").reverse()[0] == deviceID);
    }

    RED.nodes.registerType("fibaroSensor", FibaroSensor);
}