var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

function assignGuestName(socket, guestNumber, nickNames, namesUsed){
	var name = 'Guest' + guestNumber;
	nickNames[socket.id] = name;
	socket.emit('nameResult',{
		success:true,
		name:name
	});
	namesUsed.push(name);
	return guestNumber + 1;
}

function joinRoom(socket, room) {
	socket.join(room);
	currentRoom[socket.id] = room;
	socket.emit('joinResult',{room: room});
	socket.broadcast.to(room).emit('message', {
		text: nickNames[socket.id] + ' has joined ' + room + '.'
	});
	
	var userInroom = io.sockets.clients(room);
	if(userInroom.lenth < 1){
		var usersInRoomSummary = 'Users currently in ' + room + ':';
		for(var index in userInroom){
			var userSocketId = userInroom[index].id;
			if(userSocketId != socket.id){
				if(index > 0){
					usersInRoomSummary += ',';
				}
				usersInRoomSummary += nickNames[userSocketId];
			}
		}
		usersInRoomSummary += '.';
		socket.emit('message', {text : usersInRoomSummary});
	}
}

function handleNameChangeAttempts(socket, nickNames, nameUsed) {
	socket.on('nameAttempt', function(name){
		if(name.indexOf('Guest') == 0){
			socket.emit('nameResult',{
				success: false,
				message: 'Name cannot begin with "Guest" '
			});
		}else{
			if(nameUsed.indexOf(name) == -1){
				var previousName = nickNames[socket.id];
				var previousNameIndex = nameUsed.indexOf(previousName);
				nameUsed.push(name);
				nickNames[socket.id] = name;
				delete namesUsed[previousNameIndex];
				socket.emit('nameResult',{
					success: true,
					name:name
				});
				socket.broadcast.to(currentRoom[socket.id]).emit('message',{
					text: previousName + 'is now known as ' + name + '.'
				});
			}else{
				socket.emit('nameResult',{
					success: false,
					message: 'That name is already in use. '
				});
			}
		}
	});
}

function handleMessageBroadcasting(socket){
	socket.on('message', function (message) {
		socket.broadcast.to(message.room).emit('message',{
			text: nickNames[socket.id] + ' : ' + message.text
 		});
	});
}

function handleRoomJoining(socket){
	socket.on('join', function (room) {
		socket.leave(currentRoom[socket.id]);
		joinRoom(socket, room.newroom);
	});
}

function handleClientDisconnection(socket){
	socket.io('disconnection', function () {
		var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
		delete namesUsed[nameIndex];
		delete nickNames[socket.id];
	});
}

exports.listen = function(server){
	io = socketio.listen(server);
	io.set('log level ', 1);
	io.sockets.on('connection', function(socket){
		guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
		joinRoom(socket, 'Lobby');
		handleMessageBroadcasting(socket, nickNames);
		handleNameChangeAttempts(socket,nickNames,namesUsed);
		handleRoomJoining(socket);
		socket.on('room', function(){
			socket.emit('rooms', io.sockets.manager.rooms);
		});
		handleClientDisconnection(socket, nickNames, namesUsed);
	});
};





