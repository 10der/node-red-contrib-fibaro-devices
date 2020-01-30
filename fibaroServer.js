var FibaroAPI = require('./fibaroAPI.js');

module.exports = function (RED) {
  function FibaroServer(n) {
    RED.nodes.createNode(this, n);
    this.client = new FibaroAPI();
    this.ipaddress = n.ipaddress;
    if (this.credentials) {
      this.login = this.credentials.login;
      this.password = this.credentials.password;
    }
    
    var node = this;
    var fibaro = this.client;

    // Build API
    RED.httpAdmin.get(`/${node.name}/:object`, (req, res) => {
      const { object } = req.params;
      if (object == 'devices') {
        let rooms = [];
        fibaro.sendRequest('/rooms',
          (data) => {
            try {
              rooms = JSON.parse(data);
              fibaro.sendRequest('/devices',
                (data) => {
                  try {
                    let devices = JSON.parse(data);
                    devices = devices.filter(device => (device.enabled && device.visible && device.parentId > 1));
                    devices = devices.map((item) => {
                      let roomName = 'undefined';
                      const room = rooms.find(o => o.id == item.roomID);
                      if (room) roomName = room.name;
                      return { label: `${item.name} (${roomName})`, value: item.id };
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
              jdata = JSON.parse(data);
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
