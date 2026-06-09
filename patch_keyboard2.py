from pathlib import Path
p = Path('index.js')
text = p.read_text(encoding='utf-8')
replacements = [
    (
        '''  ctx.reply(
    `📞 /clients - רשימת לקוחות`,
    { parse_mode: 'Markdown' }
  );''',
        '''  ctx.reply(
    `📞 /clients - רשימת לקוחות`,
    { parse_mode: 'Markdown', ...buildMainKeyboard() }
  );'''
    ),
    (
        '''    { parse_mode: 'Markdown' }
  );
}''',
        '''    { parse_mode: 'Markdown', ...buildMainKeyboard() }
  );
}'''
    ),
    (
        '''bot.command('clients', ctx => {
  registerChat(ctx);
  const clients = getClients();
  if (clients.length === 0) {
    return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown' });
  }
  ctx.reply(`📋 *לקוחות:*

${formatClientList(clients)}`, { parse_mode: 'Markdown' });
});''',
        '''bot.command('clients', ctx => {
  registerChat(ctx);
  const clients = getClients();
  if (clients.length === 0) {
    return ctx.reply('❌ אין לקוחות ברשימה עדיין. שלח /addclient להוספת לקוח.', { parse_mode: 'Markdown', ...buildMainKeyboard() });
  }
  ctx.reply(`📋 *לקוחות:*

${formatClientList(clients)}`, { parse_mode: 'Markdown', ...buildMainKeyboard() });
});'''
    ),
    (
        '''  ctx.reply(`📊 *סטטוס מהיר`

${summary}`, { parse_mode: 'Markdown' });
});''',
        '''  ctx.reply(`📊 *סטטוס מהיר`

${summary}`, { parse_mode: 'Markdown', ...buildMainKeyboard() });
});'''
    )
]
for old, new in replacements:
    if old not in text:
        print('missing replacement:')
        print(repr(old[:200]))
        raise SystemExit(1)
    text = text.replace(old, new, 1)
p.write_text(text, encoding='utf-8')
print('patched')
