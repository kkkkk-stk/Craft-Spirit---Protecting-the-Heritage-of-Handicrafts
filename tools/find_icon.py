import json
from PIL import Image

with open('tools/elements2.json') as f:
    data = json.load(f)

# Show last 20 elements
print("Last 20 elements:")
for e in data['elements'][-20:]:
    print(f"{e['name']}: x={e['x']}, y={e['y']}, w={e['w']}, h={e['h']}, area={e['area']}")

# Also look at elements in bottom right with small area
print("\nSmall elements in bottom right (x>2200, y>1200, area<2000):")
for e in data['elements']:
    if e['x'] > 2200 and e['y'] > 1200 and e['area'] < 2000:
        print(f"{e['name']}: x={e['x']}, y={e['y']}, w={e['w']}, h={e['h']}, area={e['area']}")
