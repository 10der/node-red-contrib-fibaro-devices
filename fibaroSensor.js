module.exports = function (RED) {
    function FibaroSensor(n) {
        RED.nodes.createNode(this, n);
        this.server = n.server;
        this.serverConfig = RED.nodes.getNode(this.server);
        var node = this;
        var fibaro = this.serverConfig.client;

        fibaro.on('event', function (msg) {
            if (MyMessage(msg, n.deviceID)) {
                // console.debug(msg);                
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
    }

    function MyMessage(msg, deviceID) {
        return (msg.topic.split("/").reverse()[0] == deviceID);
    }

    RED.nodes.registerType("fibaroSensor", FibaroSensor);
}