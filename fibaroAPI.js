"use strict"

var events = require('events');
var util = require('util');
var request = require('request');

var FibaroAPI = function (ipaddress, login, password) {
    this.ipaddress = ipaddress;
    this.login = login;
    this.password = password;
    //...........
    this.lastPoll = 0;
    this.nodes = [];
    events.EventEmitter.call(this);
}

util.inherits(FibaroAPI, events.EventEmitter);

FibaroAPI.prototype.validateConfig = function validateConfig() {
    if (this.login && this.login !== undefined) {
        // all OK
    } else {
        return false;
    }

    if (this.password && this.password !== undefined) {
        // all OK
    } else {
        return false;
    }

    const hasIpAddress = this.ipaddress !== undefined && this.ipaddress !== null && this.ipaddress.trim().length > 5;
    if (!hasIpAddress) {
        return false;
    }
    return true;
}

FibaroAPI.prototype.sendRequest = function sendRequest(query, callback, error) {
    var _api = this;

    if (!_api.validateConfig()) {
        if (error) error({ text: "HC API configuration is empty" });
        return
    }

    const host = this.ipaddress;
    const user = this.login;
    const pass = this.password;
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
                error({ code: statusCode, text: response.statusMessage });
            }
        }
    });
}

FibaroAPI.prototype.fibaroInit = function fibaroInit(callback, error) {
    var _api = this;

    _api.sendRequest('/settings/info',
        (data) => {
            try {
                var info = JSON.parse(data);
                if (callback) {
                    callback(info);
                }
            } catch (e) {
                if (error) error(e);
            }
        }, (e) => { if (error) error(e); });
}

FibaroAPI.prototype.init = function init() {
    var _api = this;
    _api.fibaroInit(() => {
        _api.emit('connected', {});
    }, (e) => {
        _api.emit('error', { text: "HC intialization failed", error: e });
        this.configNode = null;
    })
}

FibaroAPI.prototype.addDevice = function addDevice(nodeId, deviceID) {
    this.nodes.push({ nodeId: nodeId, deviceID: deviceID, initialized: false });
}

FibaroAPI.prototype.removeDevice = function removeDevice(nodeId) {
    this.nodes = this.nodes.filter(item => item.nodeId !== nodeId)
}

FibaroAPI.prototype.poll = function poll() {
    var _api = this;

    if (!_api.validateConfig()) {
        _api.emit('error', { text: 'config node is not configured' });
        return
    }

    _api.sendRequest(`/refreshStates?last=${this.lastPoll}`,
        (data) => {
            try {
                var updates = JSON.parse(data);
                if (updates.last != undefined)
                    this.lastPoll = updates.last;

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
    var _api = this;

    if (!_api.validateConfig()) {
        // HC is not configured
        return
    }

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

FibaroAPI.prototype.queryDeviceHistory = function queryDeviceHistory(deviceID, query, callback, error) {
    var _api = this;
    var path = `/panels/event?deviceID=${deviceID}&${query}`;
    _api.sendRequest(path,
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
            if (error) error(e); else console.debug(e);
        });
}

FibaroAPI.prototype.queryDevices = function queryDevices(query, callback, error) {
    var _api = this;
    // /api/devices/?visible=true&enabled=true&interface=light&property=[isLight,true]
    var path = `/devices/?${query}`;
    _api.sendRequest(path,
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
            if (error) error(e); else console.debug(e);
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
            if (error) error(e); else console.debug(e);
        });
}

// FibaroAPI.prototype.getRoomByDeviceID = function getRoomByDeviceID(deviceID) {
//     const device = this.devices.find(o => o.id == deviceID);
//     if (device) {
//         return device.roomID;
//     }
//     return 0;
// }

module.exports = FibaroAPI;