(() => {
  const section = document.getElementById('systems');
  if (!section) return;
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };
  const byId = id => document.getElementById(id);
  const themeButtons = [...document.querySelectorAll('[data-intro-option]')];
  function selectTheme(option) {
    option = option === '2' ? '2' : '1';
    section.dataset.theme = option === '1' ? 'business' : 'official';
    themeButtons.forEach(button => {
      const active = button.dataset.introOption === option;
      button.setAttribute('aria-pressed', String(active));
      byId(button.getAttribute('aria-controls')).hidden = !active;
    });
    section.setAttribute('aria-labelledby', option === '1' ? 'workspace-title' : 'bt-official-title');
    byId('bt-theme-name').textContent = option === '1' ? 'الأعمال' : 'الرسمية';
    save('clerio-opening-theme', option);
  }
  const themeMenu = byId('b-theme-options')?.closest('details');
  themeButtons.forEach(button => button.addEventListener('click', () => { selectTheme(button.dataset.introOption); if (themeMenu) themeMenu.open = false; }));
  selectTheme(read('clerio-opening-theme', '1'));
  const today = new Date();
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const todayKey = dateKey(today);
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && dateKey(new Date(value + 'T12:00:00')) === value;
  const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  const dateLabel = value => new Date(value + 'T12:00:00').toLocaleDateString('ar-OM', { weekday: 'long', day: 'numeric', month: 'long' });
  const number = value => value.toLocaleString('ar-EG');
  const types = { task: 'مهمة', meeting: 'اجتماع', call: 'اتصال', delivery: 'تسليم مشروع', note: 'ملاحظة' };
  const validType = type => Object.hasOwn(types, type) ? type : 'task';
  let selected = todayKey, month = new Date(today.getFullYear(), today.getMonth(), 1);
  let tasks = read('clerio-personal-tasks', []);
  if (!Array.isArray(tasks)) tasks = [];
  tasks = tasks.filter(task => task && typeof task.title === 'string' && typeof task.done === 'boolean').map(task => ({
    ...task, date: validDate(task.date) ? task.date : todayKey,
    time: validTime(task.time) ? task.time : '', type: validType(task.type), body: typeof task.body === 'string' ? task.body : ''
  }));
  let notes = read('clerio-business-notes', {});
  if (!notes || Array.isArray(notes) || typeof notes !== 'object') notes = {};
  // Examples are anchored once and explicitly labeled, not official observance dates.
  let demoDate = read('clerio-business-demo-date', null);
  if (!validDate(demoDate)) { demoDate = todayKey; save('clerio-business-demo-date', demoDate); }
  const offsetDate = offset => { const date = new Date(demoDate + 'T12:00:00'); date.setDate(date.getDate() + offset); return dateKey(date); };
  const occasions = [
    { date: demoDate, title: 'يوم القلب', symbol: '♡', detail: 'تذكير بالعناية بصحتك خلال يوم العمل.' },
    { date: offsetDate(3), title: 'يوم مشاركة المعرفة', symbol: '✦', detail: 'فكرة أو تجربة تستحق المشاركة مع الفريق.' },
    { date: offsetDate(7), title: 'مبادرة تطوعية', symbol: '◇', detail: 'مساحة للمشاركة وصناعة أثر إيجابي.' }
  ];
  if (!read('clerio-business-examples-v1', false)) {
    if (!tasks.length) {
      tasks = [
        { title: 'مراجعة أولويات الأسبوع', type: 'task', time: '08:30' },
        { title: 'اجتماع متابعة الفريق', type: 'meeting', time: '10:00' },
        { title: 'اتصال لمتابعة متطلبات العميل', type: 'call', time: '11:30' },
        { title: 'تسليم النسخة الأولية للمشروع', type: 'delivery', time: '14:00' }
      ].map(task => ({ ...task, date: todayKey, done: false, demo: true }));
      save('clerio-personal-tasks', tasks);
    }
    if (!Object.hasOwn(notes, todayKey)) {
      notes[todayKey] = 'ملاحظة توضيحية — يمكنك تعديلها:\n• تجهيز نقاط اجتماع الفريق.\n• مراجعة متطلبات المشروع قبل التسليم.';
      save('clerio-business-notes', notes);
    }
    save('clerio-business-examples-v1', true);
  }
  // Copy existing dated notes once; retain the original storage as a recovery source.
  if (!read('clerio-business-notes-merged-v1', false)) {
    Object.entries(notes).forEach(([date, body]) => {
      if (validDate(date) && typeof body === 'string' && body.trim() && !tasks.some(task => task.legacyNoteDate === date)) {
        tasks.push({ title: 'ملاحظات اليوم', body, type: 'note', date, time: '', done: false, legacyNoteDate: date });
      }
    });
    if (save('clerio-personal-tasks', tasks)) save('clerio-business-notes-merged-v1', true);
  }
  const timeline = byId('bt-task-preview'), composer = byId('bt-task-composer'), form = byId('bt-task-form');
  let editing = null;
  const announce = message => { byId('bt-task-status').textContent = message; };
  function persistTasks(message) {
    announce(save('clerio-personal-tasks', tasks) ? message : 'تعذّر الحفظ في المتصفح؛ التغييرات متاحة حتى إغلاق الصفحة.');
  }
  function updateFade() { timeline.parentElement.classList.toggle('has-more', timeline.scrollHeight - timeline.clientHeight - timeline.scrollTop > 2); }
  timeline.addEventListener('scroll', updateFade, { passive: true });
  new ResizeObserver(updateFade).observe(timeline);
  function counts() {
    const daily = tasks.filter(task => task.date === selected), work = daily.filter(task => task.type !== 'note'), noteCount = daily.length - work.length;
    const summary = [];
    if (work.length) summary.push(`${number(work.filter(task => task.done).length)} / ${number(work.length)} مكتملة`);
    if (noteCount) summary.push(`ملاحظات: ${number(noteCount)}`);
    byId('bt-day-count').textContent = summary.join(' · ') || 'يوم متاح';
  }
  function draw() {
    byId('bt-month-label').textContent = month.toLocaleDateString('ar-OM', { month: 'long', year: 'numeric' });
    const grid = byId('bt-month-grid'); grid.replaceChildren();
    ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].forEach(day => { const label = document.createElement('span'); label.className = 'bt-weekday'; label.textContent = day; grid.append(label); });
    for (let i = 0; i < month.getDay(); i++) { const blank = document.createElement('span'); blank.setAttribute('aria-hidden', 'true'); grid.append(blank); }
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= days; day++) {
      const date = dateKey(new Date(month.getFullYear(), month.getMonth(), day));
      const daily = tasks.filter(task => task.date === date), occasion = occasions.find(item => item.date === date);
      const button = document.createElement('button'); button.type = 'button'; button.textContent = number(day); button.dataset.date = date;
      const label = dateLabel(date) + (daily.length ? `، ${number(daily.length)} عناصر في جدول اليوم` : '') + (occasion ? `، ${occasion.title} — مناسبة توضيحية` : '');
      button.setAttribute('aria-label', label); button.title = label; button.setAttribute('aria-pressed', String(selected === date));
      if (date === todayKey) button.setAttribute('aria-current', 'date');
      button.classList.toggle('has-tasks', daily.length > 0); button.classList.toggle('has-occasion', Boolean(occasion));
      button.addEventListener('click', () => { selected = date; render(); grid.querySelector(`[data-date="${date}"]`).focus({ preventScroll: true }); });
      grid.append(button);
    }
  }
  function renderOccasion() {
    const box = byId('bt-occasion'); box.replaceChildren(); const occasion = occasions.find(item => item.date === selected);
    const symbol = document.createElement('span'); symbol.className = 'bt-occasion-symbol'; symbol.setAttribute('aria-hidden', 'true'); symbol.textContent = occasion?.symbol || '◇';
    const copy = document.createElement('div'), title = document.createElement('strong'), detail = document.createElement('small');
    title.textContent = occasion?.title || 'مساحة ليومك';
    detail.textContent = occasion ? `مناسبة توضيحية · ${occasion.detail}` : 'اختر يومًا عليه نقطة مناسبة لعرض تفاصيلها.';
    copy.append(title, detail); box.append(symbol, copy);
  }
  function updateComposerType() {
    const type = validType(byId('bt-task-type').value), isNote = type === 'note';
    byId('bt-note-field').hidden = !isNote;
    byId('bt-time-field').hidden = isNote;
    byId('bt-task-time').disabled = isNote;
    byId('bt-task-input').placeholder = isNote ? 'عنوان مختصر للملاحظة' : 'ماذا تريد إنجازه؟';
    byId('bt-entry-title').textContent = `${editing ? 'تعديل' : 'إضافة'} ${types[type]}`;
    byId('bt-task-submit').textContent = editing ? 'حفظ التعديل' : (isNote ? 'إضافة الملاحظة' : 'إضافة العمل');
  }
  byId('bt-task-type').addEventListener('change', updateComposerType);
  function openComposer(type = 'task', task = null) {
    editing = task; form.reset(); byId('bt-task-input').setCustomValidity('');
    byId('bt-task-input').value = task?.title || ''; byId('bt-task-type').value = task?.type || type;
    byId('bt-task-date').value = task?.date || selected; byId('bt-task-time').value = task?.time || '';
    byId('bt-note-body').value = task?.body || '';
    updateComposerType(); byId('bt-entry-status').textContent = '';
    composer.showModal(); byId('bt-task-input').focus();
  }
  function renderTasks() {
    const daily = tasks.filter(task => task.date === selected).sort((a, b) => Number(b.type === 'note') - Number(a.type === 'note') || (a.time || '99').localeCompare(b.time || '99'));
    timeline.replaceChildren(); section.querySelector('.bt-agenda').classList.toggle('is-empty', !daily.length);
    daily.forEach(task => {
      const row = document.createElement('div'); row.className = 'bt-task-row'; row.dataset.type = task.type;
      const time = document.createElement('time'); time.className = 'bt-task-hour'; time.textContent = task.time || 'مرن'; if (task.time) time.dateTime = `${task.date}T${task.time}`;
      const check = document.createElement('input'); check.type = 'checkbox'; check.checked = task.done; check.setAttribute('aria-label', `إتمام ${task.title}`);
      const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'bt-task-copy'; copy.setAttribute('aria-label', `تعديل ${task.title}`);
      const title = document.createElement('strong'); title.textContent = task.title; const status = document.createElement('small');
      const updateStatus = () => { status.textContent = `${types[task.type]}${task.demo ? ' · نموذج' : ''}${task.done ? ' · مكتملة' : ''}`; };
      updateStatus(); copy.append(title, status); copy.addEventListener('click', () => openComposer(task.type, task));
      check.addEventListener('change', () => { task.done = check.checked; updateStatus(); persistTasks('تم تحديث حالة العمل.'); counts(); draw(); });
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'bt-task-remove'; remove.textContent = '×'; remove.setAttribute('aria-label', `حذف ${task.title}`);
      remove.addEventListener('click', () => { tasks = tasks.filter(item => item !== task); persistTasks('تم حذف العمل.'); renderTasks(); counts(); draw(); byId('bt-task-add-toggle').focus({ preventScroll: true }); });
      if (task.type === 'note') {
        const label = document.createElement('small'); label.className = 'bt-note-label'; label.textContent = '✎ ملاحظة';
        const body = document.createElement('span'); body.className = 'bt-note-preview'; body.textContent = task.body || '';
        copy.replaceChildren(label, title, body);
        row.append(copy, remove);
      } else row.append(time, check, copy, remove);
      timeline.append(row);
    });
    requestAnimationFrame(updateFade);
  }
  function render() {
    byId('bt-selected-label').textContent = dateLabel(selected);
    counts(); renderTasks(); draw(); renderOccasion();
  }
  byId('bt-month-prev').addEventListener('click', () => { month.setMonth(month.getMonth() - 1); draw(); });
  byId('bt-month-next').addEventListener('click', () => { month.setMonth(month.getMonth() + 1); draw(); });
  byId('bt-task-add-toggle').addEventListener('click', () => openComposer());
  section.querySelectorAll('[data-entry-type]').forEach(button => button.addEventListener('click', () => openComposer(button.dataset.entryType)));
  byId('bt-task-cancel').addEventListener('click', () => composer.close()); composer.addEventListener('close', () => { editing = null; });
  byId('bt-task-input').addEventListener('input', event => event.target.setCustomValidity(''));
  form.addEventListener('submit', event => {
    event.preventDefault(); const input = byId('bt-task-input'), title = input.value.trim();
    if (!title) { input.setCustomValidity('اكتب عنوان العمل'); input.reportValidity(); return; }
    const date = byId('bt-task-date').value;
    if (!validDate(date)) { byId('bt-entry-status').textContent = 'اختر تاريخًا صالحًا.'; return; }
    const time = byId('bt-task-time').value, type = validType(byId('bt-task-type').value);
    const data = { title, date, time: type !== 'note' && validTime(time) ? time : '', type, body: byId('bt-note-body').value.trim(), demo: false };
    if (type === 'note') data.done = false;
    if (editing) Object.assign(editing, data); else tasks.push({ ...data, done: false });
    persistTasks(editing ? 'تم حفظ التعديل.' : 'تمت إضافة العمل.'); selected = date; month = new Date(date + 'T12:00:00'); month.setDate(1);
    composer.close(); render(); byId('bt-task-add-toggle').focus({ preventScroll: true });
  });
  render();
})();
