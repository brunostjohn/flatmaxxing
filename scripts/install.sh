#!/bin/sh
set -eu

# Installs the latest flatmaxx release into ~/.local/bin (override with
# FLATMAXX_INSTALL_DIR). Pin a version with FLATMAXX_VERSION=1.2.3.
#
#   curl -fsSL https://raw.githubusercontent.com/brunostjohn/flatmaxxing/main/scripts/install.sh | sh

REPO="brunostjohn/flatmaxxing"
BIN_NAME="flatmaxx"
ASSET="flatmaxx-darwin-arm64"
INSTALL_DIR="${FLATMAXX_INSTALL_DIR:-$HOME/.local/bin}"

err() { printf '%s\n' "$*" >&2; }

os="$(uname -s)"
arch="$(uname -m)"
if [ "$os" != "Darwin" ] || [ "$arch" != "arm64" ]; then
  err "flatmaxx only ships a macOS arm64 (Apple Silicon) binary."
  err "Detected: $os $arch."
  exit 1
fi

if [ -n "${FLATMAXX_VERSION:-}" ]; then
  base="https://github.com/$REPO/releases/download/v${FLATMAXX_VERSION#v}"
else
  base="https://github.com/$REPO/releases/latest/download"
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

printf 'Downloading %s...\n' "$ASSET"
curl -fsSL "$base/$ASSET" -o "$tmp/$ASSET"
curl -fsSL "$base/$ASSET.sha256" -o "$tmp/$ASSET.sha256"

printf 'Verifying checksum...\n'
( cd "$tmp" && shasum -a 256 -c "$ASSET.sha256" >/dev/null )

mkdir -p "$INSTALL_DIR"
install -m 0755 "$tmp/$ASSET" "$INSTALL_DIR/$BIN_NAME"
xattr -d com.apple.quarantine "$INSTALL_DIR/$BIN_NAME" 2>/dev/null || true

printf 'Installed flatmaxx to %s/%s\n' "$INSTALL_DIR" "$BIN_NAME"

case ":$PATH:" in
  *":$INSTALL_DIR:"*)
    printf 'Run `flatmaxx --version` to get started.\n'
    ;;
  *)
    err ""
    err "WARNING: $INSTALL_DIR is not on your PATH."
    err "Add it by appending this line to ~/.zshrc (macOS default shell):"
    err ""
    err "    export PATH=\"$INSTALL_DIR:\$PATH\""
    err ""
    err "Then restart your terminal or run: source ~/.zshrc"
    err "(bash: use ~/.bashrc; fish: run \`fish_add_path $INSTALL_DIR\`)"
    ;;
esac
