const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Store last 50 messages
const messageHistory = [];
const MAX_MESSAGES = 50;

io.on('connection', (socket) => {
    console.log('A user connected');

    // Send message history to newly connected user
    if (messageHistory.length > 0) {
        socket.emit('message history', messageHistory);
    }

    // Handle joining chat
    socket.on('join', (name) => {
        socket.name = name;
        const systemMsg = `${name} has joined the chat`;
        io.emit('system message', systemMsg);
        
        // Store system message in history
        const systemMessageData = { user: 'system', text: systemMsg, timestamp: Date.now() };
        messageHistory.push(systemMessageData);
        if (messageHistory.length > MAX_MESSAGES) {
            messageHistory.shift();
        }
    });

    // Handle chat messages
    socket.on('chat message', (msg) => {
        if (!socket.name) return; // Don't store messages from users who haven't joined
        
        const messageData = { user: socket.name, text: msg, timestamp: Date.now() };
        
        // Add to history (keep only last 50)
        messageHistory.push(messageData);
        if (messageHistory.length > MAX_MESSAGES) {
            messageHistory.shift(); // Remove oldest message
        }
        
        // Broadcast to everyone
        io.emit('chat message', messageData);
        console.log(`Message from ${socket.name}: ${msg}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        if (socket.name) {
            const systemMsg = `${socket.name} left the chat`;
            io.emit('system message', systemMsg);
            
            // Store system message in history
            const systemMessageData = { user: 'system', text: systemMsg, timestamp: Date.now() };
            messageHistory.push(systemMessageData);
            if (messageHistory.length > MAX_MESSAGES) {
                messageHistory.shift();
            }
        }
    });

    // Handle typing indicator (optional bonus)
    socket.on('typing', () => {
        socket.broadcast.emit('typing', socket.name);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Local url: http://localhost:${PORT}`);
});
