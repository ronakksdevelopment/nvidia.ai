/**
 * NVIDIA AI Studio — Main Application Entry Point
 * Initializes all modules and handles global application state.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize core modules
  ThemeManager.init();
  Navigation.init();
  ScrollAnimations.init();

  // Console welcome message
  console.log(
    '%c⚡ NVIDIA AI Studio %cv1.0.0',
    'background: #76B900; color: #0B0D0E; padding: 4px 8px; border-radius: 4px 0 0 4px; font-weight: bold;',
    'background: #1E2328; color: #94da32; padding: 4px 8px; border-radius: 0 4px 4px 0; font-family: monospace;'
  );
  console.log(
    '%cEnterprise DGX Cloud · TensorRT-LLM · NeMo Guardrails',
    'color: #9EACB9; font-size: 11px;'
  );

  // Keyboard shortcut: Ctrl/Cmd + K to scroll to get-started
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const target = document.getElementById('get-started');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });

  // Add active nav link style
  const style = document.createElement('style');
  style.textContent = `
    .navbar__link--active {
      color: var(--color-primary) !important;
      background: rgba(118, 185, 0, 0.1);
    }
  `;
  document.head.appendChild(style);
});
