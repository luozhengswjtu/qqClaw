from datetime import datetime, timezone
from pathlib import Path


target = Path("/opt/mycontent/Caddyfile")
snippet = Path("/opt/qqclaw/Caddyfile.qqclaw.snippet")

target_bytes = target.read_bytes()
snippet_bytes = snippet.read_bytes()

for name, data in (("Caddyfile", target_bytes), ("snippet", snippet_bytes)):
    if data.startswith(b"\xef\xbb\xbf"):
        raise SystemExit(f"Refuse to modify {name} with BOM")
    if b"\r" in data:
        raise SystemExit(f"Refuse to modify {name} with CR line endings")
    if any(byte >= 128 for byte in data):
        raise SystemExit(f"Refuse to modify non-ASCII {name}")

if b"qqclaw.xiaobinke.com" in target_bytes:
    print("qqclaw block already present")
else:
    backup = Path(
        "/opt/mycontent/Caddyfile.bak-qqclaw-"
        + datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    )
    backup.write_bytes(target_bytes)
    target.write_bytes(target_bytes + snippet_bytes)
    print(f"updated {backup}")
