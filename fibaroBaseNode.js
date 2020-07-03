class BaseNode {
    constructor(nodeDefinition, RED, options = {}) {
        RED.nodes.createNode(this, nodeDefinition);
        this.serverConfig = RED.nodes.getNode(nodeDefinition.server);
        this.node = this;        
        this.RED = RED;
        
        if (nodeDefinition.deviceID === undefined || nodeDefinition.deviceID === null) nodeDefinition.deviceID = "";
        this.deviceID = nodeDefinition.deviceID.trim();
        if (this.deviceID === "") {
            this.deviceID = "0";
        }
        if (options) {
            // TODO
        }
        this.node.status({});        

        var node = this;
        node.running = false;
        if (typeof this.serverConfig === "object") {
            var startup = function () {
                node.fibaro = node.serverConfig.client;
                var doit = function () {
                    node.running = true;
                    node.on('input', function(msg) {
                        if (node.fibaro.isReady) {
                            node.onInput(msg);
                        }
                    });
                    node.on('event', function(msg) {
                        if (node.fibaro.isReady) {
                            node.onEvent(msg);
                        }
                    });
                    // register device
                    if (node.deviceID != 0) {
                        node.fibaro.addDevice(node.id, node.deviceID);
                    }
                }
                if (node.fibaro.isReady) { doit(); }
                else { /* this.fibaro.once("ready", function () { doit(); }); */ }
                setTimeout(function () { if (node.running === false) { startup(); } }, 4500);
            }
            startup();
        }

        this.node.on('close', function() {
            this.node.running = false;
        });        
    }
    onInput() {}
    onEvent() {}
}

module.exports = BaseNode;