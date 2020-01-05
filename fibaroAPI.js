"use strict"

var events = require('events');
var util = require('util');
var request = require('request');

var FibaroAPI = function () {
    this.lastPoll = 1;
    this.configNode = null;

    // custom parameters
    this.output_topic = "";
    this.roomMode = false;
    this.globals_topic = "";
    this.rooms = [];
    this.devices = [];

    events.EventEmitter.call(this);
}

util.inherits(FibaroAPI, events.EventEmitter);

FibaroAPI.prototype.init = function init(HCNode, config) {
    var _api = this;

    if (_api.validateConfig(HCNode)) {
        _api.emit('connected', {});
        this.configNode = HCNode;
        // console.debug(configNode);
    } else {
        // error
        this.configNode = null;
    }

    if (config) {
        this.output_topic = config.output_topic || this.output_topic;
        this.roomMode = config.room_mode || this.roomMode;
        this.globals_topic = config.globals_topic || this.globals_topic;
    }
}

FibaroAPI.prototype.poll = function poll(init) {
    var _api = this;

    if (!this.configNode) {
        _api.emit('error', { text: 'config node is not configured' });
        return
    }

    if (this.roomMode) {
        if (this.devices.length == 0) {
            _api.sendRequest(this.configNode, '/devices',
                (data) => {
                    try {
                        this.devices = JSON.parse(data);
                    } catch (e) {
                        console.debug(e);
                    }
                }, (error) => { console.debug(error) });
            return;
        }

        if (this.rooms.length == 0) {
            _api.sendRequest(this.configNode, '/rooms',
                (data) => {
                    try {
                        this.rooms = JSON.parse(data);
                    } catch (e) {
                        console.debug(e);
                    }
                }, (error) => { console.debug(error) });
            return;
        }
    }

    if (init) this.lastPoll = 1;
    _api.sendRequest(this.configNode, `/refreshStates?last=${this.lastPoll}`,
        (data) => {
            try {
                var updates = JSON.parse(data);
                var calledLastPoll = this.lastPoll;
                if (updates.last != undefined)
                    this.lastPoll = updates.last;

                if (calledLastPoll == 1) {
                    // initial changes
                    if (updates.changes != undefined) {
                        updates.changes.map((change) => {
                            // console.debug(change);
                            var event = {};
                            change.roomID = this.roomMode ? _api.getRoomByDeviceID(change.id) : 0;
                            event.topic = `${this.output_topic}/${this.roomMode ? `${change.roomID}/` : ''}${change.id}`;
                            if (change.value != undefined) {
                                event.payload = change.value;
                            } else if (change.log != undefined) {
                                // stop SPAMMING
                                event = null;
                            } else {
                                delete change.id;
                                event.payload = change;
                            }

                            // do it
                            if (event) {
                                try {
                                    // console.debug(event);
                                    _api.emit('event', event);
                                } catch (e) {
                                    console.debug(e);
                                }
                            }
                        });
                    }
                    return
                }

                // events
                if (updates.events != undefined) {
                    updates.events.map((s) => {
                        if (s.data.property) {
                            // console.debug(s);
                            var event = {};
                            s.data.roomID = this.roomMode ? _api.getRoomByDeviceID(s.data.id) : 0;
                            event.topic = `${this.output_topic}/${this.roomMode ? `${s.data.roomID}/` : ''}${s.data.id}`;
                            if (s.data.property == "value") {
                                event.payload = s.data.newValue;
                            } else {
                                event.payload = { property: s.data.property, value: s.data.newValue };
                            }
                            // do it

                            if (s.data.id == 725) {
                                // console.debug(">", event); 
                            }

                            try {
                                _api.emit('event', event);
                            } catch (e) {
                                console.debug(e);
                            }
                        } else {
                            // console.debug(s);
                        }
                    });
                }
            } catch (e) {
                _api.emit('error', { text: `error: ${e}` });
            }
        },
        (error) => {
            _api.emit('error', { text: `poll devices data error: ${error.code}`, error: error });
        });
}

FibaroAPI.prototype.callAPI = function callAPI(methodName, args) {
    var _api = this;
    let q = new URLSearchParams(args).toString();
    var url = "/" + methodName;
    if (q) {
        url = url + "?" + q;
    }
    // console.debug(url);
    _api.sendRequest(this.configNode, url,
        (data) => {
            var msg = {};
            msg.topic = url;
            msg.payload = data;
            _api.emit('data', msg);
            // console.debug(msg);
        },
        (error) => {
            _api.emit('error', { text: `error: ${error}`, error: error });
        });
}

FibaroAPI.prototype.validateConfig = function validateConfig(configNode) {
    var _api = this;
    if (configNode === undefined || configNode === null) {
        _api.emit('error', { text: 'please select a config node' });
        return false;
    }

    if (configNode.credentials) {
        // all OK
    } else {
        _api.emit('error', { text: 'missing valid credentials in config node' });
        return false;
    }

    if (configNode.credentials && configNode.credentials.login) {
        // all OK
    } else {
        _api.emit('error', { text: 'missing login in config node' });
        return false;
    }

    if (configNode.credentials && configNode.credentials.password) {
        // all OK
    } else {
        _api.emit('error', { text: 'missing password in config node' });
        return false;
    }

    const hasIpAddress = configNode.ipaddress !== undefined && configNode.ipaddress !== null && configNode.ipaddress.trim().length > 5;
    if (!hasIpAddress) {
        _api.emit('error', { text: 'missing IP Address in config node' });
        return false;
    }

    return true;
}

FibaroAPI.prototype.queryState = function queryState(deviceID, property, callback) {
    var _api = this;
    // /api/devices/969/properties/value
    _api.sendRequest(this.configNode, `/devices/${deviceID}/properties/${property}`,
        (data) => {
            var payload = JSON.parse(data);
            try {
                if (callback) {
                    callback(payload);
                } else {
                    var event = {};
                    var roomID = this.roomMode ? _api.getRoomByDeviceID(deviceID) : 0;
                    event.topic = `${this.output_topic}/${this.roomMode ? `${roomID}/` : ''}${deviceID}`;
                    event.payload = payload;
                    _api.emit('query', event);
                }
            } catch (e) {
                console.debug(e);
            }
        }, (error) => { console.debug(error) });
}

FibaroAPI.prototype.getRoomByDeviceID = function getRoomByDeviceID(deviceID) {
    const device = this.devices.find(o => o.id == deviceID);
    if (device) {
        return device.roomID;
    }
    return 0;
}

FibaroAPI.prototype.sendRequest = function sendRequest(config, query, callback, error) {
    const host = config.ipaddress;
    const user = config.login;
    const pass = config.password;
    // ................................................
    const url = `http://${host}/api${query}`;
    const opts = {
        method: 'GET',
        url,
        headers: {}
    };

    opts.auth = {
        user,
        pass,
        sendImmediately: false,
    };

    opts.headers.accept = 'application/json, text/plain;q=0.9, */*;q=0.8';
    //console.debug(opts);
    request(opts, (err, response, data) => {
        if (err) {
            error(err);
        } else {
            const { statusCode } = response;
            if (statusCode === 200 || statusCode === 201 || statusCode === 202) {
                callback(data);
            } else {
                error({ code: statusCode });
            }
        }
    });
}

module.exports = FibaroAPI;