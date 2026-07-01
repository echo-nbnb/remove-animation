from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import socket


ROOT = Path(__file__).resolve().parent
PF_ROOT = ROOT.parent
MODEL_ROOT = PF_ROOT / "model"
THREE_ROOT = PF_ROOT / "html_part" / "node_modules" / "three"
PIC_ROOT = PF_ROOT / "PIC"
VED_ROOT = PF_ROOT / "ved"


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".glb": "model/gltf-binary",
        ".gltf": "model/gltf+json",
        ".js": "text/javascript",
        ".json": "application/json",
        ".mov": "video/quicktime",
        ".webm": "video/webm",
        ".mp4": "video/mp4",
    }

    def translate_path(self, path):
        clean = path.split("?", 1)[0].split("#", 1)[0]
        if clean.startswith("/model/"):
            return str((MODEL_ROOT / clean.removeprefix("/model/")).resolve())
        if clean.startswith("/three/"):
            return str((THREE_ROOT / clean.removeprefix("/three/")).resolve())
        if clean.startswith("/pic/"):
            return str((PIC_ROOT / clean.removeprefix("/pic/")).resolve())
        if clean.startswith("/ved/"):
            return str((VED_ROOT / clean.removeprefix("/ved/")).resolve())
        return str((ROOT / clean.lstrip("/")).resolve())

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format, *args):
        print(format % args)


def find_port(start=8013):
    for port in range(start, start + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            if sock.connect_ex(("127.0.0.1", port)) != 0:
                return port
    raise RuntimeError("No free local port found.")


if __name__ == "__main__":
    os.chdir(ROOT)
    port = find_port()
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"ReMove v2 particle demo: http://127.0.0.1:{port}")
    server.serve_forever()
