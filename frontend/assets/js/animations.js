/* ============================================================
   GIVING TREE — animations.js
   Editorial Scroll Observer, Stat Counter & Interaction Handlers
   Inspired by eBay Playbook
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // 1. Sticky Navbar scroll elevation
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 40) {
                navbar.classList.add('navbar-scrolled');
            } else {
                navbar.classList.remove('navbar-scrolled');
            }
        }, { passive: true });
    }

    // 2. IntersectionObserver for Scroll Reveal
    let scrollObserver = null;
    window.refreshScrollObserver = function() {
        const revealElements = document.querySelectorAll('.reveal-on-scroll:not(.is-revealed)');
        if ('IntersectionObserver' in window && revealElements.length > 0) {
            if (!scrollObserver) {
                scrollObserver = new IntersectionObserver((entries, obs) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('is-revealed');
                            obs.unobserve(entry.target);
                        }
                    });
                }, {
                    threshold: 0.08,
                    rootMargin: '0px 0px -30px 0px'
                });
            }
            revealElements.forEach(el => scrollObserver.observe(el));
        } else {
            revealElements.forEach(el => el.classList.add('is-revealed'));
        }
    };

    window.refreshScrollObserver();

    // 3. Animated Number Counters
    const counters = document.querySelectorAll('.stat-counter');
    if (counters.length > 0 && 'IntersectionObserver' in window) {
        const countObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counter = entry.target;
                    const target = parseInt(counter.getAttribute('data-target') || counter.innerText.replace(/\D/g, ''), 10);
                    if (!isNaN(target)) {
                        animateCounter(counter, target);
                    }
                    obs.unobserve(counter);
                }
            });
        }, { threshold: 0.3 });

        counters.forEach(c => countObserver.observe(c));
    }

    function animateCounter(el, target) {
        const duration = 1800; // ms
        const startTime = performance.now();
        const suffix = el.getAttribute('data-suffix') || '+';

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(easeOut * target);

            el.innerText = current.toLocaleString('en-IN') + suffix;

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        requestAnimationFrame(update);
    }
});
