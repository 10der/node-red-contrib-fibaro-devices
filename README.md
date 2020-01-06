node-red-contrib-fibaro-devices
========================

Install
-------

Run the following command in your Node-RED user directory - typically `~/.node-red`

    npm install node-red-contrib-fibaro-devices

Usage
-----

Example
-------

**With an inject node and a debug node.**

```
[{"id":"5a3e5a86.06d304","type":"switch","z":"8ed7de78.43463","name":"Movement detected?","property":"payload","propertyType":"msg","rules":[{"t":"true"}],"checkall":"false","repair":false,"outputs":1,"x":400,"y":400,"wires":[["9b42b45d.90e578"]]},{"id":"ee56462a.683378","type":"trigger","z":"8ed7de78.43463","op1":"","op2":"0","op1type":"nul","op2type":"num","duration":"1","extend":false,"units":"min","reset":"true","bytopic":"all","name":"Switch off delay","x":620,"y":440,"wires":[["1e8f78cf.e477f7"]]},{"id":"ef02f17e.55e8","type":"inject","z":"8ed7de78.43463","name":"Reduce Brightness at 00:00","topic":"Night Brightness","payload":"1","payloadType":"num","repeat":"","crontab":"*/1 0-5 * * *","once":false,"onceDelay":"","x":180,"y":340,"wires":[["73501bc1.ebc364"]]},{"id":"22f90ee7.f78102","type":"inject","z":"8ed7de78.43463","name":"Normal Brightness at 6:00","topic":"Night Brightness","payload":"50","payloadType":"num","repeat":"","crontab":"*/1 6-20 * * *","once":true,"onceDelay":"0","x":180,"y":260,"wires":[["73501bc1.ebc364"]]},{"id":"29b5abc9.72af94","type":"switch","z":"8ed7de78.43463","name":"Light Threshold Selector","property":"payload","propertyType":"msg","rules":[{"t":"lt","v":"20","vt":"num"},{"t":"else"}],"checkall":"false","outputs":2,"x":470,"y":220,"wires":[["557b3abd.19b934"],["c684e174.ce18"]]},{"id":"557b3abd.19b934","type":"change","z":"8ed7de78.43463","name":"Enable Light","rules":[{"t":"set","p":"Light_enabled","pt":"flow","to":"Yes","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":710,"y":200,"wires":[[]]},{"id":"c684e174.ce18","type":"change","z":"8ed7de78.43463","name":"Disable Light","rules":[{"t":"set","p":"Light_enabled","pt":"flow","to":"No","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":710,"y":240,"wires":[[]]},{"id":"73501bc1.ebc364","type":"change","z":"8ed7de78.43463","name":"Light Brightness Adjustment","rules":[{"t":"set","p":"Light_brightness","pt":"flow","to":"payload","tot":"msg"}],"action":"","property":"","from":"","to":"","reg":false,"x":533.6666564941406,"y":281.1499938964844,"wires":[[]]},{"id":"9b42b45d.90e578","type":"switch","z":"8ed7de78.43463","name":"Light Enabled?","property":"Light_enabled","propertyType":"flow","rules":[{"t":"eq","v":"Yes","vt":"str"}],"checkall":"true","repair":false,"outputs":1,"x":620,"y":400,"wires":[["e1397c12.7615c"]]},{"id":"e1397c12.7615c","type":"change","z":"8ed7de78.43463","name":"Light Brightness Adjustment","rules":[{"t":"set","p":"payload","pt":"msg","to":"Light_brightness","tot":"flow"}],"action":"","property":"","from":"","to":"","reg":false,"x":860,"y":400,"wires":[["1e8f78cf.e477f7"]]},{"id":"1e8f78cf.e477f7","type":"function","z":"8ed7de78.43463","name":"passthru","func":"if (msg.payload > 0) {\n    msg.payload = {\n        name: \"setColor\", \n        arg1:255, \n        arg2:255,\n        arg3:255,\n        arg4:255\n    };\n} else {\n    msg.payload = {\n        name: \"turnOff\"\n    }\n}\nreturn msg;","outputs":1,"noerr":0,"x":1060,"y":440,"wires":[["27558a5.c0dbe76","c358465e.ebacb8"]]},{"id":"6e241b8b.dcf114","type":"debug","z":"8ed7de78.43463","name":"","active":false,"tosidebar":true,"console":false,"tostatus":false,"complete":"false","x":510,"y":120,"wires":[]},{"id":"ea4371c0.0c172","type":"inject","z":"8ed7de78.43463","name":"Reset","topic":"","payload":"0","payloadType":"num","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":110,"y":80,"wires":[["2c2ab5ef.4b8fea"]]},{"id":"15d59a8a.b09c55","type":"inject","z":"8ed7de78.43463","name":"","topic":"","payload":"true","payloadType":"bool","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":150,"y":540,"wires":[["2d8748a0.505f68"]]},{"id":"51bf7fa3.0cb28","type":"inject","z":"8ed7de78.43463","name":"","topic":"","payload":"false","payloadType":"bool","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":150,"y":580,"wires":[["2d8748a0.505f68"]]},{"id":"527c4744.bd8638","type":"inject","z":"8ed7de78.43463","name":"run custom command","topic":"devices/1483/properties/mode","payload":"{}","payloadType":"json","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":160,"y":120,"wires":[["2c2ab5ef.4b8fea"]]},{"id":"1ba70c61.dd3cf4","type":"inject","z":"8ed7de78.43463","name":"Reduce Brightness at 21:00","topic":"Night Brightness","payload":"1","payloadType":"num","repeat":"","crontab":"*/1 21-23 * * *","once":false,"onceDelay":"","x":180,"y":300,"wires":[["73501bc1.ebc364"]]},{"id":"cdcb0cc0.f8fbc","type":"mqtt out","z":"8ed7de78.43463","name":"","topic":"","qos":"","retain":"","broker":"dfd1bf12.67da5","x":490,"y":60,"wires":[]},{"id":"d960ff20.0a214","type":"mqtt in","z":"8ed7de78.43463","name":"","topic":"home/status/#","qos":"2","datatype":"json","broker":"dfd1bf12.67da5","x":910,"y":80,"wires":[["b00e81fa.2f672"]]},{"id":"b00e81fa.2f672","type":"debug","z":"8ed7de78.43463","name":"","active":false,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","x":1130,"y":80,"wires":[]},{"id":"27558a5.c0dbe76","type":"debug","z":"8ed7de78.43463","name":"","active":false,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","x":1270,"y":380,"wires":[]},{"id":"9ffbd447.0af508","type":"fibaroSensor","z":"8ed7de78.43463","name":"Light sensor","deviceID":"727","server":"22c8eb11.659074","outputs":1,"x":220,"y":220,"wires":[["29b5abc9.72af94"]]},{"id":"b6864e38.a9be7","type":"fibaroSensor","z":"8ed7de78.43463","name":"Motion sensor","deviceID":"725","server":"22c8eb11.659074","events":true,"outputs":2,"x":170,"y":440,"wires":[["5a3e5a86.06d304","ee56462a.683378","8bd5b9e7.21c1b8"],["ea2aa299.5f2d7"]]},{"id":"2d8748a0.505f68","type":"fibaroActor","z":"8ed7de78.43463","name":"Plug Reserved (Test)","deviceID":"969","server":"22c8eb11.659074","events":true,"outputs":1,"x":380,"y":560,"wires":[["2a35cf31.0825c"]],"info":"Binary switcher test"},{"id":"2a35cf31.0825c","type":"debug","z":"8ed7de78.43463","name":"","active":false,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","x":630,"y":560,"wires":[]},{"id":"440aaf68.8e3d1","type":"inject","z":"8ed7de78.43463","name":"heating ON","topic":"","payload":"turnOn","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":170,"y":720,"wires":[["87f2a9d.c296158"]]},{"id":"77a0ae3d.206ab","type":"inject","z":"8ed7de78.43463","name":"OFF","topic":"","payload":"turnOff","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":150,"y":680,"wires":[["87f2a9d.c296158"]]},{"id":"18302956.36f3c7","type":"inject","z":"8ed7de78.43463","name":"set heating +26","topic":"","payload":"Heating26","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":180,"y":760,"wires":[["87f2a9d.c296158"]]},{"id":"2c34766c.cfec5a","type":"comment","z":"8ed7de78.43463","name":"Binary switcher test","info":"","x":110,"y":500,"wires":[]},{"id":"bd376687.557938","type":"comment","z":"8ed7de78.43463","name":"Simple thermostat","info":"","x":110,"y":640,"wires":[]},{"id":"8e93d680.97eba8","type":"comment","z":"8ed7de78.43463","name":"Motion lights (lux + motion sensor + RGB LED strip)","info":"","x":210,"y":180,"wires":[]},{"id":"eeb7859.8366a78","type":"comment","z":"8ed7de78.43463","name":"FIBARO Rulezzz!","info":"","x":100,"y":40,"wires":[]},{"id":"59f7144.b51d7ec","type":"comment","z":"8ed7de78.43463","name":"MQTT handler","info":"","x":850,"y":40,"wires":[]},{"id":"ea2aa299.5f2d7","type":"debug","z":"8ed7de78.43463","name":"others values","active":false,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","x":370,"y":480,"wires":[]},{"id":"8bd5b9e7.21c1b8","type":"debug","z":"8ed7de78.43463","name":"value","active":false,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","x":210,"y":380,"wires":[]},{"id":"9e3e296d.13bc48","type":"fibaroSensor","z":"8ed7de78.43463","name":"Motion sensor","deviceID":"725","server":"22c8eb11.659074","events":true,"outputs":2,"x":730,"y":680,"wires":[["664a9f92.1064"],["9fc5c4cf.c25658"]]},{"id":"664a9f92.1064","type":"debug","z":"8ed7de78.43463","name":"value","active":false,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","x":910,"y":660,"wires":[]},{"id":"9fc5c4cf.c25658","type":"debug","z":"8ed7de78.43463","name":"others values","active":false,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","x":930,"y":700,"wires":[]},{"id":"a247dc33.c6d61","type":"comment","z":"8ed7de78.43463","name":"another copy of motion sensor","info":"","x":680,"y":640,"wires":[]},{"id":"2c2ab5ef.4b8fea","type":"fibaroAPI","z":"8ed7de78.43463","name":"HC2","server":"22c8eb11.659074","output_topic":"","globals_topic":"","room_mode":false,"pollingInterval":"1000","events":true,"outputs":2,"x":350,"y":80,"wires":[["cdcb0cc0.f8fbc"],["6e241b8b.dcf114"]]},{"id":"cc5bfb34.1c7528","type":"inject","z":"8ed7de78.43463","name":"turn Off","topic":"","payload":"{\"name\":\"turnOff\"}","payloadType":"json","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":1070,"y":480,"wires":[["c358465e.ebacb8"]]},{"id":"f6e5e3ed.fb94a","type":"fibaroQuery","z":"8ed7de78.43463","name":"query dev state","server":"22c8eb11.659074","x":320,"y":860,"wires":[["275ba264.e6677e"]]},{"id":"25ae839d.36a1ac","type":"fibaroActor","z":"8ed7de78.43463","name":"","deviceID":"0","server":"22c8eb11.659074","events":false,"outputs":0,"x":830,"y":860,"wires":[]},{"id":"ce422501.332b48","type":"inject","z":"8ed7de78.43463","name":"toggle","topic":"969","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":150,"y":860,"wires":[["f6e5e3ed.fb94a"]]},{"id":"275ba264.e6677e","type":"switch","z":"8ed7de78.43463","name":"","property":"currentState.value","propertyType":"msg","rules":[{"t":"eq","v":"1","vt":"str"},{"t":"eq","v":"0","vt":"str"}],"checkall":"true","repair":false,"outputs":2,"x":470,"y":860,"wires":[["f489909a.a520c"],["326fcf3b.efefb"]]},{"id":"f489909a.a520c","type":"change","z":"8ed7de78.43463","name":"","rules":[{"t":"set","p":"payload","pt":"msg","to":"false","tot":"bool"}],"action":"","property":"","from":"","to":"","reg":false,"x":640,"y":840,"wires":[["25ae839d.36a1ac"]]},{"id":"326fcf3b.efefb","type":"change","z":"8ed7de78.43463","name":"","rules":[{"t":"set","p":"payload","pt":"msg","to":"true","tot":"bool"}],"action":"","property":"","from":"","to":"","reg":false,"x":640,"y":880,"wires":[["25ae839d.36a1ac"]]},{"id":"87f2a9d.c296158","type":"fibaroXActor","z":"8ed7de78.43463","name":"Thermostat","deviceID":"1483","server":"22c8eb11.659074","events":false,"payload":"{\"turnOff\":{\"name\":\"setMode\",\"arg1\":0},\"turnOn\":{\"name\":\"setMode\",\"arg1\":1},\"Heating26\":{\"name\":\"setThermostatSetpoint\",\"arg1\":1,\"arg2\":26}}","outputs":0,"x":410,"y":720,"wires":[]},{"id":"c358465e.ebacb8","type":"fibaroXActor","z":"8ed7de78.43463","name":"RGBW LED (Workroom)","deviceID":"608","server":"22c8eb11.659074","events":false,"payload":"{}","outputs":0,"x":1270,"y":460,"wires":[]},{"id":"3d041ae8.403a56","type":"comment","z":"8ed7de78.43463","name":"Query device state","info":"","x":110,"y":820,"wires":[]},{"id":"dfd1bf12.67da5","type":"mqtt-broker","z":"","name":"NAS","broker":"192.168.1.29","port":"1883","clientid":"","usetls":false,"compatmode":true,"keepalive":"60","cleansession":true,"birthTopic":"","birthQos":"0","birthPayload":"","closeTopic":"","closeQos":"0","closePayload":"","willTopic":"","willQos":"0","willPayload":""},{"id":"22c8eb11.659074","type":"fibaro-server","z":"","name":"HC2","ipaddress":"192.168.1.36"}]
```

![emaple](https://raw.githubusercontent.com/10der/node-red-contrib-fibaro-hc2/master/images/example.png)

Docs
---
com.fibaro.binarySensor
com.fibaro.multilevelSensor
com.fibaro.binarySwitch
com.fibaro.multilevelSwitch

Devices:
ID = device ID
name = action
arg1 = (e.g. value dimmer)

http://api/callAction?deviceID=4&name=turnOff
http://api/callAction?deviceID=7&name=setValue&arg1=39

Virtual Devices
ID = device ID
arg1 = button ID
arg2 = slider value (only for slider)
http://api/callAction?deviceID=15&name=pressButton&arg1=2
http://api/callAction?deviceID=51&name=setSlider&arg1=8&arg2=30

Notification
ID = Device (Iphone, e-mail et cetera)
arg1 = Notification template
http://api/callAction?deviceID=9&name=sendDefinedPushNotification&arg1=1

Arm/Disarm devices
arg1 = 1 - Armed
arg1 = 0 - Disarmed
http://api/callAction?deviceID=51&&name=setArmed&arg1=0

Scene
ID = SceneID
http://api/sceneControl?id=14&action=start
http://api/sceneControl?id=14&action=stop

Thermostat OFF
http://api/callAction?deviceID=1483&name=setMode&arg1=0
Thermostat ON + HEATING
http://api/callAction?deviceID=1483&name=setMode&arg1=1
Thermostat heating temperature
http://api/callAction?deviceID=1483&name=setThermostatSetpoint&arg1=1&arg2=28
