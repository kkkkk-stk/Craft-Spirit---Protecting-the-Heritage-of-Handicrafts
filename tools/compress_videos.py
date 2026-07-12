#!/usr/bin/env python3
"""
视频压缩工具：用 ffmpeg 将 CG 视频压缩为 720p + 2.5Mbps H.264
用法: python tools/compress_videos.py
"""
import os
import subprocess
import shutil
import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CG_DIR = os.path.join(ROOT, 'assets', 'cg')

# ffmpeg 压缩参数（720p + CRF 24，画质清晰体积小）
FFMPEG_ARGS = [
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '32',
    '-maxrate', '0.8M',
    '-bufsize', '1.6M',
    '-vf', "scale='min(854,iw)':-2",
    '-c:a', 'aac',
    '-b:a', '64k',
    '-movflags', '+faststart',
    '-y',
]


def find_ffmpeg():
    """查找 ffmpeg 可执行文件"""
    # 优先使用 imageio-ffmpeg 包（自带 ffmpeg 二进制）
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        pass
    # 检查 PATH
    if shutil.which('ffmpeg'):
        return 'ffmpeg'
    return None


def compress_videos():
    ffmpeg = find_ffmpeg()
    if not ffmpeg:
        print('错误: 找不到 ffmpeg，请先安装 (winget install Gyan.FFmpeg)')
        return

    print(f'使用 ffmpeg: {ffmpeg}')

    total_before = 0
    total_after = 0
    count = 0

    for root, dirs, files in os.walk(CG_DIR):
        for f in files:
            if not f.lower().endswith('.mp4'):
                continue

            src = os.path.join(root, f)
            tmp = os.path.join(root, '._compressed_tmp.mp4')

            before = os.path.getsize(src)
            total_before += before

            rel = os.path.relpath(src, ROOT)
            print(f'\n压缩: {rel}')
            print(f'  原始: {before / 1024 / 1024:.1f} MB')

            cmd = [ffmpeg, '-i', src] + FFMPEG_ARGS + [tmp]
            result = subprocess.run(cmd, capture_output=True, text=True)

            if result.returncode != 0:
                print(f'  错误: 压缩失败')
                print(f'  {result.stderr[-300:]}')
                if os.path.exists(tmp):
                    os.remove(tmp)
                continue

            after = os.path.getsize(tmp)
            total_after += after
            count += 1

            # 替换原文件
            os.remove(src)
            os.rename(tmp, src)

            ratio = (1 - after / before) * 100 if before > 0 else 0
            print(f'  压缩后: {after / 1024 / 1024:.1f} MB (-{ratio:.0f}%)')

    print(f'\n{"="*40}')
    print(f'压缩完成: {count} 个视频')
    if total_before > 0:
        print(f'总体积: {total_before / 1024 / 1024:.1f} MB -> {total_after / 1024 / 1024:.1f} MB')
        print(f'减少: {total_before / 1024 / 1024 - total_after / 1024 / 1024:.1f} MB '
              f'({(1 - total_after / total_before) * 100:.0f}%)')


if __name__ == '__main__':
    print('=== 视频压缩 (720p + 2.5Mbps H.264) ===\n')
    compress_videos()
