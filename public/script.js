const socket = io();

// DOM Elements
const loginOverlay = document.getElementById('login-overlay');
const btnUtpal = document.getElementById('btn-utpal');
const btnKhushi = document.getElementById('btn-khushi');
const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesArea = document.getElementById('messages-area');
const daysCountSpan = document.getElementById('days-count');
const emojiBtn = document.getElementById('emoji-btn');
const emojiPicker = document.querySelector('emoji-picker');
const replyIndicator = document.getElementById('reply-indicator');
const replyToUserSpan = document.getElementById('reply-to-user');
const replyPreviewP = document.getElementById('reply-preview');
const cancelReplyBtn = document.getElementById('cancel-reply');

let username = '';
let storedMessages = [];
let replyingTo = null; // Object { user, text }

// Relationship Start Date Logic
const startDate = new Date('2026-01-06'); // Updated to 2026
const today = new Date();
const timeDiff = today - startDate;
const daysTogether = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
daysCountSpan.innerText = `Total Days: ${daysTogether}, Counting...`;

// Login Logic
function loginAs(name) {
    if (name) {
        username = name;
        loginOverlay.style.opacity = '0';

        // Request Notification Permission
        if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission();
        }

        renderMessages();

        setTimeout(() => {
            loginOverlay.classList.add('hidden');
            chatContainer.classList.remove('hidden');

            // Scroll to bottom NOW that it is visible
            scrollToBottom();

            appendSystemMessage(`Welcome back, ${username} ❤️`);
            // Scroll again for system message
            scrollToBottom();
        }, 500);
    }
}

btnUtpal.addEventListener('click', () => loginAs('Utpal'));
btnKhushi.addEventListener('click', () => loginAs('Khushi'));

// Emoji Logic
emojiBtn.addEventListener('click', () => {
    emojiPicker.classList.toggle('hidden');
});

emojiPicker.addEventListener('emoji-click', event => {
    messageInput.value += event.detail.unicode;
    messageInput.focus();
});

document.addEventListener('click', (e) => {
    if (!emojiPicker.contains(e.target) && !emojiBtn.contains(e.target)) {
        emojiPicker.classList.add('hidden');
    }
});

// Quick Reply Logic
document.querySelectorAll('.quick-reply-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const msg = btn.getAttribute('data-msg');
        sendMessage(msg);
    });
});

// Swipe to Reply Logic
let touchStartX = 0;
let touchEndX = 0;

function addSwipeListener(messageElement, msgData) {
    messageElement.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });

    messageElement.addEventListener('touchmove', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchEndX - touchStartX;
        if (diff > 0 && diff < 100) { // Drag right visual feedback
            messageElement.style.transform = `translateX(${diff}px)`;
        }
    });

    messageElement.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        messageElement.style.transform = 'translateX(0)'; // Reset position
        if (touchEndX - touchStartX > 50) { // Swipe threshold
            setReply(msgData);
        }
    });

    // Also support double click for desktop testing
    messageElement.addEventListener('dblclick', () => setReply(msgData));
}

function setReply(msgData) {
    replyingTo = {
        user: msgData.user,
        text: msgData.text
    };
    replyToUserSpan.innerText = `Replying to ${msgData.user}`;
    replyPreviewP.innerText = msgData.text;
    replyIndicator.classList.remove('hidden');
    messageInput.focus();
}

function clearReply() {
    replyingTo = null;
    replyIndicator.classList.add('hidden');
}

cancelReplyBtn.addEventListener('click', clearReply);

// Send Message Logic
function sendMessage(textOverride = null) {
    const text = textOverride || messageInput.value.trim();
    if (text && username) {
        const messageData = {
            user: username,
            text: text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            replyTo: replyingTo // Add reply context
        };
        socket.emit('chat message', messageData);

        if (!textOverride) {
            messageInput.value = '';
            messageInput.focus();
        }
        emojiPicker.classList.add('hidden');
        clearReply(); // Clear reply after sending
    }
}

sendBtn.addEventListener('click', () => sendMessage());
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Receive Message Logic
socket.on('load history', (messages) => {
    storedMessages = messages;
    if (username) {
        renderMessages();
    }
});

socket.on('chat message', (msg) => {
    storedMessages.push(msg);
    if (username) {
        appendMessage(msg);
        scrollToBottom();

        // Show Notification if message is not from me and window is hidden or specific
        if (msg.user !== username && 'Notification' in window && Notification.permission === 'granted') {
            // Don't notify if tab is focused? Actually user asked for "each and every notification". 
            // Usually we check document.hidden but let's just send it.
            new Notification(`${msg.user} ❤️`, {
                body: msg.text,
                silent: false // Try to make sound if possible
            });
        }
    }
});

function renderMessages() {
    messagesArea.innerHTML = '';
    storedMessages.forEach(msg => {
        appendMessage(msg);
    });
    scrollToBottom();
}

// UI Helper Functions
function appendMessage(msg) {
    const messageDiv = document.createElement('div');
    const isMyMessage = msg.user === username;

    // Swipe listener
    addSwipeListener(messageDiv, msg);

    messageDiv.classList.add('message');
    if (isMyMessage) {
        messageDiv.classList.add('my-message');
    } else {
        messageDiv.classList.add('their-message');
    }

    if (msg.user === 'Utpal') messageDiv.classList.add('msg-utpal');
    if (msg.user === 'Khushi') messageDiv.classList.add('msg-khushi');

    let contentHtml = '';

    if (!isMyMessage) {
        contentHtml += `<span class="sender-name">${msg.user}</span>`;
    }

    // Render Reply Quote
    if (msg.replyTo) {
        contentHtml += `
            <div class="reply-quote">
                <strong>${msg.replyTo.user}</strong>
                <span>${msg.replyTo.text}</span>
            </div>
        `;
    }

    contentHtml += `${msg.text}`;

    messageDiv.innerHTML = contentHtml;
    messagesArea.appendChild(messageDiv);
}



function appendSystemMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'system');
    messageDiv.innerHTML = `<p>${text}</p>`;
    messagesArea.appendChild(messageDiv);
}

function scrollToBottom() {
    // fast scroll
    messagesArea.scrollTop = messagesArea.scrollHeight;

    // delayed scroll to ensure images/layout renders fully
    setTimeout(() => {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }, 100);
}

// ---- UI EFFECTS ----

// 1. Firefly Background
function initFireflies() {
    const blobsContainer = document.querySelector('.background-blobs');
    for (let i = 0; i < 20; i++) { // 20 fireflies
        const firefly = document.createElement('div');
        firefly.classList.add('firefly');

        // Random start position
        firefly.style.left = Math.random() * 100 + '%';
        firefly.style.top = Math.random() * 100 + '%';

        // Random destination
        const dx = (Math.random() - 0.5) * 200 + 'px';
        const dy = (Math.random() - 0.5) * 200 + 'px';
        firefly.style.setProperty('--dx', dx);
        firefly.style.setProperty('--dy', dy);

        // Random delay
        firefly.style.animationDelay = Math.random() * 5 + 's';

        blobsContainer.appendChild(firefly);
    }
}
initFireflies();

// 2. Floating Hearts
function spawnHeart() {
    const heart = document.createElement('div');
    heart.classList.add('floating-heart');
    heart.innerText = '❤️';
    // Randomize slightly
    heart.style.left = Math.random() * 80 + 10 + '%'; // Random X
    const size = Math.random() * 1.5 + 1; // Random size
    heart.style.transform = `scale(${size})`;

    document.body.appendChild(heart);

    setTimeout(() => {
        heart.remove();
    }, 4000);
}

// 3. Typing Indicator
let typingTimeout;
messageInput.addEventListener('input', () => {
    socket.emit('typing', username);

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('stop typing');
    }, 1000);
});

const typingDiv = document.createElement('div');
typingDiv.className = 'typing-indicator hidden';
typingDiv.innerHTML = `
    <span>Khushi is typing</span>
    <div class="typing-dots">
        <span></span><span></span><span></span>
    </div>
`;
messagesArea.parentNode.insertBefore(typingDiv, messagesArea.nextSibling); // Insert above input area

socket.on('typing', (user) => {
    if (user && user !== username) {
        typingDiv.querySelector('span').innerText = `${user} is typing`;
        typingDiv.classList.remove('hidden');
    }
});

socket.on('stop typing', () => {
    typingDiv.classList.add('hidden');
});

// Animation Listener
socket.on('animate', (type) => {
    if (type === 'hearts') {
        for (let i = 0; i < 5; i++) setTimeout(spawnHeart, i * 200);
    }
});

// Update sendMessage to trigger hearts
const heartTriggers = ['i love you', 'love', '❤️', 'miss you'];

// Overwrite sendMessage to add visual effects hook
// We grab the existing DOM element and logic is already bound.
// The easiest way is to add a listener to the send button that runs BEFORE the main one?
// No, let's just intercept the clicks.
// Or actually, let's just listen to 'chat message' on client side!
// When *I* send a message, socket.on('chat message') fires for me too? Yes.
// So I can just check in the existing socket.on('chat message') handler!

// Wait, I need to modify the socket.on handler to check for hearts.
// Or I can just add a NEW listener for 'chat message' since listeners stack.

socket.on('chat message', (msg) => {
    // Check for heart triggers
    if (heartTriggers.some(t => msg.text.toLowerCase().includes(t))) {
        // Only trigger if it's a new message (not history load)
        // This handler runs for live messages.
        // We want to sync the animation? The backend now emits 'animate' if we wanted.
        // But the previous implementation emits 'animate' manually? 
        // No, I didn't update sendMessage to emit 'animate'.
        // Let's just do it locally here for everyone who receives the message.
        for (let i = 0; i < 5; i++) setTimeout(spawnHeart, i * 200);
    }
});
