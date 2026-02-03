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

let username = '';

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
        setTimeout(() => {
            loginOverlay.classList.add('hidden');
            chatContainer.classList.remove('hidden');
            appendSystemMessage(`Welcome back, ${username} ❤️`);
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

// Send Message Logic
function sendMessage(textOverride = null) {
    const text = textOverride || messageInput.value.trim();
    if (text && username) {
        const messageData = {
            user: username,
            text: text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        socket.emit('chat message', messageData);

        if (!textOverride) {
            messageInput.value = '';
            messageInput.focus();
        }
        emojiPicker.classList.add('hidden');
    }
}

sendBtn.addEventListener('click', () => sendMessage());
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Receive Message Logic
socket.on('chat message', (msg) => {
    appendMessage(msg);
    scrollToBottom();
});

// UI Helper Functions
function appendMessage(msg) {
    const messageDiv = document.createElement('div');
    const isMyMessage = msg.user === username;

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
    messagesArea.scrollTop = messagesArea.scrollHeight;
}
