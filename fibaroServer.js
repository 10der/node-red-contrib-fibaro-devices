var FibaroAPI = require('./fibaroAPI.js');

module.exports = function (RED) {
  function FibaroServer(n) {
    RED.nodes.createNode(this, n);
    this.client = null;
    this.ipaddress = n.ipaddress;
    
    if (this.credentials) {
      this.client = new FibaroAPI(n.ipaddress, this.credentials.login, this.credentials.password);
    }

    var node = this;
    var fibaro = this.client;

    FibaroServer.prototype.validateConfig = function validateConfig(node) {

      if (this.credentials) {
        // all OK
      } else {
        let text = 'missing valid credentials in config node';
        if (node) {
          node.status({ fill: 'red', shape: 'ring', text: `error: ${text}` });
        }
        return false;
      }

      if (this.credentials && this.credentials.login && this.credentials.login !== undefined) {
        // all OK
      } else {
        let text = 'missing login in config node';
        if (node) {
          node.status({ fill: 'red', shape: 'ring', text: `error: ${text}` });
        }
        return false;
      }

      if (this.credentials && this.credentials.password && this.credentials.password !== undefined) {
        // all OK
      } else {
        let text = 'missing passeord in config node';
        if (node) {
          node.status({ fill: 'red', shape: 'ring', text: `error: ${text}` });
        }
        return false;
      }

      const hasIpAddress = this.ipaddress !== undefined && this.ipaddress !== null && this.ipaddress.trim().length > 5;
      if (!hasIpAddress) {
        let text = 'missing IP Address in config node';
        if (node) {
          node.status({ fill: 'red', shape: 'ring', text: `error: ${text}` });
        }
        return false;
      }

      return true;
    }

    // Build API
    RED.httpAdmin.get(`/${node.name}/:object`, (req, res) => {
      const { object } = req.params;
      if (object == 'devices') {
        let rooms = [];
        fibaro.sendRequest('/rooms',
          (data) => {
            try {
              rooms = data;
              fibaro.sendRequest('/devices',
                (data) => {
                  try {
                    let devices = data;
                    devices = devices.filter(device => (device.enabled && device.visible && device.parentId != 1));
                    devices = devices.map((item) => {
                      let roomName = 'undefined';
                      const room = rooms.find(o => o.id == item.roomID);
                      if (room) roomName = room.name;
                      return { label: `${item.name} (${roomName})`, value: item.id, name: item.name,  roomName: roomName};
                    });
                    res.json(devices);
                  } catch (e) {
                    console.debug(e);
                  }
                }, (error) => { console.debug(error) });
            } catch (e) {
              console.debug(e);
            }
          }, (error) => { console.debug(error) });
      } else if (object == 'rooms') {
        fibaro.sendRequest('/rooms',
          (data) => {
            let jdata;
            try {
              jdata = data;
            } catch (e) {
              return;
            }
            res.json(jdata);
          }, (error) => { console.debug(error) });
      } else {
        res.json([]);
      }
    });
  }

  RED.nodes.registerType('fibaro-server', FibaroServer, {
    credentials: {
      login: { type: 'text' },
      password: { type: 'password' },
    },
  });
};
