const socket = io();

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const nameButtons = document.querySelectorAll('.name-btn');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const messagesList = document.getElementById('messages');
const popupMsgButtons = document.querySelectorAll('.popup-msg');
const emojiBtn = document.getElementById('emoji-btn');
const emojiPicker = document.getElementById('emoji-picker');
const emojiGrid = document.getElementById('emoji-grid');

const POPUP_TEXTS = ['I love you so much babuu', 'I miss you'];

function isPopupMessage(text) {
    return POPUP_TEXTS.includes(text);
}

// Emoji list
const EMOJIS = [
    '😊', '😍', '🥰', '😘', '😗', '😙', '😚', '☺️', '😋', '😛',
    '😜', '😝', '🤑', '🤗', '🤔', '🤐', '🤨', '😐', '😑', '😶',
    '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴',
    '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😶‍🌫️', '😵',
    '😵‍💫', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁',
    '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰',
    '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫',
    '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💋',
    '💌', '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💟', '❣️',
    '💔', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎',
    '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️',
    '🗨️', '🗯️', '💭', '💤', '👋', '🤚', '🖐️', '✋', '🖖', '👌',
    '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆',
    '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏',
    '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵',
    '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀',
    '👁️', '👅', '👄', '💋', '🩸', '👶', '🧒', '👦', '👧', '🧑',
    '👱', '👨', '🧔', '👨‍🦰', '👨‍🦱', '👨‍🦳', '👨‍🦲', '👩', '👩‍🦰', '🧑‍🦰',
    '👩‍🦱', '🧑‍🦱', '👩‍🦳', '🧑‍🦳', '👩‍🦲', '🧑‍🦲', '👱‍♀️', '👱‍♂️', '🧓', '👴',
    '👵', '🙍', '🙍‍♂️', '🙍‍♀️', '🙎', '🙎‍♂️', '🙎‍♀️', '🙅', '🙅‍♂️', '🙅‍♀️',
    '🙆', '🙆‍♂️', '🙆‍♀️', '💁', '💁‍♂️', '💁‍♀️', '🙋', '🙋‍♂️', '🙋‍♀️', '🧏',
    '🧏‍♂️', '🧏‍♀️', '🤦', '🤦‍♂️', '🤦‍♀️', '🤷', '🤷‍♂️', '🤷‍♀️', '🙇', '🙇‍♂️',
    '🙇‍♀️', '🤦', '🤦‍♂️', '🤦‍♀️', '🤷', '🤷‍♂️', '🤷‍♀️', '🙇', '🙇‍♂️', '🙇‍♀️',
    '🤦', '🤦‍♂️', '🤦‍♀️', '🤷', '🤷‍♂️', '🤷‍♀️', '🙇', '🙇‍♂️', '🙇‍♀️'
];

// Initialize emoji picker
function initEmojiPicker() {
    EMOJIS.forEach(emoji => {
        const emojiBtn = document.createElement('button');
        emojiBtn.type = 'button';
        emojiBtn.className = 'emoji-item';
        emojiBtn.textContent = emoji;
        emojiBtn.addEventListener('click', () => {
            socket.emit('chat message', emoji);
            emojiPicker.classList.add('hidden');
        });
        emojiGrid.appendChild(emojiBtn);
    });
}

// Toggle emoji picker
emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    emojiPicker.classList.toggle('hidden');
});

// Close emoji picker when clicking outside
document.addEventListener('click', (e) => {
    if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
        emojiPicker.classList.add('hidden');
    }
});

// Initialize emoji picker when page loads
initEmojiPicker();

let myName = "";

// Notification permission and setup
async function requestNotificationPermission() {
    if ('Notification' in window) {
        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    }
}

function showNotification(title, body, icon = null) {
    if ('Notification' in window && Notification.permission === 'granted') {
        // Don't show notification if page is focused (user is actively viewing)
        // But still show if user wants to see notifications even when active
        const options = {
            body: body,
            icon: icon || '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'chat-message', // Replace previous notifications with same tag
            requireInteraction: false,
            silent: false
        };
        
        new Notification(title, options);
    }
}

// Join Chat - Handle name button clicks
nameButtons.forEach(button => {
    button.addEventListener('click', async () => {
        const name = button.getAttribute('data-name');
        if (name) {
            myName = name;
            socket.emit('join', name);
            loginScreen.classList.add('hidden');
            chatScreen.classList.remove('hidden');
            // Request notification permission when joining chat
            await requestNotificationPermission();
        }
    });
});

// Send Message
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = messageInput.value.trim();
    if (msg) {
        socket.emit('chat message', msg);
        messageInput.value = '';
    }
});

// Popup quick messages – send on click
popupMsgButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const msg = btn.getAttribute('data-msg');
        if (msg) {
            socket.emit('chat message', msg);
        }
    });
});

// Helper function to add message to chat
function addMessageToChat(data, isHistory = false) {
    const item = document.createElement('li');
    item.textContent = data.text;

    // Check if it's a system message
    if (data.user === 'system') {
        item.classList.add('message-system');
    } else if (data.user === myName) {
        item.classList.add('message-sent');
    } else {
        item.classList.add('message-received');
        // Show notification for messages from others (only for new messages, not history)
        if (!isHistory) {
            showNotification(`${data.user} sent a message`, data.text);
        }
    }
    
    if (isPopupMessage(data.text)) {
        item.classList.add('message-popup');
    }

    messagesList.appendChild(item);
    
    // Auto-scroll only for new messages, not when loading history
    if (!isHistory) {
        window.scrollTo(0, document.body.scrollHeight);
        messagesList.scrollTop = messagesList.scrollHeight;
    }
}

// Load message history when connecting
socket.on('message history', (history) => {
    // Clear any existing messages first
    messagesList.innerHTML = '';
    
    // Add all historical messages
    history.forEach(msg => {
        addMessageToChat(msg, true);
    });
    
    // Scroll to bottom after loading history
    setTimeout(() => {
        messagesList.scrollTop = messagesList.scrollHeight;
    }, 100);
});

// Receive Message
socket.on('chat message', (data) => {
    addMessageToChat(data, false);
});

// System Messages (for real-time updates, history is handled separately)
socket.on('system message', (msg) => {
    // Only add if not already in the list (to avoid duplicates when loading history)
    const existingMessages = Array.from(messagesList.children).map(li => li.textContent);
    if (!existingMessages.includes(msg)) {
        const systemData = { user: 'system', text: msg };
        addMessageToChat(systemData, false);
        // Show notification for system messages (like when someone joins/leaves)
        showNotification('Us & Always', msg);
    }
});
