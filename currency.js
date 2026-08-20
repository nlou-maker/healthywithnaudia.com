(function () {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const lang = (navigator.language || '').toLowerCase();
    const isUS = (tz.startsWith('America/') && !tz.includes('Argentina') && !tz.includes('Sao_Paulo')) || lang === 'en-us';
    if (isUS) {
      document.querySelectorAll('.js-cur').forEach((el) => { el.textContent = '$'; });
    }
  } catch (e) {}
})();
