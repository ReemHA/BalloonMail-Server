# Server on cloud

Currently the server is deployed on a free cloud service [OpenShift](https://www.openshift.com/). The server url is (app-balloonmail.rhcloud.com), so you can connect the android to the cloud server directly by 
putting the server url in the `server_url` field in the `values/strings` file in the android application.

# Setup locally 

1. Install [Node.js 64-bit](https://nodejs.org/dist/v4.4.3/node-v4.4.3-x64.msi) or [Node.js 32-bit](https://nodejs.org/dist/v4.4.3/node-v4.4.3-x86.msi)
2. Install [MongoDB 64-bit](https://fastdl.mongodb.org/win32/mongodb-win32-x86_64-3.2.5-signed.msi) or [Mongodb 32-bit](https://fastdl.mongodb.org/win32/mongodb-win32-i386-3.2.5-signed.msi)
3. Add MongoDB bin folder to the System PATH variable. It is usually located here `C:\Program Files\MongoDB\Server\3.2\bin`, check where yours is installed.
4. Open a terminal and type :
  * `md \data`
  * `md \data\db`
5. Ensure you have a stable internet connection or otherwise some dependencies wont be installed with next command and you will get some errors.
6. Navigate to the server directory in the terminal and then type `npm install`

# Running the server Locally

1. Open a temrinal and type `mongod` for 64-bit versions and `mongod --storageEngine=mmapv1` for 32-bit versions.
2. Open another terminal, navigate to the server directory and type `npm start`
3. No the server is up and running on `http://localhost:3000`


# Connecting to the server locally

1. Ensure the android device and the pc are on the same network.
2. Get the ip address of the pc using `ipconfig` in terminal
3. Now type this ip in the `server_url` field in the `values/strings` file in the android application
