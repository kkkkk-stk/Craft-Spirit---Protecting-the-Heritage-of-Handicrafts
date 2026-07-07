import re

with open('css/save.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace delete-icon.png with delete-icon-clean.png (avoid browser cache)
content = content.replace(
    "url('../assets/images/ui/delete-icon.png')",
    "url('../assets/images/ui/delete-icon-clean.png')"
)

with open('css/save.css', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done! Updated to delete-icon-clean.png')
