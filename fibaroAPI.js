"use strict"

var events = require('events');
var util = require('util');
var request = require('request');

var FibaroAPI = function () {
    this.lastPoll = 1;
    this.configNode = null;
    this.rooms = [];
    this.devices = [];
    events.EventEmitter.call(this);
}

util.inherits(FibaroAPI, events.EventEmitter);

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

FibaroAPI.prototype.sendRequest = function sendRequest(query, callback, error) {
    if (!this.configNode) {
        if (error) error({ text: "HC API configuration is empty" });
        return
    }

    const host = this.configNode.ipaddress;
    const user = this.configNode.login;
    const pass = this.configNode.password;
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
            // console.error(err);
            error(err);
        } else {
            const { statusCode } = response;
            if (statusCode === 200 || statusCode === 201 || statusCode === 202) {
                callback(data);
            } else {
                // console.error(response);
                error({ code: statusCode });
            }
        }
    });
}

FibaroAPI.prototype.fibaroInit = function fibaroInit(callback, error) {
    var _api = this;

    // getting rooms
    _api.sendRequest('/rooms',
        (data) => {
            try {
                this.rooms = JSON.parse(data);
                // getting devices
                _api.sendRequest('/devices',
                    (data) => {
                        try {
                            this.devices = JSON.parse(data);
                            if (callback) {
                                callback();
                            }
                        } catch (e) {
                            if (error) error(e);
                        }
                    }, (e) => { if (error) error(e); });
            } catch (e) {
                if (error) error(e);
            }
        }, (e) => { if (error) error(e); });
}

FibaroAPI.prototype.init = function init(HCNode) {
    var _api = this;

    if (_api.validateConfig(HCNode)) {
        this.configNode = HCNode;
        _api.fibaroInit(() => {
            _api.emit('connected', {});
        }, (e) => {
            _api.emit('error', { text: "HC intialization failed", error: e });
            this.configNode = null;
        })
    } else {
        // error
        this.configNode = null;
    }
}

FibaroAPI.prototype.poll = function poll(init) {
    var _api = this;

    if (!this.configNode) {
        _api.emit('error', { text: 'config node is not configured' });
        return
    }

    if (init) this.lastPoll = 1;
    _api.sendRequest(`/refreshStates?last=${this.lastPoll}`,
        (data) => {
            try {
                var updates = JSON.parse(data);
                var calledLastPoll = this.lastPoll;
                if (updates.last != undefined)
                    this.lastPoll = updates.last;

                if (updates.changes != undefined) {
                    // devices initialization...
                    if (calledLastPoll == 1) {
                        // console.debug("devices initialization...");
                        updates.changes.map((change) => {
                            // initial states
                            if (change.value) {
                                let event = {};
                                event.topic = "DevicePropertyUpdatedEvent";
                                event.payload = {
                                    id: change.id,
                                    property: "value",
                                    newValue: change.value,
                                    oldValue: null
                                };
                                _api.emit('events', event);
                            }
                        });
                        return
                    }
                }

                // events
                if (updates.events != undefined) {
                    updates.events.map((s) => {
                        if (s.type) {
                            let event = {};
                            event.topic = s.type;
                            event.payload = s.data;
                            _api.emit('events', event);
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
    if (!this.configNode) {
        // HC is not configured
        return
    }
    var _api = this;

    let q = new URLSearchParams(args).toString();
    var url = "/" + methodName;
    if (q) {
        url = url + "?" + q;
    }
    // console.debug(url);
    _api.sendRequest(url,
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

FibaroAPI.prototype.queryState = function queryState(deviceID, property, callback, error) {
    var _api = this;
    // /api/devices/969/properties/value
    _api.sendRequest(`/devices/${deviceID}/properties/${property}`,
        (data) => {
            var payload = JSON.parse(data);
            try {
                if (callback) {
                    callback(payload);
                }
            } catch (e) {
                if (error) error(e)
                console.debug(e);
            }
        }, (e) => {
            if (error) error(e)
        });
}

FibaroAPI.prototype.getRoomByDeviceID = function getRoomByDeviceID(deviceID) {
    const device = this.devices.find(o => o.id == deviceID);
    if (device) {
        return device.roomID;
    }
    return 0;
}

module.exports = FibaroAPI;