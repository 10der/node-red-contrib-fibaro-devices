const BaseNode = require('./fibaroBaseNode.js');

module.exports = function (RED) {
    class FibaroActor extends BaseNode {
        constructor(n) {
            super(n, RED);
            this.events = n.events;
        }

        onInput(msg) {
            // it's my own message
            if (msg.passthrough) return;

            var deviceID = this.deviceID;
            if (this.deviceID == 0) {
                deviceID = String(msg.topic);
            }

            var payload = msg.payload;
            try {
                payload = JSON.parse(payload);
            } catch (e) {
                // Ignore malformed
            }

            var orgDeviceID = this.fibaro.translateDeviceID(deviceID);
            if (orgDeviceID) deviceID = orgDeviceID;

            if (typeof payload == "boolean") {
                // binarySwitch
                var action = payload ? "turnOn" : "turnOff";
                this.fibaro.callAPI("callAction", { deviceID: deviceID, name: action });
            } else if (typeof msg.payload == "number") {
                // multiLevelSwitch
                this.fibaro.callAPI("callAction", { deviceID: deviceID, name: "setValue", arg1: payload });
            } else if (typeof payload === 'string') {
                // callAction name as string
                this.fibaro.callAPI("callAction", { deviceID: deviceID, name: payload });
            } else if (typeof payload === 'object') {
                payload.deviceID = deviceID
                this.fibaro.callAPI("callAction", payload);
            } else {
                // error action
                console.debug("error action!");
            }
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
            try { event.payload = JSON.parse(msg.payload); } // obj
            catch (e) {/* */ }
            if (this.events) {
                event.passthrough = true; // mark message
                if (typeof event.payload === 'object') {
                    this.node.send([null, event]);
                } else {
                    this.node.send([event, null]);
                }
            }

            if (typeof event.payload === 'object') {
            } else {
                this.node.status({ fill: 'gray', shape: 'ring', text: `${event.payload}` });
            }
        }
    }

    RED.nodes.registerType("fibaroActor", FibaroActor);
}