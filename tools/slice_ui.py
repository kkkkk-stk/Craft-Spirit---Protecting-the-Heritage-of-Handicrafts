"""
UI Sprite 切割工具
从绿底 UI 合图中抠出透明背景的合图，并自动检测各 UI 元素的边界框。

输入: assets/game_UI.png (绿底合图，背景纯绿 #00FF00)
输出:
  - assets/images/ui/ui-sprite.png  透明背景合图（CSS sprite 主力）
  - tools/elements.json              元素坐标清单
  - tools/ui-preview.png             标注预览图（红框 + 编号）

用法: python tools/slice_ui.py
"""

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

# ========== 配置 ==========
ROOT = Path(__file__).resolve().parent.parent  # 项目根目录
INPUT = ROOT / "assets" / "game_UI.png"

OUT_DIR = ROOT / "assets" / "images" / "ui"
OUT_DIR.mkdir(parents=True, exist_ok=True)

SPRITE_OUT = OUT_DIR / "ui-sprite.png"
JSON_OUT = ROOT / "tools" / "elements.json"
PREVIEW_OUT = ROOT / "tools" / "ui-preview.png"

# 绿幕阈值 (RGB)：G 高、R/B 低视为绿幕
# 纯绿 (0,255,0)，抗锯齿边缘可能偏黄/偏青，范围放宽
GREEN_R_MAX = 130
GREEN_G_MIN = 180
GREEN_B_MAX = 130

# 连通域过滤：面积小于此值的视为噪声丢弃
MIN_AREA = 400

# 形态学膨胀迭代次数：用于把同一元素内部的绿色空洞连起来，
# 避免把一个按钮切成多块；数值过大会把相邻元素误合并
DILATION_ITERS = 2

# 边界框外扩像素：让切出的元素保留一点边距，避免切掉抗锯齿边缘
PADDING = 2


def is_green(arr: np.ndarray) -> np.ndarray:
    """返回布尔数组，True 表示该像素是绿幕背景。"""
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    return (r < GREEN_R_MAX) & (g > GREEN_G_MIN) & (b < GREEN_B_MAX)


def main():
    # 1. 读取绿底图
    img = Image.open(INPUT).convert("RGB")
    arr = np.array(img)
    h, w = arr.shape[:2]
    print(f"读取图片: {INPUT.name}  尺寸: {w}x{h}")

    # 2. 识别绿色像素
    green_mask = is_green(arr)
    fg_mask = ~green_mask  # 前景（非绿 = UI 元素）
    fg_ratio = fg_mask.mean() * 100
    print(f"前景占比: {fg_ratio:.1f}%")

    # 3. 形态学膨胀，合并同一元素内部的绿色空洞
    struct = ndimage.generate_binary_structure(2, 2)  # 8 连通
    merged = ndimage.binary_dilation(fg_mask, structure=struct, iterations=DILATION_ITERS)

    # 4. 连通域检测
    labels, num = ndimage.label(merged, structure=struct)
    print(f"检测到 {num} 个候选连通域")

    # 5. 在原始前景上找每个连通域的精确边界框
    slices = ndimage.find_objects(labels)
    elements = []
    for i, sl in enumerate(slices, 1):
        if sl is None:
            continue
        # 在该连通域内，取属于该标签 且 属于原始前景的像素
        region = (labels[sl] == i) & fg_mask[sl]
        area = int(region.sum())
        if area < MIN_AREA:
            continue
        rows = np.any(region, axis=1)
        cols = np.any(region, axis=0)
        y_idx = np.where(rows)[0]
        x_idx = np.where(cols)[0]
        y0 = sl[0].start + int(y_idx[0])
        y1 = sl[0].start + int(y_idx[-1]) + 1
        x0 = sl[1].start + int(x_idx[0])
        x1 = sl[1].start + int(x_idx[-1]) + 1
        # 外扩 padding，但不越界
        x0 = max(0, x0 - PADDING)
        y0 = max(0, y0 - PADDING)
        x1 = min(w, x1 + PADDING)
        y1 = min(h, y1 + PADDING)
        elements.append({
            "name": f"element_{len(elements) + 1:03d}",
            "x": x0, "y": y0,
            "w": x1 - x0, "h": y1 - y0,
            "area": area,
        })

    print(f"有效元素: {len(elements)} 个 (已过滤面积<{MIN_AREA}px 的噪声)")

    # 6. 生成透明合图：基于绿度做软 alpha + 溢色抑制，消除绿边残留
    r = arr[..., 0].astype(np.int16)
    g = arr[..., 1].astype(np.int16)
    b = arr[..., 2].astype(np.int16)
    # 绿度 = G 超过 max(R,B) 的量（纯绿 255，偏绿渐变，非绿 0）
    greenness = np.clip(g - np.maximum(r, b), 0, 255)
    # 软 alpha：绿度越高越透明，过渡带约 85 色阶，避免硬边
    alpha = np.clip(255 - greenness * 3, 0, 255).astype(np.uint8)
    # 溢色抑制：G 通道压到不超过 max(R,B)+阈值，去掉 UI 边缘绿色污染
    g_supp = np.minimum(g, np.maximum(r, b) + 15).astype(np.uint8)
    rgba = np.dstack([r.astype(np.uint8), g_supp, b.astype(np.uint8), alpha])
    Image.fromarray(rgba, "RGBA").save(SPRITE_OUT)
    print(f"透明合图: {SPRITE_OUT.relative_to(ROOT)}")

    # 7. 输出 JSON 坐标清单
    JSON_OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(JSON_OUT, "w", encoding="utf-8") as f:
        json.dump({
            "sprite": "assets/images/ui/ui-sprite.png",
            "source_size": {"w": w, "h": h},
            "elements": elements,
        }, f, ensure_ascii=False, indent=2)
    print(f"坐标清单: {JSON_OUT.relative_to(ROOT)}")

    # 8. 生成标注预览图（红框 + 编号）
    preview = img.copy()
    draw = ImageDraw.Draw(preview)
    for e in elements:
        x, y, ew, eh = e["x"], e["y"], e["w"], e["h"]
        draw.rectangle([x, y, x + ew - 1, y + eh - 1], outline=(255, 0, 0), width=4)
        label = e["name"].replace("element_", "e")
        # 编号背景块，便于辨认
        tw = len(label) * 16 + 8
        draw.rectangle([x, y - 24, x + tw, y], fill=(255, 0, 0))
        draw.text((x + 4, y - 22), label, fill=(255, 255, 255))
    preview.save(PREVIEW_OUT)
    print(f"预览图:   {PREVIEW_OUT.relative_to(ROOT)}")

    print("\n完成！下一步:")
    print(f"  1. 打开 tools/ui-preview.png 查看各元素位置和编号")
    print(f"  2. 在 tools/elements.json 中把 element_NNN 改成有意义的名字")
    print(f"  3. CSS 中用 ui-sprite.png + background-position 引用各元素")


if __name__ == "__main__":
    main()
