// Atlas Link - Background Service Worker

const GATEWAY_URL = 'ws://localhost:18789';
let socket = null;
let keepAliveInterval = null;


// Update UI status in storage
function updateStatus(status, details = '') {
    chrome.storage.local.set({
        connectionStatus: status,
        lastUpdate: new Date().toLocaleTimeString(),
        details: details
    });
}

// Listen for popup messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'reconnect') {
        console.log('🔄 Manual reconnect requested');
        if (socket) try { socket.close(); } catch (e) { }
        connect();
        sendResponse({ success: true });
    }
});

// Initialize connection
function connect() {
    console.log('🚀 [Extension] Connecting to Gateway:', GATEWAY_URL);
    updateStatus('connecting', 'Connecting...');

    // Close existing connection if any
    if (socket) {
        try { socket.close(); } catch (e) { }
        socket = null;
    }

    try {
        const ws = new WebSocket(GATEWAY_URL);
        socket = ws;

        ws.onopen = () => {
            console.log('✅ [Extension] WebSocket Open');

            // Safety check: ensure we are still the active socket
            if (ws !== socket) return;

            updateStatus('connected', 'Connected');

            // Authenticate with Gateway
            try {
                const authMsg = JSON.stringify({
                    type: 'auth',
                    token: 'your-secure-gateway-token',
                    channel: 'web'
                });
                console.log('📤 [Extension] Sending Auth Message');
                ws.send(authMsg);
                startKeepAlive();
            } catch (e) {
                console.error('❌ [Extension] Auth send failed:', e);
            }
        };

        ws.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('📩 [Extension] Received:', data);

                // Handle commands from Agent
                if (data.type === 'command') {
                    handleCommand(data);
                } else if (data.type === 'error') {
                    console.warn('⚠️ [Extension] Gateway Error:', data.content?.text);
                }
            } catch (e) {
                console.error('❌ [Extension] Failed to parse message:', e, event.data);
            }
        };

        ws.onclose = (event) => {
            // Only react if this was the active socket
            if (ws !== socket) return;

            console.log(`❌ [Extension] Disconnected (Code: ${event.code}). Reconnecting in 5s...`);
            updateStatus('disconnected', `Reconnecting in 5s... (Code: ${event.code})`);
            stopKeepAlive();
            socket = null;
            setTimeout(connect, 5000);
        };

        ws.onerror = (err) => {
            if (ws !== socket) return;
            console.error('⚠️ [Extension] WebSocket Error Event:', err);
            updateStatus('error', 'Connection Failed (Check Console)');
        };
    } catch (e) {
        console.error('❌ [Extension] Critical connection error:', e);
        updateStatus('error', 'Critical connection error');
    }
}

// Handle commands (execute script in active tab)
// Handle commands (execute script in active tab)
async function handleCommand(cmd) {
    try {
        console.log(`[Extension] Handling command: ${cmd.action} (ID: ${cmd.id})`);

        // Find the most appropriate tab: try last focused window first, then any active tab
        let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        let tab = tabs[0];

        if (!tab) {
            console.log('[Extension] No active tab in last focused window, checking all windows...');
            tabs = await chrome.tabs.query({ active: true });
            // Prefer a tab that isn't a devtools or chrome:// page if possible?
            // For now just take the first one
            if (tabs.length > 0) tab = tabs[0];
        }

        if (cmd.action === 'navigate') {
            const newTab = await chrome.tabs.create({ url: cmd.url });
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'response',
                    id: cmd.id,
                    result: { success: true, tabId: newTab.id, message: `Navigated to ${cmd.url}` }
                }));
            }
            return;
        }

        if (!tab) {
            console.error('[Extension] No active tab found to execute command');
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'response',
                    id: cmd.id,
                    result: { success: false, error: 'No active tab found' }
                }));
            }
            return;
        }

        console.log(`[Extension] Executing on tab: ${tab.id} (${tab.url})`);

        if (cmd.action === 'script') {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (code) => {
                    try {
                        // eslint-disable-next-line no-eval
                        const result = eval(code);
                        return result;
                    } catch (e) {
                        return { error: e.toString() };
                    }
                },
                args: [cmd.code]
            }, (results) => {
                if (chrome.runtime.lastError) {
                    console.error('[Extension] Script execution error:', chrome.runtime.lastError);
                    if (socket && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            type: 'response',
                            id: cmd.id,
                            result: { success: false, error: chrome.runtime.lastError.message }
                        }));
                    }
                    return;
                }

                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: 'response',
                        id: cmd.id,
                        result: results[0]?.result
                    }));
                }
            });
        }
        else if (cmd.action === 'click') {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (selector) => {
                    const el = document.querySelector(selector);
                    if (el) {
                        el.click();
                        return { success: true, message: `Clicked ${selector}` };
                    }
                    return { success: false, error: `Element ${selector} not found` };
                },
                args: [cmd.selector]
            }, (results) => {
                if (chrome.runtime.lastError) {
                    console.error('[Extension] Click execution error:', chrome.runtime.lastError);
                }
                socket.send(JSON.stringify({
                    type: 'response',
                    id: cmd.id,
                    result: results && results[0] ? results[0].result : { error: 'Execution failed' }
                }));
            });
        }
        else if (cmd.action === 'type') {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (selector, text) => {
                    const el = document.querySelector(selector);
                    if (el) {
                        el.value = text;
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                        return { success: true, message: `Typed into ${selector}` };
                    }
                    return { success: false, error: `Element ${selector} not found` };
                },
                args: [cmd.selector, cmd.text]
            }, (results) => {
                if (chrome.runtime.lastError) {
                    console.error('[Extension] Type execution error:', chrome.runtime.lastError);
                }
                socket.send(JSON.stringify({
                    type: 'response',
                    id: cmd.id,
                    result: results && results[0] ? results[0].result : { error: 'Execution failed' }
                }));
            });
        }
        else if (cmd.action === 'inspect') {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const elements = Array.from(document.querySelectorAll('button, input, a, [role="button"]')).map(el => ({
                        tag: el.tagName,
                        text: (el.innerText || el.value || el.placeholder || '').substring(0, 100).trim(),
                        selector: (() => {
                            if (el.id) return `#${el.id}`;
                            const ariaLabel = el.getAttribute('aria-label');
                            if (ariaLabel) return `[aria-label="${ariaLabel}"]`;
                            if (el.className) return `.${el.className.split(' ').filter(c => c).join('.')}`;
                            return el.tagName.toLowerCase();
                        })(),
                        type: el.type || 'text'
                    }));
                    return { success: true, elements, url: window.location.href, title: document.title };
                }
            }, (results) => {
                if (chrome.runtime.lastError) {
                    console.error('[Extension] Inspect execution error:', chrome.runtime.lastError);
                    socket.send(JSON.stringify({
                        type: 'response',
                        id: cmd.id,
                        result: { success: false, error: chrome.runtime.lastError.message }
                    }));
                    return;
                }

                socket.send(JSON.stringify({
                    type: 'response',
                    id: cmd.id,
                    result: results[0]?.result || { success: false, error: 'Failed to inspect page' }
                }));
            });
        }
        else if (cmd.action === 'screenshot') {
            chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }, (dataUrl) => {
                if (chrome.runtime.lastError) {
                    console.error('[Extension] Screenshot error:', chrome.runtime.lastError);
                    socket.send(JSON.stringify({
                        type: 'response',
                        id: cmd.id,
                        result: { success: false, error: chrome.runtime.lastError.message }
                    }));
                    return;
                }

                socket.send(JSON.stringify({
                    type: 'response',
                    id: cmd.id,
                    result: { success: true, dataUrl }
                }));
            });
        }
    } catch (e) {
        console.error('Command failed:', e);
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'response',
                id: cmd.id,
                result: { success: false, error: e.toString() }
            }));
        }
    }
}

// Keep connection alive (Service Workers can die)
function startKeepAlive() {
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    keepAliveInterval = setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
        }
    }, 20000);
}

function stopKeepAlive() {
    if (keepAliveInterval) clearInterval(keepAliveInterval);
}

// Start
connect();

