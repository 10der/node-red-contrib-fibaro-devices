module.exports = function (RED) {
    function FibaroAPINode(config) {
        RED.nodes.createNode(this, config);

        this.server = config.server;
        this.serverConfig = RED.nodes.getNode(this.server);
        var fibaro = this.serverConfig.client;
        var node = this;
        var initialization = true;

        const defaultPollerPeriod = 1;
        let pollerPeriod = config.pollingInterval ? parseInt(config.pollingInterval) : defaultPollerPeriod;
        if (isNaN(pollerPeriod) || pollerPeriod < 0 || pollerPeriod > 10) {
            pollerPeriod = defaultPollerPeriod;
        }

        // Fibaro API evensts
        fibaro.on('connected', function () {
            node.configured = true;
            node.status({ fill: "green", shape: "dot", text: "connected" });
        });

        fibaro.on('error', function (error) {
            node.configured = (error.code != 401);
            node.status({ fill: 'red', shape: 'ring', text: `error: ${error.text}` });
        });

        // handle all events. just ONLY for user purposes via MQTT! (output #1)
        fibaro.on('events', function (msg) {
            node.status({ fill: "green", shape: "dot", text: "ready" });
            setTimeout(() => {
                node.status({});
            }, 2000);

            // internal post handling...
            var topic = msg.topic;
            var payload = msg.payload;
            try {
                payload = JSON.parse(payload);
            } catch (e) {
                // Ignore malformed
            }

            if (topic == "DevicePropertyUpdatedEvent") {
                if (payload.property) {
                    let event = {};
                    event.topic = `${payload.id}`;
                    if (payload.property == "value") {
                        event.payload = payload.newValue;
                    } else {
                        event.payload = { property: payload.property, value: payload.newValue };
                    }
                    fibaro.emit('event', event);
                }
            }
            else if (topic == "CentralSceneEvent") {
                let event = {};
                event.topic = `${payload.deviceId}`;
                delete payload.deviceId;
                event.payload = { property: topic, value: payload };
                // console.debug(event);
                fibaro.emit('event', event);
            }

            // var roomMode = config.room_mode || false;
            // let roomID = 0 ; //roomMode ? fibaro.getRoomByDeviceID(payload.id) : 0;

            // passthrough
            if (config.outputs > 0) {
                node.send(msg);
            }
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

        var poll = function (init) {
            if (!node.configured) {
                node.status({ fill: "red", shape: "dot", text: "NOT CONFIGURED!" });
                return
            }
            fibaro.poll(init);
        }

        // init Fibaro API
        node.configured = false;
        node.status({});
        fibaro.init(this.serverConfig);

        if (pollerPeriod != 0) {
            this.poller = setInterval(function () {
                poll(initialization);
                initialization = false;
            }, pollerPeriod * 1000);
        }
        this.on("close", function () {
            if (this.poller) { clearTimeout(this.poller); }
        });
    }
    RED.nodes.registerType("fibaroAPI", FibaroAPINode);
}