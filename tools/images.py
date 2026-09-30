#!/usr/bin/env python3
"""
그린파스처 홈페이지 — 이미지 준비 도구
======================================
새 자료(로고 · 사진)가 오면 이 스크립트로 웹용 파일을 만듭니다.
필요한 것: Python 3, Pillow  (설치: pip install pillow numpy)

  1) 사진을 웹용으로 줄이기 (가로 폭 제한 · 용량 최적화 · 방향 보정)
     python3 tools/images.py photo 원본.jpg assets/img/prod-original.jpg --width 1200

  2) 정사각형으로 잘라 저장 (경영진 사진 등)
     python3 tools/images.py square 원본.jpg assets/img/leader-song.jpg --size 800

  3) 어두운 배경 위 로고에서 배경을 투명하게 걷어내기 (원본이 투명 PNG면 필요 없음)
     python3 tools/images.py keyout 로고.jpg assets/img/logo-gp.png

  4) 로고로 파비콘 · 홈 화면 아이콘 다시 만들기 (logo-gp.png 를 바꾼 뒤 실행)
     python3 tools/images.py icons

공유 미리보기 이미지(og-image.jpg)는 tools/make-og.js 로 만듭니다 (tools/README.md 참고).
"""
import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageOps
except ImportError:
    sys.exit("Pillow 가 필요합니다: pip install pillow numpy")

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"
ICON_BG = (10, 16, 32, 255)  # style.css 의 --night-900 과 같은 계열


def save_web(im, out, quality=84):
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.suffix.lower() in (".jpg", ".jpeg"):
        im.convert("RGB").save(out, "JPEG", quality=quality, optimize=True, progressive=True)
    else:
        im.save(out, optimize=True)
    print(f"저장: {out}  ({im.width}×{im.height}, {out.stat().st_size // 1024} KB)")


def cmd_photo(a):
    im = ImageOps.exif_transpose(Image.open(a.src))
    if im.width > a.width:
        im = im.resize((a.width, round(im.height * a.width / im.width)), Image.LANCZOS)
    save_web(im, a.dst, a.quality)


def cmd_square(a):
    im = ImageOps.exif_transpose(Image.open(a.src))
    side = min(im.size)
    # 인물 사진은 얼굴이 위쪽에 있는 경우가 많아 세로로 긴 사진은 위쪽을 기준으로 자릅니다
    left = (im.width - side) // 2
    top = 0 if im.height > im.width else (im.height - side) // 2
    im = im.crop((left, top, left + side, top + side)).resize((a.size, a.size), Image.LANCZOS)
    save_web(im, a.dst, a.quality)


def cmd_keyout(a):
    try:
        import numpy as np
    except ImportError:
        sys.exit("keyout 에는 numpy 가 필요합니다: pip install numpy")
    im = Image.open(a.src).convert("RGB")
    arr = np.asarray(im).astype(float)
    c = np.concatenate([arr[:6, :6].reshape(-1, 3), arr[:6, -6:].reshape(-1, 3),
                        arr[-6:, :6].reshape(-1, 3), arr[-6:, -6:].reshape(-1, 3)])
    bg = c.mean(0)  # 네 모서리 평균을 배경색으로 봅니다
    diff = np.sqrt(((arr - bg) ** 2).sum(2))
    alpha = np.clip((diff - a.low) / (a.high - a.low), 0, 1)
    safe = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.clip((arr - bg * (1 - alpha[..., None])) / safe, 0, 255)
    out = np.dstack([rgb, alpha * 255]).astype("uint8")
    res = Image.fromarray(out, "RGBA")
    bbox = res.getbbox()
    if bbox:
        res = res.crop(bbox)
    print(f"배경색 추정: RGB{tuple(int(v) for v in bg)}")
    save_web(res, a.dst)


def make_icon(mark, size, pad):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(canvas).rounded_rectangle((0, 0, size - 1, size - 1), radius=int(size * 0.22), fill=ICON_BG)
    w = size - 2 * pad
    h = round(mark.height * w / mark.width)
    if h > size - 2 * pad:
        h = size - 2 * pad
        w = round(mark.width * h / mark.height)
    m = mark.resize((w, h), Image.LANCZOS)
    canvas.paste(m, ((size - w) // 2, (size - h) // 2), m)
    return canvas


def cmd_icons(a):
    src = Path(a.logo)
    if not src.exists():
        sys.exit(f"로고 파일이 없습니다: {src}")
    mark = Image.open(src).convert("RGBA")
    bbox = mark.getbbox()
    if bbox:
        mark = mark.crop(bbox)
    for name, size, pad in (("favicon-32.png", 32, 4), ("favicon-64.png", 64, 8), ("apple-touch-icon.png", 180, 26)):
        save_web(make_icon(mark, size, pad), IMG / name)


def main():
    p = argparse.ArgumentParser(description="그린파스처 홈페이지 이미지 준비 도구")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("photo", help="사진을 웹용으로 줄이고 최적화")
    s.add_argument("src"); s.add_argument("dst")
    s.add_argument("--width", type=int, default=1600, help="최대 가로 폭 px (기본 1600)")
    s.add_argument("--quality", type=int, default=84)
    s.set_defaults(func=cmd_photo)

    s = sub.add_parser("square", help="정사각형으로 잘라 저장")
    s.add_argument("src"); s.add_argument("dst")
    s.add_argument("--size", type=int, default=800)
    s.add_argument("--quality", type=int, default=86)
    s.set_defaults(func=cmd_square)

    s = sub.add_parser("keyout", help="어두운 단색 배경을 투명하게")
    s.add_argument("src"); s.add_argument("dst")
    s.add_argument("--low", type=float, default=10, help="이 값 이하 차이는 완전 투명")
    s.add_argument("--high", type=float, default=80, help="이 값 이상 차이는 완전 불투명")
    s.set_defaults(func=cmd_keyout)

    s = sub.add_parser("icons", help="logo-gp.png 로 파비콘 · 홈 화면 아이콘 생성")
    s.add_argument("--logo", default=str(IMG / "logo-gp.png"))
    s.set_defaults(func=cmd_icons)

    a = p.parse_args()
    a.func(a)


if __name__ == "__main__":
    main()
