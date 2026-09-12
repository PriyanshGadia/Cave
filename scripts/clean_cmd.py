with open('cmd6795_full.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()
code = ''.join(lines[1:-1])
with open('cmd6795.cjs', 'w', encoding='utf-8') as out:
    out.write(code)
print('cmd6795.cjs written')
