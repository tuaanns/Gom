import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from pathlib import Path

p = Path("dataset/val")
total = 0
for d in sorted(p.iterdir()):
    if d.is_dir():
        count = len([f for f in d.iterdir() if f.suffix.lower() in (".jpg", ".jpeg", ".png")])
        total += count
        print(f"  {d.name}: {count} images")
print(f"\nTotal: {total} images across {len([d for d in p.iterdir() if d.is_dir()])} classes")
