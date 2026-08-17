/* ============================================================
   GIVING TREE — animations.js
   Modern, high-performance animation engine:
   - Silky scroll-reveal via IntersectionObserver
   - Smooth numeric count-up with easing physics
   - Sticky navbar elevation depth on scroll
   - Tactile button press & wishlist pop feedback
   - Dynamic AJAX refresh hooks (window.initAnimations)
   ============================================================ */

(function () {
    'use strict';

    /* ---- 1. Easing Physics ---- */
    function easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /* ---- 2. Scroll-Reveal Observer with Cascading Stagger ---- */
    const revealObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        },
        {
            threshold: 0.08,
            rootMargin: '0px 0px -40px 0px'
        }
    );

    function scanAndObserveElements() {
        const animElements = document.querySelectorAll('[data-animate]:not(.is-visible)');
        animElements.forEach((el, idx) => {
            // If parent container is a grid and child has no delay specified, add natural cascading stagger
            const parent = el.parentElement;
            if (parent && (parent.classList.contains('items-grid') || parent.classList.contains('preview-grid') || parent.classList.contains('action-grid') || parent.classList.contains('requests-grid'))) {
                if (!el.hasAttribute('data-delay')) {
                    const siblingIndex = Array.from(parent.children).indexOf(el);
                    const staggerDelay = (siblingIndex % 8) + 1;
                    el.setAttribute('data-delay', String(staggerDelay));
                }
            }
            revealObserver.observe(el);
        });

        // Observe uncounted stat targets
        document.querySelectorAll('[data-target]:not([data-counted])').forEach(el => {
            statObserver.observe(el);
        });
    }

    /* ---- 3. Precision Metric Count-Up Animation ---- */
    function animateCountUp(el) {
        const raw    = el.getAttribute('data-target') || el.textContent.replace(/[^\d.]/g, '');
        const suffix = el.getAttribute('data-suffix') || '';
        const target = parseFloat(raw);
        if (isNaN(target)) return;

        const isFloat = raw.includes('.');
        const duration  = 1600;
        const startTime = performance.now();

        function tick(now) {
            const elapsed  = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased    = easeOutQuart(progress);
            const current  = eased * target;

            if (isFloat) {
                el.textContent = current.toFixed(1) + suffix;
            } else {
                el.textContent = Math.floor(current).toLocaleString() + suffix;
            }

            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                el.textContent = (isFloat ? target.toFixed(1) : target.toLocaleString()) + suffix;
                el.style.animation = 'popIn 0.35s var(--ease-spring)';
            }
        }

        requestAnimationFrame(tick);
    }

    const statObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.dataset.counted) {
                    entry.target.dataset.counted = 'true';
                    animateCountUp(entry.target);
                    statObserver.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.35 }
    );

    /* ---- 4. Navbar Scroll Depth Elevation ---- */
    function handleNavbarScroll() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;
        const scrolled = window.scrollY > 20;
        if (scrolled) {
            navbar.classList.add('navbar-scrolled');
        } else {
            navbar.classList.remove('navbar-scrolled');
        }
    }
    window.addEventListener('scroll', handleNavbarScroll, { passive: true });
    handleNavbarScroll();

    /* ---- 5. Tactile Wishlist Heart & Button Feedback ---- */
    document.addEventListener('click', (e) => {
        // Wishlist button heart pop
        const heartBtn = e.target.closest('.btn-wishlist');
        if (heartBtn) {
            heartBtn.classList.remove('pop');
            // Force reflow
            void heartBtn.offsetWidth;
            heartBtn.classList.add('pop');
        }
    });

    /* ---- 6. Mobile Nav Toggle & Smooth Close ---- */
    function initMobileNav() {
        const toggle   = document.getElementById('mobileMenuToggle');
        const navLinks = document.getElementById('navLinks');

        if (toggle && navLinks) {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = navLinks.classList.toggle('open');
                const svg = toggle.querySelector('svg');
                if (svg) {
                    svg.style.transform = isOpen ? 'rotate(90deg)' : 'rotate(0deg)';
                }
            });

            // Close on outer click
            document.addEventListener('click', (e) => {
                if (!navLinks.contains(e.target) && !toggle.contains(e.target)) {
                    if (navLinks.classList.contains('open')) {
                        navLinks.classList.remove('open');
                        const svg = toggle.querySelector('svg');
                        if (svg) svg.style.transform = 'rotate(0deg)';
                    }
                }
            });

            // Close on nav link click
            navLinks.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    navLinks.classList.remove('open');
                    const svg = toggle.querySelector('svg');
                    if (svg) svg.style.transform = 'rotate(0deg)';
                });
            });
        }
    }

    /* ---- 7. DOM Mutation Observer & Global API Hooks ---- */
    const mutationObserver = new MutationObserver(() => {
        scanAndObserveElements();
    });

    if (document.body) {
        mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    // Expose global init / refresh functions for asynchronous AJAX views
    window.initAnimations = function () {
        scanAndObserveElements();
    };

    window.refreshAnimations = function () {
        scanAndObserveElements();
    };

    // Initial setup on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initMobileNav();
            scanAndObserveElements();
        });
    } else {
        initMobileNav();
        scanAndObserveElements();
    }
})();

