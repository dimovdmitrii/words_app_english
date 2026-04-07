import fs from 'node:fs/promises'
import path from 'node:path'

const BUILD_GRADLE_PATH = path.resolve('android/app/build.gradle')

function bumpVersionName(versionName) {
  const parts = versionName.split('.')
  if (parts.length === 3 && parts.every((p) => /^\d+$/.test(p))) {
    const [major, minor, patch] = parts.map(Number)
    return `${major}.${minor}.${patch + 1}`
  }
  if (parts.length === 2 && parts.every((p) => /^\d+$/.test(p))) {
    const [major, minor] = parts.map(Number)
    return `${major}.${minor + 1}.0`
  }
  return null
}

async function run() {
  if (process.env.SKIP_ANDROID_BUMP === '1') {
    console.log('SKIP_ANDROID_BUMP=1 set, skipping Android version bump.')
    return
  }

  const raw = await fs.readFile(BUILD_GRADLE_PATH, 'utf8')

  const versionCodeMatch = raw.match(/versionCode\s+(\d+)/)
  if (!versionCodeMatch) {
    throw new Error('Could not find versionCode in android/app/build.gradle')
  }
  const currentCode = Number(versionCodeMatch[1])
  const nextCode = currentCode + 1

  let updated = raw.replace(/versionCode\s+\d+/, `versionCode ${nextCode}`)

  const versionNameMatch = updated.match(/versionName\s+"([^"]+)"/)
  if (!versionNameMatch) {
    throw new Error('Could not find versionName in android/app/build.gradle')
  }
  const currentName = versionNameMatch[1]
  const nextName = bumpVersionName(currentName)

  if (nextName) {
    updated = updated.replace(/versionName\s+"[^"]+"/, `versionName "${nextName}"`)
    console.log(`Android version bumped: code ${currentCode} -> ${nextCode}, name ${currentName} -> ${nextName}`)
  } else {
    console.warn(
      `Warning: versionName "${currentName}" is not x.y or x.y.z; bumped only versionCode ${currentCode} -> ${nextCode}`
    )
  }

  await fs.writeFile(BUILD_GRADLE_PATH, updated, 'utf8')
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
