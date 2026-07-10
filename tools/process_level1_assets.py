"""
处理关卡一素材：绿幕抠图 + 缩放 + 裁剪精灵
============================================
"""
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "assets", "images", "scences", "level1")
OUT_DIR = SRC_DIR

def ensure_dir(d):
    os.makedirs(d, exist_ok=True)

# --- 工具函数 ---

def chromakey(img, threshold=110, soft=28, target_green=None):
    """对 PIL Image 对象进行绿幕抠图，返回RGBA。"""
    img = img.convert("RGBA")
    w, h = img.size
    if target_green is None:
        pts = [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3),
               (w // 2, 2), (w // 2, h - 3)]
        from collections import Counter
        cnt = Counter()
        for (x, y) in pts:
            cnt[img.getpixel((x, y))[:3]] += 1
        target_green = cnt.most_common(1)[0][0]
    tr, tg, tb = target_green
    px = img.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            dist = ((r - tr)**2 + (g - tg)**2 + (b - tb)**2)**0.5
            if dist < threshold:
                a = 0
            elif dist < threshold + soft:
                a = int(255 * (dist - threshold) / soft)
            else:
                a = 255
            # 溢色抑制
            if a < 255 and g > r and g > b:
                g = max(r, b)
            px[x, y] = (r, g if a == 255 else min(g, max(r, b)), b, a)
    return img, target_green

def resize_pixel(img, w, h):
    """像素风用最近邻缩放。"""
    return img.resize((w, h), Image.NEAREST)

def crop_sprites(img):
    """从前景装饰包中自动裁剪出独立精灵（基于非透明区域）。"""
    # 先二值化：非透明=1，透明=0
    w, h = img.size
    px = img.load()
    mask = [[0]*w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > 30:
                mask[y][x] = 1
    
    # 找连通块（简化版：水平/垂直扫描找独立区域）
    # 先找所有非透明点的 bounding box
    min_x = w; max_x = 0; min_y = h; max_y = 0
    for y in range(h):
        for x in range(w):
            if mask[y][x]:
                min_x = min(min_x, x); max_x = max(max_x, x)
                min_y = min(min_y, y); max_y = max(max_y, y)
    
    # 根据预知的布局，手动定义裁剪区域（装饰包有特定布局）
    # 根据图片分析，采用精确坐标
    sprites = []
    
    # 方法：用连通分量检测找到独立精灵的精确 bounding boxes
    visited = [[False]*w for _ in range(h)]
    
    def find_components():
        components = []
        for y in range(h):
            for x in range(w):
                if mask[y][x] and not visited[y][x]:
                    # BFS
                    stack = [(x, y)]
                    visited[y][x] = True
                    cmin_x, cmax_x = x, x
                    cmin_y, cmax_y = y, y
                    while stack:
                        cx, cy = stack.pop()
                        cmin_x = min(cmin_x, cx); cmax_x = max(cmax_x, cx)
                        cmin_y = min(cmin_y, cy); cmax_y = max(cmax_y, cy)
                        for dx, dy in [(-1,0),(1,0),(0,-1),(0,1)]:
                            nx, ny = cx+dx, cy+dy
                            if 0 <= nx < w and 0 <= ny < h and mask[ny][nx] and not visited[ny][nx]:
                                visited[ny][nx] = True
                                stack.append((nx, ny))
                    # 过滤掉太小的噪点
                    area = (cmax_x - cmin_x + 1) * (cmax_y - cmin_y + 1)
                    if area > 200:
                        components.append((cmin_x, cmin_y, cmax_x, cmax_y))
        return components
    
    components = find_components()
    # 按面积排序，取最大的几个
    components.sort(key=lambda c: (c[2]-c[0])*(c[3]-c[1]), reverse=True)
    
    # 应该有 7 个主要元素：树、灌木、栅栏、灯笼、草1、草2、草3
    # 我们只取前7个，并过滤掉太小的
    components = [c for c in components if (c[2]-c[0])*(c[3]-c[1]) > 500]
    
    # 按 y 位置分组：上排（y<中心）和下排（y>中心）
    cy = h // 2
    top = [c for c in components if c[1] < cy]
    bottom = [c for c in components if c[1] >= cy]
    
    # 按 x 排序
    top.sort(key=lambda c: c[0])
    bottom.sort(key=lambda c: c[0])
    
    names = {
        'bush': top[0] if len(top) > 0 else None,
        'fence': top[1] if len(top) > 1 else None,
        'tree': top[2] if len(top) > 2 else None,
        'lantern': bottom[0] if len(bottom) > 0 else None,
        'grass1': bottom[1] if len(bottom) > 1 else None,
        'grass2': bottom[2] if len(bottom) > 2 else None,
        'grass3': bottom[3] if len(bottom) > 3 else None,
    }
    
    # 裁剪并保存
    result = {}
    for name, box in names.items():
        if box is None:
            continue
        x1, y1, x2, y2 = box
        # 加 padding 但不超过边界
        pad = 4
        x1 = max(0, x1 - pad); y1 = max(0, y1 - pad)
        x2 = min(w-1, x2 + pad); y2 = min(h-1, y2 + pad)
        cropped = img.crop((x1, y1, x2+1, y2+1))
        result[name] = cropped
    
    return result

def main():
    ensure_dir(OUT_DIR)
    
    # ===== 1. 处理实底背景图（缩放）=====
    print("=== 1. 处理实底背景 ===")
    
    # 村口背景 -> 1920x600
    bg = Image.open(os.path.join(SRC_DIR, "background.png"))
    bg_r = resize_pixel(bg, 1920, 600)
    bg_r.save(os.path.join(OUT_DIR, "gate_bg.png"))
    print("  gate_bg.png 1920x600")
    
    # 后山背景 -> 1920x600
    hub_bg = Image.open(os.path.join(SRC_DIR, "yard background.png"))
    hub_bg_r = resize_pixel(hub_bg, 1920, 600)
    hub_bg_r.save(os.path.join(OUT_DIR, "hub_bg.png"))
    print("  hub_bg.png 1920x600")
    
    # ===== 2. 绿幕抠图：村口寨门 ====
    print("\n=== 2. 绿幕抠图 ===")
    
    gate = Image.open(os.path.join(SRC_DIR, "ethnic village gate.png"))
    gate_ck, gcolor = chromakey(gate)
    print(f"  ethnic village gate.png 绿幕色={gcolor}")
    gate_ck = resize_pixel(gate_ck, 300, 400)
    gate_ck.save(os.path.join(OUT_DIR, "gate_structure.png"))
    print("  -> gate_structure.png 300x400")
    
    # ===== 3. 绿幕抠图：绣花古宅 ====
    house = Image.open(os.path.join(SRC_DIR, "ethnic embroidery house.png"))
    house_ck, hcolor = chromakey(house)
    print(f"  ethnic embroidery house.png 绿幕色={hcolor}")
    house_ck = resize_pixel(house_ck, 400, 500)
    house_ck.save(os.path.join(OUT_DIR, "house_exterior.png"))
    print("  -> house_exterior.png 400x500")
    
    # ===== 4. 绿幕抠图：祠堂 ====
    hall = Image.open(os.path.join(SRC_DIR, "ethnic ancestral hall.png"))
    hall_ck, hcolor = chromakey(hall)
    print(f"  ethnic ancestral hall.png 绿幕色={hcolor}")
    hall_ck = resize_pixel(hall_ck, 400, 500)
    hall_ck.save(os.path.join(OUT_DIR, "hall_exterior.png"))
    print("  -> hall_exterior.png 400x500")
    
    # ===== 5. 已透明：大戏台（只缩放）====
    stage = Image.open(os.path.join(SRC_DIR, "traditional Chinese village stage.png"))
    stage_r = resize_pixel(stage, 300, 400)
    stage_r.save(os.path.join(OUT_DIR, "stage.png"))
    print("  -> stage.png 300x400 (已透明)")
    
    # ===== 6. 绿幕抠图 + 裁剪：前景装饰包 ====
    deco = Image.open(os.path.join(SRC_DIR, "foreground decoration.png"))
    deco_ck, dcolor = chromakey(deco)
    print(f"  foreground decoration.png 绿幕色={dcolor}")
    
    # 先全图抠图，再裁剪
    sprites = crop_sprites(deco_ck)
    
    # 分别缩放并保存
    sprite_sizes = {
        'bush': (60, 24),      # 灌木丛
        'fence': (200, 40),    # 栅栏
        'tree': (90, 140),     # 大树
        'lantern': (20, 24),   # 灯笼
        'grass1': (40, 16),    # 草1
        'grass2': (40, 16),    # 草2
        'grass3': (40, 16),    # 草3
    }
    
    for name, img in sprites.items():
        if name in sprite_sizes:
            w, h = sprite_sizes[name]
            # 等比例缩放，不超过目标尺寸
            orig_w, orig_h = img.size
            ratio = min(w / orig_w, h / orig_h)
            if ratio < 1:
                new_w, new_h = int(orig_w * ratio), int(orig_h * ratio)
                img = resize_pixel(img, new_w, new_h)
            img.save(os.path.join(OUT_DIR, f"fg_{name}.png"))
            print(f"  -> fg_{name}.png {img.size[0]}x{img.size[1]}")
    
    # 保存原始抠图版（备用，若需要精灵版）
    deco_ck.save(os.path.join(OUT_DIR, "fg_deco.png"))
    
    print("\n=== 全部完成！输出目录：", OUT_DIR)

if __name__ == "__main__":
    main()
