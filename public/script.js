const socket = io();

// DOM Elements
const loginOverlay = document.getElementById('login-overlay');
const pinOverlay = document.getElementById('pin-overlay');
const btnUtpal = document.getElementById('btn-utpal');
const btnKhushi = document.getElementById('btn-khushi');
const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const imageBtn = document.getElementById('image-btn');
const imageInput = document.getElementById('image-input');
const messagesArea = document.getElementById('messages-area');
const daysCountSpan = document.getElementById('days-count');
const partnerStatus = document.getElementById('partner-status');
const emojiBtn = document.getElementById('emoji-btn');
const emojiPicker = document.querySelector('emoji-picker');
const replyIndicator = document.getElementById('reply-indicator');
const replyToUserSpan = document.getElementById('reply-to-user');
const replyPreviewP = document.getElementById('reply-preview');
const cancelReplyBtn = document.getElementById('cancel-reply');
const recordingIndicator = document.getElementById('recording-indicator');
const recordingTextSpan = document.getElementById('recording-text');
const surpriseBtn = document.getElementById('surprise-btn');
const searchBtn = document.getElementById('search-btn');
const searchBar = document.getElementById('search-bar');
const searchInput = document.getElementById('search-input');
const closeSearchBtn = document.getElementById('close-search');
const searchResults = document.getElementById('search-results');
const starredBtn = document.getElementById('starred-btn');
const starredPanel = document.getElementById('starred-panel');
const closeStarredBtn = document.getElementById('close-starred');
const starredMessagesContainer = document.getElementById('starred-messages');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings');
const soundToggle = document.getElementById('sound-toggle');
const notificationToggle = document.getElementById('notification-toggle');
const pinToggle = document.getElementById('pin-toggle');
const pinSettingSection = document.getElementById('pin-setting-section');
const clearDraftsBtn = document.getElementById('clear-drafts-btn');
const timeoutWarning = document.getElementById('timeout-warning');
const extendSessionBtn = document.getElementById('extend-session');
const loadMoreBtn = document.getElementById('load-more-btn');
const loadMoreDiv = document.getElementById('load-more');

// PIN elements
const pinDigits = document.querySelectorAll('.pin-digit');
const unlockBtn = document.getElementById('unlock-btn');
const pinError = document.getElementById('pin-error');
const pinSetupDigits = document.querySelectorAll('.pin-setup-digit');
const savePinBtn = document.getElementById('save-pin-btn');

let username = '';
let storedMessages = [];
let replyingTo = null;
let currentOffset = 0;
let hasMoreMessages = false;

// Voice recording state
let mediaRecorder = null;
let isRecording = false;
let audioChunks = [];
let recordingStartTime = null;
let recordingTimerId = null;
const MAX_RECORDING_SECONDS = 60;

// Settings
let settings = {
    soundEnabled: true,
    notificationsEnabled: true,
    pinEnabled: false,
    pin: null
};

// Session management
let sessionActivityTimer = null;
let sessionWarningTimer = null;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const SESSION_WARNING = 25 * 60 * 1000; // Warn at 25 minutes

// Draft messages
let draftMessages = {};

// Reaction picker
let selectedMessageForReaction = null;
const reactionPicker = document.createElement('div');
reactionPicker.id = 'reaction-picker';
reactionPicker.className = 'reaction-picker hidden';
reactionPicker.innerHTML = `
    <div class="reaction-options">
        <button class="reaction-btn" data-emoji="❤️">❤️</button>
        <button class="reaction-btn" data-emoji="😍">😍</button>
        <button class="reaction-btn" data-emoji="😂">😂</button>
        <button class="reaction-btn" data-emoji="🥺">🥺</button>
        <button class="reaction-btn" data-emoji="🔥">🔥</button>
        <button class="reaction-btn" data-emoji="👏">👏</button>
    </div>
`;
document.body.appendChild(reactionPicker);

// Relationship Start Date Logic
const startDate = new Date('2026-01-06');
const today = new Date();
const timeDiff = today - startDate;
const daysTogether = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
daysCountSpan.innerText = `Together for ${daysTogether} days 💕`;

// Load settings from localStorage
function loadSettings() {
    const saved = localStorage.getItem('chatSettings');
    if (saved) {
        settings = JSON.parse(saved);
        soundToggle.checked = settings.soundEnabled;
        notificationToggle.checked = settings.notificationsEnabled;
        pinToggle.checked = settings.pinEnabled;
        if (settings.pinEnabled && settings.pin) {
            pinSettingSection.classList.remove('hidden');
        }
    }
}

// Save settings
function saveSettings() {
    localStorage.setItem('chatSettings', JSON.stringify(settings));
}

// PIN Management
function checkPinRequired() {
    if (settings.pinEnabled && settings.pin) {
        const sessionUnlocked = sessionStorage.getItem('pinUnlocked');
        if (!sessionUnlocked) {
            pinOverlay.classList.remove('hidden');
            pinDigits[0].focus();
            return true;
        }
    }
    return false;
}

function validatePin() {
    const enteredPin = Array.from(pinDigits).map(input => input.value).join('');
    if (enteredPin === settings.pin) {
        sessionStorage.setItem('pinUnlocked', 'true');
        pinOverlay.classList.add('hidden');
        pinDigits.forEach(d => d.value = '');
        pinError.classList.add('hidden');
        return true;
    } else {
        pinError.classList.remove('hidden');
        pinDigits.forEach(d => {
            d.value = '';
            d.classList.add('shake');
        });
        setTimeout(() => {
            pinDigits.forEach(d => d.classList.remove('shake'));
        }, 500);
        pinDigits[0].focus();
        return false;
    }
}

pinDigits.forEach((digit, index) => {
    digit.addEventListener('input', (e) => {
        if (e.target.value && index < pinDigits.length - 1) {
            pinDigits[index + 1].focus();
        }
    });
    
    digit.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            pinDigits[index - 1].focus();
        }
        if (e.key === 'Enter') {
            validatePin();
        }
    });
});

unlockBtn.addEventListener('click', validatePin);

pinToggle.addEventListener('change', (e) => {
    settings.pinEnabled = e.target.checked;
    if (e.target.checked) {
        pinSettingSection.classList.remove('hidden');
    } else {
        pinSettingSection.classList.add('hidden');
        settings.pin = null;
    }
    saveSettings();
});

pinSetupDigits.forEach((digit, index) => {
    digit.addEventListener('input', (e) => {
        if (e.target.value && index < pinSetupDigits.length - 1) {
            pinSetupDigits[index + 1].focus();
        }
    });
    
    digit.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            pinSetupDigits[index - 1].focus();
        }
    });
});

savePinBtn.addEventListener('click', () => {
    const pin = Array.from(pinSetupDigits).map(input => input.value).join('');
    if (pin.length === 4) {
        settings.pin = pin;
        saveSettings();
        alert('PIN saved successfully! 🔐');
        pinSetupDigits.forEach(d => d.value = '');
    } else {
        alert('Please enter a 4-digit PIN');
    }
});

// Session Timeout Management
function resetSessionTimer() {
    clearTimeout(sessionActivityTimer);
    clearTimeout(sessionWarningTimer);
    timeoutWarning.classList.add('hidden');
    
    sessionWarningTimer = setTimeout(() => {
        if (username) {
            timeoutWarning.classList.remove('hidden');
        }
    }, SESSION_WARNING);
    
    sessionActivityTimer = setTimeout(() => {
        if (username) {
            logout();
            alert('Session expired due to inactivity. Please login again.');
        }
    }, SESSION_TIMEOUT);
}

function logout() {
    username = '';
    chatContainer.classList.add('hidden');
    loginOverlay.classList.remove('hidden');
    loginOverlay.style.opacity = '1';
    sessionStorage.removeItem('pinUnlocked');
    clearTimeout(sessionActivityTimer);
    clearTimeout(sessionWarningTimer);
}

extendSessionBtn.addEventListener('click', () => {
    resetSessionTimer();
    timeoutWarning.classList.add('hidden');
});

// Track user activity
document.addEventListener('click', resetSessionTimer);
document.addEventListener('keypress', resetSessionTimer);
document.addEventListener('touchstart', resetSessionTimer);

// Login Logic
function loginAs(name) {
    if (name) {
        username = name;
        
        if (checkPinRequired()) {
            return;
        }
        
        loginOverlay.style.opacity = '0';
        
        if ('Notification' in window && Notification.permission !== 'granted' && settings.notificationsEnabled) {
            Notification.requestPermission();
        }
        
        // Notify server
        socket.emit('user login', username);
        
        // Load messages with pagination
        socket.emit('load history', { limit: 50, offset: 0 });
        
        // Load drafts
        loadDrafts();
        
        // Start session timer
        resetSessionTimer();
        
        setTimeout(() => {
            loginOverlay.classList.add('hidden');
            chatContainer.classList.remove('hidden');
            scrollToBottom();
            appendSystemMessage(`Welcome back, ${username} ❤️`);
            scrollToBottom();
        }, 500);
    }
}

btnUtpal.addEventListener('click', () => loginAs('Utpal'));
btnKhushi.addEventListener('click', () => loginAs('Khushi'));

// Draft Messages
function loadDrafts() {
    const saved = localStorage.getItem(`drafts_${username}`);
    if (saved) {
        draftMessages = JSON.parse(saved);
    }
}

function saveDrafts() {
    if (username) {
        localStorage.setItem(`drafts_${username}`, JSON.stringify(draftMessages));
    }
}

function saveCurrentDraft() {
    if (username && messageInput.value.trim()) {
        draftMessages['current'] = messageInput.value;
        saveDrafts();
    }
}

function loadCurrentDraft() {
    if (draftMessages['current']) {
        messageInput.value = draftMessages['current'];
    }
}

// Optimized typing with debouncing for mobile performance
let draftSaveTimeout;
let isTyping = false;

messageInput.addEventListener('input', (e) => {
    // Use requestAnimationFrame for smooth UI updates
    requestAnimationFrame(() => {
        // Debounce draft saving
        clearTimeout(draftSaveTimeout);
        draftSaveTimeout = setTimeout(() => {
            saveCurrentDraft();
        }, 500);
    });
    
    // Add typing class to disable heavy animations
    if (!isTyping) {
        isTyping = true;
        document.body.classList.add('typing');
    }
    
    // Clear typing class after input stops
    clearTimeout(window.typingClassTimeout);
    window.typingClassTimeout = setTimeout(() => {
        isTyping = false;
        document.body.classList.remove('typing');
    }, 1000);
});

clearDraftsBtn.addEventListener('click', () => {
    draftMessages = {};
    saveDrafts();
    messageInput.value = '';
    alert('All drafts cleared! 🗑️');
});

// Emoji Logic
emojiBtn.addEventListener('click', () => {
    emojiPicker.classList.toggle('hidden');
});

emojiPicker.addEventListener('emoji-click', event => {
    messageInput.value += event.detail.unicode;
    messageInput.focus();
    saveCurrentDraft();
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
        if (diff > 0 && diff < 100) {
            messageElement.style.transform = `translateX(${diff}px)`;
        }
    });

    messageElement.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        messageElement.style.transform = 'translateX(0)';
        if (touchEndX - touchStartX > 50) {
            setReply(msgData);
        }
    });

    messageElement.addEventListener('dblclick', () => {
        toggleStarMessage(msgData);
    });
    
    // Long press for reactions
    let longPressTimer;
    messageElement.addEventListener('mousedown', (e) => {
        longPressTimer = setTimeout(() => {
            showReactionPicker(e, msgData);
        }, 500);
    });
    
    messageElement.addEventListener('mouseup', () => {
        clearTimeout(longPressTimer);
    });
    
    messageElement.addEventListener('mouseleave', () => {
        clearTimeout(longPressTimer);
    });
    
    messageElement.addEventListener('touchstart', (e) => {
        longPressTimer = setTimeout(() => {
            showReactionPicker(e.touches[0], msgData);
        }, 500);
    });
    
    messageElement.addEventListener('touchend', () => {
        clearTimeout(longPressTimer);
    });
}

function setReply(msgData) {
    replyingTo = {
        user: msgData.user,
        text: msgData.text,
        id: msgData.id
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

// Star Messages
function toggleStarMessage(msgData) {
    if (!msgData.id) return;
    
    socket.emit('toggle star', {
        messageId: msgData.id,
        user: username
    });
}

socket.on('star toggled', (data) => {
    const messageEl = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (messageEl) {
        const starEl = messageEl.querySelector('.message-star');
        if (starEl) {
            if (data.starred) {
                starEl.classList.add('starred');
                starEl.textContent = '⭐';
            } else {
                starEl.classList.remove('starred');
                starEl.textContent = '☆';
            }
        }
    }
    
    // Show notification
    if (data.starred) {
        showToast('Added to Special Moments ⭐');
    }
});

// Load starred messages
starredBtn.addEventListener('click', () => {
    socket.emit('get starred messages', username);
    starredPanel.classList.remove('hidden');
});

closeStarredBtn.addEventListener('click', () => {
    starredPanel.classList.add('hidden');
});

socket.on('starred messages', (messages) => {
    starredMessagesContainer.innerHTML = '';
    if (messages.length === 0) {
        starredMessagesContainer.innerHTML = '<p class="empty-starred">No starred messages yet. Double-tap a message to star it! ⭐</p>';
    } else {
        messages.reverse().forEach(msg => {
            const msgEl = createMessageElement(msg, false);
            starredMessagesContainer.appendChild(msgEl);
        });
    }
});

// Reaction Picker
function showReactionPicker(e, msgData) {
    if (!msgData.id) return;
    
    selectedMessageForReaction = msgData.id;
    const rect = e.target.getBoundingClientRect();
    reactionPicker.style.left = `${rect.left}px`;
    reactionPicker.style.top = `${rect.top - 60}px`;
    reactionPicker.classList.remove('hidden');
}

document.querySelectorAll('.reaction-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (selectedMessageForReaction) {
            socket.emit('add reaction', {
                messageId: selectedMessageForReaction,
                emoji: btn.getAttribute('data-emoji'),
                user: username
            });
            reactionPicker.classList.add('hidden');
            selectedMessageForReaction = null;
        }
    });
});

document.addEventListener('click', (e) => {
    if (!reactionPicker.contains(e.target)) {
        reactionPicker.classList.add('hidden');
        selectedMessageForReaction = null;
    }
});

socket.on('reaction updated', (data) => {
    const messageEl = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (messageEl) {
        updateReactions(messageEl, data.reactions);
    }
});

function updateReactions(messageEl, reactions) {
    let reactionsContainer = messageEl.querySelector('.message-reactions');
    if (!reactionsContainer) {
        reactionsContainer = document.createElement('div');
        reactionsContainer.className = 'message-reactions';
        messageEl.appendChild(reactionsContainer);
    }
    
    reactionsContainer.innerHTML = '';
    
    for (const [emoji, users] of Object.entries(reactions)) {
        const reactionEl = document.createElement('div');
        reactionEl.className = 'reaction';
        if (users.includes(username)) {
            reactionEl.classList.add('user-reacted');
        }
        reactionEl.innerHTML = `${emoji} <span class="reaction-count">${users.length}</span>`;
        reactionEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const messageId = messageEl.getAttribute('data-message-id');
            socket.emit('add reaction', {
                messageId: messageId,
                emoji: emoji,
                user: username
            });
        });
        reactionsContainer.appendChild(reactionEl);
    }
}

// Surprise Love Note Logic
const surpriseMessages = [
    'You are my favourite notification every day ❤️',
    'If I could choose again, I would still choose you a thousand times 💞',
    'Thank you for being my safe place and my happiness 🥺❤️',
    'Every time my phone lights up with your name, my heart does too 💗',
    'I still get butterflies when I talk to you 🦋❤️',
    'You + Me = Forever my favourite maths 🤍',
    'No distance, no fight, nothing can change how much I love you 🫶',
    'You are my best decision, my peace, and my madness in one person 💕'
];

if (surpriseBtn) {
    surpriseBtn.addEventListener('click', () => {
        if (!username) return;
        const msg = surpriseMessages[Math.floor(Math.random() * surpriseMessages.length)];
        sendMessage(msg);
        socket.emit('animate', 'hearts');
    });
}

// Send Message Logic
function sendMessage(textOverride = null) {
    const text = textOverride || messageInput.value.trim();
    if (text && username) {
        const messageData = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            user: username,
            type: 'text',
            text: text,
            timestamp: new Date().toISOString(),
            replyTo: replyingTo,
            readBy: [username],
            reactions: {},
            starredBy: []
        };
        
        socket.emit('chat message', messageData);

        if (!textOverride) {
            messageInput.value = '';
            messageInput.focus();
            delete draftMessages['current'];
            saveDrafts();
        }
        emojiPicker.classList.add('hidden');
        clearReply();
    }
}

sendBtn.addEventListener('click', () => sendMessage());
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Image Upload
imageBtn.addEventListener('click', () => {
    imageInput.click();
});

imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !username) return;
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (data.url) {
            const messageData = {
                id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                user: username,
                type: 'image',
                text: '📷 Image',
                imageUrl: data.url,
                timestamp: new Date().toISOString(),
                replyTo: replyingTo,
                readBy: [username],
                reactions: {},
                starredBy: []
            };
            
            socket.emit('chat message', messageData);
            clearReply();
        }
    } catch (err) {
        console.error('Error uploading image:', err);
        showToast('Failed to upload image 😢');
    }
    
    imageInput.value = '';
});

// Voice Recording Logic
function updateMicUi() {
    if (!micBtn) return;
    if (isRecording) {
        micBtn.classList.add('recording');
        micBtn.textContent = '⏹';
    } else {
        micBtn.classList.remove('recording');
        micBtn.textContent = '🎤';
    }
}

function startRecordingTimer() {
    if (!recordingIndicator || !recordingTextSpan) return;
    recordingStartTime = Date.now();
    recordingIndicator.classList.remove('hidden');

    const update = () => {
        const elapsedMs = Date.now() - recordingStartTime;
        const totalSeconds = Math.floor(elapsedMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        recordingTextSpan.textContent = `Recording ${minutes}:${seconds.toString().padStart(2, '0')}`;

        if (totalSeconds >= MAX_RECORDING_SECONDS && isRecording && mediaRecorder) {
            mediaRecorder.stop();
        }
    };

    update();
    recordingTimerId = setInterval(update, 1000);
}

function stopRecordingTimer() {
    if (recordingTimerId) {
        clearInterval(recordingTimerId);
        recordingTimerId = null;
    }
    if (recordingIndicator) {
        recordingIndicator.classList.add('hidden');
    }
}

async function toggleRecording() {
    if (!username) return;

    if (isRecording && mediaRecorder) {
        mediaRecorder.stop();
        isRecording = false;
        updateMicUi();
        stopRecordingTimer();
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            stopRecordingTimer();
            isRecording = false;
            updateMicUi();
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            const duration = Math.floor((Date.now() - recordingStartTime) / 1000);

            stream.getTracks().forEach(track => track.stop());

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Audio = reader.result;

                const messageData = {
                    id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                    user: username,
                    type: 'audio',
                    text: '🎤 Voice message',
                    audio: base64Audio,
                    duration: duration,
                    timestamp: new Date().toISOString(),
                    replyTo: replyingTo,
                    readBy: [username],
                    reactions: {},
                    starredBy: []
                };

                socket.emit('chat message', messageData);
                clearReply();
            };
            reader.readAsDataURL(blob);
        };

        mediaRecorder.start();
        isRecording = true;
        updateMicUi();
        startRecordingTimer();
    } catch (err) {
        console.error('Error accessing microphone:', err);
        showToast('Could not access microphone 😢');
        isRecording = false;
        updateMicUi();
        stopRecordingTimer();
    }
}

if (micBtn && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    micBtn.addEventListener('click', toggleRecording);
} else if (micBtn) {
    micBtn.style.display = 'none';
}

// Search functionality
searchBtn.addEventListener('click', () => {
    searchBar.classList.remove('hidden');
    searchInput.focus();
});

closeSearchBtn.addEventListener('click', () => {
    searchBar.classList.add('hidden');
    searchResults.classList.add('hidden');
    searchInput.value = '';
});

searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (query.length > 2) {
        socket.emit('search messages', { query, user: username });
    } else {
        searchResults.classList.add('hidden');
    }
});

socket.on('search results', (results) => {
    searchResults.innerHTML = '';
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item">No messages found</div>';
    } else {
        results.forEach(msg => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = `
                <strong>${msg.user}</strong>
                <p>${msg.text}</p>
            `;
            item.addEventListener('click', () => {
                scrollToMessage(msg.id);
                searchBar.classList.add('hidden');
                searchResults.classList.add('hidden');
            });
            searchResults.appendChild(item);
        });
    }
    searchResults.classList.remove('hidden');
});

function scrollToMessage(messageId) {
    const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageEl) {
        messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageEl.style.animation = 'pulse 1s ease';
        setTimeout(() => {
            messageEl.style.animation = '';
        }, 1000);
    }
}

// Settings
settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

soundToggle.addEventListener('change', (e) => {
    settings.soundEnabled = e.target.checked;
    saveSettings();
});

notificationToggle.addEventListener('change', (e) => {
    settings.notificationsEnabled = e.target.checked;
    saveSettings();
});

// Sound Effects
function playSound(soundId) {
    if (settings.soundEnabled) {
        const sound = document.getElementById(soundId);
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log('Sound play failed:', e));
        }
    }
}

// Toast notifications
function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(15, 12, 41, 0.95);
        color: white;
        padding: 12px 25px;
        border-radius: 25px;
        z-index: 300;
        font-size: 0.9rem;
        border: 1px solid var(--glass-border);
        animation: slideUp 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// Receive Message Logic
socket.on('load history', (data) => {
    storedMessages = data.messages;
    hasMoreMessages = data.hasMore;
    currentOffset = 0;
    
    if (username) {
        renderMessages();
        if (hasMoreMessages) {
            loadMoreDiv.classList.remove('hidden');
        }
        loadCurrentDraft();
    }
});

loadMoreBtn.addEventListener('click', () => {
    currentOffset += 50;
    socket.emit('load history', { limit: 50, offset: currentOffset });
});

socket.on('chat message', (msg) => {
    if (!msg.type) msg.type = 'text';

    const isNewMessage = !storedMessages.find(m => m.id === msg.id);
    if (isNewMessage) {
        storedMessages.push(msg);
    }
    
    if (username) {
        appendMessage(msg);
        scrollToBottom();

        if (msg.user !== username) {
            playSound('sound-notification');
            
            if ('Notification' in window && Notification.permission === 'granted' && settings.notificationsEnabled) {
                new Notification(`${msg.user} ❤️`, {
                    body: msg.type === 'text' ? msg.text : `Sent a ${msg.type} message`,
                    silent: false
                });
            }
            
            // Mark as read if chat is visible
            if (msg.id) {
                socket.emit('message read', {
                    messageId: msg.id,
                    user: username
                });
            }
        } else {
            playSound('sound-message');
        }
    }
});

// Read receipts
socket.on('message read receipt', (data) => {
    const messageEl = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (messageEl) {
        const receiptEl = messageEl.querySelector('.read-receipt');
        if (receiptEl) {
            receiptEl.classList.add('read');
            receiptEl.textContent = '✓✓';
        }
    }
});

function renderMessages() {
    messagesArea.innerHTML = '';
    
    if (hasMoreMessages) {
        loadMoreDiv.classList.remove('hidden');
        messagesArea.appendChild(loadMoreDiv);
    }
    
    let lastDate = null;
    
    storedMessages.forEach(msg => {
        const msgDate = new Date(msg.timestamp).toDateString();
        if (msgDate !== lastDate) {
            appendDateSeparator(msgDate);
            lastDate = msgDate;
        }
        appendMessage(msg, false);
    });
    
    scrollToBottom();
}

function appendDateSeparator(dateStr) {
    const separator = document.createElement('div');
    separator.className = 'date-separator';
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let label = dateStr;
    if (date.toDateString() === today.toDateString()) {
        label = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        label = 'Yesterday';
    }
    
    separator.innerHTML = `<span>${label}</span>`;
    messagesArea.appendChild(separator);
}

// UI Helper Functions
function appendMessage(msg, animate = true) {
    const existingMsg = document.querySelector(`[data-message-id="${msg.id}"]`);
    if (existingMsg) {
        // Update existing message (for reactions)
        if (msg.reactions) {
            updateReactions(existingMsg, msg.reactions);
        }
        return;
    }
    
    const messageEl = createMessageElement(msg, animate);
    messagesArea.appendChild(messageEl);
}

function createMessageElement(msg, animate = true) {
    const messageDiv = document.createElement('div');
    const isMyMessage = msg.user === username;

    if (animate) {
        messageDiv.style.animation = 'messagePop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    }

    messageDiv.classList.add('message');
    if (isMyMessage) {
        messageDiv.classList.add('my-message');
    } else {
        messageDiv.classList.add('their-message');
    }

    if (msg.user === 'Utpal') messageDiv.classList.add('msg-utpal');
    if (msg.user === 'Khushi') messageDiv.classList.add('msg-khushi');
    
    if (msg.id) {
        messageDiv.setAttribute('data-message-id', msg.id);
    }

    let contentHtml = '';

    if (!isMyMessage) {
        contentHtml += `<span class="sender-name">${msg.user}</span>`;
    }

    // Star indicator
    const isStarred = msg.starredBy && msg.starredBy.includes(username);
    contentHtml += `<span class="message-star ${isStarred ? 'starred' : ''}">${isStarred ? '⭐' : '☆'}</span>`;

    // Render Reply Quote
    if (msg.replyTo && msg.replyTo.text) {
        contentHtml += `
            <div class="reply-quote">
                <strong>${msg.replyTo.user}</strong>
                <span>${msg.replyTo.text}</span>
            </div>
        `;
    }

    // Render message content based on type
    if (msg.type === 'audio' && msg.audio) {
        const durationStr = msg.duration ? `<span class="voice-duration">${Math.floor(msg.duration / 60)}:${(msg.duration % 60).toString().padStart(2, '0')}</span>` : '';
        contentHtml += `
            <div class="voice-label">🎧 Voice message</div>
            <audio controls class="voice-msg-player">
                <source src="${msg.audio}" type="audio/webm">
                Your browser does not support the audio element.
            </audio>
            ${durationStr}
        `;
    } else if (msg.type === 'image' && msg.imageUrl) {
        contentHtml += `<img src="${msg.imageUrl}" class="message-image" alt="Shared image">`;
    } else {
        contentHtml += `${msg.text}`;
    }

    // Timestamp
    const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Read receipt
    const readBy = msg.readBy || [];
    const otherUser = isMyMessage ? (username === 'Utpal' ? 'Khushi' : 'Utpal') : null;
    const isRead = otherUser && readBy.includes(otherUser);
    const receiptStr = isMyMessage ? `<span class="read-receipt ${isRead ? 'read' : ''}">${isRead ? '✓✓' : '✓'}</span>` : '';
    
    contentHtml += `<div class="message-timestamp">${timeStr} ${receiptStr}</div>`;

    messageDiv.innerHTML = contentHtml;
    
    // Add reactions if any
    if (msg.reactions && Object.keys(msg.reactions).length > 0) {
        updateReactions(messageDiv, msg.reactions);
    }
    
    // Add swipe listener
    addSwipeListener(messageDiv, msg);
    
    // Image click to enlarge
    if (msg.type === 'image') {
        const img = messageDiv.querySelector('.message-image');
        if (img) {
            img.addEventListener('click', () => {
                showImageModal(msg.imageUrl);
            });
        }
    }
    
    return messageDiv;
}

function showImageModal(imageUrl) {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <img src="${imageUrl}" alt="Full size image">
        <button class="close-modal">✕</button>
    `;
    modal.addEventListener('click', () => modal.remove());
    document.body.appendChild(modal);
}

function appendSystemMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'system');
    messageDiv.innerHTML = `<p>${text}</p>`;
    messagesArea.appendChild(messageDiv);
}

function scrollToBottom() {
    messagesArea.scrollTop = messagesArea.scrollHeight;
    setTimeout(() => {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }, 100);
}

// Online Status
socket.on('user online', (data) => {
    if (data.username !== username) {
        const indicator = partnerStatus.querySelector('.status-indicator');
        const text = partnerStatus.querySelector('.status-text');
        indicator.classList.remove('offline');
        indicator.classList.add('online');
        text.textContent = 'Online';
        showToast(`${data.username} is online 💚`);
    }
});

socket.on('user offline', (data) => {
    if (data.username !== username) {
        const indicator = partnerStatus.querySelector('.status-indicator');
        const text = partnerStatus.querySelector('.status-text');
        indicator.classList.remove('online');
        indicator.classList.add('offline');
        const lastSeen = new Date(data.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        text.textContent = `Last seen ${lastSeen}`;
    }
});

// Check online status on load
fetch('/api/online-status')
    .then(res => res.json())
    .then(status => {
        const otherUser = username === 'Utpal' ? 'Khushi' : 'Utpal';
        if (status[otherUser]) {
            const indicator = partnerStatus.querySelector('.status-indicator');
            const text = partnerStatus.querySelector('.status-text');
            if (status[otherUser].online) {
                indicator.classList.remove('offline');
                indicator.classList.add('online');
                text.textContent = 'Online';
            } else if (status[otherUser].lastSeen) {
                const lastSeen = new Date(status[otherUser].lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                text.textContent = `Last seen ${lastSeen}`;
            }
        }
    })
    .catch(err => console.log('Failed to fetch online status'));

// ---- UI EFFECTS ----

// 1. Firefly Background - Reduced for mobile performance
function initFireflies() {
    const blobsContainer = document.querySelector('.background-blobs');
    const isMobile = window.matchMedia('(pointer: coarse)').matches;
    const fireflyCount = isMobile ? 8 : 15; // Fewer on mobile
    
    for (let i = 0; i < fireflyCount; i++) {
        const firefly = document.createElement('div');
        firefly.classList.add('firefly');
        firefly.style.left = Math.random() * 100 + '%';
        firefly.style.top = Math.random() * 100 + '%';
        const dx = (Math.random() - 0.5) * 200 + 'px';
        const dy = (Math.random() - 0.5) * 200 + 'px';
        firefly.style.setProperty('--dx', dx);
        firefly.style.setProperty('--dy', dy);
        firefly.style.animationDelay = Math.random() * 5 + 's';
        firefly.style.willChange = 'transform, opacity';
        blobsContainer.appendChild(firefly);
    }
}

// Initialize after page load for better performance
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFireflies);
} else {
    initFireflies();
}

// 2. Floating Hearts
function spawnHeart() {
    const heart = document.createElement('div');
    heart.classList.add('floating-heart');
    heart.innerText = '❤️';
    heart.style.left = Math.random() * 80 + 10 + '%';
    const size = Math.random() * 1.5 + 1;
    heart.style.transform = `scale(${size})`;

    document.body.appendChild(heart);

    setTimeout(() => {
        heart.remove();
    }, 4000);
}

// 3. Typing Indicator - Optimized for mobile
let typingTimeout;
let lastTypingEmit = 0;
const TYPING_DEBOUNCE = 2000; // Emit typing every 2 seconds max

messageInput.addEventListener('input', () => {
    const now = Date.now();
    if (now - lastTypingEmit > TYPING_DEBOUNCE) {
        socket.emit('typing', username);
        lastTypingEmit = now;
    }
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('stop typing');
        lastTypingEmit = 0;
    }, 1500);
});

const typingDiv = document.createElement('div');
typingDiv.className = 'typing-indicator hidden';
typingDiv.innerHTML = `
    <span>Someone is typing</span>
    <div class="typing-dots">
        <span></span><span></span><span></span>
    </div>
`;
messagesArea.parentNode.insertBefore(typingDiv, messagesArea.nextSibling);

socket.on('typing', (user) => {
    if (user && user !== username) {
        typingDiv.querySelector('span').innerText = `${user} is typing...`;
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

// Heart triggers
const heartTriggers = ['i love you', 'love', '❤️', 'miss you'];

socket.on('chat message', (msg) => {
    if (msg.type === 'text' && heartTriggers.some(t => msg.text.toLowerCase().includes(t))) {
        for (let i = 0; i < 5; i++) setTimeout(spawnHeart, i * 200);
    }
});

// Initialize
loadSettings();

// Periodic online status check
setInterval(() => {
    if (username) {
        fetch('/api/online-status')
            .then(res => res.json())
            .catch(() => {});
    }
}, 30000); // Every 30 seconds

// Save drafts on page unload
window.addEventListener('beforeunload', () => {
    saveCurrentDraft();
});

// Add pulse animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.4); }
        50% { box-shadow: 0 0 20px 10px rgba(255, 107, 107, 0); }
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

// Mobile keyboard optimization
// Prevent viewport jumping when keyboard opens
const viewport = document.querySelector('meta[name=viewport]');

// Handle virtual keyboard on mobile
if ('visualViewport' in window) {
    window.visualViewport.addEventListener('resize', () => {
        // Smooth scroll to keep input visible
        if (document.activeElement === messageInput) {
            requestAnimationFrame(() => {
                messageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }
    });
}

// Optimize input focus for mobile
messageInput.addEventListener('focus', () => {
    // Disable heavy animations temporarily
    document.body.classList.add('keyboard-open');
    
    // Smooth scroll after keyboard opens
    setTimeout(() => {
        scrollToBottom();
    }, 300);
});

messageInput.addEventListener('blur', () => {
    document.body.classList.remove('keyboard-open');
});

// Passive event listeners for better scroll performance
document.addEventListener('touchstart', () => {}, { passive: true });
document.addEventListener('touchmove', () => {}, { passive: true });
document.addEventListener('scroll', () => {}, { passive: true });

// Reduce motion preference support
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.body.classList.add('reduce-motion');
}
