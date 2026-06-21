const fs = require('fs')
const path = require('path')

function findNcmgitRoot(startDir) {
  let dir = path.resolve(startDir || process.cwd())
  while (true) {
    const ncmgitPath = path.join(dir, '.ncmgit')
    if (fs.existsSync(ncmgitPath) && fs.statSync(ncmgitPath).isDirectory()) {
      return dir
    }
    const parent = path.dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

function requireNcmgitRoot() {
  const root = findNcmgitRoot()
  if (!root) {
    throw new Error('fatal: not a ncmgit repository (or any of the parent directories): .ncmgit')
  }
  return root
}

function isMusicFile(filepath) {
  const ext = path.extname(filepath).toLowerCase()
  return ext === '.json'
}

function listMusicFiles(dir) {
  const files = []
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (fs.statSync(full).isFile() && isMusicFile(entry) && !entry.startsWith('.')) {
      files.push(entry)
    }
  }
  return files.sort()
}

function readMusicFile(dir, filename) {
  const filepath = path.join(dir, filename)
  if (!fs.existsSync(filepath)) return null
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'))
  } catch {
    return null
  }
}

function writeMusicFile(dir, filename, data) {
  const filepath = path.join(dir, filename)
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n')
}

function sanitizeFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_')
}

module.exports = {
  findNcmgitRoot,
  requireNcmgitRoot,
  isMusicFile,
  listMusicFiles,
  readMusicFile,
  writeMusicFile,
  sanitizeFilename,
}
