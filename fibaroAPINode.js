module.exports = function (RED) {
    function FibaroAPINode(config) {
        RED.nodes.createNode(this, config);

        this.server = config.server;
        this.serverConfig = RED.nodes.getNode(this.server);
        var fibaro = this.serverConfig.client;
        var node = this;
        var initialization = true;

        config.output_topic = config.output_topic || "home/status";
        config.room_mode = config.room_mode || false;
        config.globals_topic = config.globals_topic || "home/globalVariables";

        const defaultPollerPeriod = 1;
        let pollerPeriod = config.pollingInterval ? parseInt(config.pollingInterval) : defaultPollerPeriod;
        if (isNaN(pollerPeriod) || pollerPeriod < 0 || pollerPeriod > 10) {
            pollerPeriod = defaultPollerPeriod;
        }

        // Fibaro API evensts
        fibaro.on('connected', function () {
            node.configured = true;
            node.status({ fill: "green", shape: "dot", text: "inited" });
        });

        fibaro.on('error', function (error) {
            node.configured = (error.code != 401);
            node.status({ fill: 'red', shape: 'ring', text: `error: ${error.text}` });
        });

        // handle all events. just ONLY for user purposes via MQTT! (output #1)
        fibaro.on('event', function (msg) {
            node.status({ fill: "green", shape: "dot", text: "OK" });
            setTimeout(() => {
                node.status({});
            }, 2000);
            node.send(msg);
        });

        // custom response data (output #2)
        fibaro.on('data', function (msg) {
            node.status({ fill: "green", shape: "dot", text: "OK" });
            setTimeout(() => {
                node.status({});
            }, 1000);
            //console.debug(msg);            
            node.send([null, msg]);
        });

        // node control
        node.on('input', function (msg) {
            if (!node.configured) {
                node.status({ fill: "red", shape: "dot", text: "NOT CONFIGURED!" });
                return
            }

            if ((msg.payload) && (msg.payload.constructor === Object)) {
                // call API
                node.status({ fill: "blue", shape: "dot", text: "API..." });
                fibaro.callAPI(msg.topic, msg.payload);
            }

            if (parseInt(msg.payload) === 0) {
                node.status({ fill: 'yellow', shape: 'ring', text: 'force re-init mode' });
                initialization = true;
            }
        });

        var poll = function () {
            if (!node.configured) {
                node.status({ fill: "red", shape: "dot", text: "NOT CONFIGURED!" });
                return
            }
            fibaro.poll();
        }

        // init Fibaro API
        node.configured = false;
        node.status({});
        fibaro.init(this.serverConfig, config);

        if (pollerPeriod != 0) {
            this.poller = setInterval(function () { poll(initialization); initialization = false; }, pollerPeriod * 1000);
        }
        this.on("close", function () {
            if (this.poller) { clearTimeout(this.poller); }
        });
    }
    RED.nodes.registerType("fibaroAPI", FibaroAPINode);
}