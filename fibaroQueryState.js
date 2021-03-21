const BaseNode = require('./fibaroBaseNode.js');

module.exports = function (RED) {

    class FibaroQueryState extends BaseNode {
        constructor(n) {
            super(n, RED);
            this.resultToPayload = n.resultToPayload;
        }

        // get prop with name value
        // msg.topic = 123; msg.property = "value";

        // get history
        // msg.topic = 123; msg.events = "from=505952000&to=1508579311;
        // msg.topic = 123; msg.events = "last=10&type=id";

        // query devices
        // msg.topic = "visible=true&enabled=true&interface=light&property=[isLight,true]";
        onInput(msg) {
            var deviceID = this.deviceID;
            if (this.deviceID == 0) {
                deviceID = String(msg.topic);
            }

            if (msg.events) {
                let orgDeviceID = this.fibaro.translateDeviceID(deviceID);
                if (orgDeviceID) deviceID = orgDeviceID;

                this.fibaro.queryDeviceHistory(deviceID, msg.events, (result) => {
                    msg.currentState = result;
                    if (this.resultToPayload) {
                        msg.payload = result;
                    }
                    this.node.send(msg);
                    this.node.status({});
                }, (error) => this.node.status({ fill: "red", shape: "dot", text: error.text }));
            } else if (msg.api) {
                this.fibaro.callAPI(msg.topic, {}, (msg) => {
                    this.node.send(msg);
                    this.node.status({});
                });
            } else if (deviceID.includes("=")) {
                this.fibaro.queryDevices(deviceID, (currentState) => {
                    msg.currentState = currentState;
                    if (this.resultToPayload) {
                        msg.payload = currentState;
                    }
                    this.node.send(msg);
                    this.node.status({});
                }, (error) => this.node.status({ fill: "red", shape: "dot", text: error.text }));
            } else {
                let orgDeviceID = this.fibaro.translateDeviceID(deviceID);
                if (orgDeviceID) deviceID = orgDeviceID;

                var property = msg.property || 'value';
                this.fibaro.queryState(deviceID, property, (currentState) => {
                    msg.currentState = currentState;
                    //if (property == "value") {
                        if (this.resultToPayload) {
                            msg.payload = currentState.value;
                        }
                    //}
                    this.node.send(msg);
                    this.node.status({});
                }, (error) => this.node.status({ fill: "red", shape: "dot", text: error.text }));
            }
        }
    }

    RED.nodes.registerType("fibaroQuery", FibaroQueryState);
}