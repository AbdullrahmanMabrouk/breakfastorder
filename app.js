// 1) Create a free Supabase project.
// 2) Run supabase.sql in Supabase > SQL Editor.
// 3) Paste your project URL and anon key below.
const SUPABASE_URL = 'https://bcpkxkhlbhnuoztuleex.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'sb_publishable_W70beGLLiQsXpktjjMjQuQ_uo-lS1vo';

const isConfigured = !SUPABASE_URL.includes('PASTE_') && !SUPABASE_ANON_KEY.includes('PASTE_');
const supabaseClient = isConfigured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const state = {
  selectedDate: localDateISO(),
  members: [],
  orders: new Map(),
  currentMemberId: localStorage.getItem('lunch-board-member-id') || '',
  saving: false,
};

const els = {
  datePicker: document.getElementById('datePicker'),
  prevDayBtn: document.getElementById('prevDayBtn'),
  nextDayBtn: document.getElementById('nextDayBtn'),
  todayBtn: document.getElementById('todayBtn'),
  stats: document.getElementById('stats'),
  memberSelect: document.getElementById('memberSelect'),
  yourNameTitle: document.getElementById('yourNameTitle'),
  orderingToggle: document.getElementById('orderingToggle'),
  mealInput: document.getElementById('mealInput'),
  noteInput: document.getElementById('noteInput'),
  saveBtn: document.getElementById('saveBtn'),
  saveState: document.getElementById('saveState'),
  formMessage: document.getElementById('formMessage'),
  board: document.getElementById('board'),
  boardTitle: document.querySelector('.board-section h2'),
  refreshBtn: document.getElementById('refreshBtn'),
  connectionState: document.getElementById('connectionState'),
  manageTeamBtn: document.getElementById('manageTeamBtn'),
  copySummaryBtn: document.getElementById('copySummaryBtn'),
  teamModal: document.getElementById('teamModal'),
  closeTeamBtn: document.getElementById('closeTeamBtn'),
  newMemberInput: document.getElementById('newMemberInput'),
  addMemberBtn: document.getElementById('addMemberBtn'),
  teamList: document.getElementById('teamList'),
  toast: document.getElementById('toast'),
};

function localDateISO(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function changeDate(days) {
  const d = new Date(`${state.selectedDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  state.selectedDate = localDateISO(d);
  els.datePicker.value = state.selectedDate;
  loadOrders();
}

function formatDate(dateISO) {
  const d = new Date(`${dateISO}T12:00:00`);
  const today = localDateISO();
  const tomorrow = localDateISO(new Date(Date.now() + 86400000));
  if (dateISO === today) return 'Today';
  if (dateISO === tomorrow) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setFormMessage(text = '', type = '') {
  els.formMessage.textContent = text;
  els.formMessage.className = `form-message ${type}`.trim();
}

function showToast(text) {
  els.toast.textContent = text;
  els.toast.classList.remove('hidden');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.add('hidden'), 2400);
}

async function loadMembers() {
  if (!supabaseClient) {
    state.members = [];
    renderMembers();
    renderTeamList();
    return;
  }
  const { data, error } = await supabaseClient
    .from('team_members')
    .select('id,name,active')
    .eq('active', true)
    .order('name');
  if (error) throw error;
  state.members = data || [];
  renderMembers();
  renderTeamList();
}

function renderMembers() {
  const previous = state.currentMemberId;
  els.memberSelect.innerHTML = '<option value="">Select your name…</option>' + state.members
    .map(m => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)}</option>`).join('');
  if (state.members.some(m => m.id === previous)) {
    els.memberSelect.value = previous;
  } else if (state.members.length === 1) {
    state.currentMemberId = state.members[0].id;
    localStorage.setItem('lunch-board-member-id', state.currentMemberId);
    els.memberSelect.value = state.currentMemberId;
  }
  loadMyForm();
}

function currentMember() {
  return state.members.find(m => m.id === state.currentMemberId) || null;
}

function loadMyForm() {
  const member = currentMember();
  const order = state.orders.get(state.currentMemberId);
  els.yourNameTitle.textContent = member ? member.name : 'Choose your name';
  els.orderingToggle.checked = Boolean(order?.ordering);
  els.mealInput.value = order?.meal || '';
  els.noteInput.value = order?.note || '';
  const disabled = !member || !els.orderingToggle.checked;
  els.mealInput.disabled = disabled;
  els.noteInput.disabled = disabled;
  els.saveBtn.disabled = !member || state.saving;
  els.saveState.textContent = order ? `Saved ${formatTime(order.updated_at)}` : 'Not saved';
}

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

async function loadOrders() {
  if (!supabaseClient) {
    state.orders = new Map();
    renderBoard();
    setConnection('Setup required', true);
    setFormMessage('Add your Supabase URL/key in app.js, then deploy the folder.', 'error');
    return;
  }
  setConnection('Loading…');
  try {
    const { data, error } = await supabaseClient
      .from('food_orders')
      .select('member_id,member_name,ordering,meal,note,updated_at')
      .eq('order_date', state.selectedDate);
    if (error) throw error;
    state.orders = new Map((data || []).map(row => [row.member_id, row]));
    renderBoard();
    loadMyForm();
    setConnection('Connected');
  } catch (err) {
    console.error(err);
    setConnection('Connection error', true);
    setFormMessage(err.message || 'Could not load today’s board.', 'error');
  }
}

function setConnection(text, error = false) {
  els.connectionState.textContent = text;
  els.connectionState.style.color = error ? 'var(--danger)' : '';
}

function renderStats() {
  const total = state.members.length;
  const responses = [...state.orders.values()];
  const ordering = responses.filter(x => x.ordering).length;
  const notOrdering = responses.filter(x => x.ordering === false).length;
  const waiting = Math.max(total - responses.length, 0);
  els.stats.innerHTML = [
    ['Ordering', ordering],
    ['Not ordering', notOrdering],
    ['Waiting', waiting],
    ['People', total],
  ].map(([label, value]) => `<div class="stat"><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div>`).join('');
}

function renderBoard() {
  renderStats();
  els.boardTitle.textContent = `${formatDate(state.selectedDate)} board`;
  if (!state.members.length) {
    els.board.innerHTML = `<div class="empty-state"><strong>No team members yet.</strong><br/>Use “Manage team” to add everyone.</div>`;
    return;
  }
  els.board.innerHTML = state.members.map(member => {
    const order = state.orders.get(member.id);
    const self = member.id === state.currentMemberId ? ' is-self' : '';
    if (!order) {
      return `<article class="board-card${self}">
        <div class="person-head"><div class="person-name">${escapeHtml(member.name)}</div><span class="badge waiting">Waiting</span></div>
        <div class="meal">No plan yet</div>
        <div class="updated">No response for ${escapeHtml(formatDate(state.selectedDate).toLowerCase())}.</div>
      </article>`;
    }
    if (!order.ordering) {
      return `<article class="board-card${self}">
        <div class="person-head"><div class="person-name">${escapeHtml(member.name)}</div><span class="badge not-ordering">Not ordering</span></div>
        <div class="meal">Skipping food</div>
        <div class="updated">Updated ${escapeHtml(formatTime(order.updated_at))}</div>
      </article>`;
    }
    return `<article class="board-card is-ordering${self}">
      <div class="person-head"><div class="person-name">${escapeHtml(member.name)}</div><span class="badge ordering">Ordering</span></div>
      <div class="meal">${escapeHtml(order.meal || 'Food not specified')}</div>
      ${order.note ? `<div class="note">${escapeHtml(order.note)}</div>` : ''}
      <div class="updated">Updated ${escapeHtml(formatTime(order.updated_at))}</div>
    </article>`;
  }).join('');
}

async function saveMyPlan() {
  const member = currentMember();
  if (!member || state.saving || !supabaseClient) return;
  state.saving = true;
  els.saveBtn.disabled = true;
  setFormMessage('Saving…');
  try {
    const ordering = els.orderingToggle.checked;
    const payload = {
      order_date: state.selectedDate,
      member_id: member.id,
      member_name: member.name,
      ordering,
      meal: ordering ? els.mealInput.value.trim() : '',
      note: ordering ? els.noteInput.value.trim() : '',
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabaseClient
      .from('food_orders')
      .upsert(payload, { onConflict: 'order_date,member_id' })
      .select('member_id,member_name,ordering,meal,note,updated_at')
      .single();
    if (error) throw error;
    state.orders.set(member.id, data);
    localStorage.setItem('lunch-board-member-id', member.id);
    renderBoard();
    loadMyForm();
    setFormMessage(`Saved for ${formatDate(state.selectedDate)}.`, 'success');
    showToast('Your food plan is saved.');
  } catch (err) {
    console.error(err);
    setFormMessage(err.message || 'Could not save your plan.', 'error');
  } finally {
    state.saving = false;
    loadMyForm();
  }
}

async function addMember() {
  const name = els.newMemberInput.value.trim();
  if (!name || !supabaseClient) return;
  els.addMemberBtn.disabled = true;
  try {
    const { data, error } = await supabaseClient
      .from('team_members')
      .insert({ name })
      .select('id,name,active')
      .single();
    if (error) throw error;
    state.members = [...state.members, data].sort((a, b) => a.name.localeCompare(b.name));
    els.newMemberInput.value = '';
    renderMembers();
    renderBoard();
    renderTeamList();
    showToast(`${name} added to the team.`);
  } catch (err) {
    showToast(err.message?.toLowerCase().includes('duplicate') ? 'That name is already on the team.' : 'Could not add that member.');
  } finally {
    els.addMemberBtn.disabled = false;
  }
}

async function removeMember(member) {
  if (!supabaseClient) return;
  if (!confirm(`Remove ${member.name} from the team?`)) return;
  const { error } = await supabaseClient.from('team_members').delete().eq('id', member.id);
  if (error) { showToast('Could not remove that member.'); return; }
  state.members = state.members.filter(m => m.id !== member.id);
  state.orders.delete(member.id);
  if (state.currentMemberId === member.id) {
    state.currentMemberId = '';
    localStorage.removeItem('lunch-board-member-id');
  }
  renderMembers();
  renderBoard();
  renderTeamList();
  showToast(`${member.name} removed.`);
}

function renderTeamList() {
  if (!state.members.length) {
    els.teamList.innerHTML = '<div class="empty-state">No members yet.</div>';
    return;
  }
  els.teamList.innerHTML = state.members.map(member =>
    `<div class="team-row"><span>${escapeHtml(member.name)}</span><button class="remove-btn" type="button" data-member-id="${escapeHtml(member.id)}">Remove</button></div>`
  ).join('');
  els.teamList.querySelectorAll('[data-member-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const member = state.members.find(m => m.id === btn.dataset.memberId);
      if (member) removeMember(member);
    });
  });
}

async function copySummary() {
  const ordering = state.members
    .map(member => ({ member, order: state.orders.get(member.id) }))
    .filter(x => x.order?.ordering);
  if (!ordering.length) {
    showToast('Nobody is ordering yet.');
    return;
  }
  const lines = [
    `${formatDate(state.selectedDate)} — food order`,
    '',
    ...ordering.map(({ member, order }) => `• ${member.name}: ${order.meal || 'Food not specified'}${order.note ? ` (${order.note})` : ''}`),
    '',
    `Total people ordering: ${ordering.length}`,
  ];
  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    showToast('Order summary copied.');
  } catch {
    showToast('Copy failed — your browser blocked clipboard access.');
  }
}

function openTeamModal() {
  els.teamModal.classList.remove('hidden');
  setTimeout(() => els.newMemberInput.focus(), 0);
}
function closeTeamModal() { els.teamModal.classList.add('hidden'); }

function wireEvents() {
  els.datePicker.value = state.selectedDate;
  els.prevDayBtn.addEventListener('click', () => changeDate(-1));
  els.nextDayBtn.addEventListener('click', () => changeDate(1));
  els.todayBtn.addEventListener('click', () => { state.selectedDate = localDateISO(); els.datePicker.value = state.selectedDate; loadOrders(); });
  els.datePicker.addEventListener('change', () => { state.selectedDate = els.datePicker.value || localDateISO(); loadOrders(); });
  els.memberSelect.addEventListener('change', () => {
    state.currentMemberId = els.memberSelect.value;
    if (state.currentMemberId) localStorage.setItem('lunch-board-member-id', state.currentMemberId);
    loadMyForm();
  });
  els.orderingToggle.addEventListener('change', loadMyForm);
  els.saveBtn.addEventListener('click', saveMyPlan);
  els.refreshBtn.addEventListener('click', loadOrders);
  els.manageTeamBtn.addEventListener('click', openTeamModal);
  els.closeTeamBtn.addEventListener('click', closeTeamModal);
  els.teamModal.addEventListener('click', (e) => { if (e.target.dataset.closeModal) closeTeamModal(); });
  els.addMemberBtn.addEventListener('click', addMember);
  els.newMemberInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addMember(); });
  els.copySummaryBtn.addEventListener('click', copySummary);
}

async function init() {
  wireEvents();
  if (!isConfigured) {
    setConnection('Setup required', true);
    renderMembers();
    renderBoard();
    return;
  }
  try {
    await loadMembers();
    await loadOrders();
    setInterval(loadOrders, 30000);
    window.addEventListener('focus', loadOrders);
  } catch (err) {
    console.error(err);
    setConnection('Setup error', true);
    setFormMessage('Run supabase.sql in your Supabase project, then refresh.', 'error');
  }
}

init();
