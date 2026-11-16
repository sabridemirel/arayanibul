"""One-off: normalize photos uploaded before the server started doing it itself.

For every JPEG/PNG/WebP under the uploads volume:
  * applies the EXIF orientation to the pixels (iOS otherwise lays rotated photos out at the
    wrong aspect ratio in the full-screen viewer),
  * drops all metadata (GPS location, device model, capture time).

File names and formats stay the same, so the URLs stored in the database keep working.
Dry run by default; pass --apply to rewrite files. Take a backup first (deploy/backup.sh).

Run on the server:
  docker run --rm -v arayanibul_uploads:/data -v "$PWD/scripts:/s:ro" python:3.12-alpine \
    sh -c "pip install -q pillow==11.0.0 && python /s/normalize_uploads.py /data [--apply]"
"""
import os
import sys

from PIL import Image, ImageOps

EXT_FORMAT = {".jpg": "JPEG", ".jpeg": "JPEG", ".png": "PNG", ".webp": "WEBP"}
ORIENTATION = 0x0112
GPS_IFD = 0x8825


def needs_fix(im: Image.Image) -> tuple[bool, list[str]]:
    exif = im.getexif()
    reasons = []
    if exif.get(ORIENTATION, 1) != 1:
        reasons.append(f"orientation={exif.get(ORIENTATION)}")
    if exif.get_ifd(GPS_IFD):
        reasons.append("gps")
    if len(exif) > 0 and not reasons:
        reasons.append("exif")
    return bool(reasons), reasons


def main() -> None:
    root = sys.argv[1]
    apply = "--apply" in sys.argv
    checked = fixed = failed = 0
    for dirpath, _, files in os.walk(root):
        for name in files:
            fmt = EXT_FORMAT.get(os.path.splitext(name)[1].lower())
            if not fmt:
                continue
            path = os.path.join(dirpath, name)
            checked += 1
            try:
                with Image.open(path) as im:
                    im.load()
                    fix, reasons = needs_fix(im)
                    if not fix:
                        continue
                    print(f"{'FIX ' if apply else 'WOULD FIX '}{os.path.relpath(path, root)}: {', '.join(reasons)}")
                    fixed += 1
                    if not apply:
                        continue
                    out = ImageOps.exif_transpose(im)
                    out.info.pop("exif", None)
                    if fmt == "JPEG" and out.mode not in ("RGB", "L"):
                        out = out.convert("RGB")
                    tmp = path + ".tmp"
                    save_args = {"quality": 90} if fmt in ("JPEG", "WEBP") else {}
                    out.save(tmp, fmt, **save_args)  # no exif= argument: metadata is dropped
                os.replace(tmp, path)
            except Exception as exc:  # keep going; report at the end
                failed += 1
                print(f"ERROR {path}: {exc}")
    print(f"checked={checked} {'fixed' if apply else 'to_fix'}={fixed} errors={failed}")


if __name__ == "__main__":
    main()
