/**
 * Chat Service - Handles AI responses for live chat
 * Uses OpenAI API if available, otherwise falls back to rule-based responses
 */

const SUPPORT_CONTEXT = {
  pt: {
    greeting: 'Olá! Bem-vindo ao suporte da Saudade Market. Como posso ajudá-lo?',
    help_options: 'Posso ajudá-lo com: rastreamento de pedidos, devoluções, envio, pagamento, segurança ou produtos favoritos.',
    tracking: 'Para rastrear seu pedido, visite sua conta > Histórico de Pedidos. Você receberá um número de rastreamento por email.',
    returns: 'Você pode devolver produtos dentro de 30 dias da compra em condições originais. Contate-nos para iniciar uma devolução.',
    shipping: 'O envio padrão leva 5-7 dias úteis. Oferecemos também envio express em 1-2 dias.',
    payment: 'Aceitamos cartão de crédito, PayPal e transferência bancária. Todos os pagamentos são seguros.',
    security: 'Seus dados estão protegidos com criptografia SSL. Nunca pedimos senha por email.',
    default: 'Entendi! Você pode falar comigo sobre qualquer coisa relacionada ao nosso serviço. O que mais você gostaria de saber?'
  },
  en: {
    greeting: 'Hello! Welcome to Saudade Market support. How can I help you?',
    help_options: 'I can help you with: order tracking, returns, shipping, payment, security, or favorite products.',
    tracking: 'To track your order, visit your account > Order History. You\'ll receive a tracking number via email.',
    returns: 'You can return products within 30 days of purchase in original condition. Contact us to start a return.',
    shipping: 'Standard shipping takes 5-7 business days. We also offer express shipping in 1-2 days.',
    payment: 'We accept credit cards, PayPal, and bank transfer. All payments are secure.',
    security: 'Your data is protected with SSL encryption. We never ask for passwords via email.',
    default: 'I understand! You can ask me anything related to our service. What else would you like to know?'
  },
  fr: {
    greeting: 'Bonjour! Bienvenue au support de Saudade Market. Comment puis-je vous aider?',
    help_options: 'Je peux vous aider avec: suivi de commande, retours, expédition, paiement, sécurité ou produits favoris.',
    tracking: 'Pour suivre votre commande, visitez votre compte > Historique des commandes. Vous recevrez un numéro de suivi par email.',
    returns: 'Vous pouvez retourner des produits dans les 30 jours suivant l\'achat en bon état. Contactez-nous pour initier un retour.',
    shipping: 'La livraison standard prend 5-7 jours ouvrables. Nous offrons également l\'expédition express en 1-2 jours.',
    payment: 'Nous acceptons les cartes de crédit, PayPal et les virements bancaires. Tous les paiements sont sécurisés.',
    security: 'Vos données sont protégées par chiffrement SSL. Nous ne demandons jamais de mot de passe par email.',
    default: 'Je comprends! Vous pouvez me poser des questions sur notre service. Que voulez-vous savoir d\'autre?'
  }
};

class ChatService {
  /**
   * Get AI response for a user message
   * @param {string} message - User message
   * @param {string} language - Language code (en, fr, pt)
   * @param {string} userId - User ID
   * @returns {Promise<{reply: string}>}
   */
  static async getResponse(message, language = 'pt', userId) {
    try {
      // Try OpenAI first if API key is available
      if (process.env.OPENAI_API_KEY) {
        console.log('[ChatService] OpenAI API key detected, attempting to use OpenAI...');
        try {
          const result = await this.getOpenAIResponse(message, language);
          console.log('[ChatService] OpenAI response successful');
          return result;
        } catch (openaiError) {
          console.error('[ChatService] OpenAI error:', openaiError.message, openaiError.status);
          throw openaiError;
        }
      } else {
        console.log('[ChatService] No OpenAI API key found, using fallback methods');
      }
    } catch (error) {
      console.warn('OpenAI error, falling back to rule-based responses:', error.message);
    }

    // Try local RAG (search local help/FAQ/translations) before pure rule-based fallback
    try {
      const rag = await this.getLocalRagResponse(message, language);
      if (rag && rag.reply) {
        return { reply: rag.reply };
      }
    } catch (err) {
      console.warn('Local RAG error, falling back to rule-based:', err && err.message);
    }

    // Fall back to rule-based responses
    return this.getRuleBasedResponse(message, language);
  }

  /**
   * Get response from OpenAI API
   * @private
   */
  static async getOpenAIResponse(message, language = 'pt') {
    const OpenAI = require('openai');
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const systemPrompts = {
      pt: 'Você é um agente de suporte ao cliente amigável para Saudade Market, uma loja online portuguesa. Responda em português de forma concisa e útil.',
      en: 'You are a friendly customer support agent for Saudade Market, a Portuguese online store. Respond in English concisely and helpfully.',
      fr: 'Vous êtes un agent de support client amical pour Saudade Market, une boutique en ligne portugaise. Répondez en français de manière concise et utile.'
    };

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompts[language] || systemPrompts.pt
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    const reply = response.choices[0].message.content;
    return { reply };
  }

  /**
   * Get rule-based response for common support questions
   * @private
   */
  static getRuleBasedResponse(message, language = 'pt') {
    const lang = language || 'pt';
    const lowerMessage = (message || '').toLowerCase();

    // Load canonical service texts from translations.json (cached)
    let canonical = null;
    try {
      if (!this._translationsCache) {
        const fs = require('fs');
        const path = require('path');
        const translationsPath = path.join(__dirname, '..', '..', 'public', 'translations.json');
        if (fs.existsSync(translationsPath)) {
          const raw = fs.readFileSync(translationsPath, 'utf8');
          this._translationsCache = JSON.parse(raw);
        } else {
          this._translationsCache = {};
        }
      }
      canonical = this._translationsCache[lang] || this._translationsCache['en'] || null;
    } catch (e) {
      canonical = null;
    }

    const context = (canonical && {
      tracking: canonical['service.tracking'],
      returns: canonical['service.returns'],
      shipping: canonical['service.shipping'],
      payment: canonical['service.payment'],
      support: canonical['service.support_contact'],
      greeting: SUPPORT_CONTEXT[lang] && SUPPORT_CONTEXT[lang].greeting,
      help_options: SUPPORT_CONTEXT[lang] && SUPPORT_CONTEXT[lang].help_options,
      default: SUPPORT_CONTEXT[lang] && SUPPORT_CONTEXT[lang].default,
      security: SUPPORT_CONTEXT[lang] && SUPPORT_CONTEXT[lang].security
    }) || (SUPPORT_CONTEXT[lang] || SUPPORT_CONTEXT.pt);

    // Greeting
    if (lowerMessage.match(/(oi|olá|ola|hey|hello|bonjour|salut)/i)) {
      return { reply: context.greeting };
    }

    // Tracking
    if (lowerMessage.match(/(rastrear|rastreamento|track|tracking|suivi|où est|status|numero|rastreio)/i)) {
      return { reply: context.tracking || SUPPORT_CONTEXT[lang].tracking };
    }

    // How to buy / Order
    if (lowerMessage.match(/(comprar|fazer a compra|como faço para comprar|how to buy|how do i buy|order|como comprar|passer commande|commander|fazer pedido)/i)) {
      return { reply: (canonical && canonical['service.how_to_buy']) || (context && context.how_to_buy) || 'To place an order, add items to your cart and proceed to checkout.' };
    }

    // Returns
    if (lowerMessage.match(/(devolução|devolver|retorno|return|retour|trocar|exchange|devolu|reembolso)/i)) {
      return { reply: context.returns || SUPPORT_CONTEXT[lang].returns };
    }

    // Shipping
    if (lowerMessage.match(/(envio|entrega|shipping|expédition|delivery|como entrega|combien de temps|frete)/i)) {
      return { reply: context.shipping || SUPPORT_CONTEXT[lang].shipping };
    }

    // Payment
    if (lowerMessage.match(/(pagamento|pagar|payment|paiement|métodos|cards|cartão|cartes)/i)) {
      return { reply: context.payment || SUPPORT_CONTEXT[lang].payment };
    }

    // Security
    if (lowerMessage.match(/(seguro|segurança|segura|security|sécurité|dados|données|protecção)/i)) {
      return { reply: context.security || SUPPORT_CONTEXT[lang].security };
    }

    // Help/Options
    if (lowerMessage.match(/(ajuda|help|aide|quais|options|menu|pode|peux|you can)/i)) {
      return { reply: context.help_options };
    }

    // Default response
    return { reply: context.default };
  }

  /**
   * Local RAG: build a small in-memory index of public HTML and translations
   * and return the best matching snippet as a reply. Lightweight keyword scoring.
   */
  static _localIndex = null;
  static _indexReady = false;
  static _indexBuilding = false;
  static _indexWatcher = null;

  static async getLocalRagResponse(message, language = 'pt') {
    if (!message || !message.trim()) return null;
    // Ensure index is ready (build if needed)
    if (!this._indexReady && !this._indexBuilding) {
      try {
        await this.initLocalIndex();
      } catch (err) {
        console.warn('Failed to initialize local index:', err && err.message);
      }
    }

    const query = message.toLowerCase();
    const qTokens = this.tokenize(query);
    if (qTokens.length === 0) return null;

    // Build query TF-IDF vector
    const index = this._localIndex;
    if (!index || !index.snippets || index.snippets.length === 0) return null;

    const qFreq = {};
    qTokens.forEach(t => { qFreq[t] = (qFreq[t] || 0) + 1; });
    const qLen = qTokens.length;

    const qWeights = {};
    Object.keys(qFreq).forEach(term => {
      const tf = qFreq[term] / qLen;
      const idf = index.idf && index.idf[term] ? index.idf[term] : Math.log((index.N + 1) / 1);
      qWeights[term] = tf * idf;
    });

    const qNorm = Math.sqrt(Object.values(qWeights).reduce((s, v) => s + v * v, 0) + 1e-12);

    // Score documents by cosine similarity using sparse multiplication over query terms
    const scores = [];
    for (const doc of index.snippets) {
      let dot = 0;
      Object.keys(qWeights).forEach(term => {
        if (doc.tfidf && doc.tfidf[term]) dot += qWeights[term] * doc.tfidf[term];
      });
      const denom = (qNorm * (doc.norm || 1));
      const sim = denom > 0 ? dot / denom : 0;
      if (sim > 0) scores.push({ sim, doc });
    }

    if (!scores.length) return null;
    scores.sort((a, b) => b.sim - a.sim);

    const best = scores[0];
    // threshold for confidence
    if (best.sim < 0.12) return null;

    const replyText = best.doc.text.length > 1000 ? best.doc.text.slice(0, 980) + '...' : best.doc.text;
    const sourceInfo = best.doc.source ? `\n\nSource: ${best.doc.source}` : '';
    return { reply: replyText + sourceInfo };
  }

  static buildLocalIndex() {
    const fs = require('fs');
    const path = require('path');
    const publicDir = path.join(__dirname, '..', 'public');
    const snippets = [];

    // Load translations.json if present
    try {
      const transPath = path.join(publicDir, 'translations.json');
      if (fs.existsSync(transPath)) {
        const data = JSON.parse(fs.readFileSync(transPath, 'utf8'));
        ['en', 'fr', 'pt'].forEach(lang => {
          if (data[lang]) {
            Object.keys(data[lang]).forEach(key => {
              const txt = String(data[lang][key] || '').trim();
              if (txt.length > 20) {
                snippets.push({ id: `trans:${lang}:${key}`, text: txt, source: `/translations.json#${key}`, lang, tokens: this.tokenize(txt) });
              }
            });
          }
        });
      }
    } catch (err) {
      console.warn('Could not load translations.json for RAG index:', err && err.message);
    }

    // Read public HTML files (basic text extraction)
    try {
      const files = fs.readdirSync(publicDir);
      files.forEach(file => {
        const ext = path.extname(file).toLowerCase();
        if (ext === '.html' || ext === '.htm') {
          try {
            const full = path.join(publicDir, file);
            let html = fs.readFileSync(full, 'utf8');
            // strip scripts/styles and tags
            html = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
            html = html.replace(/<style[\s\S]*?<\/style>/gi, ' ');
            html = html.replace(/<[^>]+>/g, ' ');
            html = html.replace(/\s+/g, ' ').trim();
            if (html.length > 50) {
              // split into sentence-like snippets
              const parts = html.split(/[\.\?\!]\s+/).map(p => p.trim()).filter(p => p.length > 30 && p.length < 2000);
              parts.forEach((p, i) => snippets.push({ id: `html:${file}:${i}`, text: p, source: `/${file}`, lang: 'mixed', tokens: this.tokenize(p) }));
            }
          } catch (err) {
            // ignore read errors per-file
          }
        }
      });
    } catch (err) {
      console.warn('Could not index public HTML files for RAG:', err && err.message);
    }

    // compute document frequencies
    const df = {};
    snippets.forEach(s => {
      const uniq = new Set(s.tokens);
      uniq.forEach(t => { df[t] = (df[t] || 0) + 1; });
    });

    const N = snippets.length;
    const idf = {};
    Object.keys(df).forEach(term => { idf[term] = Math.log((N + 1) / (df[term] + 1)) + 1.0; });

    // compute tf-idf vectors and norms for each snippet
    snippets.forEach(s => {
      const tf = {};
      s.tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
      const len = s.tokens.length || 1;
      const tfidf = {};
      Object.keys(tf).forEach(t => {
        const termTf = tf[t] / len;
        tfidf[t] = termTf * (idf[t] || Math.log((N + 1) / 1));
      });
      const norm = Math.sqrt(Object.values(tfidf).reduce((acc, v) => acc + v * v, 0) + 1e-12);
      s.tfidf = tfidf;
      s.norm = norm;
    });

    return { snippets, df, idf, N };
  }

  static tokenize(text) {
    if (!text) return [];
    // Lowercase, remove punctuation, split on spaces
    return text.toLowerCase().replace(/["'“”‘’·\(\)\[\],:;<>\/\\@#\$%\^&\*=+~`|]/g, ' ').split(/\s+/).filter(Boolean).filter(w => w.length > 2);
  }

  static tokenOverlapScore(qTokens, sTokens) {
    if (!qTokens.length || !sTokens.length) return 0;
    const qSet = new Set(qTokens);
    let common = 0;
    sTokens.forEach(t => { if (qSet.has(t)) common++; });
    // normalize by lengths
    return common / Math.sqrt(qTokens.length * sTokens.length + 1e-6);
  }

  static async initLocalIndex() {
    if (this._indexReady) return;
    if (this._indexBuilding) return;
    this._indexBuilding = true;
    try {
      const idx = this.buildLocalIndex();
      this._localIndex = idx;
      this._indexReady = true;
    } catch (err) {
      console.error('initLocalIndex error:', err);
      this._localIndex = { snippets: [] };
      this._indexReady = false;
    } finally {
      this._indexBuilding = false;
    }

    // Setup a file watcher to hot-rebuild the index on changes in public/
    try {
      const fs = require('fs');
      const path = require('path');
      const publicDir = path.join(__dirname, '..', 'public');
      if (this._indexWatcher) {
        try { this._indexWatcher.close(); } catch (e) {}
      }

      let rebuildTimer = null;
      const debouncedRebuild = () => {
        if (rebuildTimer) clearTimeout(rebuildTimer);
        rebuildTimer = setTimeout(() => {
          try {
            this._indexBuilding = true;
            const idx2 = this.buildLocalIndex();
            this._localIndex = idx2;
            this._indexReady = true;
            this._indexBuilding = false;
            console.log('[ChatService] Local RAG index rebuilt');
          } catch (e) {
            console.warn('[ChatService] Error rebuilding index:', e && e.message);
            this._indexBuilding = false;
          }
        }, 800);
      };

      // fs.watch with recursive true on supported platforms
      try {
        this._indexWatcher = fs.watch(publicDir, { recursive: true }, (evt, filename) => {
          if (!filename) return;
          debouncedRebuild();
        });
      } catch (e) {
        // Fallback: no watcher available
        this._indexWatcher = null;
      }
    } catch (watchErr) {
      // ignore watcher errors
    }
  }
}

// Initialize local index in background
try {
  ChatService.initLocalIndex();
} catch (err) {
  // ignore
}

module.exports = ChatService;
