from pathlib import Path
text = Path('index.js').read_text('utf-8').replace('\r\n', '\n')
start = text.find("bot.command('clients'")
end = text.find('});', start) + 3
print('start', start, 'end', end)
block = text[start:end]
print(repr(block))
old = "ctx.reply(`📋 *לקוחות:*\\n\\n${formatClientList(clients)}`, { parse_mode: 'Markdown' });"
print('old in block?', old in block)
print('old repr', repr(old))
