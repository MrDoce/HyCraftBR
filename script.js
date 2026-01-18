// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAP9kLr_FquLJBKjxBn4mdrwzc5SUE7gDY",
    authDomain: "hycraf-br.firebaseapp.com",
    databaseURL: "https://hycraf-br-default-rtdb.firebaseio.com",
    projectId: "hycraf-br",
    storageBucket: "hycraf-br.firebasestorage.app",
    messagingSenderId: "79682829599",
    appId: "1:79682829599:web:992462504dadd96900c42a",
    measurementId: "G-C2MQ58CTJL"
};

// Inicializar Firebase
let db = null;
let chatRef = null;
let isFirebaseConfigured = false;

try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    chatRef = db.ref('chat/messages');
    isFirebaseConfigured = true;
    
    // Verificar conexão em background
    db.ref('.info/connected').on('value', (snapshot) => {
        if (snapshot.val() === true) {
            console.log('✅ Firebase Realtime Database conectado!');
        }
    });
    
    console.log('Firebase inicializado com sucesso!');
} catch (error) {
    console.error('Erro ao inicializar Firebase:', error);
    isFirebaseConfigured = false;
}

// Estado do chat
let chatOpen = false;
let messageCount = 0;
let userName = 'Usuário' + Math.floor(Math.random() * 1000);

// Função para copiar IP do servidor
function copyServerIp() {
    const serverIp = document.getElementById('serverIp').textContent;
    const feedback = document.getElementById('copyFeedback');
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(serverIp).then(() => {
            showCopyFeedback(feedback);
        }).catch(() => {
            fallbackCopyTextToClipboard(serverIp, feedback);
        });
    } else {
        fallbackCopyTextToClipboard(serverIp, feedback);
    }
}

function fallbackCopyTextToClipboard(text, feedback) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopyFeedback(feedback);
    } catch (err) {
        console.error('Erro ao copiar texto:', err);
    }
    
    document.body.removeChild(textArea);
}

function showCopyFeedback(feedback) {
    feedback.textContent = '✓ IP copiado!';
    feedback.classList.add('show');
    
    setTimeout(() => {
        feedback.classList.remove('show');
    }, 2000);
}

// Toggle do chat
function toggleChat() {
    const chatWidget = document.getElementById('chatWidget');
    const chatButton = document.getElementById('chatButton');
    
    chatOpen = !chatOpen;
    
    if (chatOpen) {
        chatWidget.classList.add('open');
        chatButton.classList.add('hidden');
        connectToChat();
    } else {
        chatWidget.classList.remove('open');
        chatButton.classList.remove('hidden');
        disconnectFromChat();
    }
}

// Conectar ao chat Firebase
function connectToChat() {
    if (!isFirebaseConfigured || !db || !chatRef) {
        addMessageToChat('Sistema', '⚠️ Firebase Realtime Database não está configurado.', false);
        addMessageToChat('Sistema', '📝 Para ativar o chat:', false);
        addMessageToChat('Sistema', '1. Acesse: https://console.firebase.google.com/project/hycraf-br/database', false);
        addMessageToChat('Sistema', '2. Clique em "Criar banco de dados"', false);
        addMessageToChat('Sistema', '3. Escolha "Modo de teste" e confirme', false);
        addMessageToChat('Sistema', '4. Recarregue esta página', false);
        return;
    }

    // Verificar conexão primeiro
    const connectedRef = db.ref('.info/connected');
    connectedRef.on('value', (snapshot) => {
        if (snapshot.val() === true) {
            // Conectado - carregar mensagens
            chatRef.limitToLast(50).once('value', (snapshot) => {
                const messagesContainer = document.getElementById('chatMessages');
                messagesContainer.innerHTML = '';
                
                const messages = snapshot.val();
                if (messages) {
                    Object.values(messages).forEach(msg => {
                        addMessageToChat(msg.user, msg.text, msg.user === userName);
                    });
                }
                addMessageToChat('Sistema', '✅ Conectado ao chat!', false);
            }).catch((error) => {
                console.error('Erro ao carregar mensagens:', error);
                addMessageToChat('Sistema', '❌ Erro ao carregar mensagens. Verifique se o Realtime Database foi criado.', false);
            });

            // Escutar novas mensagens
            chatRef.limitToLast(1).on('child_added', (snapshot) => {
                const msg = snapshot.val();
                if (msg && msg.user !== userName) {
                    addMessageToChat(msg.user, msg.text, false);
                }
            });
        } else {
            addMessageToChat('Sistema', '⚠️ Não conectado ao Firebase. Verifique sua conexão.', false);
        }
    });
}

// Desconectar do chat
function disconnectFromChat() {
    if (chatRef) {
        chatRef.off();
    }
}

// Enviar mensagem no chat
function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (message === '') {
        return;
    }
    
    // Adicionar mensagem localmente primeiro
    addMessageToChat(userName, message, true);
    
    // Limpar input
    input.value = '';
    
    // Enviar para Firebase se estiver configurado
    if (isFirebaseConfigured && chatRef) {
        chatRef.push({
            user: userName,
            text: message,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).catch((error) => {
            console.error('Erro ao enviar mensagem:', error);
            addMessageToChat('Sistema', 'Erro ao enviar mensagem. Tente novamente.', false);
        });
    } else {
        // Modo offline - apenas local
        setTimeout(() => {
            addMessageToChat('Sistema', 'Configure o Firebase para chat em tempo real!', false);
        }, 500);
    }
}

// Adicionar mensagem ao chat
function addMessageToChat(user, text, isOwn = false) {
    const messagesContainer = document.getElementById('chatMessages');
    
    // Evitar duplicatas verificando última mensagem
    const lastMessage = messagesContainer.lastElementChild;
    if (lastMessage) {
        const lastUser = lastMessage.querySelector('.message-user')?.textContent.replace(':', '');
        const lastText = lastMessage.querySelector('.message-text')?.textContent;
        if (lastUser === user && lastText === text) {
            return; // Mensagem duplicada, não adicionar
        }
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    if (isOwn) {
        messageDiv.classList.add('own-message');
    }
    if (user === 'Sistema') {
        messageDiv.classList.add('system-message');
    }
    
    const time = new Date().toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageDiv.innerHTML = `
        <span class="message-user">${escapeHtml(user)}:</span>
        <span class="message-text">${escapeHtml(text)}</span>
        <span class="message-time">${time}</span>
    `;
    
    messagesContainer.appendChild(messageDiv);
    
    // Scroll automático para a última mensagem
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Atualizar badge se não for mensagem própria
    if (!isOwn && user !== 'Sistema') {
        updateChatBadge();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateChatBadge() {
    const badge = document.getElementById('chatBadge');
    messageCount++;
    badge.textContent = messageCount > 9 ? '9+' : messageCount;
    badge.classList.remove('hidden');
}

function resetChatBadge() {
    const badge = document.getElementById('chatBadge');
    messageCount = 0;
    badge.classList.add('hidden');
}

function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Aplicar background-image nos ::before dos cards
function setupCardBackgrounds() {
    const cards = document.querySelectorAll('.link-card[style*="background-image"]');
    cards.forEach(card => {
        const bgImage = card.style.backgroundImage;
        if (bgImage) {
            const before = window.getComputedStyle(card, '::before');
            card.style.setProperty('--card-bg', bgImage);
            // Criar um elemento para aplicar o background
            const bgElement = document.createElement('div');
            bgElement.className = 'card-bg-blur';
            bgElement.style.backgroundImage = bgImage;
            card.insertBefore(bgElement, card.firstChild);
        }
    });
}

// Funções para editar nome no chat
function saveChatName() {
    const input = document.getElementById('chatNameInput');
    if (input) {
        const newName = input.value.trim();
        if (newName && newName.length > 0) {
            userName = newName.substring(0, 20);
            localStorage.setItem('chatUserName', userName);
        } else {
            // Se vazio, restaurar o nome anterior
            input.value = userName;
        }
    }
}

function handleChatNameKeyPress(event) {
    if (event.key === 'Enter') {
        event.target.blur(); // Salva ao pressionar Enter
    }
}

function updateChatUserNameDisplay() {
    const input = document.getElementById('chatNameInput');
    if (input) {
        input.value = userName;
    }
}

function updateChatUserNameDisplay() {
    const display = document.getElementById('chatUserName');
    if (display) {
        display.textContent = userName;
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    setupCardBackgrounds();
    // Mensagem de boas-vindas quando abrir o chat
    const chatHeader = document.getElementById('chatHeader');
    chatHeader.addEventListener('click', () => {
        if (chatOpen) {
            resetChatBadge();
        }
    });
    
    // Carregar nome salvo ou gerar um temporário
    const storedName = localStorage.getItem('chatUserName');
    if (storedName) {
        userName = storedName;
    } else {
        // Gerar nome temporário se não tiver
        userName = 'Jogador' + Math.floor(Math.random() * 10000);
        localStorage.setItem('chatUserName', userName);
    }
    updateChatUserNameDisplay();
    
});
