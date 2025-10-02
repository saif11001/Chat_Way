const express = require('express');
const { join } = require('node:path');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);

const io = new Server(server);

app.use(express.static(join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
  console.log('a user connected ', socket.id);

  socket.on('set_username', (username) => {
    socket.username = username || 'Anonymous';
    console.log(`${socket.username} joined the chat`);
    socket.broadcast.emit('user_joined', `${socket.username} joined the chat`);
  });

  socket.on('message', (msg) => {
    const messageData = {
      user: socket.username || "Anonymous",
      text: msg.text,
      senderId: socket.id,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    console.log(`${messageData.user}: ${messageData.text} (${messageData.time})`);
    io.emit('send_messages_to_all_users', messageData);
  });

  socket.on('typing', () => {
    socket.broadcast.emit('show_typing_status', socket.username);
  });

  socket.on('stop_typing', () => {
    socket.broadcast.emit('clear_typing_status');
  });

  socket.on('disconnect', () => {
    console.log(`${socket.username || "Anonymous"} disconnected: ${socket.id}`);
    io.emit('user_left', `${socket.username || "Anonymous"} left the chat`);
  });
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});
