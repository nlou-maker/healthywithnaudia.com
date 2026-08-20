(function () {
  const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzU1KxJng13yaM48Lk2P5pLYllRsFjscDg3gZaaq7pkQbm470LVDb3YmXsmevzh0g/exec';

  const formatDay = (date) => date.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'Europe/Berlin' });
  const berlinISO = (date) => date.toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' });
  const shortDay = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  };
  const formatTime = (date) => date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });

  const state = {
    step: 'time', month: null, day: null, slots: [], selected: null, loading: true, loadError: false,
    busy: false, error: '',
    form: { name: '', email: '', age: '', gender: '', goal: '', symptoms: '' }
  };

  const stepTime = document.getElementById('step-time');
  const stepDetails = document.getElementById('step-details');
  const stepConfirm = document.getElementById('step-confirm');
  const slotsContainer = document.getElementById('slots-container');
  const selectedTimeDisplay = document.getElementById('selected-time-display');
  const changeTimeBtn = document.getElementById('change-time-btn');
  const bookingForm = document.getElementById('booking-form');
  const submitBtn = document.getElementById('submit-btn');
  const formError = document.getElementById('form-error');
  const confirmDetail = document.getElementById('confirm-detail');

  function showStep(step) {
    state.step = step;
    stepTime.hidden = step !== 'time';
    stepDetails.hidden = step !== 'details';
    stepConfirm.hidden = step !== 'confirm';
    window.scrollTo(0, 0);
  }

  changeTimeBtn.addEventListener('click', () => showStep('time'));

  ['name', 'email', 'age', 'gender', 'goal', 'symptoms'].forEach((k) => {
    document.getElementById(k).addEventListener('input', (e) => { state.form[k] = e.target.value; });
  });

  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (state.busy || !state.selected) return;
    state.busy = true;
    state.error = '';
    setSubmitBusy(true);
    formError.hidden = true;

    const f = state.form;
    const payload = {
      action: 'book',
      start: state.selected.start,
      client: {
        name: f.name.trim(), email: f.email.trim(), age: String(f.age).trim(),
        gender: f.gender, goal: f.goal.trim(), symptoms: f.symptoms.trim()
      }
    };
    try {
      const res = await fetch(WEBAPP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) {
        state.busy = false;
        setSubmitBusy(false);
        formError.textContent = data.error || 'Something went wrong. Please try again.';
        formError.hidden = false;
        if (data.error && data.error.indexOf('just booked') !== -1) loadSlots();
        return;
      }
      state.busy = false;
      setSubmitBusy(false);
      confirmDetail.textContent = state.selectedLabel || '';
      showStep('confirm');
    } catch (err) {
      state.busy = false;
      setSubmitBusy(false);
      formError.textContent = 'Network error — please check your connection and try again.';
      formError.hidden = false;
    }
  });

  function setSubmitBusy(busy) {
    submitBtn.disabled = busy;
    submitBtn.textContent = busy ? 'Booking…' : 'Confirm Booking';
    submitBtn.style.background = busy ? 'color-mix(in srgb, var(--color-text) 28%, var(--color-surface))' : 'var(--color-accent)';
    submitBtn.style.cursor = busy ? 'not-allowed' : 'pointer';
  }

  async function loadSlots() {
    state.loading = true;
    state.loadError = false;
    renderCalendar();
    try {
      const res = await fetch(WEBAPP_URL + '?action=availability');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      state.slots = data.slots || [];
      state.loading = false;
    } catch (err) {
      state.loading = false;
      state.loadError = true;
    }
    renderCalendar();
  }

  function pickDay(iso) {
    state.day = iso;
    renderCalendar();
  }

  function pickSlot(slot) {
    state.selected = slot;
    const sel = new Date(slot.start);
    state.selectedLabel = formatDay(sel) + ' at ' + formatTime(sel) + ' (Berlin time)';
    selectedTimeDisplay.textContent = state.selectedLabel;
    state.error = '';
    showStep('details');
  }

  function stepMonth(dir, monthsWithSlots, monthKey) {
    const list = dir < 0
      ? monthsWithSlots.filter((m) => m < monthKey).slice(-1)
      : monthsWithSlots.filter((m) => m > monthKey).slice(0, 1);
    if (list.length) { state.month = list[0]; renderCalendar(); }
  }

  function renderCalendar() {
    const { slots, loading, loadError } = state;

    const byDate = {};
    slots.forEach((slot) => {
      const d = new Date(slot.start);
      const iso = berlinISO(d);
      (byDate[iso] = byDate[iso] || []).push({ start: slot.start, time: formatTime(d), raw: slot });
    });
    const openDates = Object.keys(byDate).sort();

    let msg = '';
    if (loading) msg = 'Loading available times…';
    else if (loadError) msg = 'Could not load available times. Please refresh, or contact Naudia directly.';
    else if (slots.length === 0) msg = 'No times available right now — please check back soon.';

    slotsContainer.innerHTML = '';

    if (msg) {
      const div = document.createElement('div');
      div.style.cssText = 'text-align:center;padding:40px 8px;font-size:15px;line-height:1.5;color:color-mix(in srgb, var(--color-text) 55%, transparent)';
      div.textContent = msg;
      slotsContainer.appendChild(div);
      return;
    }

    const firstDate = openDates[0] || berlinISO(new Date());
    const day = state.day && byDate[state.day] ? state.day : (openDates[0] || null);
    state.day = day;
    const monthKey = state.month || (day || firstDate).slice(0, 7);
    const [my, mm] = monthKey.split('-').map(Number);
    const monthsWithSlots = [...new Set(openDates.map((d) => d.slice(0, 7)))];
    const canPrev = monthsWithSlots.some((m) => m < monthKey);
    const canNext = monthsWithSlots.some((m) => m > monthKey);

    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:26px';

    // --- calendar column ---
    const calCol = document.createElement('div');

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:14px';
    const monthLabel = document.createElement('span');
    monthLabel.style.cssText = 'font-size:15px;font-weight:700;white-space:nowrap';
    monthLabel.textContent = new Date(Date.UTC(my, mm - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const navBtns = document.createElement('div');
    navBtns.style.cssText = 'display:flex;gap:6px';
    const navBtnStyle = (on) => 'width:28px;height:28px;border-radius:999px;border:0;font-family:var(--font-body);font-size:14px;display:flex;align-items:center;justify-content:center;' +
      (on ? 'background:var(--color-accent-100);color:var(--color-accent-700);cursor:pointer;' : 'background:var(--color-accent-2-100);color:color-mix(in srgb, var(--color-text) 30%, transparent);cursor:not-allowed;');
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.setAttribute('aria-label', 'Previous month');
    prevBtn.style.cssText = navBtnStyle(canPrev);
    prevBtn.textContent = '‹';
    prevBtn.disabled = !canPrev;
    prevBtn.addEventListener('click', () => stepMonth(-1, monthsWithSlots, monthKey));
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.setAttribute('aria-label', 'Next month');
    nextBtn.style.cssText = navBtnStyle(canNext);
    nextBtn.textContent = '›';
    nextBtn.disabled = !canNext;
    nextBtn.addEventListener('click', () => stepMonth(1, monthsWithSlots, monthKey));
    navBtns.append(prevBtn, nextBtn);
    header.append(monthLabel, navBtns);
    calCol.appendChild(header);

    const dow = document.createElement('div');
    dow.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:6px';
    ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((l) => {
      const s = document.createElement('span');
      s.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:0.06em;color:color-mix(in srgb, var(--color-text) 40%, transparent);text-align:center';
      s.textContent = l;
      dow.appendChild(s);
    });
    calCol.appendChild(dow);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:4px';
    const cellBase = 'position:relative;aspect-ratio:1;border:0;border-radius:10px;padding:0;font-family:var(--font-body);font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;';
    const daysInMonth = new Date(Date.UTC(my, mm, 0)).getUTCDate();
    const lead = (new Date(Date.UTC(my, mm - 1, 1)).getUTCDay() + 6) % 7;

    for (let i = 0; i < lead; i++) {
      const b = document.createElement('span');
      b.style.cssText = cellBase + 'background:transparent;';
      grid.appendChild(b);
    }
    for (let n = 1; n <= daysInMonth; n++) {
      const iso = monthKey + '-' + String(n).padStart(2, '0');
      const has = !!byDate[iso];
      const isSel = iso === day;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.disabled = !has;
      btn.setAttribute('aria-label', shortDay(iso) + (has ? ' — ' + byDate[iso].length + ' times open' : ' — nothing free'));
      btn.style.cssText = cellBase + (isSel ? 'background:var(--color-accent);color:var(--color-bg);cursor:pointer;'
        : has ? 'background:var(--color-accent-100);color:var(--color-accent-700);cursor:pointer;'
        : 'background:transparent;color:color-mix(in srgb, var(--color-text) 30%, transparent);text-decoration:line-through;text-decoration-color:color-mix(in srgb, var(--color-text) 35%, transparent);text-decoration-thickness:1px;');
      const numSpan = document.createElement('span');
      numSpan.textContent = String(n);
      btn.appendChild(numSpan);
      if (has) {
        const dot = document.createElement('span');
        dot.style.cssText = 'position:absolute;bottom:6px;width:4px;height:4px;border-radius:999px;background:' + (isSel ? 'var(--color-bg)' : 'var(--color-accent)') + ';';
        btn.appendChild(dot);
        btn.addEventListener('click', () => pickDay(iso));
      }
      grid.appendChild(btn);
    }
    calCol.appendChild(grid);
    wrap.appendChild(calCol);

    // --- day / times column ---
    const dayGroup = document.createElement('div');
    const dayLabelEl = document.createElement('div');
    dayLabelEl.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--color-accent-2-600);margin-bottom:10px';
    dayLabelEl.textContent = day ? shortDay(day) : '';
    dayGroup.appendChild(dayLabelEl);

    const slotGrid = document.createElement('div');
    slotGrid.style.cssText = 'display:flex;flex-direction:column;gap:8px';
    const times = day && byDate[day] ? byDate[day] : [];
    times.forEach((s) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.start = s.start;
      btn.style.cssText = 'padding:11px 8px;border:1px solid color-mix(in srgb, var(--color-text) 14%, transparent);border-radius:var(--radius-lg);background:var(--color-bg);font-family:var(--font-body);font-size:14px;font-weight:600;color:var(--color-text);cursor:pointer;text-align:center;transition:background .15s,color .15s,border-color .15s';
      btn.textContent = s.time;
      btn.addEventListener('mouseenter', () => { btn.style.background = 'var(--color-accent-700)'; btn.style.borderColor = 'var(--color-accent-700)'; btn.style.color = 'var(--color-bg)'; });
      btn.addEventListener('mouseleave', () => { btn.style.background = 'var(--color-bg)'; btn.style.borderColor = 'color-mix(in srgb, var(--color-text) 14%, transparent)'; btn.style.color = 'var(--color-text)'; });
      btn.addEventListener('click', () => pickSlot(s.raw));
      slotGrid.appendChild(btn);
    });
    dayGroup.appendChild(slotGrid);

    if (!day || !times.length) {
      const p = document.createElement('p');
      p.style.cssText = 'font-size:12px;line-height:1.5;color:color-mix(in srgb, var(--color-text) 50%, transparent);margin:0';
      p.textContent = 'Pick a highlighted day to see open times.';
      dayGroup.appendChild(p);
    }
    wrap.appendChild(dayGroup);

    slotsContainer.appendChild(wrap);
  }

  loadSlots();
})();
