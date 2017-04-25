[![Build Status](https://jenkins-balloonmail.rhcloud.com/buildStatus/icon?job=balloon)](https://jenkins-balloonmail.rhcloud.com/job/balloon/)


# Azure

- production server: 
  - <b>email</b>: tarabishy_2020@hotmail.com
  - <b> app name</b>: balloonmail
  - <b> endpoint </b>: https://balloonmail.azurewebsites.net
- text analytics server: 
  - <b>email</b>: tarabishysafari@hotmail.com
  - <b>endpoint</b>: https://westus.api.cognitive.microsoft.com/text/analytics/v2.0
  - <b>account name</b>: nlp-balloonmail
  - <b>key1</b>: 025287fda0234d14b4de6250f1e68de2
  - <b>pass</b>: 7ob
- prod database:
  - <b>email</b>: dev_prod_db@hotmail.com
  - <b>name</b>: balloonmail_prod_db
  - <b> server name </b>: balloonmail-prod-db.database.windows.net
  - <b> admin</b>: bmailadmin
  - <b>pass</b>: Bmailisgreat93
  
- deployer:
    - <b>user</b>: balloonmail-deployer
    - <b>pass</b>: BmailDeployer93




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
3. No the server is up and running on `http://localhost:8080`


# Connecting to the server locally

1. Ensure the android device and the pc are on the same network.
2. Get the ip address of the pc using `ipconfig` in terminal
3. Now in the globals file in the android app put the IPv4 under the wireless section and the port is 8080.
