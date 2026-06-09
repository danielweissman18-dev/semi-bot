// ====================================
//  סמי בוט – קובץ ראשי
// ====================================

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const QRCode  = require('qrcode');
const express = require('express');
const fs      = require('fs');
const { execSync } = require('child_process');
const puppeteer = require('puppeteer');
const config  = require('./config');
const { startScheduler }   = require('./scheduler');
const { generateQuotePDF } = require('./pdfGenerator');

const systemChromiumPath = '/run/current-system/sw/bin/chromium';

// ─── QR Web Server ────────────────────────────────────────────
const app = express();
let currentQR = null;

app.get('/', async (req, res) => {
  if (!currentQR) {
    return res.send('<h2 style="font-family:sans-serif;padding:40px">⏳ ממתין ל-QR Code... רענן את הדף בעוד שנייה.</h2>');
  }
  const imgData = await QRCode.toDataURL(currentQR, { width: 400, margin: 2 });
  res.send(`
    <html><head><meta charset="UTF-8">
    <meta http-equiv="refresh" content="30">
    <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#111;font-family:sans-serif;color:#fff}
    img{border:8px solid #fff;border-radius:16px}h1{margin-bottom:24px}p{color:#aaa;margin-top:16px}</style>
    </head><body>
    <h1>📱 סרוק עם ווצאפ</h1>
    <img src="${imgData}">
    <p>הדף מתרענן אוטומטית כל 30 שניות</p>
    </body></html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 QR Server פעיל על פורט ${PORT}`));

// ─── DB helpers ──────────────────────────────────────────────
function getClients() {
  try { return JSON.parse(fs.readFileSync('./clients.json', 'utf8')); }
  catch { return []; }
}
function saveClients(data) {
  fs.writeFileSync('./clients.json', JSON.stringify(data, null, 2), 'utf8');
}

// ─── Session state per phone ──────────────────────────────────
const sessions = {};
function getSession(phone) {
  if (!sessions[phone]) sessions[phone] = { state: null, data: {} };
  return sessions[phone];
}
function clearSession(phone) {
  sessions[phone] = { state: null, data: {} };
}

// ─── Helpers ──────────────────────────────────────────────────
const AUTHORIZED = [config.phone1, config.phone2];

function isAuthorized(number) {
  return AUTHORIZED.includes(number.replace('@c.us', ''));
}

function getUserName(phone) {
  const num = phone.replace('@c.us', '');
  if (num === config.phone1) return config.name1;
  if (num === config.phone2) return config.name2;
  return 'משתמש';
}

// ─── מציא נתיב Chromium אוטומטית ─────────────────────────────
function findChromium() {
  const isWindows = process.platform === 'win32';
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;

  if (envPath) {
    if (fs.existsSync(envPath)) {
      console.log('✅ משתמש ב-PUPPETEER_EXECUTABLE_PATH:', envPath);
      return envPath;
    }
    console.warn(`⚠️ PUPPETEER_EXECUTABLE_PATH לא נמצא: ${envPath}. מתעלם ממנו.`);
    delete process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const candidatePaths = [
    '/run/current-system/sw/bin/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ];

  if (isWindows) {
    candidatePaths.unshift(
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge\\Application\\msedge.exe`
    );
  }

  for (const p of candidatePaths) {
    if (!p) continue;
    if (fs.existsSync(p)) {
      console.log('✅ נמצא Chromium/Chrome:', p);
      return p;
    }
  }

  if (!isWindows) {
    try {
      const found = execSync('which chromium || which chromium-browser || which google-chrome', { encoding: 'utf8' })
        .trim()
        .split('\n')[0];
      if (found && fs.existsSync(found)) {
        console.log('✅ נמצא Chromium דרך which:', found);
        return found;
      }
    } catch {
      // ignore
    }
  }

  if (process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === 'true') {
    console.warn('⚠️ לא נמצא דפדפן במערכת, בוטל PUPPETEER_SKIP_CHROMIUM_DOWNLOAD כדי לאפשר הורדה');
    delete process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD;
  }

  console.log('⚠️ לא נמצא Chromium/Chrome – מנסה ללא נתיב');
  return undefined;
}

// ─── WhatsApp Client ──────────────────────────────────────────
const chromiumPath = findChromium() || puppeteer.executablePath();
console.log('Using Chromium path:', chromiumPath);
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
      '--no-zygote'
    ],
    headless: true,
    ...(chromiumPath ? { executablePath: chromiumPath } : {})
  }
});

client.on('qr', qr => {
  currentQR = qr;
  console.log('\n✅ QR Code מוכן! פתח את הקישור הבא בדפדפן וסרוק:');
  console.log('👉  https://' + (process.env.RAILWAY_PUBLIC_DOMAIN || 'localhost:3000') + '\n');
});

client.on('ready', () => {
  console.log('✅ סמי מחובר ומוכן!');
  startScheduler(client);
});

client.on('disconnected', reason => {
  console.log('⚠️ סמי התנתק:', reason);
});

// ─── Message Handler ──────────────────────────────────────────
client.on('message', async msg => {
  const phone = msg.from;

  // התעלם מהודעות קבוצה + מספרים לא מורשים
  if (msg.isGroupMsg || !isAuthorized(phone)) return;

  const text     = msg.body.trim();
  const session  = getSession(phone);
  const userName = getUserName(phone);

  // אם יש סשן פתוח – המשך שיחה
  if (session.state) {
    await handleConversation(msg, phone, text, session, userName);
    return;
  }

  // ── פקודות ראשיות ────────────────────────────────────────────

  // תפריט
  if (['תפריט', 'מנו', 'menu', '0'].includes(text.toLowerCase())) {
    await msg.reply(
`🤖 *${config.botName} | תפריט ראשי*

1️⃣  הוספת לקוח
2️⃣  שינוי סטטוס לקוח
3️⃣  יצירת הצעת מחיר

_שלח מספר או שם אפשרות_`
    );
    return;
  }

  if (text === '1' || text === 'הוספת לקוח') {
    session.state = 'add_name';
    session.data  = {};
    await msg.reply('➕ *הוספת לקוח חדש*\n\nמה שם הלקוח / איש הקשר?\n\n_שלח *ביטול* בכל שלב לביטול_');
    return;
  }

  if (text === '2' || text === 'שינוי סטטוס לקוח') {
    const clients = getClients();
    if (clients.length === 0) {
      await msg.reply('❌ אין לקוחות ברשימה עדיין. שלח *1* להוספת לקוח.');
      return;
    }
    const list = clients.map((c, i) => `${i + 1}. *${c.business}* (${c.name})`).join('\n');
    session.state = 'update_select';
    session.data  = {};
    await msg.reply(`✏️ *עדכון סטטוס*\n\nשלח שם עסק לעדכון:\n\n${list}`);
    return;
  }

  if (text === '3' || text === 'יצירת הצעת מחיר') {
    session.state = 'quote_client';
    session.data  = {};
    await msg.reply(`📄 *יצירת הצעת מחיר*\n\nמה שם הלקוח / איש הקשר?\n\n_שלח *ביטול* בכל שלב לביטול_`);
    return;
  }

  // ── Natural language – "שם עסק אישר את ההצעה" ────────────────
  const approvalRx = /^(.+?)\s+אישר(?:ה)?\s+את\s+ה?הצעה/;
  const approvalMatch = text.match(approvalRx);
  if (approvalMatch) {
    const biz     = approvalMatch[1].trim();
    const clients = getClients();
    if (clients.find(c => c.business === biz)) {
      await msg.reply(`ℹ️ *${biz}* כבר קיים ברשימת הלקוחות הפעילים.`);
    } else {
      session.state      = 'approval_status';
      session.data.biz   = biz;
      await msg.reply(`🎉 *${biz} אישר את ההצעה!*\n\nמה הסטטוס ההתחלתי של הפרויקט?`);
    }
    return;
  }

  // ── Natural language – "שם עסק" + סטטוס חופשי ────────────────
  const clients     = getClients();
  const matchClient = clients.find(c => text.startsWith(c.business));
  if (matchClient) {
    const newStatus = text.slice(matchClient.business.length).trim();
    if (newStatus) {
      const idx = clients.indexOf(matchClient);
      clients[idx].status = newStatus;
      clients[idx].updatedAt = new Date().toISOString();
      saveClients(clients);
      await msg.reply(`✅ *סטטוס עודכן*\n\n*${matchClient.business}* (${matchClient.name})\n📝 ${newStatus}`);
    } else {
      // הצגת פרטי לקוח
      await msg.reply(`📋 *${matchClient.business}*\n👤 לקוח: ${matchClient.name}\n📝 סטטוס: ${matchClient.status}`);
    }
    return;
  }

  // ── Default ────────────────────────────────────────────────────
  await msg.reply(`👋 היי ${userName}!\nשלח *תפריט* כדי להתחיל.`);
});

// ─── Conversation State Machine ───────────────────────────────
async function handleConversation(msg, phone, text, session, userName) {
  // ביטול בכל שלב
  if (['ביטול', 'cancel', 'בטל'].includes(text.toLowerCase())) {
    clearSession(phone);
    await msg.reply('❌ הפעולה בוטלה.\nשלח *תפריט* להמשך.');
    return;
  }

  switch (session.state) {

    // ── הוספת לקוח ──────────────────────────────────────────────
    case 'add_name':
      session.data.name  = text;
      session.state      = 'add_business';
      await msg.reply('מה שם העסק?');
      break;

    case 'add_business':
      session.data.business = text;
      session.state         = 'add_status';
      await msg.reply('מה הסטטוס הנוכחי של הפרויקט?\n\n_לדוגמה: ממתין לתשלום ראשוני_');
      break;

    case 'add_status': {
      const clients = getClients();
      clients.push({
        name:      session.data.name,
        business:  session.data.business,
        status:    text,
        addedAt:   new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      saveClients(clients);
      clearSession(phone);
      await msg.reply(
`✅ *לקוח נוסף בהצלחה!*

👤 ${session.data.name}
🏢 ${session.data.business}
📝 ${text}

יופיע בעדכון הבוקר הבא ב-${config.morningTime} ☀️`
      );
      break;
    }

    // ── עדכון סטטוס ─────────────────────────────────────────────
    case 'update_select': {
      const clients = getClients();
      const found   = clients.find(c =>
        c.business.includes(text) || text.includes(c.business)
      );
      if (!found) {
        await msg.reply('❌ לא מצאתי עסק כזה. נסה שוב או שלח *ביטול*.');
        return;
      }
      session.data.biz  = found.business;
      session.state     = 'update_status';
      await msg.reply(
`✏️ *${found.business}* (${found.name})
סטטוס נוכחי: ${found.status}

מה הסטטוס החדש?`
      );
      break;
    }

    case 'update_status': {
      const clients = getClients();
      const idx     = clients.findIndex(c => c.business === session.data.biz);
      if (idx !== -1) {
        clients[idx].status    = text;
        clients[idx].updatedAt = new Date().toISOString();
        saveClients(clients);
      }
      clearSession(phone);
      await msg.reply(`✅ *סטטוס עודכן!*\n\n*${session.data.biz}*\n📝 ${text}`);
      break;
    }

    // ── הצעת מחיר ───────────────────────────────────────────────
    case 'quote_client':
      session.data.clientName = text;
      session.state           = 'quote_business';
      await msg.reply('מה שם העסק?');
      break;

    case 'quote_business':
      session.data.businessName = text;
      session.state             = 'quote_photos';
      await msg.reply(`כמה *תמונות*? (₪${config.pricePhoto} לתמונה)\n\n_שלח 0 אם אין תמונות_`);
      break;

    case 'quote_photos': {
      const n = parseInt(text);
      if (isNaN(n) || n < 0) { await msg.reply('❌ נא להזין מספר תקין (לדוגמה: 5 או 0)'); return; }
      session.data.photos = n;
      session.state       = 'quote_videos';
      await msg.reply(`כמה *סרטונים*? (₪${config.priceVideo} לסרטון)\n\n_שלח 0 אם אין סרטונים_`);
      break;
    }

    case 'quote_videos': {
      const n = parseInt(text);
      if (isNaN(n) || n < 0) { await msg.reply('❌ נא להזין מספר תקין'); return; }
      session.data.videos = n;

      const autoTotal = (session.data.photos * config.pricePhoto) + (n * config.priceVideo);
      session.data.total  = autoTotal;
      session.state       = 'quote_confirm';

      await msg.reply(
`💰 *סיכום הצעת מחיר*

👤 ${session.data.clientName}
🏢 ${session.data.businessName}
📸 ${session.data.photos} תמונות × ₪${config.pricePhoto} = ₪${(session.data.photos * config.pricePhoto).toLocaleString('he-IL')}
🎬 ${session.data.videos} סרטונים × ₪${config.priceVideo} = ₪${(n * config.priceVideo).toLocaleString('he-IL')}
━━━━━━━━━━━━━━━
💵 *סה"כ: ₪${autoTotal.toLocaleString('he-IL')}*

שלח *אישור* ליצירת PDF 📄
או שלח מחיר אחר לעקוף (לדוגמה: 1200)`
      );
      break;
    }

    case 'quote_confirm': {
      // בדוק אם שלחו מחיר ידני
      if (text !== 'אישור') {
        const override = parseInt(text.replace(/[^\d]/g, ''));
        if (!isNaN(override) && override > 0) {
          session.data.total = override;
        } else {
          await msg.reply('❌ שלח *אישור* ליצירת PDF, או מחיר מספרי (לדוגמה: 1200)');
          return;
        }
      }

      await msg.reply('⏳ מייצר PDF, רגע...');

      try {
        const pdfPath = await generateQuotePDF({
          clientName:   session.data.clientName,
          businessName: session.data.businessName,
          photos:       session.data.photos,
          videos:       session.data.videos,
          total:        session.data.total,
          pricePhoto:   config.pricePhoto,
          priceVideo:   config.priceVideo
        });

        const media    = MessageMedia.fromFilePath(pdfPath);
        media.filename = `${session.data.businessName}. הצעת מחיר.pdf`;

        await client.sendMessage(phone, media, {
          caption:
`📄 *הצעת מחיר – ${session.data.businessName}*
סה"כ: ₪${session.data.total.toLocaleString('he-IL')}

לאחר אישור הלקוח, שלח:
_${session.data.businessName} אישר את ההצעה_`
        });

        clearSession(phone);
      } catch (e) {
        console.error('❌ שגיאה ביצירת PDF:', e.message);
        await msg.reply('❌ שגיאה ביצירת ה-PDF. בדוק את הלוגים.');
        clearSession(phone);
      }
      break;
    }

    // ── אישור הצעה → הוספה ללקוחות ──────────────────────────────
    case 'approval_status': {
      const clients = getClients();
      clients.push({
        name:      session.data.biz,
        business:  session.data.biz,
        status:    text,
        addedAt:   new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      saveClients(clients);
      clearSession(phone);
      await msg.reply(
`🎉 *${session.data.biz} נוסף ללקוחות הפעילים!*

📝 סטטוס: ${text}
יופיע בעדכון הבוקר הבא ב-${config.morningTime} ☀️`
      );
      break;
    }

    default:
      clearSession(phone);
      await msg.reply('⚠️ משהו השתבש. שלח *תפריט* להתחלה מחדש.');
  }
}

// ─── Start ────────────────────────────────────────────────────
client.initialize();
