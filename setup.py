#!/usr/bin/env python3
"""Cross-platform setup script for the robo-advisor project."""

import subprocess
import sys
import shutil
from pathlib import Path

ROOT = Path(__file__).parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
VENV = BACKEND / "venv"

# On Windows the venv binaries live in Scripts/, elsewhere in bin/
BIN = "Scripts" if sys.platform == "win32" else "bin"
PYTHON = VENV / BIN / ("python.exe" if sys.platform == "win32" else "python")
PIP = VENV / BIN / ("pip.exe" if sys.platform == "win32" else "pip")


def run(cmd, **kwargs):
    print(f"  $ {' '.join(str(c) for c in cmd)}")
    subprocess.run(cmd, check=True, **kwargs)


def setup_backend():
    print("\n── Backend ──────────────────────────────────────────────────────")
    if not VENV.exists():
        run([sys.executable, "-m", "venv", str(VENV)])
        print(f"  Created virtual environment at {VENV.relative_to(ROOT)}")

    run([str(PIP), "install", "--upgrade", "pip", "-q"])
    run([str(PIP), "install", "-r", str(BACKEND / "requirements.txt")])
    print("  Backend packages installed.")


def setup_frontend():
    print("\n── Frontend ─────────────────────────────────────────────────────")
    if not shutil.which("node"):
        print("  ERROR: Node.js not found. Install it from https://nodejs.org and re-run.")
        sys.exit(1)

    run(["npm", "install"], cwd=str(FRONTEND))
    print("  Frontend packages installed.")


def print_next_steps():
    activate = (
        r"backend\venv\Scripts\activate"
        if sys.platform == "win32"
        else "source backend/venv/bin/activate"
    )
    print("\n── Done ─────────────────────────────────────────────────────────")
    print("\nTo start the backend:")
    print(f"  {activate}")
    print("  cd backend && python app.py")
    print("\nTo start the frontend:")
    print("  cd frontend && npm run dev")


if __name__ == "__main__":
    setup_backend()
    setup_frontend()
    print_next_steps()
