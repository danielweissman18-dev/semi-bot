// ====================================
//  סמי בוט – קובץ ראשי (Telegram)
// ====================================

const { Telegraf } = require('telegraf');
const fs = require('fs');
const cron = require('node-cron');
const config = require('./config');
const { generateQuotePDF } = require('./pdfGenerator');

const TOKEN = process.env.TELEGRAM_TOKEN;
if (!TOKEN) {
  console.error('❌ TELEGRAM_TOKEN is required in environment variables.');
  process.exit(1);
}
const bot = new Telegraf(TOKEN);

// ─── DB helpers ──────────────────────────────────────────────
function getClients() {
  try { return JSON.parse(fs.readFileSync('./clients.json', 'utf8')); }
  catch { return []; }
}
function saveClients(data) {
  fs.writeFileSync('./clients.json', JSON.stringify(data, null, 2), 'utf8');
}

// ─── Session state per user ──────────────────────────────────
const sessions = {};
function getSession(userId) {
  if (!sessions[userId]) sessions[userId] = { state: null, data: {} };
  return sessions[userId];
}
function clearSession(userId) {
  sessions[userId] = { state: null, data: {} };
}

// ─── Bot Commands ────────────────────────────────────────────

bot.start(ctx => {
  ctx.reply(
    `🤖 *ברוכים הבאים ל-סמי בוט!*\n\n` +
    `📋 שלח /menu כדי להתחיל\n` +
    `❓ שלח /help לקבל עזרה\n` +
    `📞 /clients - רשימת לקוחות`,
    { parse_mode: 'Markdown' }
  );
});

bot.command('help', ctx => {
  ctx.reply(
    `📖 *הוראות שימוש*\n\n` +
    `*פקודות ראשיות:*\n` +
    `/menu - תפריט ראשי\n` +
    `/clients - רשימת לקוחות\n` +
    `/help - הוראות\n\n` +
    `*דוגמאות:*\n` +
    `שלח "1" להוספת לקוח\n` +
    `שלח "2" לעדכון סטטוס\n` +
    `שלח "3" ליצירת הצעה\n\n` +
    `📧 כל יום ב-9:30 בוקר - סטטוסים`,
    { parse_mode: 'Markdown' }
  );
});

bot.command('menu', ctx => {
  ctx.reply(
    `🤖 *${config.botName} | תפריט ראשי*\n\n` +
    `1️⃣ הוספת לקוח\n` +
    `2️⃣ שינוי סטטוס לקוח\n` +
    `3️⃣ יצירת הצעת מחיר\n\n` +
    `_שלח מספר או שם אפשרות_`,
    { parse_mode: 'Markdown' }
  );
});

bot.command('clients', ctx => {
  const clients = getClients();
  if (clients.length === 0) {
    return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח *1* להוספת לקוח.', { parse_mode: 'Markdown' });
  }
  const list = clients
    .map((c, i) => `${i + 1}. *${c.business}* (${c.name})\n   📌 ${c.status}`)
    .join('\n');
  ctx.reply(`📋 *לקוחות:*\n\n${list}`, { parse_mode: 'Markdown' });
});

// ─── Message Handler ──────────────────────────────────────────
bot.on('text', async ctx => {
  const userId = ctx.from.id;
  const text = ctx.message.text.trim();
  const session = getSession(userId);

  // אם יש סשן פתוח – המשך שיחה
  if (session.state) {
    await handleConversation(ctx, userId, text, session);
    return;
  }

  // תפריט
  if (['תפריט', 'מנו', 'menu', '0'].includes(text.toLowerCase())) {
    return ctx.reply(
      `🤖 *${config.botName} | תפריט ראשי*\n\n` +
      `1️⃣ הוספת לקוח\n` +
      `2️⃣ שינוי סטטוס לקוח\n` +
      `3️⃣ יצירת הצעת מחיר\n\n` +
      `_שלח מספר או שם אפשרות_`,
      { parse_mode: 'Markdown' }
    );
  }

  // אפשרות 1: הוספת לקוח
  if (text === '1' || text.toLowerCase() === 'הוספת לקוח') {
    session.state = 'add_name';
    session.data = {};
    return ctx.reply(
      '➕ *הוספת לקוח חדש*\n\nמה שם הלקוח / איש הקשר?\n\n_שלח *ביטול* בכל שלב לביטול_',
      { parse_mode: 'Markdown' }
    );
  }

  // אפשרות 2: עדכון סטטוס
  if (text === '2' || text.toLowerCase() === 'שינוי סטטוס לקוח') {
    const clients = getClients();
    if (clients.length === 0) {
      return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח *1* להוספת לקוח.', { parse_mode: 'Markdown' });
    }
    const list = clients.map((c, i) => `${i + 1}. *${c.business}* (${c.name})`).join('\n');
    session.state = 'update_select';
    session.data = {};
    return ctx.reply(`📋 בחר לקוח:\n\n${list}`, { parse_mode: 'Markdown' });
  }

  // אפשרות 3: יצירת הצעה
  if (text === '3' || text.toLowerCase() === 'יצירת הצעת מחיר') {
    const clients = getClients();
    if (clients.length === 0) {
      return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח *1* להוספת לקוח.', { parse_mode: 'Markdown' });
    }
    const list = clients.map((c, i) => `${i + 1}. *${c.business}* (${c.name})`).join('\n');
    session.state = 'quote_select';
    session.data = {};
    return ctx.reply(`📋 בחר לקוח להצעה:\n\n${list}`, { parse_mode: 'Markdown' });
  }

  ctx.reply('❓ לא הבנתי. שלח /menu לתפריט או /help לעזרה');
});

// ─── Conversation Handler ─────────────────────────────────────
async function handleConversation(ctx, userId, text, session) {
  const state = session.state;
  const data = session.data;

  // ביטול בכל שלב
  if (['ביטול', 'cancel'].includes(text.toLowerCase())) {
    clearSession(userId);
    return ctx.reply('❌ בוטל. שלח /menu להתחלה מחדש.');
  }

  try {
    if (state === 'add_name') {
      data.name = text;
      session.state = 'add_business';
      return ctx.reply('🏢 שם העסק?', { parse_mode: 'Markdown' });
    }

    if (state === 'add_business') {
      data.business = text;
      session.state = 'add_status';
      return ctx.reply('📝 מה הסטטוס הנוכחי של הפרויקט?', { parse_mode: 'Markdown' });
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
      return ctx.reply(
        `✅ *לקוח נוסף בהצלחה!*\n\n👤 ${data.name}\n🏢 ${data.business}\n📝 ${text}`,
        { parse_mode: 'Markdown' }
      );
    }

    if (state === 'update_select') {
      const idx = parseInt(text) - 1;
      const clients = getClients();
      if (idx < 0 || idx >= clients.length) {
        return ctx.reply('❌ מספר לא תקין. נסה שוב.', { parse_mode: 'Markdown' });
      }
      data.clientIdx = idx;
      session.state = 'update_status';
      return ctx.reply(
        `✏️ *${clients[idx].business}*\nסטטוס נוכחי: ${clients[idx].status}\n\nמה הסטטוס החדש?`,
        { parse_mode: 'Markdown' }
      );
    }

    if (state === 'update_status') {
      const idx = data.clientIdx;
      const clients = getClients();
      clients[idx].status = text;
      clients[idx].updatedAt = new Date().toISOString();
      saveClients(clients);
      clearSession(userId);
      return ctx.reply(
        `✅ *סטטוס עודכן!*\n\n*${clients[idx].business}*\n📝 ${text}`,
        { parse_mode: 'Markdown' }
      );
    }

    if (state === 'quote_select') {
      const idx = parseInt(text) - 1;
      const clients = getClients();
      if (idx < 0 || idx >= clients.length) {
        return ctx.reply('❌ מספר לא תקין. נסה שוב.', { parse_mode: 'Markdown' });
      }
      data.clientIdx = idx;
      data.businessName = clients[idx].business;
      data.clientName = clients[idx].name;
      session.state = 'quote_photos';
      return ctx.reply(
        `📸 כמה *תמונות*? (₪${config.pricePhoto} לתמונה)\n_שלח 0 אם אין_`,
        { parse_mode: 'Markdown' }
      );
    }

    if (state === 'quote_photos') {
      const n = parseInt(text);
      if (isNaN(n) || n < 0) {
        return ctx.reply('❌ נא להזין מספר תקין (לדוגמה: 5 או 0)', { parse_mode: 'Markdown' });
      }
      data.photos = n;
      session.state = 'quote_videos';
      return ctx.reply(
        `🎬 כמה *סרטונים*? (₪${config.priceVideo} לסרטון)\n_שלח 0 אם אין_`,
        { parse_mode: 'Markdown' }
      );
    }

    if (state === 'quote_videos') {
      const n = parseInt(text);
      if (isNaN(n) || n < 0) {
        return ctx.reply('❌ נא להזין מספר תקין', { parse_mode: 'Markdown' });
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
        { parse_mode: 'Markdown' }
      );
    }

    if (state === 'quote_confirm') {
      if (text.toLowerCase() !== 'אישור') {
        const override = parseInt(text.replace(/[^\d]/g, ''));
        if (!isNaN(override) && override > 0) {
          data.total = override;
        } else {
          return ctx.reply('❌ שלח *אישור* או מחיר מספרי', { parse_mode: 'Markdown' });
        }
      }

      await ctx.reply('⏳ מייצר PDF...');

      try {
        const pdfPath = generateQuotePDF({
          clientName: data.clientName,
          businessName: data.businessName,
          photos: data.photos,
          videos: data.videos,
          total: data.total,
          pricePhoto: config.pricePhoto,
          priceVideo: config.priceVideo
        });

        await ctx.replyWithDocument(
          { source: fs.createReadStream(pdfPath) },
          { caption: `📄 הצעה עבור ${data.businessName}\nסה"כ: ₪${data.total}` }
        );

        clearSession(userId);
      } catch (e) {
        console.error('❌ שגיאה:', e);
        clearSession(userId);
        return ctx.reply('❌ שגיאה ביצירת ה-PDF');
      }
    }

  } catch (err) {
    console.error('❌ שגיאה בטיפול בודעה:', err);
    clearSession(userId);
    ctx.reply('❌ משהו השתבש. שלח /menu להתחלה מחדש.');
  }
}

// ─── Scheduler (Daily Status) ─────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  cron.schedule('30 9 * * *', async () => {
    console.log('📅 שולח דיווח בוקר...');
    const clients = getClients();
    if (clients.length > 0) {
      const list = clients
        .map((c, i) => `${i + 1}. *${c.business}* (${c.name})\n   📌 ${c.status}`)
        .join('\n');
      console.log('✅ דיווח בוקר מוכן:\n' + list);
    }
  });
  console.log('⏰ Scheduler פעיל – דיווח בוקר כל יום ב-9:30');
}

// ─── Start Bot ────────────────────────────────────────────────
bot.launch()
  .then(() => {
    console.log('🤖 סמי בוט טלגרם כעת פעיל! 🚀');
    console.log(`💬 שלח לבוט: /start`);
  })
  .catch(err => console.error('❌ שגיאה בהפעלת הבוט:', err));

// Handle graceful shutdown
process.once('SIGINT', () => {
  console.log('⛔ בוט בהפסקה...');
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  console.log('⛔ בוט בהפסקה...');
  bot.stop('SIGTERM');
});
