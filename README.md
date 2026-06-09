# 🤖 סמי בוט – מדריך הגדרה לטלגרם + Glitch

## מה הבוט יודע לעשות?

- **➕ הוספת לקוח** – שלח `1` (שם, עסק, סטטוס)
- **✏️ עדכון סטטוס** – שלח `2`, בחר לקוח, עדכן סטטוס
- **📄 הצעת מחיר PDF** – שלח `3`, בחר לקוח, כמה תמונות/סרטונים, והבוט יוצר PDF
- **📅 דיווח בוקר** – כל יום ב-9:30 – סטטוס כל הלקוחות (ב-logs)
- **💾 Storage לצמיתות** – לקוחות נשמרים ב-`clients.json`

---

## שלב 1 – צור בוט ב-Telegram

1. **פתח Telegram** (טלפון או [web.telegram.org](https://web.telegram.org))
2. **חפש** `@BotFather`
3. **שלח** `/newbot`
4. **בחר שם** (לדוגמה: `Sami Bot`)
5. **בחר username** (לדוגמה: `sami_business_bot` – צריך להיות ייחודי!)
6. **קבל TOKEN** – משהו כמו:
   ```
   123456789:ABCDefGhIjKlMnOpQrStUvWxYz...
   ```

**שמור את ה-TOKEN הזה!** ← תצריך אותו בשלב הבא

---

## שלב 2 – Deploy ל-Glitch (חינם, 24/7)

### 2.1 – צור GitHub Repository

1. עבור ל-[github.com](https://github.com)
2. צור **New Repository** בשם `sami-telegram-bot`
3. **Upload את הקבצים:**
   ```
   index.js
   config.js
   pdfGenerator.js
   scheduler.js
   package.json
   clients.json
   .gitignore
   README.md
   ```

**`.gitignore`:**
```
node_modules/
.wwebjs_auth/
.wwebjs_cache/
quotes/
.env
```

4. **Push ל-GitHub** (או העלה קבצים ידנית)

### 2.2 – Deploy ל-Glitch

1. עבור ל-[glitch.com](https://glitch.com)
2. **התחבר** עם GitHub
3. **New Project** → **Import from GitHub**
4. **בחר את ה-repo:** `your-username/sami-telegram-bot`
5. Glitch יזהה את Node.js ויריץ אוטומטית `npm install` ו-`npm start`

### 2.3 – הוסף את ה-TOKEN לסביבה

ב-Glitch:
1. **לחץ** `.env` (בכפתור בצד שמאל)
2. **הוסף:**
   ```
   TELEGRAM_TOKEN=123456789:ABCDefGhIjKlMnOpQrStUvWxYz...
   ```
   (תחליף ב-TOKEN שלך מ-BotFather)

3. **הבוט יתרוממ לבד** (Glitch restarts automatically)

### 2.4 – בדוק את הלוגים

ב-Glitch:
1. **לחץ** "Tools" (בפינה תחתונה משמאל)
2. **בחר** "Logs"
3. תראה:
   ```
   🤖 סמי בוט טלגרם כעת פעיל! 🚀
   💬 שלח לבוט: /start
   ```

---

## שלב 3 – התחל לתדבר עם הבוט

1. **פתח Telegram**
2. **חפש את ה-username שלך** (משהו כמו `@sami_business_bot`)
3. **שלח** `/start`
4. **שלח** `/menu` לתפריט

### פקודות:

| שלח | מה קורה |
|---|---|
| `/start` | הודעת ברכה |
| `/menu` | תפריט ראשי (1, 2, 3) |
| `/help` | הוראות |
| `/clients` | רשימת לקוחות |
| `1` | הוספת לקוח |
| `2` | עדכון סטטוס |
| `3` | יצירת הצעה PDF |
| `ביטול` | בטל פעולה נוכחית |

---

## עדכון ההגדרות

ערוך את `config.js`:

```javascript
module.exports = {
  botName: 'סמי בוט',
  phone1: '123456789',
  name1: 'דניאל',
  pricePhoto: 150,     // שנה מחיר תמונה
  priceVideo: 300,     // שנה מחיר סרטון
  morningTime: '9:30'  // שעת דיווח בוקר
};
```

**ואז push ל-GitHub:**
```bash
git add config.js
git commit -m "Update prices"
git push
```

**Glitch יעדכן אוטומטית!** 🚀

---

## בעיות נפוצות

### "❌ בוט לא מגיב"
1. בדוק ש-TOKEN נכון ב-Glitch `.env`
2. בדוק Logs ב-Glitch (Tools → Logs)
3. נסה לשלוח `/start` שוב

### "❌ לא מוצא את הלקוח"
- וודא שהוספת לקוח תחילה (שלח `1`)

### "❌ PDF לא נוצר"
- בדוק ש-`pdfGenerator.js` קיים
- בדוק Logs לשגיאות

---

## עדכון הבוט

בכל פעם שאתה רוצה לשנות משהו:

1. **ערוך הקובץ** (לדוגמה: `config.js`)
2. **Push ל-GitHub:**
   ```bash
   git add .
   git commit -m "עדכון כלשהו"
   git push
   ```
3. **Glitch יעדכן אוטומטית!** (אותות סימן משחה בפינה העליונה)

---

## תמיכה

📧 בעיות? בדוק Logs ב-Glitch או שלח לי הודעה! 😄
