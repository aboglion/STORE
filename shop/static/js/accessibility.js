// Accessibility Menu Logic
document.addEventListener('DOMContentLoaded', function () {
  const toggleBtn = document.getElementById('accessibility-toggle');
  const menu = document.getElementById('accessibility-menu');
  const fontBtn = document.getElementById('increase-font');
  const contrastBtn = document.getElementById('toggle-contrast');
  const resetBtn = document.getElementById('reset-accessibility');
  const root = document.documentElement;
  const body = document.body;

  if (!toggleBtn || !menu) {
    console.error('Accessibility elements not found');
    return;
  }

  // Toggle menu visibility with animation
  toggleBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    menu.classList.toggle('active');
  });

  if (fontBtn) {
    fontBtn.addEventListener('click', function () {
      body.classList.toggle('font-large');
      root.classList.toggle('font-large');
    });
  }

  if (contrastBtn) {
    contrastBtn.addEventListener('click', function () {
      body.classList.toggle('high-contrast');
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      body.classList.remove('font-large', 'high-contrast');
      root.classList.remove('font-large');
    });
  }

  // Optional: Close menu when clicking outside
  document.addEventListener('click', function (e) {
    if (!menu.contains(e.target) && !toggleBtn.contains(e.target)) {
      menu.classList.remove('active');
    }
  });
});