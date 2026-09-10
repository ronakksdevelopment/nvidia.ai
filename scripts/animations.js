/**
 * NVIDIA AI Studio — Scroll Animation Controller
 * Uses IntersectionObserver for performant scroll-triggered animations.
 */

const ScrollAnimations = (() => {
  let observer = null;

  /**
   * Initialize the IntersectionObserver for scroll reveals.
   */
  function init() {
    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Make everything visible immediately
      document.querySelectorAll('.reveal, .reveal-scale, .reveal-stagger').forEach(el => {
        el.classList.add('is-visible');
      });
      return;
    }

    const options = {
      root: null,
      rootMargin: '0px 0px -60px 0px',
      threshold: 0.1
    };

    observer = new IntersectionObserver(handleIntersection, options);

    // Observe all elements with reveal classes
    document.querySelectorAll('.reveal, .reveal-scale, .reveal-stagger').forEach(el => {
      observer.observe(el);
    });

    // Add reveal classes to elements that should animate
    addRevealClasses();
  }

  /**
   * Handle intersection events.
   */
  function handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        // Once visible, stop observing
        observer.unobserve(entry.target);
      }
    });
  }

  /**
   * Add reveal classes to sections and elements.
   */
  function addRevealClasses() {
    // Section headers
    document.querySelectorAll('.section__header').forEach(el => {
      if (!el.classList.contains('reveal')) {
        el.classList.add('reveal');
        observer.observe(el);
      }
    });

    // Feature cards grid
    document.querySelectorAll('.features__grid, .models__grid').forEach(el => {
      if (!el.classList.contains('reveal-stagger')) {
        el.classList.add('reveal-stagger');
        observer.observe(el);
      }
    });

    // Tech cards
    document.querySelectorAll('.tech-card').forEach(el => {
      if (!el.classList.contains('reveal')) {
        el.classList.add('reveal');
        observer.observe(el);
      }
    });

    // CTA section
    document.querySelectorAll('.cta-section__card').forEach(el => {
      if (!el.classList.contains('reveal-scale')) {
        el.classList.add('reveal-scale');
        observer.observe(el);
      }
    });

    // Hero elements - animate immediately with CSS
    const heroEmblem = document.querySelector('.hero__emblem');
    const heroTitle = document.querySelector('.hero__title');
    const heroSubtitle = document.querySelector('.hero__subtitle');
    const heroActions = document.querySelector('.hero__actions');
    const heroStats = document.querySelector('.hero__stats');

    if (heroEmblem) heroEmblem.classList.add('animate-fade-in-down');
    if (heroTitle) {
      heroTitle.classList.add('animate-fade-in-up');
      heroTitle.style.animationDelay = '200ms';
    }
    if (heroSubtitle) {
      heroSubtitle.classList.add('animate-fade-in-up');
      heroSubtitle.style.animationDelay = '400ms';
    }
    if (heroActions) {
      heroActions.classList.add('animate-fade-in-up');
      heroActions.style.animationDelay = '600ms';
    }
    if (heroStats) {
      heroStats.classList.add('animate-fade-in-up');
      heroStats.style.animationDelay = '800ms';
    }
  }

  return { init };
})();
