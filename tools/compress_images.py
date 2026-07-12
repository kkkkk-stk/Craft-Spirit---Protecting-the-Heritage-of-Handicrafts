#!/usr/bin/env python3
"""
图片压缩工具：将 assets 目录下的 PNG/JPG 转换为 WebP
同时更新 css/js/html 中的资源引用 (.png/.jpg -> .webp)
用法: python tools/compress_images.py
"""
import os
import re
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def convert_images():
    """递归扫描 assets 目录，将 PNG/JPG 转为 WebP 并删除原文件"""
    image_dir = os.path.join(ROOT, 'assets')
    total_before = 0
    total_after = 0
    count = 0

    for root, dirs, files in os.walk(image_dir):
        for f in files:
            if not f.lower().endswith(('.png', '.jpg', '.jpeg')):
                continue

            src = os.path.join(root, f)
            dst = os.path.splitext(src)[0] + '.webp'
            before = os.path.getsize(src)

            img = Image.open(src)
            # 保留透明通道
            if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                img = img.convert('RGBA')
            else:
                img = img.convert('RGB')

            img.save(dst, 'webp', quality=85, method=6)
            after = os.path.getsize(dst)
            os.remove(src)

            total_before += before
            total_after += after
            count += 1

            ratio = (1 - after / before) * 100 if before > 0 else 0
            rel = os.path.relpath(src, ROOT)
            print(f'  {rel}: {before / 1024:.0f}KB -> {after / 1024:.0f}KB (-{ratio:.0f}%)')

    print(f'\n  转换完成: {count} 个文件')
    print(f'  总体积: {total_before / 1024 / 1024:.1f}MB -> {total_after / 1024 / 1024:.1f}MB')
    print(f'  减少: {total_before / 1024 / 1024 - total_after / 1024 / 1024:.1f}MB '
          f'({(1 - total_after / total_before) * 100:.0f}%)')


def update_references():
    """将 css/js/index.html 中的 .png/.jpg/.jpeg 引用替换为 .webp"""
    targets = [os.path.join(ROOT, 'index.html')]

    for subdir in ['css', 'js']:
        d = os.path.join(ROOT, subdir)
        for root, dirs, files in os.walk(d):
            for f in files:
                if f.endswith(('.css', '.js')):
                    targets.append(os.path.join(root, f))

    # 只替换扩展名，不碰 .mp4 等
    pattern = re.compile(r'\.(png|jpg|jpeg)\b', re.IGNORECASE)
    updated = 0

    for filepath in targets:
        if not os.path.exists(filepath):
            continue
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        new_content = pattern.sub('.webp', content)

        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            rel = os.path.relpath(filepath, ROOT)
            print(f'  更新引用: {rel}')
            updated += 1

    print(f'\n  引用更新完成: {updated} 个文件')


if __name__ == '__main__':
    print('=== 图片压缩 (PNG/JPG -> WebP) ===\n')
    convert_images()
    print('\n=== 更新代码引用 ===\n')
    update_references()
    print('\n完成！')
