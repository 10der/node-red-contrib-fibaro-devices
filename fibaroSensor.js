module.exports = function (RED) {
    function FibaroSensor(n) {
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

        this.on("close", function () {
            fibaro.emit('done', n.id);
        });

        node.on('event', function (msg) {
            if (MyMessage(msg, n.deviceID)) {

                node.status({ fill: 'yellow', shape: 'ring', text: 'event' });
                setTimeout(() => {
                    node.status({});
                }, 1000);

                var event = {};
                event.topic = String(msg.topic);
                event.payload = msg.payload;
                try { event.payload = JSON.parse(event.payload); } // obj
                catch (e) {/* */ }
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
        });

        // register device
        if (this.deviceID != 0) {
            fibaro.addDevice(n.id, n.deviceID);
        }
    }

    function MyMessage(msg, deviceID) {
        if ((String(msg.topic) == deviceID)) {
            // TODO
        }
        return true;
    }

    RED.nodes.registerType("fibaroSensor", FibaroSensor);
}