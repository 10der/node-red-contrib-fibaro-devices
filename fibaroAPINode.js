module.exports = function (RED) {
    function FibaroAPINode(config) {
        RED.nodes.createNode(this, config);

        var server = config.server;
        var serverConfig = RED.nodes.getNode(server);
        var fibaro = serverConfig.client;
        var node = this;
        var initialization = true;

        node.status({});

        if (serverConfig) {
            if (!serverConfig.validateConfig(node)) {
                node.configured = false;
                node.error("Node has invalid configuration");
                return
            }
        } else {
            node.error("Node configuration is not found!");
            return
        }

        var sendEvent = function (deviceID, event) {
            // console.debug(fibaro.nodes);
            var items = fibaro.nodes.filter(o => o.deviceID === String(deviceID));
            items.forEach(item => {
                var node = RED.nodes.getNode(item.nodeId);
                if (node) {
                    node.emit('event', event);
                }
            });
        }

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
            if (node.configured && error.code == 401) node.configured = false;
            node.status({ fill: 'red', shape: 'ring', text: `error: ${error.text}` });
            node.error(error);
        });

        fibaro.on('done', function (nodeId) {
            //  console.debug(`core asking to remove ${nodeId} node`);
            fibaro.removeDevice(nodeId);
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
                    // console.debug(event);
                    sendEvent(payload.id, event);
                }
            }
            else if (topic == "CentralSceneEvent") {
                let event = {};
                event.topic = `${payload.deviceId}`;
                delete payload.deviceId;
                event.payload = { property: topic, value: payload };
                // console.debug(event);
                sendEvent(payload.deviceId, event);
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
                // node.status({ fill: "red", shape: "dot", text: "Node is not configured" });
                return
            }

            if ((msg.payload) && (msg.payload.constructor === Object)) {
                if (msg.topic && pollerPeriod == 0) {
                    // MQTT
                    msg.topic = msg.payload.type;
                    msg.payload = msg.payload.data;
                    fibaro.emit('events', msg);
                    // console.debug(msg);
                } else {
                    // call API
                    node.status({ fill: "blue", shape: "dot", text: "API..." });
                    fibaro.callAPI(msg.topic, msg.payload);
                }
            }

            if (parseInt(msg.payload) === 0) {
                node.status({ fill: 'yellow', shape: 'ring', text: 'force re-init mode' });
                initialization = true;
            }
        });

        var poll = function (init) {
            if (!node.configured) {
                // node.status({ fill: "red", shape: "dot", text: "Node is not configured" });
                return
            }

            var notInitialized = fibaro.nodes.filter(o => !o.initialized);
            notInitialized.forEach(item => {
                // console.debug(`init node: ${item.nodeId} with device: ${item.deviceID}`);
                var node = RED.nodes.getNode(item.nodeId);
                if (node) {
                    fibaro.queryState(item.deviceID, 'value', (currentState) => {
                        let event = {};
                        event.topic = `${item.deviceID}`;
                        event.payload = currentState.value;
                        node.emit('event', event);
                        // console.debug(`node: ${item.nodeId} with device: ${item.deviceID} initialized`);
                    }, (error) => console.debug(error));
                    item.initialized = true;
                } else {
                    console.debug(`node not found: ${item.nodeId}`);
                }
            });

            // just call poll for a new events
            fibaro.poll(init);
        }

        // init Fibaro API
        node.configured = false;
        node.status({});
        fibaro.init();

        if (pollerPeriod != 0) {
            if (this.poller) { clearTimeout(this.poller); }
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