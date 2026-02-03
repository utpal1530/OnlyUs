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
