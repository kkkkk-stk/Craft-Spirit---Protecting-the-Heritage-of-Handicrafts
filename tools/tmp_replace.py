import sys

with open('css/save.css', 'r', encoding='utf-8') as f:
    content = f.read()

old = '''.save-slots-btn {
    padding: 12px 40px;
    background: #8b4513;
    color: #f5f0e8;
    border: none;
    border-radius: 8px;
    font-size: 18px;
    cursor: pointer;
    letter-spacing: 3px;
    transition: all 0.3s;
    font-family: inherit;
}

.save-slots-btn:hover {
    background: #a0522d;
    transform: scale(1.05);
}

.save-slots-btn.secondary {
    background: transparent;
    color: #8b4513;
    border: 2px solid #8b4513;
}

.save-slots-btn.secondary:hover {
    background: rgba(139, 69, 19, 0.1);
}

/* ɾť */
.save-slots-btn.danger {
    background: transparent;
    color: #c62828;
    border: 2px solid #c62828;
}

.save-slots-btn.danger:hover {
    background: #c62828;
    color: #fff;
}

.save-slots-btn.danger.active {
    background: #c62828;
    color: #fff;
}'''

new = '''.save-slots-btn {
    padding: 12px 40px;
    min-width: 120px;
    min-height: 48px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: url('../assets/images/ui/square-panel.png') center/100% 100% no-repeat;
    border: none;
    border-radius: 0;
    color: #2c1810;
    font-size: 18px;
    cursor: pointer;
    letter-spacing: 3px;
    transition: all 0.3s;
    font-family: inherit;
    text-shadow: 0 1px 2px rgba(245, 240, 232, 0.7);
}

.save-slots-btn:hover {
    filter: brightness(1.08);
    transform: scale(1.05);
}

.save-slots-btn.secondary {
    background: url('../assets/images/ui/square-panel.png') center/100% 100% no-repeat;
    color: #2c1810;
    border: none;
    opacity: 0.85;
}

.save-slots-btn.secondary:hover {
    opacity: 1;
    filter: brightness(1.05);
}

/* 删除按钮 */
.save-slots-btn.danger {
    background: url('../assets/images/ui/square-panel.png') center/100% 100% no-repeat;
    color: #c62828;
    border: none;
}

.save-slots-btn.danger:hover {
    filter: brightness(1.05);
    color: #fff;
}

.save-slots-btn.danger.active {
    filter: brightness(1.05);
    color: #fff;
}'''

if old in content:
    content = content.replace(old, new)
    with open('css/save.css', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Replaced button styles')
else:
    print('Pattern not found, trying alternative...')
    # Try reading the exact bytes
    with open('css/save.css', 'r', encoding='utf-8') as f:
        lines = f.readlines()
    for i, line in enumerate(lines[140:190], 141):
        print(f'{i}: {repr(line)}')
