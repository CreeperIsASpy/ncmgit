const fs = require('fs')
const path = require('path')

const NCMGIT_DIR = '.ncmgit'

function initRepo(dir) {
  const ncmgitPath = path.join(dir, NCMGIT_DIR)
  if (fs.existsSync(ncmgitPath)) {
    throw new Error('已存在 ncmgit 仓库')
  }

  fs.mkdirSync(ncmgitPath)
  fs.mkdirSync(path.join(ncmgitPath, 'objects'))
  fs.writeFileSync(path.join(ncmgitPath, 'HEAD'), '')
  fs.writeFileSync(path.join(ncmgitPath, 'index'), '[]')
  fs.writeFileSync(path.join(ncmgitPath, 'ORDER'), '[]\n')
  fs.writeFileSync(path.join(ncmgitPath, 'config'), JSON.stringify({
    remote: { playlistId: null, playlistName: null },
  }, null, 2))

  return ncmgitPath
}

function loadConfig(rootDir) {
  const configPath = path.join(rootDir, NCMGIT_DIR, 'config')
  if (!fs.existsSync(configPath)) return null
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
}

function saveConfig(rootDir, config) {
  const configPath = path.join(rootDir, NCMGIT_DIR, 'config')
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
}

function loadHead(rootDir) {
  const headPath = path.join(rootDir, NCMGIT_DIR, 'HEAD')
  if (!fs.existsSync(headPath)) return ''
  return fs.readFileSync(headPath, 'utf-8').trim()
}

function saveHead(rootDir, playlistId) {
  const headPath = path.join(rootDir, NCMGIT_DIR, 'HEAD')
  fs.writeFileSync(headPath, String(playlistId))
}

function loadIndex(rootDir) {
  const indexPath = path.join(rootDir, NCMGIT_DIR, 'index')
  if (!fs.existsSync(indexPath)) return []
  return JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
}

function saveIndex(rootDir, index) {
  const indexPath = path.join(rootDir, NCMGIT_DIR, 'index')
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2))
}

function clearIndex(rootDir) {
  saveIndex(rootDir, [])
}

function writeObject(rootDir, id, data) {
  const hash = String(id)
  const dirName = hash.substring(0, 2)
  const fileName = hash.substring(2)
  const dirPath = path.join(rootDir, NCMGIT_DIR, 'objects', dirName)
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
  fs.writeFileSync(path.join(dirPath, fileName), JSON.stringify(data, null, 2))
}

function readObject(rootDir, id) {
  const hash = String(id)
  const dirName = hash.substring(0, 2)
  const fileName = hash.substring(2)
  const filePath = path.join(rootDir, NCMGIT_DIR, 'objects', dirName, fileName)
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function loadOrder(rootDir) {
  const orderPath = path.join(rootDir, NCMGIT_DIR, 'ORDER')
  if (!fs.existsSync(orderPath)) return []
  return JSON.parse(fs.readFileSync(orderPath, 'utf-8'))
}

function saveOrder(rootDir, order) {
  const orderPath = path.join(rootDir, NCMGIT_DIR, 'ORDER')
  fs.writeFileSync(orderPath, JSON.stringify(order, null, 2) + '\n')
}

function listObjects(rootDir) {
  const objects = []
  const objectsDir = path.join(rootDir, NCMGIT_DIR, 'objects')
  if (!fs.existsSync(objectsDir)) return objects

  for (const dirEntry of fs.readdirSync(objectsDir)) {
    const dirPath = path.join(objectsDir, dirEntry)
    if (fs.statSync(dirPath).isDirectory()) {
      for (const fileEntry of fs.readdirSync(dirPath)) {
        objects.push(dirEntry + fileEntry)
      }
    }
  }
  return objects
}

module.exports = {
  NCMGIT_DIR,
  initRepo,
  loadConfig,
  saveConfig,
  loadHead,
  saveHead,
  loadIndex,
  saveIndex,
  clearIndex,
  writeObject,
  readObject,
  listObjects,
  loadOrder,
  saveOrder,
}
