// ====================================

//  סמי בוט – קובץ ראשי (Telegram)

// ====================================



const { Telegraf } = require('telegraf');

const fs = require('fs');

const path = require('path');

const config = require('./config');

const { generateQuotePDF } = require('./pdfGenerator');

const { startScheduler } = require('./scheduler');
require('./env-loader');



const TOKEN = process.env.TELEGRAM_TOKEN;

if (!TOKEN) {

  console.error('❌ TELEGRAM_TOKEN is required in environment variables.');

  process.exit(1);

}

const bot = new Telegraf(TOKEN);



const DATA_DIR = __dirname;

const CLIENTS_FILE = path.join(DATA_DIR, 'clients.json');

const CHATS_FILE = path.join(DATA_DIR, 'chatIds.json');

const CHAT_STATE_FILE = path.join(DATA_DIR, 'chatState.json');

const AI_BASE_URL = process.env.UNLIMITED_API_BASE_URL || 'https://unlimited.surf';

const AI_KEY = process.env.UNLIMITED_API_KEY || 'ua_Pz8Z7r_Rgw75y8_qx6dOS2eH7iPOScpJ';

const DEFAULT_MODEL = 'gateway-gpt-5';



function readJson(filePath, fallback) {

  try {

    return JSON.parse(fs.readFileSync(filePath, 'utf8'));

  } catch {

    return fallback;

  }

}

function writeJson(filePath, data) {

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

}



function getClients() {

  return readJson(CLIENTS_FILE, []);

}

function saveClients(data) {

  writeJson(CLIENTS_FILE, data);

}



function getChats() {

  return readJson(CHATS_FILE, []);

}

function saveChats(chats) {

  writeJson(CHATS_FILE, chats);

}



function getChatStateData() {

  return readJson(CHAT_STATE_FILE, {});

}

function saveChatStateData(data) {

  writeJson(CHAT_STATE_FILE, data);

}

function getChatState(chatId) {

  const data = getChatStateData();

  return data[chatId] || { model: DEFAULT_MODEL, chatMode: false };

}

function setChatState(chatId, updates) {

  const data = getChatStateData();

  data[chatId] = {

    ...(data[chatId] || { model: DEFAULT_MODEL, chatMode: false }),

    ...updates,

    updatedAt: new Date().toISOString()

  };

  saveChatStateData(data);

  return data[chatId];

}

function clearChatMode(chatId) {

  const data = getChatStateData();

  if (!data[chatId]) return;

  data[chatId].chatMode = false;

  saveChatStateData(data);

}



const sessions = {};

function getSession(userId) {

  if (!sessions[userId]) {

    sessions[userId] = { state: null, data: {}, chatMode: false, chatModel: DEFAULT_MODEL, chatHistory: [] };

  }

  return sessions[userId];

}

function clearSession(userId) {

  delete sessions[userId];

}



function registerChat(ctx) {

  const chat = ctx.chat;

  if (!chat || chat.type !== 'private') return;



  const chats = getChats();

  const chatName = `${chat.first_name || ''} ${chat.last_name || ''}`.trim() || chat.username || 'משתמש';

  const existing = chats.find(c => c.id === chat.id);



  if (existing) {

    if (existing.name !== chatName || existing.username !== (chat.username || '')) {

      existing.name = chatName;

      existing.username = chat.username || '';

      saveChats(chats);

    }

    return;

  }



  chats.push({

    id: chat.id,

    name: chatName,

    username: chat.username || '',

    registeredAt: new Date().toISOString()

  });

  saveChats(chats);

}



function buildMainKeyboard() {

  return {

    reply_markup: {

      keyboard: [

        ['📋 /menu', '🔎 /clients'],

        ['📈 /status', '➕ /addclient'],

        ['✏️ /updateclient', '📄 /quote'],

        ['📄 /export', '🧠 /model'],

        ['🧠 /models', '⛔ /exit-chat'],

        ['❌ /cancel']

      ],

      resize_keyboard: true,

      one_time_keyboard: false

    }

  };

}



function buildCancelKeyboard() {

  return {

    reply_markup: {

      keyboard: [

        ['❌ /cancel']

      ],

      resize_keyboard: true,

      one_time_keyboard: false

    }

  };

}



async function fetchAvailableModels() {

  try {

    const res = await fetch(`${AI_BASE_URL}/api/models`);

    if (!res.ok) throw new Error(`models fetch ${res.status}`);

    const json = await res.json();

    return Array.isArray(json.data) ? json.data : [];

  } catch (error) {

    console.error('❌ Error fetching models list:', error);

    return [];

  }

}



async function fetchAIResponse(message, model) {

  if (!AI_KEY) throw new Error('Missing AI API key');

  const res = await fetch(`${AI_BASE_URL}/api/chat`, {

    method: 'POST',

    headers: {

      'Authorization': `Bearer ${AI_KEY}`,

      'Content-Type': 'application/json'

    },

    body: JSON.stringify({ message, model, effort: 'medium' })

  });



  if (!res.body) {

    throw new Error('No response body from AI service');

  }



  const decoder = new TextDecoder();

  const reader = res.body.getReader();

  let text = '';

  let buffer = '';



  while (true) {

    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split(/\r?\n/);

    buffer = lines.pop();



    for (const line of lines) {

      const trimmed = line.trim();

      if (!trimmed.startsWith('data:')) continue;

      const frame = trimmed.slice(5).trim();

      if (!frame) continue;

      if (frame === '[DONE]') {

        return text;

      }



      let parsed;

      try {

        parsed = JSON.parse(frame);

      } catch {

        continue;

      }



      if (parsed.error) {

        throw new Error(parsed.error);

      }

      if (parsed.delta) {

        text += parsed.delta;

      }

      if (parsed.done) {

        return text;

      }

    }

  }



  return text;

}



async function handleChatMode(ctx, text, session) {

  const model = session.chatModel || DEFAULT_MODEL;

  await ctx.reply(`🧠 שואל את ${model}...`, { parse_mode: 'Markdown' });

  try {

    const answer = await fetchAIResponse(text, model);

    session.chatHistory = session.chatHistory || [];

    session.chatHistory.push({ role: 'user', text, at: new Date().toISOString() });

    session.chatHistory.push({ role: 'assistant', text: answer, at: new Date().toISOString() });

    await ctx.reply(answer);

  } catch (error) {

    console.error('❌ AI chat error:', error);

    await ctx.reply('❌ לא הצלחתי לקבל תשובה מה-AI כרגע. נסה שנית.', { parse_mode: 'Markdown', ...buildMainKeyboard() });

  }

}



function formatClientList(clients) {

  if (clients.length === 0) return '_אין לקוחות פעילים כרגע._';

  return clients

    .map((c, i) => `${i + 1}. *${c.business}* (${c.name})\n   📌 ${c.status}`)

    .join('\n');

}



function findClient(clients, query) {

  const normalized = query.trim().toLowerCase();

  if (!normalized) return null;



  const index = parseInt(normalized) - 1;

  if (!Number.isNaN(index) && clients[index]) {

    return { client: clients[index], index };

  }



  const byBusiness = clients.findIndex(c => c.business.toLowerCase().includes(normalized));

  if (byBusiness !== -1) return { client: clients[byBusiness], index: byBusiness };



  const byName = clients.findIndex(c => c.name.toLowerCase().includes(normalized));

  if (byName !== -1) return { client: clients[byName], index: byName };



  return null;

}



function clientSummary(client, index) {

  return `${index + 1}. *${client.business}* (${client.name})\n   📌 ${client.status}`;

}



function buildQuickReply() {

  return `🤖 *${config.botName} | תפריט ראשי*\n\n` +

         `1️⃣ הוספת לקוח\n` +

         `2️⃣ שינוי סטטוס\n` +

         `3️⃣ יצירת הצעת מחיר\n` +

         `🔎 /clients - רשימת לקוחות\n` +

         `📈 /status - סטטוס מהיר\n` +

         `🧠 /model - מצב שיחה עם AI\n` +

         `📄 /export - ייצוא לקבצים\n` +

         `_שלח מספר או שם אפשרות_`;

}



function sendHelp(ctx) {

  ctx.reply(

    `📖 *הוראות שימוש*\n\n` +

    `*פקודות ראשיות:*\n` +

    `/menu - תפריט ראשי\n` +

    `/clients - רשימת לקוחות\n` +

    `/status - סטטוס מהיר\n` +

    `/addclient - הוספת לקוח\n` +

    `/updateclient - עדכון סטטוס\n` +

    `/quote - יצירת הצעת מחיר\n` +

    `/export - שליחת קובץ לקוחות\n` +

    `/model - בחירת מודל ושיחה עם AI\n` +

    `/models - רשימת מודלים זמינים\n` +

    `/exit-chat - יציאה ממצב שיחה\n` +

    `/cancel - ביטול פעולה\n\n` +

    `*קיצורים:*\n` +

    `שלח "1" / "2" / "3" או את שם העסק\n` +

    `לדוגמה: \`נגריית דני\`\n` +

    `\n*הערה:* הבוט ישמור אותך כדי לשלוח דוח בוקר אוטומטי.`,

    { parse_mode: 'Markdown', ...buildMainKeyboard() }

  );

}



bot.start(ctx => {

  registerChat(ctx);

  ctx.reply(

    `🤖 *ברוך הבא ל-סמי בוט!*\n\n` +

    `📋 שלח /menu כדי להתחיל\n` +

    `❓ שלח /help לקבל עזרה\n` +

    `📞 /clients - רשימת לקוחות`,

    { parse_mode: 'Markdown', ...buildMainKeyboard() }

  );

});



bot.command('help', ctx => {

  registerChat(ctx);

  sendHelp(ctx);

});



bot.command('menu', ctx => {

  registerChat(ctx);

  ctx.reply(buildQuickReply(), { parse_mode: 'Markdown', ...buildMainKeyboard() });

});



bot.command('clients', ctx => {

  registerChat(ctx);

  const clients = getClients();

  if (clients.length === 0) {

    return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown', ...buildMainKeyboard() });

  }

  ctx.reply(`📋 *לקוחות:*\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildMainKeyboard() });

});



bot.command('status', ctx => {

  registerChat(ctx);

  const clients = getClients();

  const summary = clients.length === 0

    ? '_אין לקוחות פעילים כרגע._'

    : clients.map((c, i) => clientSummary(c, i)).join('\n\n');

  ctx.reply(`📊 *סטטוס מהיר*\n\n${summary}`, { parse_mode: 'Markdown', ...buildMainKeyboard() });

});



bot.command('addclient', ctx => {

  registerChat(ctx);

  const session = getSession(ctx.from.id);

  session.state = 'add_name';

  session.data = {};

  ctx.reply('➕ *הוספת לקוח חדש*\n\nמה שם הלקוח / איש הקשר?\n\n_שלח /cancel בכל שלב לביטול_', { parse_mode: 'Markdown', ...buildCancelKeyboard() });

});



bot.command('updateclient', ctx => {

  registerChat(ctx);

  const clients = getClients();

  if (clients.length === 0) {

    return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown', ...buildMainKeyboard() });

  }

  const session = getSession(ctx.from.id);

  session.state = 'update_select';

  session.data = {};

  ctx.reply(`📋 בחר לקוח לעדכון סטטוס:\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildCancelKeyboard() });

});



bot.command('quote', ctx => {

  registerChat(ctx);

  const clients = getClients();

  if (clients.length === 0) {

    return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown', ...buildMainKeyboard() });

  }

  const session = getSession(ctx.from.id);

  session.state = 'quote_select';

  session.data = {};

  ctx.reply(`📋 בחר לקוח להצעת מחיר:\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildCancelKeyboard() });

});



bot.command('export', ctx => {

  registerChat(ctx);

  const clients = getClients();

  const exportPath = path.join(DATA_DIR, 'clients-export.json');

  writeJson(exportPath, clients);

  ctx.replyWithDocument({ source: exportPath }, { caption: '📄 הנה קובץ הלקוחות שלך', reply_markup: buildMainKeyboard().reply_markup });

});



bot.command('report', ctx => {

  registerChat(ctx);

  const clients = getClients();

  const text = clients.length === 0

    ? '_אין לקוחות פעילים כרגע._'

    : clients.map((c, i) => clientSummary(c, i)).join('\n\n');

  ctx.reply(`📨 *דוח מהיר*\n\n${text}`, { parse_mode: 'Markdown', ...buildMainKeyboard() });

});



bot.command('cancel', ctx => {

  const session = getSession(ctx.from.id);

  clearSession(ctx.from.id);

  if (session.state) {

    return ctx.reply('❌ הפעולה בוטלה. שלח /menu להמשך.', { parse_mode: 'Markdown', ...buildMainKeyboard() });

  }

  ctx.reply('אין פעולה פעילה כרגע. שלח /menu להתחלה.', { parse_mode: 'Markdown', ...buildMainKeyboard() });

});



bot.command('models', async ctx => {

  registerChat(ctx);

  const models = await fetchAvailableModels();

  if (models.length === 0) {

    return ctx.reply('❌ לא הצלחתי לקבל את רשימת המודלים כרגע. נסה שוב מעט מאוחר יותר.', { parse_mode: 'Markdown', ...buildMainKeyboard() });

  }

  const list = models.slice(0, 20).map(m => '• `' + m.id + '` - ' + m.name + ' (' + m.provider + ')').join('\n');

  ctx.reply(`🧠 *מודלים זמינים*\n\n${list}\n\nלהפעלת מצב שיחה: /model <model-id>`, { parse_mode: 'Markdown', ...buildMainKeyboard() });

});



bot.command('model', async ctx => {

  registerChat(ctx);

  const raw = ctx.message.text.split(' ').slice(1).join(' ').trim();

  const chatId = ctx.chat.id;

  const session = getSession(ctx.from.id);

  if (!raw || raw.toLowerCase() === 'list') {

    return ctx.reply('📌 שלח /models כדי לראות מספר מודלים, או /model <model-id> כדי לבחור מודל ולהיכנס למצב שיחה.', { parse_mode: 'Markdown', ...buildMainKeyboard() });

  }



  setChatState(chatId, { model: raw, chatMode: true });

  session.chatModel = raw;

  session.chatMode = true;

  session.chatHistory = [];



  ctx.reply(`✅ מצב שיחה מופעל עם המודל: *${raw}*\nשלח הודעה עכשיו. לצאת: /exit-chat`, { parse_mode: 'Markdown', ...buildMainKeyboard() });

});



bot.command('exit-chat', ctx => {

  registerChat(ctx);

  clearChatMode(ctx.chat.id);

  const session = getSession(ctx.from.id);

  session.chatMode = false;

  session.chatHistory = [];

  ctx.reply('✅ יצאת ממצב שיחה. שלח /model <model-id> כדי לחזור.', { parse_mode: 'Markdown', ...buildMainKeyboard() });

});



bot.on('text', async ctx => {

  registerChat(ctx);

  const userId = ctx.from.id;

  const text = ctx.message.text.trim();

  const lower = text.toLowerCase();
  const clean = lower.replace(/^\//, '').trim();

  const session = getSession(userId);

  const chatState = getChatState(ctx.chat.id);

  session.chatModel = chatState.model || session.chatModel || DEFAULT_MODEL;

  session.chatMode = chatState.chatMode || false;



  if (['exit-chat'].includes(clean)) {

    clearChatMode(ctx.chat.id);

    session.chatMode = false;

    session.chatHistory = [];

    return ctx.reply('✅ יצאת ממצב שיחה. שלח /model <model-id> כדי לחזור.', { parse_mode: 'Markdown', ...buildMainKeyboard() });

  }



  if (session.state) {

    await handleConversation(ctx, userId, text, session);

    return;

  }



  if (['תפריט', 'מנו', 'menu', '0'].includes(clean)) {

    return ctx.reply(buildQuickReply(), { parse_mode: 'Markdown', ...buildMainKeyboard() });

  }



  if (['1', 'הוספת לקוח', 'addclient'].includes(clean)) {

    const session = getSession(userId);

    session.state = 'add_name';

    session.data = {};

    return ctx.reply('➕ *הוספת לקוח חדש*\n\nמה שם הלקוח / איש הקשר?\n\n_שלח /cancel בכל שלב לביטול_', { parse_mode: 'Markdown', ...buildCancelKeyboard() });

  }



  if (['2', 'שינוי סטטוס לקוח', 'עדכון סטטוס', 'updateclient'].includes(clean)) {

    const clients = getClients();

    if (clients.length === 0) {

      return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown', ...buildMainKeyboard() });

    }

    const session = getSession(userId);

    session.state = 'update_select';

    session.data = {};

    return ctx.reply(`📋 בחר לקוח לעדכון סטטוס:\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildCancelKeyboard() });

  }



  if (['3', 'יצירת הצעת מחיר', 'quote'].includes(clean)) {

    const clients = getClients();

    if (clients.length === 0) {

      return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown', ...buildMainKeyboard() });

    }

    const session = getSession(userId);

    session.state = 'quote_select';

    session.data = {};

    return ctx.reply(`📋 בחר לקוח להצעת מחיר:\n\n${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildCancelKeyboard() });

  }



  

  if (session.chatMode) {

    await handleChatMode(ctx, text, session);

    return;

  }

  if (clean.startsWith('עדכן סטטוס') || clean.startsWith('update status')) {

    const parts = text.split(' ').slice(2);

    if (parts.length < 2) {

      return ctx.reply('❌ שלח: עדכן סטטוס שם_הלקוח סטטוס_חדש', { parse_mode: 'Markdown', ...buildMainKeyboard() });

    }

    const clients = getClients();

    const match = findClient(clients, parts[0]);

    if (!match) {

      return ctx.reply('❌ לקוח לא נמצא.', { parse_mode: 'Markdown', ...buildMainKeyboard() });

    }

    const newStatus = parts.slice(1).join(' ');

    clients[match.index].status = newStatus;

    clients[match.index].updatedAt = new Date().toISOString();

    saveClients(clients);

    return ctx.reply(`✅ סטטוס של *${clients[match.index].business}* עודכן ל:\n${newStatus}`, { parse_mode: 'Markdown', ...buildMainKeyboard() });

  }



  if (clean.startsWith('הצעת מחיר') || clean.startsWith('quote')) {

    const query = text.replace(/^(הצעת מחיר|quote)\s*/i, '');

    const clients = getClients();

    const match = findClient(clients, query);

    if (match) {

      const session = getSession(userId);

      session.state = 'quote_select';

      session.data = { clientIdx: match.index, clientName: match.client.name, businessName: match.client.business, photos: 0, videos: 0 };

      session.state = 'quote_photos';

      return ctx.reply(`📸 כמה *תמונות*? (₪${config.pricePhoto} לתמונה)\n_שלח 0 אם אין_`, { parse_mode: 'Markdown', ...buildCancelKeyboard() });

    }

  }



  ctx.reply('❓ לא הבנתי. שלח /menu לתפריט או /help לעזרה.', { parse_mode: 'Markdown', ...buildMainKeyboard() });

});



async function handleConversation(ctx, userId, text, session) {

  const state = session.state;

  const data = session.data;



  const cmd = text.toLowerCase().replace(/^\//, '').trim();
  if (['cancel', 'ביטול'].includes(cmd)) {

    clearSession(userId);

    return ctx.reply('❌ הפעולה בוטלה. שלח /menu להתחלה מחדש.', { parse_mode: 'Markdown', ...buildMainKeyboard() });

  }



  try {

    if (state === 'add_name') {

      data.name = text;

      session.state = 'add_business';

      return ctx.reply('🏢 מה שם העסק?', { parse_mode: 'Markdown', ...buildCancelKeyboard() });

    }



    if (state === 'add_business') {

      data.business = text;

      session.state = 'add_status';

      return ctx.reply('📝 מה הסטטוס הנוכחי של הפרויקט?', { parse_mode: 'Markdown', ...buildCancelKeyboard() });

    }



    if (state === 'add_status') {

      const clients = getClients();

      clients.push({

        name: data.name,

        business: data.business,

        status: text,

        addedAt: new Date().toISOString(),

        updatedAt: new Date().toISOString()

      });

      saveClients(clients);

      clearSession(userId);

      return ctx.reply(`✅ *לקוח נוסף!*\n\n👤 ${data.name}\n🏢 ${data.business}\n📝 ${text}`, { parse_mode: 'Markdown', ...buildMainKeyboard() });

    }



    if (state === 'update_select') {

      const clients = getClients();

      const match = findClient(clients, text);

      if (!match) {

        return ctx.reply('❌ לא מצאתי לקוח מתאים. נסה שוב עם מספר או שם.', { parse_mode: 'Markdown', ...buildCancelKeyboard() });

      }

      data.clientIdx = match.index;

      session.state = 'update_status';

      return ctx.reply(`✏️ *${match.client.business}*\nסטטוס נוכחי: ${match.client.status}\n\nמה הסטטוס החדש?`, { parse_mode: 'Markdown', ...buildCancelKeyboard() });

    }



    if (state === 'update_status') {

      const clients = getClients();

      const idx = data.clientIdx;

      clients[idx].status = text;

      clients[idx].updatedAt = new Date().toISOString();

      saveClients(clients);

      clearSession(userId);

      return ctx.reply(`✅ *סטטוס עודכן!*\n\n*${clients[idx].business}*\n📝 ${text}`, { parse_mode: 'Markdown', ...buildMainKeyboard() });

    }



    if (state === 'quote_select') {

      const clients = getClients();

      const match = findClient(clients, text);

      if (!match) {

        return ctx.reply('❌ לא מצאתי לקוח מתאים. נסה שוב עם מספר או שם.', { parse_mode: 'Markdown', ...buildCancelKeyboard() });

      }

      data.clientIdx = match.index;

      data.businessName = match.client.business;

      data.clientName = match.client.name;

      session.state = 'quote_photos';

      return ctx.reply(`📸 כמה *תמונות*? (₪${config.pricePhoto} לתמונה)\n_שלח 0 אם אין_`, { parse_mode: 'Markdown', ...buildCancelKeyboard() });

    }



    if (state === 'quote_photos') {

      const n = parseInt(text);

      if (isNaN(n) || n < 0) {

        return ctx.reply('❌ נא להזין מספר תקין (לדוגמה: 5 או 0)', { parse_mode: 'Markdown', ...buildCancelKeyboard() });

      }

      data.photos = n;

      session.state = 'quote_videos';

      return ctx.reply(`🎬 כמה *סרטונים*? (₪${config.priceVideo} לסרטון)\n_שלח 0 אם אין_`, { parse_mode: 'Markdown', ...buildCancelKeyboard() });

    }



    if (state === 'quote_videos') {

      const n = parseInt(text);

      if (isNaN(n) || n < 0) {

        return ctx.reply('❌ נא להזין מספר תקין', { parse_mode: 'Markdown', ...buildCancelKeyboard() });

      }

      data.videos = n;

      const autoTotal = (data.photos * config.pricePhoto) + (n * config.priceVideo);

      data.total = autoTotal;

      session.state = 'quote_confirm';

      return ctx.reply(

        `💰 *סיכום הצעת מחיר*\n\n` +

        `👤 ${data.clientName}\n` +

        `🏢 ${data.businessName}\n` +

        `📸 ${data.photos} תמונות × ₪${config.pricePhoto} = ₪${(data.photos * config.pricePhoto)}\n` +

        `🎬 ${data.videos} סרטונים × ₪${config.priceVideo} = ₪${(n * config.priceVideo)}\n` +

        `━━━━━━━━━━━━━━━\n` +

        `💵 *סה"כ: ₪${autoTotal}*\n\n` +

        `שלח *אישור* ליצירת PDF 📄\n` +

        `או שלח מחיר אחר (לדוגמה: 1200)`,

        { parse_mode: 'Markdown', ...buildCancelKeyboard() }

      );

    }



    if (state === 'quote_confirm') {

      if (text.toLowerCase() !== 'אישור') {

        const override = parseInt(text.replace(/[^\d]/g, ''));

        if (!isNaN(override) && override > 0) {

          data.total = override;

        } else {

          return ctx.reply('❌ שלח *אישור* או מחיר מספרי', { parse_mode: 'Markdown', ...buildCancelKeyboard() });

        }

      }



      await ctx.reply('⏳ מייצר PDF...', { parse_mode: 'Markdown' });

      try {

        const pdfPath = await generateQuotePDF({

          clientName: data.clientName,

          businessName: data.businessName,

          photos: data.photos,

          videos: data.videos,

          total: data.total,

          pricePhoto: config.pricePhoto,

          priceVideo: config.priceVideo

        });



        await ctx.replyWithDocument({ source: fs.createReadStream(pdfPath) }, { caption: `📄 הצעה עבור ${data.businessName}\nסה"כ: ₪${data.total}`, reply_markup: buildMainKeyboard().reply_markup });

        clearSession(userId);

      } catch (e) {

        console.error('❌ שגיאה:', e);

        clearSession(userId);

        return ctx.reply('❌ שגיאה ביצירת ה-PDF', { parse_mode: 'Markdown', ...buildMainKeyboard() });

      }

    }



  } catch (err) {

    console.error('❌ שגיאה בטיפול הודעה:', err);

    clearSession(userId);

    ctx.reply('❌ משהו השתבש. שלח /menu להתחלה מחדש.', { parse_mode: 'Markdown', ...buildMainKeyboard() });

  }

}



bot.catch((err, ctx) => {

  console.error('❌ Telegraf error:', err);

  if (ctx && ctx.reply) {

    ctx.reply('❌ משהו השתבש. נסה שוב או שלח /cancel כדי להתחיל מחדש.', { parse_mode: 'Markdown', ...buildMainKeyboard() }).catch(() => {});

  }

});



bot.launch()

  .then(() => {

    console.log('🤖 סמי בוט טלגרם כעת פעיל! 🚀');

    console.log('💬 שלח לבוט: /start');

    startScheduler(bot);

  })

  .catch(err => console.error('❌ שגיאה בהפעלת הבוט:', err));



process.once('SIGINT', () => {

  console.log('⛔ בוט בהפסקה...');

  bot.stop('SIGINT');

});

process.once('SIGTERM', () => {

  console.log('⛔ בוט בהפסקה...');

  bot.stop('SIGTERM');

});

