const BaseNode = require('./fibaroBaseNode.js');

module.exports = function (RED) {
    class FibaroSensor extends BaseNode {
        constructor(n) {
            super(n, RED);
            this.events = n.events;
        }

        onEvent(msg) {
            var event = {};
            event.topic = String(this.deviceID);
            if (this.deviceID == 0) {
                event.topic = String(msg.topic);
            }
            event.payload = msg.payload;
            try { event.payload = JSON.parse(event.payload); } // obj
            catch (e) {/* */ }
            if (typeof event.payload === 'object') {
                this.node.status({ fill: 'yellow', shape: 'ring', text: 'event' });
            } else {
                let value = event.payload;
                this.node.send([event, null]);
                setTimeout(() => {
                    this.node.status({ fill: 'green', shape: 'ring', text: `${value}` });
                }, 1000);
            }
        }
    }

    RED.nodes.registerType("fibaroSensor", FibaroSensor);
}