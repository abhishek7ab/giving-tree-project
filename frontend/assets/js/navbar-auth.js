/* ============================================================
   GIVING TREE — navbar-auth.js
   Clean, modern, uncluttered navbar authentication handler
   ============================================================ */

(function () {
    'use strict';

    const BACKEND_URL = '';
    const path = window.location.pathname.toLowerCase();

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getLinkClass(target, extraClasses = '') {
        const isAct = (target === '/index.html' && (path === '/' || path.endsWith('/index.html') || path === ''))
            || (target !== '/index.html' && path.includes(target.replace('.html', '')));
        return `class="nav-link ${extraClasses} ${isAct ? 'active' : ''}"`.trim();
    }

    const svgIcons = {
        home: `<svg class="nav-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
        search: `<svg class="nav-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
        give: `<svg class="nav-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
        requests: `<svg class="nav-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 12 2 2 4-4"/></svg>`,
        myItems: `<svg class="nav-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
        admin: `<svg class="nav-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>`,
        user: `<svg class="nav-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
        logout: `<svg class="nav-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
        login: `<svg class="nav-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`,
        join: `<svg class="nav-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>`
    };

    fetch(`${BACKEND_URL}/api/user`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
            const nav = document.getElementById('navLinks');
            if (!nav) return;

            if (data.loggedIn) {
                const name = data.name || (data.email ? data.email.split('@')[0] : 'Neighbor');
                const initial = (name.charAt(0) || 'U').toUpperCase();
                const isAdmin = data.role === 'admin' || (data.email === 'badaveabhishek2004@gmail.com');
                const roleBadge = isAdmin ? '🛡️ Administrator' : '🌿 Verified Neighbor';

                nav.innerHTML = `
                    <a href="/items.html" ${getLinkClass('/items.html')}>${svgIcons.search} Browse</a>
                    <a href="/requests.html" ${getLinkClass('/requests.html')}>${svgIcons.requests} Activity</a>
                    <a href="/post-item.html" ${getLinkClass('/post-item.html', 'nav-cta')}>${svgIcons.give} Donate Item</a>
                    ${isAdmin ? `
                    <a href="/admin.html" ${getLinkClass('/admin.html', 'nav-admin-badge-link')} style="color:#60a5fa; font-weight:800; display:inline-flex; align-items:center; gap:6px;">
                        <svg class="nav-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Admin
                    </a>
                    ` : ''}

                    <div class="user-dropdown-container" id="userDropdownContainer">
                        <button type="button" class="user-pill-btn" id="userMenuBtn" aria-expanded="false" aria-haspopup="true" onclick="toggleUserDropdown(event)">
                            <span class="user-avatar-initial">${initial}</span>
                            <span class="user-pill-name">${escapeHtml(name)}</span>
                            <svg class="chevron-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                        <div class="user-dropdown-menu" id="userDropdownMenu" onclick="event.stopPropagation()">
                            <div class="user-dropdown-header">
                                <div class="user-dropdown-name">${escapeHtml(name)}</div>
                                <div class="user-dropdown-email">${escapeHtml(data.email || '')}</div>
                                <span class="user-role-badge ${isAdmin ? 'admin' : ''}">${roleBadge}</span>
                            </div>
                            <div class="user-dropdown-divider"></div>
                            <a href="/profile.html" class="user-dropdown-item">
                                ${svgIcons.user} <span>Donor Profile</span>
                            </a>
                            <a href="/my-items.html" class="user-dropdown-item">
                                ${svgIcons.myItems} <span>My Donations</span>
                            </a>
                            <a href="/requests.html" class="user-dropdown-item">
                                ${svgIcons.requests} <span>Donation Requests</span>
                            </a>
                            ${isAdmin ? `
                            <a href="/admin.html" class="user-dropdown-item admin-item" style="color:#60a5fa; font-weight:700;">
                                ${svgIcons.admin} <span>Admin Dashboard</span>
                            </a>
                            ` : ''}
                            <div class="user-dropdown-divider"></div>
                            <a href="/logout" class="user-dropdown-item logout-item">
                                ${svgIcons.logout} <span>Log Out</span>
                            </a>
                        </div>
                    </div>
                `;
                if (isAdmin) {
                    const footerAdmin = document.getElementById('footerAdminLink');
                    if (footerAdmin) footerAdmin.style.display = 'list-item';
                }
                renderMobileBottomNav(data);
            } else {
                nav.innerHTML = `
                    <a href="/items.html" ${getLinkClass('/items.html')}>${svgIcons.search} Browse</a>
                    <a href="/post-item.html" ${getLinkClass('/post-item.html', 'nav-cta')}>${svgIcons.give} Donate Item</a>
                    <div class="auth-btns-group">
                        <a href="/login.html" class="nav-link nav-login auth-login-link">${svgIcons.login} Log In</a>
                        <a href="/register.html" class="nav-link nav-cta auth-join-link">${svgIcons.join} Join</a>
                    </div>
                `;
                renderMobileBottomNav({ loggedIn: false });
            }
        })
        .catch(() => {
            renderMobileBottomNav({ loggedIn: false });
        });

    function renderMobileBottomNav(userData) {
        if (typeof document === 'undefined') return;

        let existingNav = document.getElementById('mobileBottomNav');
        if (!existingNav) {
            existingNav = document.createElement('nav');
            existingNav.id = 'mobileBottomNav';
            existingNav.className = 'mobile-bottom-nav';
            existingNav.setAttribute('aria-label', 'Mobile Navigation');
            document.body.appendChild(existingNav);
        }

        const isHome = path === '/' || path.endsWith('/index.html') || path === '';
        const isBrowse = path.includes('items.html') && !path.includes('my-items');
        const isPost = path.includes('post-item');
        const isActivity = path.includes('requests.html');
        const isProfile = path.includes('profile.html') || path.includes('login.html') || path.includes('register.html');

        const isLoggedIn = userData && userData.loggedIn;
        const profileHref = isLoggedIn ? '/profile.html' : '/login.html';
        const profileLabel = isLoggedIn ? 'Profile' : 'Log In';

        existingNav.innerHTML = `
            <a href="/index.html" class="mobile-nav-item ${isHome ? 'active' : ''}" aria-label="Home">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                <span>Home</span>
            </a>
            <a href="/items.html" class="mobile-nav-item ${isBrowse ? 'active' : ''}" aria-label="Browse Items">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <span>Browse</span>
            </a>
            <a href="/post-item.html" class="mobile-nav-create-btn ${isPost ? 'active' : ''}" aria-label="Share or Post an Item">
                <div class="mobile-nav-create-icon-wrap">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#042F24" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </div>
                <span>+ Give</span>
            </a>
            <a href="/requests.html" class="mobile-nav-item ${isActivity ? 'active' : ''}" aria-label="Activity and Requests">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 12 2 2 4-4"/></svg>
                <span class="mobile-nav-badge" id="mobileNavBadge"></span>
                <span>Activity</span>
            </a>
            <a href="${profileHref}" class="mobile-nav-item ${isProfile ? 'active' : ''}" aria-label="${profileLabel}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>${profileLabel}</span>
            </a>
        `;
    }

    // Mobile menu toggle handler
    document.addEventListener('DOMContentLoaded', () => {
        const mobileToggle = document.getElementById('mobileMenuToggle');
        const navLinks = document.getElementById('navLinks');
        if (mobileToggle && navLinks) {
            mobileToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                navLinks.classList.toggle('mobile-open');
            });
        }
    });

    window.toggleUserDropdown = function (e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const container = document.getElementById('userDropdownContainer');
        const menu = document.getElementById('userDropdownMenu');
        if (container) container.classList.toggle('open');
        if (menu) menu.classList.toggle('show');
    };

    document.addEventListener('click', function (e) {
        const container = document.getElementById('userDropdownContainer');
        const menu = document.getElementById('userDropdownMenu');
        if (container && !container.contains(e.target)) {
            container.classList.remove('open');
            if (menu) menu.classList.remove('show');
        }
        const navLinks = document.getElementById('navLinks');
        if (navLinks && navLinks.classList.contains('mobile-open') && !e.target.closest('.navbar')) {
            navLinks.classList.remove('mobile-open');
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const container = document.getElementById('userDropdownContainer');
            const menu = document.getElementById('userDropdownMenu');
            if (container) container.classList.remove('open');
            if (menu) menu.classList.remove('show');
            const navLinks = document.getElementById('navLinks');
            if (navLinks) navLinks.classList.remove('mobile-open');
        }
    });
})();
