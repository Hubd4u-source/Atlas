console.log('🚀 Atlas Agent Connected to this page.');

// Listen for messages from background script (optional for future)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'ping') {
        sendResponse({ status: 'alive' });
    }
});

