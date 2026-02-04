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
const MESSAGES_BACKUP = path.join(__dirname, 'messages.bak.json');

let messageHistory = [];

// Load messages from file on startup
function loadMessages() {
  try {
    if (fs.existsSync(MESSAGES_FILE)) {
      const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
      try {
        messageHistory = JSON.parse(data);
        console.log(`[Persistence] Loaded ${messageHistory.length} messages successfully.`);
      } catch (parseError) {
        console.error('[Persistence] CRITICAL: JSON Parse Error reading messages.json:', parseError);
        // Try to backup the corrupt file
        try {
          fs.copyFileSync(MESSAGES_FILE, MESSAGES_FILE + '.corrupt-' + Date.now());
          console.log('[Persistence] Corrupt file backed up.');
        } catch (e) { console.error('[Persistence] Failed to backup corrupt file:', e); }

        messageHistory = []; // Start fresh if corrupt
      }
    } else {
      console.log('[Persistence] No existing messages file found. Starting fresh.');
      messageHistory = [];
    }
  } catch (err) {
    console.error('[Persistence] Error loading messages:', err);
    messageHistory = [];
  }
}

// Save messages to file safely
function saveMessages() {
  try {
    // 1. Write to a temporary file first
    const tempFile = MESSAGES_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(messageHistory, null, 2));

    // 2. Rename temp file to actual file (atomic operation on POSIX, usually safe on Windows)
    fs.renameSync(tempFile, MESSAGES_FILE);

    // Optional: Log every save or just periodically? Let's log for debugging now.
    console.log(`[Persistence] Saved ${messageHistory.length} messages.`);
  } catch (err) {
    console.error('[Persistence] Error saving messages:', err);
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
