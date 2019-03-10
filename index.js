// Setup
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var List = require("collections/list");

var totalUsers = 0;
var userList = [];
var colourDict = {};
var mssgCount = 0;

app.get('/', function(req,res) {
   res.sendFile(__dirname + '/index.html');
});

// Handle a connection
io.on('connection', function(socket) {
    // If client is first user, check length of storage of old messages
    if (totalUsers === 0) {
        console.log("1st user !!!!");
        io.to(`${socket.id}`).emit('check storage');
    }

    // Handle this new client connection
    console.log('A user connected');
    console.log(socket.id);
    // increment total number of users for username creation
    totalUsers += 1;
    let userId = "User"+totalUsers;
    // update list of current users
    userList.add(userId);
    // send new client their username
    io.to(`${socket.id}`).emit('new connection', userId);
    // send updated list to all clients
    io.emit('changed user list', userList);

    // Handle this client disconnection
    socket.on('disconnect', function(){
        console.log('   a user disconnected');
        // update list of current users
        userList.delete(userId);
        // send updated list to all clients
        io.emit('changed user list', userList);
    });

    // Very first client sent size of local storage
    socket.on('storage length', function(count){
        mssgCount = count;
        console.log("There were already " + mssgCount + " messages");
    });

    // Client sent a message
    socket.on('chat message', function(msg){
        // Get timestamp
        let time = new Date();
        // Check if message is a command
        let command = msg.split(" ");
        // Check if command to change nickname
        if (command[0] === "/nick") {
            userId = usernameChange(socket, command[1], userId);
        }
        // Check if command to change colour of nickname
        else if (command[0] === "/nickcolor") {
            colourChange(socket, command[1]);
        }
        // Normal message
        else {
            // Check if user has a nickname colour attributed
            if (socket.id in colourDict) {
                io.emit('chat message', msg, time, userId, colourDict[socket.id], socket.id, mssgCount);
            }
            // Else send message in black
            else {
                io.emit('chat message', msg, time, userId, '000000', socket.id, mssgCount);
            }
            // Increment message count
            mssgCount += 1;
            // If localStorage  of messages has become too big, have this client fix it
            /*if (mssgCount > 10) {
                console.log(mssgCount + " messages");
                io.to(`${socket.id}`).emit('renew localStorage');
            }*/
        }
    });
});

    http.listen(3000, function() {
    console.log('listening on *:3000');
});

    // Function handling client command to change their username colour
    function colourChange (socket, colour) {
        // Check if valid rrggbb colour
        // is it 6 digits long?
        if (colour.length === 6) {
            // is it a valid hex number?
            // parse in hex
            let translatedcolour = parseInt(colour, 16);
            // back to decimal string
            translatedcolour = translatedcolour.toString(16);
            // pad with leading zeros if necessary
            while (translatedcolour.length < 6) {
                translatedcolour = "0" + translatedcolour;
            }
            // compare with original string
            if (translatedcolour === colour){
                // Add valid colour to dictionary
                colourDict[socket.id] = colour;
                // Erase any message in com area
                io.to(`${socket.id}`).emit('valid colour');
            }
            else {
                // Tell user that colour is invalid
                io.to(`${socket.id}`).emit('colour not valid', colour);
            }
        }
        else {
            // Tell user that colour is invalid
            io.to(`${socket.id}`).emit('colour not valid', colour);
        }
    }

    // Function handling client command to change their username
    function usernameChange(socket, username, userId){
        console.log("desired: " + username);
        var lowerCaseList = [];
        for (i=0; i<userList.length; i++) {
            lowerCaseList.add(userList[i].toLowerCase());
        }
        console.log(lowerCaseList);
        if (lowerCaseList.indexOf(username.toLowerCase()) >= 0) {
            io.to(`${socket.id}`).emit('nickname not unique', username);
            return userId;
        }
        else {
            console.log("unique");
            userList.delete(userId);
            console.log(userList);
            userId = username;
            userList.add(userId);
            console.log(userList);
            io.to(`${socket.id}`).emit('nickname unique', username);
            io.emit('changed user list', userList);
            return userId;
        }
    }