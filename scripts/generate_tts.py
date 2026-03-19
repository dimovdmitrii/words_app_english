import json
import os
import time
from pathlib import Path
from urllib.parse import quote

from gtts import gTTS


ROOT = Path(__file__).resolve().parents[1]
WORDS_PATH = ROOT / "public" / "words.json"
SOUNDS_DIR = ROOT / "public" / "sounds"


def audio_filename(word: str) -> str:
    return f"{quote(word.strip(), safe='')}.mp3"


def main() -> None:
    if not WORDS_PATH.exists():
        raise FileNotFoundError(f"words file not found: {WORDS_PATH}")

    SOUNDS_DIR.mkdir(parents=True, exist_ok=True)

    with WORDS_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise ValueError("public/words.json must be an array")

    generated = 0
    skipped = 0

    for item in data:
        word = str(item.get("german", "")).strip()
        if not word:
            skipped += 1
            continue

        out_path = SOUNDS_DIR / audio_filename(word)
        if out_path.exists():
            skipped += 1
            continue

        tts = gTTS(text=word, lang="en")
        tts.save(str(out_path))
        generated += 1
        print(f"generated: {word}")
        # Small delay to avoid aggressive throttling from provider.
        time.sleep(0.15)

    print(f"done: generated={generated}, skipped={skipped}, total={len(data)}")


if __name__ == "__main__":
    main()
