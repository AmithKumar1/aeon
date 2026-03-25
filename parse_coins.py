import json

with open('/home/runner/.claude/projects/-home-runner-work-aeon-aeon/bb8c8de5-ece5-41fa-be77-17e28ae1aa94/tool-results/bmswn4214.txt', 'r') as f:
    data = json.load(f)

bitcoin = next((c for c in data if c['id'] == 'bitcoin'), None)
solana = next((c for c in data if c['id'] == 'solana'), None)

def fmt_price(p):
    if p is None:
        return 'N/A'
    if p >= 1:
        return f'${p:,.2f}'
    elif p >= 0.01:
        return f'${p:.4f}'
    else:
        return f'${p:.6f}'

def fmt_large(v):
    if v is None:
        return 'N/A'
    return f'${v:,.0f}'

def fmt_pct(p):
    if p is None:
        return 'N/A'
    sign = '+' if p >= 0 else ''
    return f'{sign}{p:.1f}%'

valid = [c for c in data if c.get('price_change_percentage_24h') is not None]
sorted_coins = sorted(valid, key=lambda c: c['price_change_percentage_24h'])

losers = sorted_coins[:10]
winners = sorted_coins[-10:][::-1]

lines = []
lines.append('*Token Movers -- 2026-03-25*')
lines.append('')

for coin, label in [(bitcoin, 'Bitcoin (BTC)'), (solana, 'Solana (SOL)')]:
    if coin:
        lines.append(f'*{label} Spotlight*')
        lines.append(f'  Price: {fmt_price(coin["current_price"])}')
        lines.append(f'  24h Change: {fmt_pct(coin["price_change_percentage_24h"])}')
        lines.append(f'  Market Cap: {fmt_large(coin["market_cap"])}')
        lines.append(f'  24h Volume: {fmt_large(coin["total_volume"])}')
        lines.append('')

lines.append('*Top 10 Winners (24h)*')
for i, c in enumerate(winners, 1):
    lines.append(f'{i}. {c["symbol"].upper()}: {fmt_price(c["current_price"])} ({fmt_pct(c["price_change_percentage_24h"])})')

lines.append('')
lines.append('*Top 10 Losers (24h)*')
for i, c in enumerate(losers, 1):
    lines.append(f'{i}. {c["symbol"].upper()}: {fmt_price(c["current_price"])} ({fmt_pct(c["price_change_percentage_24h"])})')

print('\n'.join(lines))
