/**
 * NVIDIA AI Studio — Navigation Controller
 * Handles responsive navigation, mobile menu, smooth scrolling,
 * active link tracking, and navbar scroll effects.
 */

const Navigation = (() => {
  let navbar = null;
  let mobileMenu = null;
  let menuToggle = null;
  let menuIcon = null;
  let isMenuOpen = false;

  /**
   * Initialize all navigation behavior.
   */
  function init() {
    navbar = document.getElementById('navbar');
    mobileMenu = document.getElementById('mobile-menu');
    menuToggle = document.getElementById('menu-toggle');
    menuIcon = document.getElementById('menu-icon');

    if (menuToggle) {
      menuToggle.addEventListener('click', toggleMobileMenu);
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', handleAnchorClick);
    });

    // Navbar scroll effect
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Close mobile menu on resize to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && isMenuOpen) {
        closeMobileMenu();
      }
    });

    // Close mobile menu on outside click
    document.addEventListener('click', (e) => {
      if (isMenuOpen && !mobileMenu.contains(e.target) && !menuToggle.contains(e.target)) {
        closeMobileMenu();
      }
    });

    // Close mobile menu on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isMenuOpen) {
        closeMobileMenu();
        menuToggle.focus();
      }
    });

    // Set initial scroll state
    handleScroll();
  }

  /**
   * Toggle mobile menu open/closed.
   */
  function toggleMobileMenu() {
    if (isMenuOpen) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }

  /**
   * Open the mobile menu.
   */
  function openMobileMenu() {
    isMenuOpen = true;
    mobileMenu.classList.add('is-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    if (menuIcon) menuIcon.textContent = 'close';
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close the mobile menu.
   */
  function closeMobileMenu() {
    isMenuOpen = false;
    mobileMenu.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    if (menuIcon) menuIcon.textContent = 'menu';
    document.body.style.overflow = '';
  }

  /**
   * Handle anchor link clicks with smooth scrolling.
   */
  function handleAnchorClick(e) {
    const href = this.getAttribute('href');
    if (!href || href === '#') return;

    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      
      // Close mobile menu if open
      if (isMenuOpen) closeMobileMenu();

      // Smooth scroll to target
      const navHeight = navbar ? navbar.offsetHeight : 0;
      const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 24;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });

      // Update URL hash without scroll jump
      history.pushState(null, null, href);
    }
  }

  /**
   * Handle scroll events for navbar styling and active link tracking.
   */
  function handleScroll() {
    if (!navbar) return;

    // Navbar scroll styling
    if (window.scrollY > 20) {
      navbar.classList.add('navbar--scrolled');
    } else {
      navbar.classList.remove('navbar--scrolled');
    }

    // Active section tracking
    updateActiveLink();
  }

  /**
   * Update the active navigation link based on scroll position.
   */
  function updateActiveLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.navbar__link, .navbar__mobile-link');
    const scrollPos = window.scrollY + 200;

    let currentSection = '';

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        currentSection = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('navbar__link--active');
      const href = link.getAttribute('href');
      if (href === `#${currentSection}`) {
        link.classList.add('navbar__link--active');
      }
    });
  }

  return { init };
})();
