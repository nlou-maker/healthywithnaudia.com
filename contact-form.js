// Same Google Apps Script backend as the booking page — requires the 'contact'
// action added to Code.gs (see contact-form-backend-snippet.gs.txt).
(function () {
  const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzU1KxJng13yaM48Lk2P5pLYllRsFjscDg3gZaaq7pkQbm470LVDb3YmXsmevzh0g/exec';
  const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  const form = document.getElementById('contact-form');
  const sentPanel = document.getElementById('contact-sent');
  const submitBtn = document.getElementById('contact-submit');
  const errorEl = document.getElementById('contact-error');
  const nameEl = document.getElementById('c-name');
  const emailEl = document.getElementById('c-email');
  const messageEl = document.getElementById('c-message');

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function clearError() {
    errorEl.hidden = true;
    errorEl.textContent = '';
  }

  function setBusy(busy) {
    submitBtn.disabled = busy;
    submitBtn.textContent = busy ? 'Sending…' : 'Submit';
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = nameEl.value.trim();
    const email = emailEl.value.trim();
    const message = messageEl.value.trim();

    if (!name || !email || !message) {
      showError('Please fill in your name, email and message.');
      return;
    }
    if (!EMAIL_RE.test(email)) {
      showError('That email address does not look right.');
      return;
    }

    clearError();
    setBusy(true);

    try {
      const res = await fetch(WEBAPP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'contact', name, email, message })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Message could not be sent.');

      setBusy(false);
      form.style.display = 'none';
      sentPanel.hidden = false;
    } catch (err) {
      setBusy(false);
      showError(err.message + ' You can also email info@healthywithnaudia.com directly.');
    }
  });
})();
