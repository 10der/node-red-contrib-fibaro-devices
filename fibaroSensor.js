module.exports = function (RED) {
    function FibaroSensor(n) {
        RED.nodes.createNode(this, n);
        this.deviceID = n.deviceID;
        var serverConfig = RED.nodes.getNode(n.server);
        var fibaro = serverConfig.client;
        var node = this;

        node.status({});

        if (serverConfig) {
            if (!fibaro.validateConfig(serverConfig, node)) {
                node.error("Node has invalid configuration");
                return
            }
        }

        this.on("close", function() {
            fibaro.emit('done', n.id);
        });

        node.on('event', function (msg) {
            if (MyMessage(msg, n.deviceID)) {
                
                node.status({ fill: 'yellow', shape: 'ring', text: 'event' });
                setTimeout(() => {
                    node.status({});
                }, 1000);

                var event = {};
                event.topic = msg.topic;
                event.payload = msg.payload;
                try { event.payload = JSON.parse(event.payload); } // obj
                catch (e) {/* */ }
                if (typeof event.payload === 'object') {
                    node.send([null, event]);
                } else {
                    node.send([event, null]);
                }
            }
        });

        // register device
        fibaro.emit('init', n.id, n.deviceID);
    }

    function MyMessage(msg, deviceID) {
        return (msg.topic.split("/").reverse()[0] == deviceID);
    }

    RED.nodes.registerType("fibaroSensor", FibaroSensor);
}