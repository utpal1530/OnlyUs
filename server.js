const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require('path');
const fs = require('fs');
// const multer = require('multer'); // Removed

app.use(express.static(path.join(__dirname, 'public')));

const MESSAGES_FILE = path.join(__dirname, 'messages.json');

let messageHistory = [];


// Load messages from file on startup
function loadMessages() {
  try {
    if (fs.existsSync(MESSAGES_FILE)) {
      const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
      messageHistory = JSON.parse(data);
      console.log(`Loaded ${messageHistory.length} messages from history`);
    }
  } catch (err) {
    console.error('Error loading messages:', err);
    messageHistory = [];
  }
}

// Save messages to file
function saveMessages() {
  try {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messageHistory, null, 2));
  } catch (err) {
    console.error('Error saving messages:', err);
  }
}

loadMessages();

io.on('connection', (socket) => {
  console.log('A user connected');

  // Send message history to newly connected user
  socket.emit('load history', messageHistory);



  socket.on('chat message', (msg) => {
    // Ensure default type is text if not specified
    if (!msg.type) msg.type = 'text';

    // Add to history
    messageHistory.push(msg);

    // Save to file
    saveMessages();

    // Broadcast to everyone including sender
    io.emit('chat message', msg);
  });

  socket.on('typing', (user) => {
    socket.broadcast.emit('typing', user);
  });

  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing');
  });

  socket.on('animate', (type) => {
    io.emit('animate', type); // Broadcast to all
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
