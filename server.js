const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require('path');
const fs = require('fs');
const multer = require('multer');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));

const MESSAGES_FILE = path.join(__dirname, 'messages.json');
const MESSAGES_BACKUP = path.join(__dirname, 'messages.bak.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

let messageHistory = [];
let onlineUsers = new Map(); // Track online users
let userLastSeen = new Map(); // Track when users were last seen

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Load messages from file on startup
function loadMessages() {
    try {
        if (fs.existsSync(MESSAGES_FILE)) {
            const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
            try {
                const parsed = JSON.parse(data);
                // Handle old format or new format
                if (Array.isArray(parsed)) {
                    messageHistory = parsed;
                } else if (parsed.messages && Array.isArray(parsed.messages)) {
                    messageHistory = parsed.messages;
                } else {
                    messageHistory = [];
                }
                console.log(`[Persistence] Loaded ${messageHistory.length} messages successfully.`);
            } catch (parseError) {
                console.error('[Persistence] CRITICAL: JSON Parse Error reading messages.json:', parseError);
                try {
                    fs.copyFileSync(MESSAGES_FILE, MESSAGES_FILE + '.corrupt-' + Date.now());
                    console.log('[Persistence] Corrupt file backed up.');
                } catch (e) { 
                    console.error('[Persistence] Failed to backup corrupt file:', e); 
                }
                messageHistory = [];
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
        const tempFile = MESSAGES_FILE + '.tmp';
        fs.writeFileSync(tempFile, JSON.stringify(messageHistory, null, 2));
        fs.renameSync(tempFile, MESSAGES_FILE);
        console.log(`[Persistence] Saved ${messageHistory.length} messages.`);
    } catch (err) {
        console.error('[Persistence] Error saving messages:', err);
    }
}

// Image upload endpoint
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
});

// Get online status endpoint
app.get('/api/online-status', (req, res) => {
    const status = {};
    onlineUsers.forEach((socketId, username) => {
        status[username] = {
            online: true,
            lastSeen: null
        };
    });
    userLastSeen.forEach((timestamp, username) => {
        if (!status[username]) {
            status[username] = {
                online: false,
                lastSeen: timestamp
            };
        }
    });
    res.json(status);
});

loadMessages();

io.on('connection', (socket) => {
    console.log('A user connected');
    
    // Track user session
    let currentUsername = null;

    // Send message history to newly connected user (paginated)
    socket.on('load history', (options = {}) => {
        const limit = options.limit || 50;
        const offset = options.offset || 0;
        const totalMessages = messageHistory.length;
        const messages = messageHistory.slice(Math.max(0, totalMessages - limit - offset), totalMessages - offset);
        
        socket.emit('load history', {
            messages: messages,
            hasMore: totalMessages > limit + offset,
            total: totalMessages
        });
    });

    // User login
    socket.on('user login', (username) => {
        currentUsername = username;
        onlineUsers.set(username, socket.id);
        userLastSeen.delete(username);
        
        // Broadcast online status to others
        socket.broadcast.emit('user online', {
            username: username,
            online: true
        });
        
        console.log(`[Online] ${username} is now online`);
    });

    // Typing indicators
    socket.on('typing', (user) => {
        socket.broadcast.emit('typing', user);
    });

    socket.on('stop typing', () => {
        socket.broadcast.emit('stop typing');
    });

    // Message handling
    socket.on('chat message', (msg) => {
        if (!msg.type) msg.type = 'text';
        
        // Ensure message has an ID
        if (!msg.id) {
            msg.id = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        }
        
        // Add to history
        messageHistory.push(msg);
        
        // Save to file
        saveMessages();

        // Broadcast to everyone including sender
        io.emit('chat message', msg);
    });

    // Read receipts
    socket.on('message read', (data) => {
        const { messageId, user } = data;
        
        // Find the message and update read status
        const message = messageHistory.find(m => m.id === messageId);
        if (message) {
            if (!message.readBy) message.readBy = [];
            if (!message.readBy.includes(user)) {
                message.readBy.push(user);
                saveMessages();
                
                // Notify the original sender
                const senderSocketId = onlineUsers.get(message.user);
                if (senderSocketId) {
                    io.to(senderSocketId).emit('message read receipt', {
                        messageId: messageId,
                        readBy: user,
                        readAt: new Date().toISOString()
                    });
                }
            }
        }
    });

    // Mark all messages as read
    socket.on('mark all read', (data) => {
        const { user, fromUser } = data;
        let updated = false;
        
        messageHistory.forEach(msg => {
            if (msg.user === fromUser && msg.id) {
                if (!msg.readBy) msg.readBy = [];
                if (!msg.readBy.includes(user)) {
                    msg.readBy.push(user);
                    updated = true;
                }
            }
        });
        
        if (updated) {
            saveMessages();
            io.emit('all messages read', { by: user, from: fromUser });
        }
    });

    // Message reactions
    socket.on('add reaction', (data) => {
        const { messageId, emoji, user } = data;
        const message = messageHistory.find(m => m.id === messageId);
        
        if (message) {
            if (!message.reactions) message.reactions = {};
            if (!message.reactions[emoji]) message.reactions[emoji] = [];
            
            // Toggle reaction
            const index = message.reactions[emoji].indexOf(user);
            if (index === -1) {
                message.reactions[emoji].push(user);
            } else {
                message.reactions[emoji].splice(index, 1);
                if (message.reactions[emoji].length === 0) {
                    delete message.reactions[emoji];
                }
            }
            
            saveMessages();
            io.emit('reaction updated', {
                messageId: messageId,
                reactions: message.reactions
            });
        }
    });

    // Star/unstar message
    socket.on('toggle star', (data) => {
        const { messageId, user } = data;
        const message = messageHistory.find(m => m.id === messageId);
        
        if (message) {
            if (!message.starredBy) message.starredBy = [];
            const index = message.starredBy.indexOf(user);
            
            if (index === -1) {
                message.starredBy.push(user);
            } else {
                message.starredBy.splice(index, 1);
            }
            
            saveMessages();
            socket.emit('star toggled', {
                messageId: messageId,
                starred: index === -1,
                starredBy: message.starredBy
            });
        }
    });

    // Get starred messages
    socket.on('get starred messages', (user) => {
        const starred = messageHistory.filter(m => m.starredBy && m.starredBy.includes(user));
        socket.emit('starred messages', starred);
    });

    // Search messages
    socket.on('search messages', (data) => {
        const { query, user } = data;
        const results = messageHistory.filter(m => {
            const textMatch = m.text && m.text.toLowerCase().includes(query.toLowerCase());
            const userMatch = m.user && m.user.toLowerCase().includes(query.toLowerCase());
            return textMatch || userMatch;
        }).slice(-50); // Return last 50 matches
        
        socket.emit('search results', results);
    });

    // Animation events
    socket.on('animate', (type) => {
        io.emit('animate', type);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected');
        
        if (currentUsername) {
            onlineUsers.delete(currentUsername);
            userLastSeen.set(currentUsername, new Date().toISOString());
            
            // Broadcast offline status
            socket.broadcast.emit('user offline', {
                username: currentUsername,
                lastSeen: new Date().toISOString()
            });
            
            console.log(`[Online] ${currentUsername} is now offline`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
