document.addEventListener('DOMContentLoaded', function () {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const loading = document.getElementById('loading');

    // ===========================================================
    // THEME TOGGLE (NEW)
    // ===========================================================
    const root = document.documentElement;
    const themeBtn = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('gita-theme');

    // Apply saved theme on load
    if (savedTheme) {
        root.setAttribute('data-theme', savedTheme);
    }

    themeBtn?.addEventListener('click', () => {
        const currentTheme = root.getAttribute('data-theme');
        const now = currentTheme === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', now);
        localStorage.setItem('gita-theme', now);
    });

    // ===========================================================
    // MOBILE VIEWPORT FIX (Crucial for iOS Safari)
    // ===========================================================
    function setViewportHeight() {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);

    // ===========================================================
    // SUGGESTION CHIPS (NEW)
    // ===========================================================
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const query = chip.textContent.trim();
            if (query) {
                addMessage(query, true);
                sendQuery(query);
            }
        });
    });

    // ===========================================================
    // TEXT FORMATTING (Safely escapes HTML + preserves newlines)
    // ===========================================================
    function formatMessageText(element, text) {
        const safeText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        element.innerHTML = safeText.replace(/\n/g, '<br>');
    }

    // ===========================================================
    // ADD MESSAGE TO CHAT
    // ===========================================================
    function addMessage(message, isUser = false, references = [], toolsUsed = [], isFallback = false) {
        if (chatBox.classList.contains('empty-chat')) {
            chatBox.classList.remove('empty-chat');
        }

        const messageContainer = document.createElement('div');
        messageContainer.className = 'message-container';
        if (isUser) messageContainer.className += ' user-container';

        const messageDiv = document.createElement('div');
        messageDiv.className = isUser ? 'user-message' : 'bot-message';
        if (isFallback) messageDiv.className += ' fallback-message';

        formatMessageText(messageDiv, message);

        if (isFallback) {
            const fallbackIndicator = document.createElement('div');
            fallbackIndicator.className = 'fallback-indicator';
            fallbackIndicator.textContent = 'General AI response (Not specific to Bhagavad Gita)';
            messageContainer.appendChild(fallbackIndicator);
        }

        messageContainer.appendChild(messageDiv);

        // Action buttons for bot messages only
        if (!isUser) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'button-container';

            // Explain More Button
            const explainBtn = document.createElement('button');
            explainBtn.className = 'action-btn';
            explainBtn.textContent = '✨ Explain more';
            explainBtn.onclick = function () {
                sendQuery(`Please explain this concept in more detail: ${message}`);
            };
            buttonContainer.appendChild(explainBtn);

            // References (Fix: declared BEFORE use to avoid scoping bugs)
            const referencesDiv = document.createElement('div');
            referencesDiv.className = 'references-container';
            referencesDiv.style.display = 'none';

            if (references.length > 0 || toolsUsed.length > 0) {
                const referencesBtn = document.createElement('button');
                referencesBtn.className = 'action-btn';
                referencesBtn.textContent = '📚 Show References';

                referencesBtn.onclick = function () {
                    const isHidden = referencesDiv.style.display === 'none' || !referencesDiv.style.display;
                    referencesDiv.style.display = isHidden ? 'block' : 'none';
                    referencesBtn.textContent = isHidden ? '📚 Hide References' : '📚 Show References';

                    if (isHidden) {
                        setTimeout(() => {
                            chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
                        }, 100);
                    }
                };
                buttonContainer.appendChild(referencesBtn);

                if (toolsUsed.length > 0) {
                    const toolsTitle = document.createElement('h4');
                    toolsTitle.textContent = 'Tools Used:';
                    referencesDiv.appendChild(toolsTitle);

                    const toolsList = document.createElement('ul');
                    toolsList.className = 'tools-list';
                    toolsUsed.forEach(tool => {
                        const toolItem = document.createElement('li');
                        toolItem.textContent = `${tool.name}${tool.input ? ': ' + tool.input : ''}`;
                        toolsList.appendChild(toolItem);
                    });
                    referencesDiv.appendChild(toolsList);
                }

                if (references.length > 0) {
                    const refsTitle = document.createElement('h4');
                    refsTitle.textContent = 'References:';
                    referencesDiv.appendChild(refsTitle);

                    const refsList = document.createElement('ul');
                    refsList.className = 'references-list';
                    references.forEach(ref => {
                        const refItem = document.createElement('li');
                        refItem.textContent = ref;
                        refsList.appendChild(refItem);
                    });
                    referencesDiv.appendChild(refsList);
                }

                messageContainer.appendChild(referencesDiv);
            }

            messageContainer.appendChild(buttonContainer);
        }

        // Insert BEFORE the typing indicator so dots always stay at the bottom
        chatBox.insertBefore(messageContainer, loading);

        setTimeout(() => {
            chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
        }, 100);
    }

    // ===========================================================
    // SEND QUERY TO BACKEND
    // ===========================================================
    async function sendQuery(query) {
        loading.style.display = 'flex';

        try {
            const response = await fetch('/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query }),
            });

            const data = await response.json();
            loading.style.display = 'none';

            if (response.ok) {
                addMessage(data.response, false, data.references || [], data.tools_used || [], data.is_fallback || false);
            } else {
                addMessage('Sorry, I encountered an error: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            loading.style.display = 'none';
            addMessage('Sorry, an error occurred while connecting to the server. Please check your connection.');
            console.error('Network Error:', error);
        }
    }

    // ===========================================================
    // USER INPUT HANDLING
    // ===========================================================
    function handleSend() {
        const query = userInput.value.trim();
        if (query) {
            addMessage(query, true);
            userInput.value = '';
            sendQuery(query);
        }
    }

    sendBtn.addEventListener('click', handleSend);

    userInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            handleSend();
        }
    });
});