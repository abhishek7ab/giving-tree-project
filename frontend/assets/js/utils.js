/* ============================================================
   GIVING TREE — utils.js
   Shared utilities: toast notifications, time formatting,
   HTML escaping. Include this on every page.
   ============================================================ */

// ---- Toast Notification System ----
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const isError   = type === 'error';
    const isWarning = type === 'warning';
    const isInfo    = type === 'info';

    let iconClass = 'fa-check-circle';
    if (isError)   iconClass = 'fa-exclamation-circle';
    if (isWarning) iconClass = 'fa-triangle-exclamation';
    if (isInfo)    iconClass = 'fa-circle-info';

    toast.className = `toast${isError ? ' error' : isWarning ? ' warning' : isInfo ? ' info' : ''}`;
    toast.innerHTML = `
        <i class="fas ${iconClass}"></i>
        <span style="font-weight:600;">${message}</span>
        <button onclick="this.parentElement.classList.remove('show'); setTimeout(()=>this.parentElement.remove(),500)"
            style="background:none;border:none;color:inherit;opacity:0.5;cursor:pointer;font-size:16px;padding:0;margin-left:auto;line-height:1;"
            aria-label="Dismiss notification">✕</button>
    `;
    container.appendChild(toast);
    // Force reflow before adding 'show' to trigger transition
    void toast.offsetWidth;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 4500);
}

// ---- Time-Ago Formatter ----
function timeAgo(dateString) {
    if (!dateString) return '';
    const now  = new Date();
    const date = new Date(dateString);
    const secs = Math.floor((now - date) / 1000);
    if (secs < 60)          return 'just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60)          return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)           return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7)           return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5)          return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12)        return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
}

// ---- HTML Escape ----
function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value || '';
    return div.innerHTML;
}
