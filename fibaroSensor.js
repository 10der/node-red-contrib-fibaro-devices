const BaseNode = require('./fibaroBaseNode.js');

module.exports = function (RED) {
    class FibaroSensor extends BaseNode {
        constructor(n) {
            super(n, RED);
            this.events = n.events;
        }

        onEvent(msg) {
            if (this.initialized) {
                if (msg.init) {
                    // do NOT!
                    return;
                }
            } else {
                this.initialized = true;
            }
            var event = {};
            event.topic = String(this.deviceID);
            if (this.deviceID == 0) {
                event.topic = String(msg.topic);
            }
            event.payload = msg.payload;
            try { event.payload = JSON.parse(event.payload); } // obj
            catch (e) {/* */ }
            if (typeof event.payload === 'object') {
                // nothing todo
            } else {
                let value = event.payload;
                this.node.send([event, null]);
                this.node.status({ fill: 'green', shape: 'ring', text: `${value}` });
            }
        }
    }

    RED.nodes.registerType("fibaroSensor", FibaroSensor);
}