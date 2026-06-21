const fs = require('fs')
const path = require('path')
const os = require('os')

const CONFIG_DIR = path.join(os.homedir(), '.config', 'ncmgit')
const AUTH_PATH = path.join(CONFIG_DIR, 'auth.json')
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json')

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

function loadAuth() {
  ensureConfigDir()
  if (fs.existsSync(AUTH_PATH)) {
    return JSON.parse(fs.readFileSync(AUTH_PATH, 'utf-8'))
  }
  return null
}

function saveAuth(data) {
  ensureConfigDir()
  fs.writeFileSync(AUTH_PATH, JSON.stringify(data, null, 2))
}

function loadGlobalConfig() {
  ensureConfigDir()
  if (fs.existsSync(CONFIG_PATH)) {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
  }
  return { apiBase: 'http://localhost:3000' }
}

function saveGlobalConfig(data) {
  ensureConfigDir()
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2))
}

module.exports = {
  CONFIG_DIR,
  AUTH_PATH,
  CONFIG_PATH,
  loadAuth,
  saveAuth,
  loadGlobalConfig,
  saveGlobalConfig,
}
