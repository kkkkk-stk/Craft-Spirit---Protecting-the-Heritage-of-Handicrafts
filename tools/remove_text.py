import numpy as np
from PIL import Image, ImageFilter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# 1. 切出 "允议" 按钮（element_035: x:364, y:1271, w:176, h:185）
# 同时切出高亮版 "设定"（element_036: x:697, y:1279, w:169, h:170）
# 和灰色版 "设定"（element_037: x:121, y:1280, w:173, h:171）
# 处理后得到3个空白按钮

SOURCE = ROOT / "assets/images/ui/ui-sprite.png"
OUT_DIR = ROOT / "assets/images/ui"
OUT_DIR.mkdir(parents=True, exist_ok=True)

buttons = {
    "btn-round-gray":  {"x": 364, "y": 1271, "w": 176, "h": 185, "name": "允议"},
    "btn-round-green": {"x": 697, "y": 1279, "w": 169, "h": 170, "name": "设定灰"},
    "btn-round-gold":  {"x": 121, "y": 1280, "w": 173, "h": 171, "name": "设定高亮"},
}


def remove_text(img: Image.Image) -> Image.Image:
    """去除圆形按钮中心的文字，保留边框和质感。"""
    arr = np.array(img.convert("RGBA"))
    alpha = arr[..., 3]
    mask = alpha > 0
    rgb = arr[..., :3]

    # 圆形中心
    ys, xs = np.where(mask)
    if len(ys) == 0:
        return img
    cy, cx = ys.mean(), xs.mean()

    # 每个像素到中心的距离
    yy, xx = np.ogrid[:arr.shape[0], :arr.shape[1]]
    dist = np.sqrt((yy - cy) ** 2 + (xx - cx) ** 2)
    max_r = dist[mask].max()

    # 亮度
    brightness = rgb.mean(axis=2)
    valid = brightness[mask]

    # 背景色：非透明区域里亮度最高的 50% 像素的平均
    bg_threshold = np.percentile(valid, 50)
    bg_mask = mask & (brightness >= bg_threshold)
    if bg_mask.sum() > 0:
        bg_color = rgb[bg_mask].mean(axis=0).astype(np.uint8)
    else:
        bg_color = np.array([200, 190, 175], dtype=np.uint8)

    # 文字检测：在圆形内部（距离 < 0.65R），且比较暗（亮度 < 35%分位）
    # 这样不会误伤外圈边框
    inner = dist < max_r * 0.65
    text_threshold = np.percentile(valid, 30)
    text_mask = mask & inner & (brightness < text_threshold)

    # 用背景色填充文字
    arr[text_mask, :3] = bg_color

    # 轻微模糊，消除文字残留的锐利边缘
    out = Image.fromarray(arr, "RGBA").filter(ImageFilter.GaussianBlur(radius=0.5))
    return out


def main():
    sprite = Image.open(SOURCE)
    for name, info in buttons.items():
        x, y, w, h = info["x"], info["y"], info["w"], info["h"]
        cropped = sprite.crop((x, y, x + w, y + h))
        cleaned = remove_text(cropped)
        out_path = OUT_DIR / f"{name}.png"
        cleaned.save(out_path)
        print(f"OK {name}.png ({w}x{h})  source: {info['name']}")
    print("Output dir:", OUT_DIR.relative_to(ROOT))


if __name__ == "__main__":
    main()
