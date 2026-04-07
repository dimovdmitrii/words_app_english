import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const SRC_ICON = path.resolve(ROOT, 'public', 'favicon.png')
const RES_DIR = path.resolve(ROOT, 'android', 'app', 'src', 'main', 'res')
const BG_COLOR = '#0f172a'

const LEGACY_SIZES = [
  ['mipmap-mdpi', 48],
  ['mipmap-hdpi', 72],
  ['mipmap-xhdpi', 96],
  ['mipmap-xxhdpi', 144],
  ['mipmap-xxxhdpi', 192]
]

const ADAPTIVE_FOREGROUND_SIZES = [
  ['mipmap-mdpi', 108],
  ['mipmap-hdpi', 162],
  ['mipmap-xhdpi', 216],
  ['mipmap-xxhdpi', 324],
  ['mipmap-xxxhdpi', 432]
]

const PNG_OPTIONS = {
  compressionLevel: 9,
  adaptiveFiltering: true,
  effort: 10
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function generateLegacyIcon(size, outPath) {
  await sharp(SRC_ICON)
    .resize(size, size, { fit: 'contain' })
    .png(PNG_OPTIONS)
    .toFile(outPath)
}

async function generateAdaptiveForeground(size, outPath) {
  // 72x72dp "safe zone" inside full 108x108 adaptive canvas.
  const safeZone = Math.round(size * (72 / 108))
  const pad = Math.floor((size - safeZone) / 2)
  const safeLayer = await sharp(SRC_ICON)
    .resize(safeZone, safeZone, { fit: 'contain' })
    .png(PNG_OPTIONS)
    .toBuffer()

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 }
    }
  })
    .composite([{ input: safeLayer, left: pad, top: pad }])
    .png(PNG_OPTIONS)
    .toFile(outPath)
}

async function run() {
  for (const [folder, size] of LEGACY_SIZES) {
    const outDir = path.join(RES_DIR, folder)
    await ensureDir(outDir)
    await generateLegacyIcon(size, path.join(outDir, 'ic_launcher.png'))
    await generateLegacyIcon(size, path.join(outDir, 'ic_launcher_round.png'))
  }

  for (const [folder, size] of ADAPTIVE_FOREGROUND_SIZES) {
    const outDir = path.join(RES_DIR, folder)
    await ensureDir(outDir)
    await generateAdaptiveForeground(size, path.join(outDir, 'ic_launcher_foreground.png'))
  }

  console.log(`Android icons generated from ${SRC_ICON} (bg ${BG_COLOR}).`)
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
