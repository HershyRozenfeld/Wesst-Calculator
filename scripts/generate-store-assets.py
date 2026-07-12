from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "chrome-store-assets"
ICON_DIR = ASSET_DIR / "icons"
SCREENSHOT_DIR = ASSET_DIR / "screenshots"
SOURCE_ICON = ROOT / "scripts" / "icon-source.png"
EXTENSION_ICON_DIR = ROOT / "extension" / "public" / "icons"

NAVY = "#1E3A5F"
NAVY_DARK = "#142B49"
BLUE = "#70A7E6"
GOLD = "#F0B44D"
RED = "#D9272E"
WHITE = "#FFFFFF"
MUTED = "#D8E7F5"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "arialbd.ttf" if bold else "arial.ttf"
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), size=size)


def rtl_visual(text: str) -> str:
    # Pillow on the build machine has no libraqm; reversing simple Hebrew text
    # preserves the intended right-to-left visual order without extra packages.
    return text[::-1]


def resize_contain(source: Image.Image, size: tuple[int, int]) -> Image.Image:
    image = source.copy()
    image.thumbnail(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    x = (size[0] - image.width) // 2
    y = (size[1] - image.height) // 2
    canvas.alpha_composite(image, (x, y))
    return canvas


def create_icons(source: Image.Image) -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    EXTENSION_ICON_DIR.mkdir(parents=True, exist_ok=True)

    for size in (16, 32, 48):
        icon = resize_contain(source, (size, size))
        icon.save(ICON_DIR / f"icon-{size}.png", optimize=True)
        icon.save(EXTENSION_ICON_DIR / f"icon-{size}.png", optimize=True)

    # Chrome Web Store asks for 96px artwork centered in a 128px transparent canvas.
    artwork = resize_contain(source, (96, 96))
    store_icon = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    store_icon.alpha_composite(artwork, (16, 16))
    store_icon.save(ICON_DIR / "icon-128.png", optimize=True)
    store_icon.save(EXTENSION_ICON_DIR / "icon-128.png", optimize=True)


def draw_background(size: tuple[int, int]) -> Image.Image:
    image = Image.new("RGB", size, NAVY)
    draw = ImageDraw.Draw(image, "RGBA")
    width, height = size

    for x in range(0, width, max(44, width // 18)):
        draw.line((x, 0, x, height), fill=(255, 255, 255, 13), width=1)
    for y in range(0, height, max(44, height // 9)):
        draw.line((0, y, width, y), fill=(255, 255, 255, 13), width=1)

    draw.rectangle((0, 0, max(10, width // 70), height), fill=RED)
    draw.rectangle((0, height - max(8, height // 70), width, height), fill=(240, 180, 77, 235))
    return image


def add_icon_with_shadow(canvas: Image.Image, icon: Image.Image, box: tuple[int, int, int, int]) -> None:
    x, y, width, height = box
    resized = resize_contain(icon, (width, height))
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    alpha = resized.getchannel("A").filter(ImageFilter.GaussianBlur(radius=max(3, width // 40)))
    shadow_layer = Image.new("RGBA", resized.size, (4, 15, 30, 150))
    shadow_layer.putalpha(alpha.point(lambda value: int(value * 0.55)))
    shadow.alpha_composite(shadow_layer, (x + max(4, width // 35), y + max(7, height // 28)))
    canvas.paste(shadow, (0, 0), shadow)
    canvas.paste(resized, (x, y), resized)


def create_small_promo(source: Image.Image) -> None:
    canvas = draw_background((440, 280)).convert("RGBA")
    draw = ImageDraw.Draw(canvas, "RGBA")
    draw.rounded_rectangle((82, 28, 358, 252), radius=34, fill=(9, 28, 52, 72), outline=(255, 255, 255, 30), width=2)
    add_icon_with_shadow(canvas, source, (132, 42, 176, 176))
    draw.ellipse((83, 63, 103, 83), fill=GOLD)
    draw.ellipse((337, 198, 353, 214), fill=BLUE)
    canvas.convert("RGB").save(ASSET_DIR / "promo-small-440x280.png", optimize=True)


def create_marquee(source: Image.Image) -> None:
    canvas = draw_background((1400, 560)).convert("RGBA")
    draw = ImageDraw.Draw(canvas, "RGBA")
    draw.rectangle((815, 0, 1400, 560), fill=(8, 28, 52, 65))
    add_icon_with_shadow(canvas, source, (920, 90, 380, 380))

    title = "מחשבון ווסתות"
    subtitle = "לוח עברי, חישוב ימי פרישה, גיבוי ותזכורות"
    draw.text((735, 205), rtl_visual(title), fill=WHITE, font=font(64, bold=True), anchor="ra")
    draw.text((735, 300), rtl_visual(subtitle), fill=MUTED, font=font(31), anchor="ra")
    draw.line((235, 355, 735, 355), fill=GOLD, width=6)
    canvas.convert("RGB").save(ASSET_DIR / "promo-marquee-1400x560.png", optimize=True)


def normalize_screenshots() -> list[Path]:
    screenshots = sorted(SCREENSHOT_DIR.glob("*.png"))
    for path in screenshots:
        image = Image.open(path).convert("RGB")
        if image.size != (1280, 800):
            image = image.resize((1280, 800), Image.Resampling.LANCZOS)
        image.save(path, optimize=True)
    return screenshots


def create_contact_sheet(screenshots: list[Path]) -> None:
    thumbs: list[tuple[str, Image.Image]] = []
    for path in screenshots:
        image = Image.open(path).convert("RGB")
        image.thumbnail((480, 300), Image.Resampling.LANCZOS)
        thumbs.append((path.stem, image.copy()))

    for filename in ("promo-small-440x280.png", "promo-marquee-1400x560.png"):
        path = ASSET_DIR / filename
        image = Image.open(path).convert("RGB")
        image.thumbnail((480, 300), Image.Resampling.LANCZOS)
        thumbs.append((path.stem, image.copy()))

    rows = (len(thumbs) + 1) // 2
    sheet = Image.new("RGB", (1040, rows * 360 + 40), "#EEF2F6")
    draw = ImageDraw.Draw(sheet)
    for index, (label, image) in enumerate(thumbs):
        column = index % 2
        row = index // 2
        x = 30 + column * 510
        y = 30 + row * 360
        draw.rounded_rectangle((x, y, x + 480, y + 325), radius=8, fill="white", outline="#CBD5E1", width=2)
        image_x = x + (480 - image.width) // 2
        image_y = y + 10 + (290 - image.height) // 2
        sheet.paste(image, (image_x, image_y))
        draw.text((x + 18, y + 300), label, fill="#27364A", font=font(16, bold=True))
    sheet.save(ASSET_DIR / "preview-contact-sheet.png", optimize=True)


def main() -> None:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE_ICON).convert("RGBA")
    create_icons(source)
    create_small_promo(source)
    create_marquee(source)
    screenshots = normalize_screenshots()
    create_contact_sheet(screenshots)


if __name__ == "__main__":
    main()
