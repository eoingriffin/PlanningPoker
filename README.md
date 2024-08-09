# Planning Poker
Simple, free NodeJS web application for planning poker (team sprint ticket estimation tool)

# Setup
## 1) Install NodeJS
I recommend using NVM for this task, to simplify switching between NodeJS versions.\
https://github.com/nvm-sh/nvm

Alternatively, install NodeJS directly: \
https://nodejs.org/en/download/package-manager

## 2) Install node modules

run `npm install`

## 3) Specify a port (optional)

Set an environment variable named `PORT` prior to starting the NodeJS server.
By default, this application will start on port 3000
### Powershell:
https://stackoverflow.com/questions/714877/setting-windows-powershell-environment-variables
```
$Env:PORT = 8080
```
### Linux / Bash:
https://askubuntu.com/questions/58814/how-do-i-add-environment-variables
```
PORT=8080
```
or
```
export PORT=8080
```

---

# Run

```
cd planning-poker
node server.js
```

# Connect
* Open a browser e.g. `http://localhost:3000`
* Enter a username and an optional room id (can be any string) and join the room.
* * Your URL will be updated with your room id. Share this URL with your teammates to get everyone on the same page.
* The first user to join a room will become the administrator, with the abilities to "Clear" the results / stats, and reveal results to all users. \
* * Note: If the administrator leaves the room, that role will fall to another person. Just because you created the room doesn't mean you own it.
* * If you intend to re-use a room id but someone else joins first, that person will be the administrator (TODO: Add the ability to pass the Administrator role to someone else)

![Screenshot 1](https://github.com/eoingriffin/planning-poker/blob/main/screenshots/planning-poker-1.png?raw=true)

![Screenshot 2](https://github.com/eoingriffin/planning-poker/blob/main/screenshots/planning-poker-2.png?raw=true)

![Screenshot 3](https://github.com/eoingriffin/planning-poker/blob/main/screenshots/planning-poker-3.png?raw=true)
