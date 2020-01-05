@echo off
call npm run lint -- --fix
C:
cd C:\Users\olegd\.node-red
rem call npm link
call npm install E:\node-red\node-red-contrib-fibaro-devices

rem start node-red
rem start http://127.0.0.1:1880/

node-red

