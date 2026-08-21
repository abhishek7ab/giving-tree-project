// ================= GIVING TREE NOTIFICATIONS & REAL-TIME CLIENT =================
(function () {
    'use strict';

    let currentNotifications = [];

    document.addEventListener('DOMContentLoaded', async () => {
        // 1. Service Worker Registration
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(err => {
                console.log('SW note:', err.message);
            });
        }

        // 2. Mobile Navbar Toggle Setup
        const toggleBtn = document.getElementById('mobileMenuToggle');
        const navLinks = document.getElementById('navLinks');
        if (toggleBtn && navLinks) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                navLinks.classList.toggle('active');
            });

            document.addEventListener('click', (e) => {
                if (navLinks.classList.contains('active') && !navLinks.contains(e.target) && e.target !== toggleBtn) {
                    navLinks.classList.remove('active');
                }
            });

            navLinks.addEventListener('click', (e) => {
                if (e.target.tagName === 'A' || e.target.closest('a')) {
                    navLinks.classList.remove('active');
                }
            });
        }

        // 3. Setup Notification Bell Popover & User State
        try {
            const userRes = await fetch('/api/user', { credentials: 'include' });
            const userData = await userRes.json();

            if (userData && userData.loggedIn) {
                const userEmail = userData.email;
                initNotificationBell();
                fetchNotifications();

                // Connect Socket.io for Live Notifications if available
                let socketConnected = false;
                if (typeof io !== 'undefined') {
                    try {
                        const socket = io({ withCredentials: true, timeout: 5000 });
                        socket.on('connect', () => {
                            socketConnected = true;
                            socket.emit('join-user', userEmail);
                        });

                        socket.on('notification:new', (notif) => {
                            fetchNotifications();
                            showNotificationToast(notif);
                        });
                    } catch (errSocket) {
                        console.warn('Socket connection note:', errSocket.message);
                    }
                }

                // Resilient Polling Fallback (ensures live notifications on Vercel / serverless)
                setInterval(() => {
                    if (document.visibilityState === 'visible') {
                        fetchNotifications(true);
                    }
                }, 15000);
            }
        } catch (e) {
            console.warn('Session check note:', e);
        }
    });

    function initNotificationBell() {
        const bell = document.querySelector('.nav-notif-bell');
        if (!bell) return;

        // Wrap bell in popover container if not already wrapped
        if (!bell.parentElement.classList.contains('nav-notif-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'nav-notif-wrapper';
            wrapper.id = 'navNotifWrapper';
            bell.parentNode.insertBefore(wrapper, bell);
            wrapper.appendChild(bell);

            const popover = document.createElement('div');
            popover.className = 'nav-notif-popover';
            popover.id = 'navNotifPopover';
            popover.onclick = (e) => e.stopPropagation();
            wrapper.appendChild(popover);

            bell.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleNotificationPopover();
            });

            document.addEventListener('click', (e) => {
                if (!wrapper.contains(e.target)) {
                    wrapper.classList.remove('open');
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    wrapper.classList.remove('open');
                }
            });
        }
    }

    function clearNotificationBadge() {
        const badge = document.getElementById('navNotifBadge');
        if (badge) {
            badge.textContent = '0';
            badge.style.display = 'none';
        }
    }

    async function toggleNotificationPopover() {
        const wrapper = document.getElementById('navNotifWrapper');
        if (!wrapper) return;
        const isOpen = wrapper.classList.toggle('open');
        if (isOpen) {
            // Once checked, clear badge immediately to 0 and normal appearance
            clearNotificationBadge();

            // Mark all notifications as read in database
            try {
                fetch('/api/notifications/read-all', {
                    method: 'POST',
                    credentials: 'include'
                }).catch(() => {});
            } catch (e) {}

            // Update client in-memory states
            currentNotifications = currentNotifications.map(n => ({ ...n, is_read: true }));
            renderNotificationPopover(currentNotifications);
        }
    }

    async function fetchNotifications() {
        try {
            const res = await fetch('/api/notifications', { credentials: 'include' });
            if (!res.ok) return;
            const data = await res.json();
            currentNotifications = data.notifications || [];
            const unreadCount = data.unreadCount || 0;

            const badge = document.getElementById('navNotifBadge');
            if (badge) {
                if (unreadCount > 0) {
                    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                    badge.style.display = 'inline-flex';
                } else {
                    badge.textContent = '0';
                    badge.style.display = 'none';
                }
            }

            renderNotificationPopover(currentNotifications);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }
    }

    function renderNotificationPopover(notifications) {
        const popover = document.getElementById('navNotifPopover');
        if (!popover) return;

        if (!notifications.length) {
            popover.innerHTML = `
                <div class="notif-popover-header">
                    <span class="notif-popover-title"><i class="fas fa-bell" style="color:var(--accent);"></i> Notifications</span>
                    <a href="/requests.html" class="notif-view-all">Activity Hub</a>
                </div>
                <div class="notif-empty-state">
                    <i class="fas fa-check-circle" style="font-size:24px; color:var(--accent); margin-bottom:8px; display:block;"></i>
                    You're all caught up! No new notifications. 🌿
                </div>
            `;
            return;
        }

        const hasUnread = notifications.some(n => !n.is_read);
        let itemsHtml = '';
        notifications.slice(0, 8).forEach(n => {
            const isMsg = n.type === 'chat_message' || String(n.title || '').toLowerCase().includes('message');
            const iconClass = isMsg ? 'msg' : '';
            const iconHtml = isMsg ? '<i class="fas fa-comment-dots"></i>' : '<i class="fas fa-handshake"></i>';
            const unreadIndicator = !n.is_read ? '<span style="width:7px; height:7px; border-radius:50%; background:#10b981; margin-left:auto; flex-shrink:0;"></span>' : '';
            const targetUrl = n.request_id ? `/requests.html?requestId=${n.request_id}` : `/requests.html`;

            itemsHtml += `
                <a href="${targetUrl}" class="notif-popover-item" onclick="handleNotificationClick(${n.id}, ${n.request_id || 'null'})">
                    <div class="notif-item-icon ${iconClass}">
                        ${iconHtml}
                    </div>
                    <div class="notif-item-content">
                        <div class="notif-item-title">${escapeHtml(n.title || 'Handover Update')}</div>
                        <div style="font-size:11px; color:#cbd5e1; line-height:1.3; margin-bottom:2px;">${escapeHtml(n.body || '')}</div>
                        <div class="notif-item-time">${timeAgo(n.created_at)}</div>
                    </div>
                    ${unreadIndicator}
                </a>
            `;
        });

        popover.innerHTML = `
            <div class="notif-popover-header">
                <span class="notif-popover-title"><i class="fas fa-bell" style="color:var(--accent);"></i> Notifications</span>
                <div style="display:flex; align-items:center; gap:8px;">
                    ${hasUnread ? `
                    <button type="button" class="notif-mark-all" onclick="markAllNotificationsRead(event)" style="background:none; border:none; color:var(--accent); font-size:11px; cursor:pointer; padding:2px 4px; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
                        <i class="fas fa-check-double"></i> Mark read
                    </button>` : ''}
                    <a href="/requests.html" class="notif-view-all">View All Activity →</a>
                </div>
            </div>
            <div class="notif-list-container">
                ${itemsHtml}
            </div>
        `;
    }

    window.markAllNotificationsRead = async function (e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        clearNotificationBadge();
        try {
            await fetch('/api/notifications/read-all', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (err) {}
        currentNotifications = currentNotifications.map(n => ({ ...n, is_read: true }));
        renderNotificationPopover(currentNotifications);
    };

    window.handleNotificationClick = async function (notifId, requestId) {
        try {
            await fetch(`/api/notifications/${notifId}/read`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (e) {}
        currentNotifications = currentNotifications.map(n => n.id === notifId ? { ...n, is_read: true } : n);
        const remaining = currentNotifications.filter(n => !n.is_read).length;
        const badge = document.getElementById('navNotifBadge');
        if (badge) {
            if (remaining > 0) {
                badge.textContent = remaining > 99 ? '99+' : remaining;
                badge.style.display = 'inline-flex';
            } else {
                badge.textContent = '0';
                badge.style.display = 'none';
            }
        }
    };

    function showNotificationToast(notif) {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.style.cssText = 'position:fixed; bottom:24px; right:24px; z-index:9999; display:flex; flex-direction:column; gap:10px; pointer-events:none;';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.style.cssText = `
            background: rgba(15, 23, 42, 0.96);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            color: #f8fafc;
            border-left: 4px solid #10b981;
            border-top: 1px solid rgba(255,255,255,0.12);
            border-right: 1px solid rgba(255,255,255,0.12);
            border-bottom: 1px solid rgba(255,255,255,0.12);
            padding: 14px 18px;
            border-radius: 14px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.6);
            font-family: inherit;
            font-size: 13px;
            pointer-events: auto;
            min-width: 280px;
            max-width: 380px;
            cursor: pointer;
            animation: dropdownFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        `;
        toast.innerHTML = `
            <div style="font-weight:700; color:#10b981; margin-bottom:3px; font-size:13px; display:flex; align-items:center; gap:6px;">
                <i class="fas fa-bell"></i> ${escapeHtml(notif.title || 'Giving Tree Alert')}
            </div>
            <div style="color:#cbd5e1; line-height:1.4; font-size:12px;">${escapeHtml(notif.body || '')}</div>
        `;

        toast.onclick = () => {
            window.location.href = '/requests.html';
        };

        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.35s ease';
            setTimeout(() => toast.remove(), 350);
        }, 4500);
    }

    function timeAgo(dateString) {
        if (!dateString) return 'recently';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return 'recently';
        const seconds = Math.floor((new Date() - d) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days}d ago`;
        return d.toLocaleDateString();
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    window.fetchNotificationCount = fetchNotifications;
})();
