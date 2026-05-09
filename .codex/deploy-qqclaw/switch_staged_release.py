from datetime import datetime, timezone
from pathlib import Path


root = Path("/opt/qqclaw")
api = root / "api"
stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")

required = [
    root / "web.next" / "index.html",
    api / "src.next" / "server.js",
    api / "src.next" / "db.js",
    api / "src.next" / "aiAdapter.js",
    api / "src.next" / "imageAdapter.js",
    api / "package.json.next",
]

missing = [path for path in required if not path.exists()]
if missing:
    raise SystemExit("Missing staged files: " + ", ".join(str(path) for path in missing))

renames = [
    (root / "web", root / f"web.prev-{stamp}"),
    (root / "web.next", root / "web"),
    (api / "src", api / f"src.prev-{stamp}"),
    (api / "src.next", api / "src"),
    (api / "package.json", api / f"package.json.prev-{stamp}"),
    (api / "package.json.next", api / "package.json"),
]

for source, target in renames:
    if source.exists():
        if target.exists():
            raise SystemExit(f"Refusing to overwrite existing target: {target}")
        source.rename(target)
        print(f"renamed {source} -> {target}")

print(f"switched {stamp}")
