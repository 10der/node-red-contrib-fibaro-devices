const BaseNode = require('./fibaroBaseNode.js');

module.exports = function (RED) {
    class fibaroCustomActor extends BaseNode {
        constructor(n) {
            super(n, RED);
            this.events = n.events;
            this.customActions = n.payload ? JSON.parse(n.payload) : {};
            this.customProperties = n.payload ? JSON.parse(n.properties) : {};
        }

        onInit() {
        }

        onEvent(msg) {
            if (this.events) {
                var event = {};
                event.topic = String(this.deviceID);
                if (this.deviceID == 0) {
                    event.topic = String(msg.topic);
                }
                event.payload = msg.payload;
                try { event.payload = JSON.parse(msg.payload); } // obj
                catch (e) {/* */ }
                event.passthrough = true; // mark message
                if (typeof event.payload === 'object') {
                    this.node.send([null, event]);
                } else {
                    this.node.send([event, null]);
                }
                this.node.status({ fill: 'gray', shape: 'ring', text: `${event.payload}` });
            }
        }

        onInput(msg) {
            var deviceID = this.deviceID;
            if (this.deviceID == 0) {
                deviceID = String(msg.topic);
            }

            var orgDeviceID = this.fibaro.translateDeviceID(deviceID);
            if (orgDeviceID) deviceID = orgDeviceID;

            var payload = msg.payload;
            try {
                payload = JSON.parse(payload);
            } catch (e) {
                // Ignore malformed
            }

            if (typeof payload === 'object') {
                // customAction from payload
                // console.debug(payload);
                payload.deviceID = deviceID;
                this.fibaro.callAPI("callAction", payload);
            } else if (typeof payload === 'string') {
                // custom action by name
                if (this.customActions) {
                    var command = this.customActions[payload];
                    if (command) {
                        command.deviceID = deviceID;
                        // console.debug(command);
                        this.fibaro.callAPI("callAction", command);
                    } else {
                        console.debug("unknown action", payload);
                    }
                } else {
                    // unknown action
                    console.debug("no actions");
                }
            } else {
                // error action
                console.debug("error action!");
            }
        }
    }

    RED.nodes.registerType("fibaroXActor", fibaroCustomActor);
}