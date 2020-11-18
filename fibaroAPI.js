"use strict"

var events = require('events');
var util = require('util');
//var request = require('request');
const fetch = require('node-fetch');

// var ev = new events.EventEmitter();
// ev.setMaxListeners(0);

var FibaroAPI = function (ipaddress, login, password) {
    this.ipaddress = ipaddress;
    this.login = login;
    this.password = password;
    //...........
    this.lastPoll = 0;
    this.nodes = [];
    this.globals = [];
    this.states = {};
    this.rooms = [];
    this.devices = [];
    this.isReady = false;

    events.EventEmitter.call(this);
    this.setMaxListeners(0);
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

FibaroAPI.prototype.addDevice = function addDevice(nodeId, deviceID) {
    this.nodes.push({ nodeId: nodeId, deviceID: String(deviceID), initialized: false });
    var _api = this;
    _api.emit('nodeAdded', { nodeId, deviceID });
}

FibaroAPI.prototype.removeDevice = function removeDevice(nodeId) {
    this.nodes = this.nodes.filter(item => item.nodeId !== nodeId)
}

FibaroAPI.prototype.createRequest = function createRequest(query) {

    const host = this.ipaddress;
    const user = this.login;
    const pass = this.password;
    // ................................................
    const url = `http://${host}/api${query}`;

    function make_base_auth(user, pass) {
        var tok = user + ':' + pass;
        const hash = Buffer.from(tok).toString('base64');
        return hash;
    }

    const request = {
        url: url,
        options: {
            method: 'GET',
            // timeout: 5000,
            headers: {
                'Content-Type': 'application/json',
                "Authorization": "Basic " + make_base_auth(user, pass),
                "Accept": 'application/json, text/plain;q=0.9, */*;q=0.8'
            }
        }
    };

    return request;
}

FibaroAPI.prototype.sendRequest = function sendRequest(query, callback, error) {
    var _api = this;

    if (!_api.validateConfig()) {
        if (error) error({ text: "HC API configuration is empty" });
        return
    }

    function checkStatus(res) {
        if (res.ok) { // res.status >= 200 && res.status < 300
            return res;
        } else {
            throw new FibaroError({ code: res.status, text: res.statusText });
        }
    }

    const request = this.createRequest(query);

    const options = request.options;
    fetch(request.url, options)
        .then(checkStatus)
        .then(res => res.json())
        .then(json =>
            callback(json)
        )
        .catch(err => {
            console.debug(err, request);
            if (error)
                error({
                    code: err.code, text: "HTTP error"
                })
        });
}

FibaroAPI.prototype.sendRequestAsync = async function sendRequestAsync(query) {

    function checkStatus(res) {
        if (res.ok) { // res.status >= 200 && res.status < 300
            return res;
        } else {
            throw new FibaroError({ code: res.status, text: res.statusText });
        }
    }

    const request = this.createRequest(query);
    const options = request.options;

    return await fetch(request.url, options)
        .then(checkStatus)
        .then(res => res.json())
        .catch(err => {
            console.error({ code: err.code, text: "HTTP error" });
        });
}

FibaroAPI.prototype.fibaroInit = function fibaroInit(callback, error) {
    var _api = this;

    _api.sendRequest('/settings/info',
        (data) => {
            try {
                var info = data;
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
        _api.emit('failed', { text: "HC intialization failed", error: e });
    })
}

// if "direction: then from int to nickname
FibaroAPI.prototype.translateDeviceID = function translateDeviceID(deviceID, direction) {
    var _api = this;

    if (typeof deviceID === 'undefined' || deviceID === null) {
        return null;
    }

    if (direction) {
        if (!isNaN(deviceID)) {
            if (_api.devices.length === 0) {
                // not initialized yet!
                _api.emit('warn', { text: `HC node is not initialized!: ${deviceID}` });
                console.error('HC node is not initialized!');
                return null;
            }

            let device = this.devices.find(_ => _.id == deviceID);
            if (device) {
                let room = this.rooms.find(_ => _.id == device.roomID);
                if (room) {
                    return room.name + "/" + device.name;
                } else {
                    return device.name;
                }
            }
            _api.emit('warn', { text: `Cannot be translated to nickname: ${deviceID}` });
            console.error('Cannot be translated to nickname: ', deviceID);
            return null;
        } else {
            return deviceID;
        }
    } else {
        if (isNaN(deviceID)) {            
            if (_api.devices.length === 0) {
                // not initialized yet!
                // var fres = deviceID.split("/");
                // if (fres.length == 2) {
                //     _api.sendRequest("/devices/?name=" + encodeURIComponent(fres[1]),
                //     (data) => {
                //         if (data.length) {
                //             if (data.length != 1) {
                //                 return data[0].id;
                //             }
                //         }
                //     }, (e) => {
                //         console.debug(e);
                //     });
                // }
                _api.emit('warn', { text: `HC node is not initialized!: ${deviceID}` });
                console.error('HC node is not initialized!');
                return null;
            }
            // xlat
            var res = deviceID.split("/");
            if (res.length == 2) {
                // find room
                var room = this.rooms.find(_ => _.name == res[0]);
                if (room) {
                    // find dive by room
                    let devices = this.devices.filter(_ => _.name == res[1] && _.roomID == room.id && _.parentId != 1 && _.enabled && _.visible);
                    if (devices.length) {
                        if (devices.length != 1) {
                            _api.emit('warn', { text: `Device on/on ambiguities: ${deviceID}` });
                            console.error('Device on/on ambiguities: ', deviceID);
                            return null;
                        }
                        return devices[0].id;
                    }
                }
            } else if (res.length == 1) {
                // find by device name
                let devices = this.devices.filter(_ => _.name == res[0] && _.parentId != 1 && _.enabled && _.visible);
                if (devices.length) {
                    if (devices.length != 1) {
                        _api.emit('warn', { text: `Device on/on ambiguities: ${deviceID}` });
                        console.error('Device on/on ambiguities: ', deviceID);
                        return null;
                    }
                    return devices[0].id;
                }
            }
            // error
            _api.emit('warn', { text: `Cannot be translated to DeviceID: ${deviceID}` });
            console.error('Cannot be translated to DeviceID: ', deviceID);
            return null;
        } else {
            return deviceID;
        }
    }
}

FibaroAPI.prototype.pollDevices = function pollDevices() {
    var _api = this;

    if (!_api.validateConfig()) {
        _api.emit('error', { text: 'config node is not configured' });
        return
    }

    _api.sendRequest(`/refreshStates?last=${this.lastPoll}`,
        (data) => {
            try {
                var updates = data;
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
                            // console.debug(event);
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

FibaroAPI.prototype.pollGlobals = function pollGlobals() {
    var _api = this;

    if (!_api.validateConfig()) {
        _api.emit('error', { text: 'config node is not configured' });
        return
    }

    _api.sendRequest(`/globalVariables`,
        (data) => {
            try {
                var globals = data;
                globals.forEach((obj) => {
                    const old = this.globals.find(o => o.name === obj.name);
                    if (old === undefined || old === null) {
                        let event = {};
                        event.topic = "GlobalVariableUpdatedEvent";
                        event.payload = obj;
                        _api.emit('events', event);
                    } else {
                        if (old.value !== obj.value) {
                            let event = {};
                            event.topic = "GlobalVariableUpdatedEvent";
                            event.payload = obj;
                            _api.emit('events', event);
                        }
                    }
                });
                this.globals = globals;
            } catch (e) {
                _api.emit('error', { text: `error: ${e}` });
            }
        },
        (error) => {
            _api.emit('error', { text: `poll globalVariables data error: ${error.code}`, error: error });
        });
}

FibaroAPI.prototype.poll = function poll(onlyGlobals) {
    var _api = this;
    if (onlyGlobals)   {
        _api.pollGlobals();
        return;
    }
    _api.pollDevices();
    _api.pollGlobals();
}

FibaroAPI.prototype.callAPI = function callAPI(methodName, args, callback) {
    var _api = this;

    if (!_api.validateConfig()) {
        // HC is not configured
        return
    }

    // Object.keys(args).forEach(function (key) {
    // });


    try {
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
                if (callback) {
                    callback(msg);
                } else {
                    _api.emit('data', msg);
                    // console.debug(msg);
                }
            },
            (error) => {
                _api.emit('error', { text: `error: ${error}`, error: error });
            });
    } catch (error) {
        console.debug(methodName, args, error);
    }
}

FibaroAPI.prototype.queryDeviceHistory = function queryDeviceHistory(deviceID, query, callback, error) {
    var _api = this;

    if (isNaN(deviceID)) {
        deviceID = _api.translateDeviceID(deviceID);
    }

    var path = `/panels/event?deviceID=${deviceID}&${query}`;
    _api.sendRequest(path,
        (data) => {
            var payload = data;
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
            var payload = data;
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

FibaroAPI.prototype.queryStateAsync = async function queryStateAsync(deviceID, property) {
    var _api = this;
    if (isNaN(deviceID)) {
        deviceID = _api.translateDeviceID(deviceID);
    }
    return await _api.sendRequestAsync(`/devices/${deviceID}/properties/${property}`)
}

FibaroAPI.prototype.queryState = function queryState(deviceID, property, callback, error) {
    var _api = this;

    if (isNaN(deviceID)) {
        deviceID = _api.translateDeviceID(deviceID);
    }

    // /api/devices/969/properties/value
    _api.sendRequest(`/devices/${deviceID}/properties/${property}`,
        (data) => {
            var payload = data;
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

class FibaroError extends Error {
    constructor(error) {
        super(error.toString());
        this.code = error.code;
        this.text = error.text;
    }
}

module.exports = FibaroAPI;