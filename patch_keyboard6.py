from pathlib import Path
p = Path('index.js')
text = p.read_text(encoding='utf-8').replace('\r\n', '\n')

def find_block_end(start):
    candidates = [
        text.find('});\n\nbot.command', start),
        text.find('});\n\nbot.catch', start),
        text.find('});\n\nbot.on', start),
        text.find('});\n\nbot.launch', start),
        text.find('});\n\nprocess.once', start)
    ]
    candidates = [c for c in candidates if c != -1]
    if not candidates:
        raise SystemExit('no block end found')
    return min(candidates) + 3


def patch_block(command, old, new):
    start = text.find(f"bot.command('{command}'")
    if start == -1:
        raise SystemExit(f"command {command} not found")
    end = find_block_end(start)
    block = text[start:end]
    if old not in block:
        raise SystemExit(f"old pattern not found in {command} block: {repr(old[:80])}")
    return text[:start] + block.replace(old, new, 1) + text[end:]

text = patch_block('clients',
    "return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown' });",
    "return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown', ...buildMainKeyboard() });")
text = patch_block('clients',
    "ctx.reply(`📋 *לקוחות:*\\n\\n${formatClientList(clients)}`, { parse_mode: 'Markdown' });",
    "ctx.reply(`📋 *לקוחות:*\\n\\n${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildMainKeyboard() });")
text = patch_block('status',
    "ctx.reply(`📊 *סטטוס מהיר*\\n\\n${summary}`, { parse_mode: 'Markdown' });",
    "ctx.reply(`📊 *סטטוס מהיר*\\n\\n${summary}`, { parse_mode: 'Markdown', ...buildMainKeyboard() });")
text = patch_block('addclient',
    "ctx.reply('➕ *הוספת לקוח חדש*\\n\\nמה שם הלקוח / איש הקשר?\\n\\n_שלח /cancel בכל שלב לביטול_', { parse_mode: 'Markdown' });",
    "ctx.reply('➕ *הוספת לקוח חדש*\\n\\nמה שם הלקוח / איש הקשר?\\n\\n_שלח /cancel בכל שלב לביטול_', { parse_mode: 'Markdown', ...buildCancelKeyboard() });")
text = patch_block('updateclient',
    "return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown' });",
    "return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown', ...buildMainKeyboard() });")
text = patch_block('updateclient',
    "ctx.reply(`📋 בחר לקוח לעדכון סטטוס:\\n\\n${formatClientList(clients)}`, { parse_mode: 'Markdown' });",
    "ctx.reply(`📋 בחר לקוח לעדכון סטטוס:\\n\\n${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildCancelKeyboard() });")
text = patch_block('quote',
    "return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown' });",
    "return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown', ...buildMainKeyboard() });")
text = patch_block('quote',
    "ctx.reply(`📋 בחר לקוח להצעת מחיר:\\n\\n${formatClientList(clients)}`, { parse_mode: 'Markdown' });",
    "ctx.reply(`📋 בחר לקוח להצעת מחיר:\\n\\n${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildCancelKeyboard() });")
text = patch_block('report',
    "ctx.reply(`📨 *דוח מהיר*\\n\\n${text}`, { parse_mode: 'Markdown' });",
    "ctx.reply(`📨 *דוח מהיר*\\n\\n${text}`, { parse_mode: 'Markdown', ...buildMainKeyboard() });")
text = patch_block('models',
    "return ctx.reply('❌ לא הצלחתי לקבל את רשימת המודלים כרגע. נסה שוב מעט מאוחר יותר.', { parse_mode: 'Markdown' });",
    "return ctx.reply('❌ לא הצלחתי לקבל את רשימת המודלים כרגע. נסה שוב מעט מאוחר יותר.', { parse_mode: 'Markdown', ...buildMainKeyboard() });")
text = patch_block('models',
    "ctx.reply(`🧠 *מודלים זמינים*\\n\\n${list}\\n\\nלהפעלת מצב שיחה: /model <model-id>`, { parse_mode: 'Markdown' });",
    "ctx.reply(`🧠 *מודלים זמינים*\\n\\n${list}\\n\\nלהפעלת מצב שיחה: /model <model-id>`, { parse_mode: 'Markdown', ...buildMainKeyboard() });")
text = patch_block('model',
    "return ctx.reply('📌 שלח /models כדי לראות מספר מודלים, או /model <model-id> כדי לבחור מודל ולהיכנס למצב שיחה.', { parse_mode: 'Markdown' });",
    "return ctx.reply('📌 שלח /models כדי לראות מספר מודלים, או /model <model-id> כדי לבחור מודל ולהיכנס למצב שיחה.', { parse_mode: 'Markdown', ...buildMainKeyboard() });")
text = patch_block('model',
    "ctx.reply(`✅ מצב שיחה מופעל עם המודל: *${raw}*\\nשלח הודעה עכשיו. לצאת: /exit-chat`, { parse_mode: 'Markdown' });",
    "ctx.reply(`✅ מצב שיחה מופעל עם המודל: *${raw}*\\nשלח הודעה עכשיו. לצאת: /exit-chat`, { parse_mode: 'Markdown', ...buildMainKeyboard() });")

old = "return ctx.reply(buildQuickReply(), { parse_mode: 'Markdown' });"
new = "return ctx.reply(buildQuickReply(), { parse_mode: 'Markdown', ...buildMainKeyboard() });"
text = text.replace(old, new, 1)
old = "ctx.reply('❓ לא הבנתי. שלח /menu לתפריט או /help לעזרה.', { parse_mode: 'Markdown' });"
new = "ctx.reply('❓ לא הבנתי. שלח /menu לתפריט או /help לעזרה.', { parse_mode: 'Markdown', ...buildMainKeyboard() });"
text = text.replace(old, new, 1)
old = "return ctx.reply('➕ *הוספת לקוח חדש*\\n\\nמה שם הלקוח / איש הקשר?\\n\\n_שלח /cancel בכל שלב לביטול_', { parse_mode: 'Markdown' });"
new = "return ctx.reply('➕ *הוספת לקוח חדש*\\n\\nמה שם הלקוח / איש הקשר?\\n\\n_שלח /cancel בכל שלב לביטול_', { parse_mode: 'Markdown', ...buildCancelKeyboard() });"
text = text.replace(old, new, 1)
old = "return ctx.reply(`📋 בחר לקוח לעדכון סטטוס:\\n\\n${formatClientList(clients)}`, { parse_mode: 'Markdown' });"
new = "return ctx.reply(`📋 בחר לקוח לעדכון סטטוס:\\n\\n${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildCancelKeyboard() });"
text = text.replace(old, new, 1)
old = "return ctx.reply(`📋 בחר לקוח להצעת מחיר:\\n\\n${formatClientList(clients)}`, { parse_mode: 'Markdown' });"
new = "return ctx.reply(`📋 בחר לקוח להצעת מחיר:\\n\\n${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildCancelKeyboard() });"
text = text.replace(old, new, 1)

p.write_text(text.replace('\n', '\r\n'), encoding='utf-8')
print('patched')
