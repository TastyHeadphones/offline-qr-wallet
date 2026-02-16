#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
IMAGE_GEN="$CODEX_HOME/skills/imagegen/scripts/image_gen.py"
OUTPUT_PATH="$ROOT_DIR/ios/OfflineQRWallet/Resources/AppIcon/offline-qr-wallet-icon.png"

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  echo "OPENAI_API_KEY is not set. Export it first." >&2
  exit 1
fi

python3 "$IMAGE_GEN" generate \
  --prompt "Use case: logo-brand. Asset type: iOS app icon. Primary request: clean modern icon for an offline QR wallet app. Scene/background: flat background. Subject: stylized wallet with integrated QR corner motif and secure shield notch. Style/medium: minimal vector-like, high contrast, enterprise style. Composition/framing: centered symbol, no text, no letters, no numbers. Lighting/mood: crisp and neutral. Color palette: deep navy, cyan accent, white highlights. Constraints: no watermark, no trademark logos, simple silhouette readable at small sizes. Avoid: photorealism, clutter, gradients with too many stops." \
  --size 1024x1024 \
  --quality high \
  --output-format png \
  --out "$OUTPUT_PATH"

echo "Icon generated at $OUTPUT_PATH"
