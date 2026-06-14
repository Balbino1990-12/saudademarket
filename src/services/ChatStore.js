const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'chat-history.json');

class ChatStore {
  constructor() {
    this.store = { }; // chatId -> { messages: [] }
    this._load();
  }

  _load() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      if (fs.existsSync(FILE)) {
        const txt = fs.readFileSync(FILE, 'utf8') || '{}';
        this.store = JSON.parse(txt) || {};
      } else {
        this._flush();
      }
    } catch (err) {
      console.warn('[ChatStore] load error', err && err.message);
      this.store = {};
    }
  }

  _flush() {
    try {
      fs.writeFileSync(FILE, JSON.stringify(this.store, null, 2), 'utf8');
    } catch (err) {
      console.warn('[ChatStore] flush error', err && err.message);
    }
  }

  ensure(chatId) {
    if (!chatId) chatId = 'anon';
    if (!this.store[chatId]) this.store[chatId] = { messages: [], createdAt: new Date().toISOString() };
    return this.store[chatId];
  }

  appendMessage(chatId, message) {
    if (!chatId) chatId = 'anon';
    const conv = this.ensure(chatId);
    conv.messages.push({ ...message, timestamp: new Date().toISOString() });
    // flush to disk
    this._flush();
    return conv.messages[conv.messages.length - 1];
  }

  getConversation(chatId) {
    return this.store[chatId] || { messages: [] };
  }

  listConversations() {
    return Object.keys(this.store).map(id => ({ id, createdAt: this.store[id].createdAt, length: this.store[id].messages.length }));
  }
}

module.exports = new ChatStore();
