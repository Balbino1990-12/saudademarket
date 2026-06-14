(function(){
  const chatListEl = document.getElementById('chatList');
  const messagesArea = document.getElementById('messagesArea');
  const chatTitle = document.getElementById('chatTitle');
  const chatMeta = document.getElementById('chatMeta');
  const btnJoinSupport = document.getElementById('btnJoinSupport');
  const btnTakeOver = document.getElementById('btnTakeOver');
  const agentInput = document.getElementById('agentInput');
  const agentSend = document.getElementById('agentSend');

  let socket = null;
  let selectedChat = null;

  function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString();
  }

  async function loadList() {
    chatListEl.innerHTML = 'Loading...';
    try {
      const res = await fetch('/api/chat/list');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      renderList(data.list || []);
    } catch (err) {
      chatListEl.innerHTML = `<div class="text-red-600">Error loading list</div>`;
    }
  }

  function renderList(list) {
    if (!list || list.length === 0) {
      chatListEl.innerHTML = '<div class="text-slate-500">No conversations</div>';
      return;
    }
    chatListEl.innerHTML = '';
    list.forEach(item => {
      const el = document.createElement('div');
      el.className = 'p-2 rounded hover:bg-slate-100 cursor-pointer';
      el.innerHTML = `<div class="font-medium">${item.id}</div><div class="text-xs text-slate-500">${item.length} msgs • ${formatDate(item.createdAt)}</div>`;
      el.addEventListener('click', () => selectChat(item.id));
      chatListEl.appendChild(el);
    });
  }

  async function selectChat(chatId) {
    selectedChat = chatId;
    chatTitle.textContent = `Conversation: ${chatId}`;
    chatMeta.textContent = '';
    messagesArea.innerHTML = 'Loading...';
    try {
      const res = await fetch('/api/chat/history/' + encodeURIComponent(chatId));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      renderConversation(data.conversation.messages || []);
      // join socket room for this chat
      if (socket && socket.connected) socket.emit('joinChat', chatId);
    } catch (err) {
      messagesArea.innerHTML = `<div class="text-red-600">Error loading conversation</div>`;
    }
  }

  function renderConversation(messages) {
    if (!messages || messages.length === 0) {
      messagesArea.innerHTML = '<div class="text-slate-500">No messages</div>';
      return;
    }
    messagesArea.innerHTML = '';
    messages.forEach(m => {
      const el = document.createElement('div');
      el.className = 'p-2 rounded';
      if (m.role === 'user') el.classList.add('bg-white');
      else if (m.role === 'bot') el.classList.add('bg-slate-50');
      else if (m.role === 'agent') el.classList.add('bg-emerald-50');
      el.innerHTML = `<div class="text-xs text-slate-500">${m.role} • ${formatDate(m.timestamp || m.ts)}</div><div class="mt-1">${escapeHtml(m.text || '')}</div>`;
      messagesArea.appendChild(el);
    });
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function initSocket() {
    try {
      socket = io();
      socket.on('connect', () => { console.log('support socket connected'); socket.emit('joinSupport'); });
      socket.on('chat:new', (payload) => { loadList(); });
      socket.on('chat:message', (msg) => {
        if (!selectedChat) return;
        if (msg.chatId === selectedChat) {
          // append message
          const cur = messagesArea.innerHTML || '';
          // re-fetch conversation for consistency
          selectChat(selectedChat);
        }
      });
    } catch (e) {
      console.warn('socket init failed', e);
    }
  }

  btnJoinSupport.addEventListener('click', (e) => { e.preventDefault(); initSocket(); btnJoinSupport.disabled = true; btnJoinSupport.textContent = 'Joined'; });

  btnTakeOver.addEventListener('click', (e) => {
    e.preventDefault();
    if (!selectedChat) return alert('Select a chat first');
    if (!socket) initSocket();
    socket.emit('joinChat', selectedChat);
    alert('You joined chat ' + selectedChat);
  });

  agentSend.addEventListener('click', async (e) => {
    e.preventDefault();
    const txt = agentInput.value && agentInput.value.trim();
    if (!txt || !selectedChat) return;
    // send via socket
    if (!socket) initSocket();
    socket.emit('support:send', { chatId: selectedChat, text: txt, agentId: 'admin' });
    agentInput.value = '';
    // append locally
    selectChat(selectedChat);
  });

  // initial load
  loadList();
})();
