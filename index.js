// Setup
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var List = require("collections/list");

var totalConnections = 0; // number of connections since server started
var userList = [];  // list of users currently in chat
var colourDict = {};    //users who required a colored nickname, and the color itself
var messages = [];

app.get('/', function(req,res) {
    res.sendFile(__dirname + '/index.html');
});

// Handle a connection
io.on('connection', function(socket) {
    console.log('A user connected');
    console.log(socket.id);
    // Increment total number of connections
    totalConnections += 1;
    // Create a userId for this client
    let userId = "";

    // Client is a returning user
    socket.on('returning user', function(nickname) {
        userId = nickname;
        while (userList.includes(userId)) {
            totalConnections += 1;
            userId = "User"+totalConnections;
            io.to(`${socket.id}`).emit('nickname changed');
        }
        userJoin (socket, userId)
    });

    // Client is a new user
    socket.on('new user', function() {
        userId = "User"+totalConnections;
        while (userList.includes(userId)) {
            totalConnections += 1;
            userId = "User"+totalConnections;
        }
        userJoin (socket, userId)
    });

    // Handle this client disconnection
    socket.on('disconnect', function(){
        console.log('   a user disconnected');
        // update list of current users
        userList.delete(userId);
        // send updated list to all clients
        io.emit('changed user list', userList);
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
                io.emit('chat message', msg, time, userId, colourDict[socket.id], socket.id);
            }
            // Else send black
            else {
                io.emit('chat message', msg, time, userId, '000000', socket.id);
            }
        }
    });

    // Client formed a message
    socket.on('store message', function(msgString) {
        messages.push(msgString);
        if (messages.length >= 400) {
            messages = messages.slice (199);
        }
    });
});


http.listen(3000, function() {
    console.log('listening on *:3000');
});

//Function handling recent connection
function userJoin (socket, userId) {
    // update list of current users
    userList.add(userId);
    // send new client their username and messages history
    io.to(`${socket.id}`).emit('new connection', userId, messages);
    // send updated list to all clients
    io.emit('changed user list', userList);
}

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
        if (translatedcolour === colour.toLowerCase()){
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
    var lowerCaseList = [];
    for (i=0; i<userList.length; i++) {
        lowerCaseList.add(userList[i].toLowerCase());
    }
    if (lowerCaseList.indexOf(username.toLowerCase()) >= 0) {
        io.to(`${socket.id}`).emit('nickname not unique', username);
        return userId;
    }
    else {
        userList.delete(userId);
        userId = username;
        userList.add(userId);
        io.to(`${socket.id}`).emit('nickname unique', username);
        io.emit('changed user list', userList);
        return userId;
    }
}