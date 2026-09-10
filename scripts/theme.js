/**
 * NVIDIA AI Studio — Theme Manager
 * Handles dark/light mode toggle with localStorage persistence
 * and system preference detection.
 */

const ThemeManager = (() => {
  const STORAGE_KEY = 'nvidia-ai-studio-theme';
  const DARK = 'dark';
  const LIGHT = 'light';

  let currentTheme = DARK;

  /**
   * Detect the user's preferred color scheme from the OS.
   */
  function getSystemPreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return LIGHT;
    }
    return DARK;
  }

  /**
   * Apply a theme to the document.
   */
  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    updateToggleIcon(theme);
  }

  /**
   * Update the theme toggle button icon.
   */
  function updateToggleIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (icon) {
      icon.textContent = theme === DARK ? 'dark_mode' : 'light_mode';
    }
  }

  /**
   * Toggle between dark and light themes.
   */
  function toggle() {
    const newTheme = currentTheme === DARK ? LIGHT : DARK;
    applyTheme(newTheme);
  }

  /**
   * Initialize the theme manager.
   */
  function init() {
    // Priority: localStorage > system preference > dark default
    const saved = localStorage.getItem(STORAGE_KEY);
    const theme = saved || getSystemPreference();
    applyTheme(theme);

    // Bind toggle button
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggle);
    }

    // Listen for system preference changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(STORAGE_KEY)) {
          applyTheme(e.matches ? DARK : LIGHT);
        }
      });
    }
  }

  return { init, toggle, getTheme: () => currentTheme };
})();
