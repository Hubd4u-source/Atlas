function updateUI(status, details) {
    const statusDiv = document.getElementById('statusBadge');
    const detailsDiv = document.getElementById('details');

    status = status || 'disconnected';

    // Normalize status text
    const displayStatus = status.charAt(0).toUpperCase() + status.slice(1);
    statusDiv.textContent = displayStatus;

    // Update classes
    statusDiv.className = 'status-badge ' + status;

    // Update details
    if (details) {
        detailsDiv.textContent = details;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Initial fetch
    chrome.storage.local.get(['connectionStatus', 'details'], (result) => {
        updateUI(result.connectionStatus, result.details);
    });

    // Listen for updates
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.connectionStatus || changes.details) {
            chrome.storage.local.get(['connectionStatus', 'details'], (result) => {
                updateUI(result.connectionStatus, result.details);
            });
        }
    });

    // Reconnect button
    document.getElementById('reconnectBtn').addEventListener('click', () => {
        const btn = document.getElementById('reconnectBtn');
        btn.textContent = 'Connecting...';
        btn.disabled = true;

        chrome.runtime.sendMessage({ action: 'reconnect' }, (response) => {
            setTimeout(() => {
                btn.textContent = '⚡ Force Reconnect';
                btn.disabled = false;
            }, 1000);
        });
    });
});
