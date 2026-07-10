"""
绿幕抠图工具 / Chroma-key removal tool
=====================================
用途：把「纯绿背景」的像素风素材抠成透明 PNG，供关卡一（畲族古寨）场景使用。

用法：
  1. 把生成的纯绿底素材放进：  assets/images/scences/level1/_green/
  2. 在 manifest.json 里登记文件名与输出名（已预置 8 组素材映射）
  3. 运行：  python tools/chromakey.py
  4. 透明 PNG 会输出到：  assets/images/scences/level1/

原理：
  - 默认自动从图片四角检测「绿幕色」（任意绿都行，不限于 #00FF00）
  - 计算每个像素与绿幕色的距离（欧氏距离）
  - 距离 < threshold  → 完全透明
  - threshold ~ threshold+soft → 软过渡（消除白边/锯齿）
  - 距离 > threshold+soft → 完全保留
  - 同时做「溢色抑制」：把物体边缘残留的绿味压回中性，避免绿边

建议生成时：
  - 背景用纯色绿，物体不要含大面积绿色（树叶/草可改用 #5a7a2a 偏黄绿，避免被误扣）
  - 像素风硬边最适合抠图，导出 PNG（不要 JPG，JPG 会让绿幕出现杂色）
"""

import json
import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("缺少 Pillow，请先安装：pip install pillow")

# ---- 路径 ----
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GREEN_DIR = os.path.join(ROOT, "assets", "images", "scences", "level1", "_green")
OUT_DIR = os.path.join(ROOT, "assets", "images", "scences", "level1")
MANIFEST = os.path.join(GREEN_DIR, "manifest.json")

# 默认参数
DEF_THRESHOLD = 110      # 颜色距离阈值（越大扣得越多）
DEF_SOFT = 28            # 软边缘过渡带
DEF_TARGET_GREEN = None  # None = 自动检测四角主色


def detect_green(img):
    """从四角采样，返回最可能的绿幕色 (r,g,b)。"""
    w, h = img.size
    pts = [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3),
           (w // 2, 2), (w // 2, h - 3)]
    from collections import Counter
    cnt = Counter()
    for (x, y) in pts:
        cnt[img.getpixel((x, y))[:3]] += 1
    color, _ = cnt.most_common(1)[0]
    return color


def chromakey(src_path, dst_path, threshold, soft, target_green, resize):
    img = Image.open(src_path).convert("RGBA")
    if resize:
        img = img.resize((resize[0], resize[1]), Image.NEAREST)  # 像素风用最近邻
    w, h = img.size

    if target_green is None:
        target_green = detect_green(img)
    tr, tg, tb = target_green

    px = img.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            # 与绿幕色欧氏距离
            dist = ((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2) ** 0.5
            if dist < threshold:
                a = 0
            elif dist < threshold + soft:
                # 软过渡
                a = int(255 * (dist - threshold) / soft)
            else:
                a = 255
            # 溢色抑制：靠近透明边缘时，把绿色分量压低，避免绿边
            if a < 255 and g > r and g > b:
                g = max(r, b)
            px[x, y] = (r, g if a == 255 else min(g, max(r, b)), b, a)

    img.save(dst_path, "PNG")
    print(f"  ✓ {os.path.basename(src_path)} -> {os.path.relpath(dst_path, ROOT)}"
          f"  (绿幕色={target_green}, {w}x{h}, 透明比例≈{count_transparent(img)}%)")


def count_transparent(img):
    px = img.load()
    w, h = img.size
    t = 0
    for y in range(0, h, 4):
        for x in range(0, w, 4):
            if px[x, y][3] == 0:
                t += 1
    total = (h // 4 + 1) * (w // 4 + 1)
    return round(100 * t / total, 1)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(GREEN_DIR, exist_ok=True)

    # 读取 manifest
    manifest = {}
    if os.path.exists(MANIFEST):
        with open(MANIFEST, "r", encoding="utf-8") as f:
            manifest = json.load(f).get("inputs", {})

    files = [f for f in os.listdir(GREEN_DIR) if f.lower().endswith(".png")]
    if not files:
        print("没有找到待抠图的 PNG，请把素材放进：")
        print(" ", GREEN_DIR)
        return

    print("开始绿幕抠图...")
    for fname in sorted(files):
        if fname == "manifest.json":
            continue
        src = os.path.join(GREEN_DIR, fname)
        cfg = manifest.get(fname, {})
        out_name = cfg.get("out", fname)
        dst = os.path.join(OUT_DIR, out_name)
        chromakey(
            src, dst,
            threshold=cfg.get("threshold", DEF_THRESHOLD),
            soft=cfg.get("soft", DEF_SOFT),
            target_green=cfg.get("target_green", DEF_TARGET_GREEN),
            resize=cfg.get("resize"),
        )
    print("完成。透明 PNG 已输出到 assets/images/scences/level1/")


if __name__ == "__main__":
    main()
