from pathlib import Path
text = Path('index.js').read_text('utf-8')
for pat in ["bot.command('clients'", 'bot.command("clients"', 'bot.command', 'clients']:
    print(pat, text.find(pat))
