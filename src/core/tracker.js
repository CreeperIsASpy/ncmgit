const path = require('path')
const repo = require('./repo')
const { listMusicFiles, readMusicFile } = require('../utils/file')

function getFileKey(filename) {
  const data = filename
  return data
}

function diffRepository(rootDir) {
  const index = repo.loadIndex(rootDir)
  const head = repo.loadHead(rootDir)
  const existingObjects = repo.listObjects(rootDir)

  const indexFiles = new Set(index.map(f => typeof f === 'string' ? f : f.file))
  const headFiles = new Set(existingObjects)

  const workingFiles = new Set(listMusicFiles(rootDir))

  const staged = []
  const unstaged = []
  const untracked = []

  for (const f of workingFiles) {
    const data = readMusicFile(rootDir, f)
    if (!data) continue

    if (indexFiles.has(f)) {
      staged.push({ file: f, status: 'staged' })
    } else if (headFiles.has(String(data.nid))) {
      const obj = repo.readObject(rootDir, data.nid)
      if (JSON.stringify(obj) !== JSON.stringify(data)) {
        unstaged.push({ file: f, status: 'modified' })
      }
    } else {
      untracked.push({ file: f, status: 'untracked' })
    }
  }

  for (const f of indexFiles) {
    if (!workingFiles.has(f)) {
      staged.push({ file: f, status: 'deleted' })
    }
  }

  return { staged, unstaged, untracked, head }
}

function stageFile(rootDir, filepath) {
  const filename = path.basename(filepath)
  const data = readMusicFile(rootDir, filename)
  if (!data) {
    throw new Error(`无法读取或解析歌曲文件: ${filename}`)
  }

  const index = repo.loadIndex(rootDir)
  const entry = { file: filename, nid: data.nid || null, name: data.name || '' }

  const existingIdx = index.findIndex(f =>
    (typeof f === 'string' ? f : f.file) === filename
  )
  if (existingIdx >= 0) {
    index[existingIdx] = entry
  } else {
    index.push(entry)
  }

  repo.saveIndex(rootDir, index)
}

function stageAll(rootDir) {
  const files = listMusicFiles(rootDir)
  for (const f of files) {
    stageFile(rootDir, f)
  }
}

function unstageFile(rootDir, filepath) {
  const filename = path.basename(filepath)
  const index = repo.loadIndex(rootDir)
  const newIndex = index.filter(f =>
    (typeof f === 'string' ? f : f.file) !== filename
  )
  repo.saveIndex(rootDir, newIndex)
}

function commitStaged(rootDir, message) {
  const index = repo.loadIndex(rootDir)
  if (index.length === 0) {
    throw new Error('没有暂存的变更可以提交')
  }

  for (const entry of index) {
    const nid = typeof entry === 'string' ? entry : entry.nid
    const file = typeof entry === 'string' ? entry : entry.file
    if (!nid) continue

    const data = readMusicFile(rootDir, file)
    if (data) {
      repo.writeObject(rootDir, nid, data)
    }
  }

  repo.clearIndex(rootDir)
}

module.exports = {
  diffRepository,
  stageFile,
  stageAll,
  unstageFile,
  commitStaged,
}
