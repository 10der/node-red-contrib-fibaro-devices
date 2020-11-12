module.exports = function (RED) {
    function FibaroAPINode(config) {
        RED.nodes.createNode(this, config);

        var server = config.server;
        var serverConfig = RED.nodes.getNode(server);
        var fibaro = serverConfig.client;
        var node = this;
        var output_topic = "";
        var nicknames = config.nicknames;

        node.initialized = false;
        node.status({});

        if (serverConfig) {
            if (!serverConfig.validateConfig(node)) {
                node.error("Node has invalid configuration");
                return
            }
        } else {
            node.error("Node configuration is not found!");
            return
        }

        var sendEvent = function (deviceID, event) {
            var nicnameDeviceID = fibaro.translateDeviceID(deviceID, true);
            var items = fibaro.nodes.filter(o => String(o.deviceID) === String(deviceID) || String(o.deviceID) == nicnameDeviceID);
            items.forEach(item => {
                var node = RED.nodes.getNode(item.nodeId);
                if (node) {
                    node.emit('event', event);
                }
            });
        }

        const defaultPollerPeriod = 1;
        let pollerPeriod = config.pollingInterval ? parseInt(config.pollingInterval) : defaultPollerPeriod;
        let globalsPollerPeriod = config.globalsPollingInterval ? parseInt(config.globalsPollingInterval) : defaultPollerPeriod;
        if (isNaN(pollerPeriod) || pollerPeriod < 0 || pollerPeriod > 10) {
            pollerPeriod = defaultPollerPeriod;
        }
        if (isNaN(globalsPollerPeriod) || globalsPollerPeriod < 0 || globalsPollerPeriod > 10) {
            globalsPollerPeriod = defaultPollerPeriod;
        }

        // Fibaro API events
        fibaro.on('connected', function () {
            fibaro.sendRequest("/sections", function (sections) {
                node.send([null, { topic: "/sections", payload: sections }]);
                fibaro.sendRequest("/rooms", function (rooms) {
                    fibaro.rooms = rooms;
                    node.send([null, { topic: "/rooms", payload: rooms }]);
                    fibaro.sendRequest("/devices", function (devices) {
                        fibaro.devices = devices;
                        node.send([null, { topic: "/devices", payload: devices }]);
                        node.initialized = true;
                        fibaro.isReady = true;                        
                    }, (e) => node.error(e))
                }, (e) => node.error(e))
            }, (e) => node.error(e))
            node.status({ fill: "green", shape: "dot", text: "connected" });
        });

        fibaro.on('nodeAdded', function (item) {
            var target = RED.nodes.getNode(item.nodeId);
            if (target) {
                var orgDeviceID = fibaro.translateDeviceID(item.deviceID);
                fibaro.sendRequest("/devices/" + orgDeviceID,
                    (dev) => {
                        var currentState = dev.properties;
                        if (target.customProperties) {
                            var index;
                            for (index = 0; index < target.customProperties.length; ++index) {
                                var value = currentState[target.customProperties[index]];
                                let event = {};
                                event.topic = `${item.deviceID}`;
                                event.payload = {
                                    property: target.customProperties[index],
                                    value: value,        
                                };  
                                target.emit('event', event);

                                // passthrough
                                if (config.outputs > 0) {   
                                    let msg = {
                                        topic: "DevicePropertyUpdatedEvent",
                                        payload: {
                                            id: nicknames ? fibaro.translateDeviceID(orgDeviceID, true) : orgDeviceID,
                                            property: target.customProperties[index],
                                            oldValue: null, // statup
                                            newValue: value,
                                        }
                                    }
                                    node.send(msg);
                                }
                            }
                        }

                        if (typeof currentState.value !== 'undefined') {
                            let event = {};
                            event.topic = `${item.deviceID}`;
                            event.payload = currentState.value;
                            target.emit('event', event);

                            // passthrough
                            if (config.outputs > 0) {
                                let msg = {
                                    topic: "DevicePropertyUpdatedEvent",
                                    payload: {
                                        id: nicknames ? fibaro.translateDeviceID(orgDeviceID, true) : orgDeviceID,
                                        property: "value",
                                        oldValue: null, // statup
                                        newValue: currentState.value,
                                    }
                                }
                                node.send(msg);
                            }
                        }
                    },
                    (err) => {
                        console.debug(err);
                    });
            } else {
                console.debug(`node not found: ${item.nodeId}`);
            }
            //console.debug(nodeId)
            //console.debug(deviceID)
        });

        fibaro.on('failed', function (error) {
            node.initialized = false;
            node.status({ fill: 'red', shape: 'ring', text: `error: conection failed` });
            node.error(error);

            if (error.error.code == 401) {
                // fatal
                node.status({ fill: 'red', shape: 'ring', text: `error: conection fatal.` });
                return;
            }

            // trying to re-init again
            setTimeout(() => {
                node.status({ fill: 'yellow', shape: 'ring', text: 'force re-connection' });
                fibaro.init();
            }, 2000);
        });

        fibaro.on('warn', function (warn) {
            node.warn(warn.text);
        });

        fibaro.on('error', function (error) {
            if (node.initialized && error.error.code == 401) {
                node.initialized = false;
            }
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

            // console.debug(msg);

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

                    // // save state
                    // if (payload.property == "value") {
                    //     fibaro.states[event.topic] = { newValue: msg.payload.newValue, oldValue: msg.payload.oldValue };
                    // }
                }
            }
            else if (topic == "CentralSceneEvent") {
                let event = {};
                event.topic = `${payload.deviceId}`;
                event.payload = { property: topic, value: payload };
                // console.debug(event);
                sendEvent(event.topic, event);
            }   
            else if (topic == "GlobalVariableChangedEvent") {
                let event = {};
                event.topic = "GlobalVariableUpdatedEvent";
                event.payload = payload;
                sendEvent(event.topic, event);
            }

            // passthrough
            if (config.outputs > 0) {
                if (nicknames) {
                    if (topic == "DevicePropertyUpdatedEvent") {
                        let nicknameID = fibaro.translateDeviceID(msg.payload.id, true);
                        if (nicknameID) {
                            msg.payload.id = nicknameID;
                        }
                    }
                    if (topic == "CentralSceneEvent") {
                        let nicknameID = fibaro.translateDeviceID(msg.payload.id, true);
                        if (nicknameID) {
                            msg.payload.deviceId = nicknameID;
                        }
                    }
                }
                msg.topic = output_topic ? `${output_topic}/${msg.topic}` : msg.topic;
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
            if (!node.initialized) {
                return
            }

            // is mqtt message?
            if (msg.mqtt) {
                // parse evenets
                var updates = msg.payload;
                if (updates.events != undefined) {
                    updates.events.map((s) => {
                        if (s.type) {
                            let event = {};
                            event.topic = s.type;
                            event.payload = s.data;
                            fibaro.emit('events', event);
                        }
                    });
                }
            } else {
                // call API
                node.status({ fill: "blue", shape: "dot", text: "API..." });
                fibaro.callAPI(msg.topic, msg.payload);
            }

            if (parseInt(msg.payload) === 0) {
                // TODO
            }
        });

        var poll = function () {
            if (!node.initialized) {
                return;
            }
            // just call poll for a new events
            fibaro.pollDevices();
        };

        var globalPoll = function () {
            if (!node.initialized) {
                return;
            }
            fibaro.pollGlobals();
        };

        // init Fibaro connect
        node.status({ fill: 'yellow', shape: 'ring', text: 'connection...' });
        fibaro.init();

        if (this.poller) { clearTimeout(this.poller); }
        if (pollerPeriod != 0) {
            this.poller = setInterval(function () {
                poll();
            }, pollerPeriod * 1000);
        }
        if (this.globalPoller) { clearTimeout(this.globalPoller); }
        if (globalsPollerPeriod > 0) {
            this.globalPoller = setInterval(function () {
                globalPoll();
            }, globalsPollerPeriod * 1000);
        }

        this.on("close", function () {
            if (this.poller) { clearTimeout(this.poller); }
            if (this.globalPoller) { clearTimeout(this.globalPoller); }
            if (fibaro != null) {
                fibaro.removeAllListeners();
            }
        });
    }

    RED.nodes.registerType("fibaroAPI", FibaroAPINode);
}