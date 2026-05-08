from datetime import datetime, timezone
from pathlib import Path


stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
root = Path("/opt/qqclaw")

for source, target in (
    (root / "web.prev-", root / f"web.prev-{stamp}"),
    (root / "api" / "src.prev-", root / "api" / f"src.prev-{stamp}"),
    (
        root / "api" / "package.json.prev-",
        root / "api" / f"package.json.prev-{stamp}",
    ),
):
    if source.exists() and not target.exists():
        source.rename(target)
        print(f"renamed {source} -> {target}")
