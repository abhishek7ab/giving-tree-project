// ===== THEME SWITCHER CONTROLLER =====
// Manages dynamic theme changes and persistence

class ThemeSwitcher {
    constructor() {
        this.currentTheme = this.loadTheme();
        this.themes = [
            { name: 'emerald', emoji: '💚', label: 'Emerald' },
            { name: 'sapphire', emoji: '💙', label: 'Sapphire' },
            { name: 'amethyst', emoji: '💜', label: 'Amethyst' },
            { name: 'ruby', emoji: '❤️', label: 'Ruby' },
            { name: 'citrine', emoji: '🧡', label: 'Citrine' },
            { name: 'topaz', emoji: '💛', label: 'Topaz' },
            { name: 'mint', emoji: '🍃', label: 'Mint' },
            { name: 'rose', emoji: '🌸', label: 'Rose' }
        ];
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.createWidget();
        this.attachEventListeners();
    }

    createWidget() {
        const widget = document.createElement('div');
        widget.className = 'theme-switcher-widget';
        widget.innerHTML = `
            <div class="theme-picker-panel" id="themePickerPanel">
                <div class="theme-picker-header">
                    <h3 class="theme-picker-title">
                        <i class="fas fa-palette"></i>
                        Choose Theme
                    </h3>
                    <button class="theme-close-btn" id="themeCloseBtn" aria-label="Close theme picker">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="current-theme-badge">
                    <div class="current-theme-color"></div>
                    <span>Current: <strong id="currentThemeName">${this.getCurrentThemeLabel()}</strong></span>
                </div>

                <div class="theme-options-grid" id="themeOptionsGrid">
                    ${this.themes.map(theme => `
                        <div class="theme-option ${theme.name === this.currentTheme ? 'active' : ''}"
                             data-theme="${theme.name}"
                             role="button"
                             tabindex="0"
                             aria-label="Select ${theme.label} theme">
                            <span class="theme-option-emoji">${theme.emoji}</span>
                            <div class="theme-color-preview"></div>
                            <span class="theme-option-name">${theme.label}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <button class="theme-toggle-btn" id="themeToggleBtn" aria-label="Open theme picker" title="Change Theme">
                <i class="fas fa-palette"></i>
            </button>
        `;

        document.body.appendChild(widget);
    }

    attachEventListeners() {
        const toggleBtn = document.getElementById('themeToggleBtn');
        const panel = document.getElementById('themePickerPanel');
        const closeBtn = document.getElementById('themeCloseBtn');
        const optionsGrid = document.getElementById('themeOptionsGrid');

        toggleBtn.addEventListener('click', () => this.togglePanel());
        closeBtn.addEventListener('click', () => this.closePanel());

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.theme-switcher-widget')) {
                this.closePanel();
            }
        });

        // Theme option clicks
        optionsGrid.addEventListener('click', (e) => {
            const option = e.target.closest('.theme-option');
            if (option) {
                const theme = option.dataset.theme;
                this.switchTheme(theme);
            }
        });

        // Keyboard navigation
        optionsGrid.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const option = e.target.closest('.theme-option');
                if (option) {
                    e.preventDefault();
                    const theme = option.dataset.theme;
                    this.switchTheme(theme);
                }
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closePanel();
            }
        });
    }

    togglePanel() {
        const panel = document.getElementById('themePickerPanel');
        panel.classList.toggle('active');
    }

    closePanel() {
        const panel = document.getElementById('themePickerPanel');
        panel.classList.remove('active');
    }

    switchTheme(themeName) {
        if (this.currentTheme === themeName) return;

        // Visual feedback
        this.animateThemeChange();

        // Update theme
        this.currentTheme = themeName;
        this.applyTheme(themeName);
        this.saveTheme(themeName);

        // Update UI
        this.updateActiveOption(themeName);
        this.updateCurrentBadge(themeName);

        // Optional: show toast notification
        if (typeof showToast === 'function') {
            const themeLabel = this.getCurrentThemeLabel();
            showToast(`Switched to ${themeLabel} theme!`, 'success');
        }

        // Close panel after selection
        setTimeout(() => this.closePanel(), 300);
    }

    applyTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);

        // Update meta theme-color for mobile browsers
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        const themeColors = {
            emerald: '#10b981',
            sapphire: '#3b82f6',
            amethyst: '#a855f7',
            ruby: '#dc2626',
            citrine: '#f97316',
            topaz: '#eab308',
            mint: '#34d399',
            rose: '#ec4899'
        };
        if (metaTheme) {
            metaTheme.setAttribute('content', themeColors[themeName] || themeColors.emerald);
        }
    }

    animateThemeChange() {
        // Create a ripple effect from the theme toggle button
        const toggleBtn = document.getElementById('themeToggleBtn');
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            width: 20px;
            height: 20px;
            background: var(--accent);
            border-radius: 50%;
            transform: translate(-50%, -50%) scale(0);
            pointer-events: none;
            z-index: 99999;
            opacity: 0.3;
        `;
        document.body.appendChild(ripple);

        // Animate
        ripple.animate([
            { transform: 'translate(-50%, -50%) scale(0)', opacity: 0.3 },
            { transform: 'translate(-50%, -50%) scale(100)', opacity: 0 }
        ], {
            duration: 800,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }).onfinish = () => ripple.remove();
    }

    updateActiveOption(themeName) {
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.toggle('active', option.dataset.theme === themeName);
        });
    }

    updateCurrentBadge(themeName) {
        const badge = document.getElementById('currentThemeName');
        if (badge) {
            badge.textContent = this.getCurrentThemeLabel();
        }
    }

    getCurrentThemeLabel() {
        const theme = this.themes.find(t => t.name === this.currentTheme);
        return theme ? theme.label : 'Emerald';
    }

    saveTheme(themeName) {
        try {
            localStorage.setItem('giving-tree-theme', themeName);
        } catch (e) {
            console.warn('Failed to save theme preference:', e);
        }
    }

    loadTheme() {
        try {
            return localStorage.getItem('giving-tree-theme') || 'emerald';
        } catch (e) {
            return 'emerald';
        }
    }
}

// ===== SCROLL ANIMATIONS CONTROLLER =====
class ScrollAnimations {
    constructor() {
        this.elements = [];
        this.observer = null;
        this.init();
    }

    init() {
        this.setupObserver();
        this.observeElements();
        this.createScrollProgressBar();
    }

    setupObserver() {
        const options = {
            root: null,
            rootMargin: '0px 0px -100px 0px',
            threshold: 0.1
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                    // Optional: unobserve after animation
                    // this.observer.unobserve(entry.target);
                }
            });
        }, options);
    }

    observeElements() {
        const elements = document.querySelectorAll('[data-scroll-animate]');
        elements.forEach(el => {
            this.observer.observe(el);
            this.elements.push(el);
        });
    }

    createScrollProgressBar() {
        const progressBar = document.createElement('div');
        progressBar.className = 'scroll-progress-bar';
        progressBar.id = 'scrollProgressBar';
        document.body.appendChild(progressBar);

        window.addEventListener('scroll', () => {
            const winScroll = document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            progressBar.style.width = scrolled + '%';
        });
    }

    refresh() {
        // Re-observe new elements
        this.observeElements();
    }
}

// ===== PARTICLE SYSTEM =====
class ParticleSystem {
    constructor() {
        this.container = null;
        this.particleCount = 15;
        this.init();
    }

    init() {
        this.createContainer();
        this.generateParticles();
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'particles-container';
        this.container.setAttribute('aria-hidden', 'true');
        document.body.insertBefore(this.container, document.body.firstChild);
    }

    generateParticles() {
        for (let i = 0; i < this.particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';

            // Random positioning
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 10 + 's';
            particle.style.animationDuration = (Math.random() * 5 + 8) + 's';

            this.container.appendChild(particle);
        }
    }

    destroy() {
        if (this.container) {
            this.container.remove();
        }
    }
}

// ===== UTILITY: Add ripple effect to buttons =====
function addRippleEffect(button) {
    button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            pointer-events: none;
        `;

        this.appendChild(ripple);

        ripple.animate([
            { transform: 'scale(0)', opacity: 1 },
            { transform: 'scale(2)', opacity: 0 }
        ], {
            duration: 600,
            easing: 'ease-out'
        }).onfinish = () => ripple.remove();
    });
}

// ===== UTILITY: Animate counters =====
function animateCounter(element, target, duration = 2000) {
    const start = parseInt(element.textContent) || 0;
    const increment = (target - start) / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current).toLocaleString();
        element.classList.add('counting');
        setTimeout(() => element.classList.remove('counting'), 100);
    }, 16);
}

// ===== UTILITY: Show loading state on button =====
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.classList.add('btn-loading');
        button.disabled = true;
        button.dataset.originalText = button.textContent;
    } else {
        button.classList.remove('btn-loading');
        button.disabled = false;
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
        }
    }
}

// ===== UTILITY: Show success state on button =====
function setButtonSuccess(button, duration = 2000) {
    button.classList.add('btn-success');
    button.disabled = true;

    setTimeout(() => {
        button.classList.remove('btn-success');
        button.disabled = false;
    }, duration);
}

// ===== AUTO-INITIALIZE ON DOM READY =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAnimationSystem);
} else {
    initializeAnimationSystem();
}

function initializeAnimationSystem() {
    // Initialize theme switcher
    if (!window.themeSwitcher) {
        window.themeSwitcher = new ThemeSwitcher();
    }

    // Initialize scroll animations
    if (!window.scrollAnimations) {
        window.scrollAnimations = new ScrollAnimations();
    }

    // Initialize particle system (optional - can be disabled on mobile)
    if (!window.matchMedia('(max-width: 768px)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        if (!window.particleSystem) {
            window.particleSystem = new ParticleSystem();
        }
    }

    // Add ripple effect to all buttons with class
    document.querySelectorAll('.btn-ripple, .btn-primary, .btn-hero-primary').forEach(btn => {
        addRippleEffect(btn);
    });

    // Animate counters on scroll
    const counters = document.querySelectorAll('[data-counter]');
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.dataset.animated) {
                const target = parseInt(entry.target.dataset.counter);
                animateCounter(entry.target, target);
                entry.target.dataset.animated = 'true';
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => counterObserver.observe(counter));
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ThemeSwitcher,
        ScrollAnimations,
        ParticleSystem,
        animateCounter,
        setButtonLoading,
        setButtonSuccess,
        addRippleEffect
    };
}
