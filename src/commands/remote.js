const path = require('path')
const repo = require('../core/repo')
const ncm = require('../core/ncm-client')
const { requireNcmgitRoot } = require('../utils/file')

async function remoteCommand(action, value) {
  const rootDir = requireNcmgitRoot()
  const config = repo.loadConfig(rootDir)

  if (!action || action === 'show') {
    const r = (config && config.remote) || {}
    if (r.playlistId) {
      console.log(`remote playlist: ${r.playlistId}`)
    }
    console.log(`  name: ${r.playlistName || '(未设置)'}`)
    console.log(`  desc: ${r.desc || '(未设置)'}`)
    console.log(`  tags: ${r.tags || '(未设置)'}`)
    return
  }

  if (action === 'set') {
    if (!value) {
      throw new Error('请提供歌单 ID: ncmgit remote set <playlist-id>')
    }
    config.remote = {
      playlistId: String(value),
      playlistName: (config && config.remote && config.remote.playlistName) || null,
      desc: (config && config.remote && config.remote.desc) || '',
      tags: (config && config.remote && config.remote.tags) || '',
    }
    repo.saveConfig(rootDir, config)
    repo.saveHead(rootDir, String(value))
    console.log(`远程歌单已设置为: ${value}`)
    return
  }

  if (action === 'name') {
    if (!value) throw new Error('用法: ncmgit remote name <新名称>')
    config.remote.playlistName = value
    repo.saveConfig(rootDir, config)
    console.log(`歌单名称已更新为: ${value}\n运行 ncmgit push 同步到云端`)
    return
  }

  if (action === 'desc') {
    if (value === undefined) throw new Error('用法: ncmgit remote desc <描述>')
    config.remote.desc = value
    repo.saveConfig(rootDir, config)
    console.log(`歌单描述已更新\n运行 ncmgit push 同步到云端`)
    return
  }

  if (action === 'tags') {
    if (value === undefined) throw new Error('用法: ncmgit remote tags <tag1,tag2>')
    config.remote.tags = value
    repo.saveConfig(rootDir, config)
    console.log(`歌单标签已更新为: ${value}\n运行 ncmgit push 同步到云端`)
    return
  }

  if (action === 'create') {
    await remoteCreate(rootDir, config, value)
    return
  }

  if (action === 'delete') {
    await remoteDelete(rootDir, config)
    return
  }

  if (action === 'list') {
    await listUserPlaylists()
    return
  }

  throw new Error(`未知操作: ${action}。可用: show, set, list, create, delete, name, desc, tags`)
}

async function remoteCreate(rootDir, config, name) {
  const loggedIn = await ncm.isLoggedIn()
  if (!loggedIn) throw new Error('未登录，请先运行: ncmgit auth login')

  const playlistName = name || config.remote.playlistName || path.basename(rootDir)
  console.log(`正在创建歌单 "${playlistName}" ...`)

  const result = await ncm.playlistCreate(playlistName, 0)
  if (!result || !result.id) {
    throw new Error(`创建失败: ${(result && result.message) || '未知错误'}`)
  }

  config.remote = {
    playlistId: String(result.id),
    playlistName: playlistName,
    desc: config.remote.desc || '',
    tags: config.remote.tags || '',
  }
  repo.saveConfig(rootDir, config)
  repo.saveHead(rootDir, String(result.id))
  console.log(`已创建远程歌单: ${result.id}`)
}

async function remoteDelete(rootDir, config) {
  const pid = (config && config.remote && config.remote.playlistId)
  if (!pid) throw new Error('未配置远程歌单')

  const readline = require('readline')
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const name = config.remote.playlistName || pid

  const answer = await new Promise(resolve => {
    rl.question(`确认删除远程歌单 "${name}" (${pid})? (输入 yes 确认): `, resolve)
  })
  rl.close()

  if (answer.trim() !== 'yes') {
    console.log('已取消')
    return
  }

  console.log('正在删除...')
  try {
    await ncm.playlistDelete(pid)
    config.remote = { playlistId: null, playlistName: null, desc: '', tags: '' }
    repo.saveConfig(rootDir, config)
    repo.saveHead(rootDir, '')
    console.log('已删除远程歌单')
  } catch (err) {
    console.error(`删除失败: ${err.message}`)
  }
}

async function listUserPlaylists() {
  const loggedIn = await ncm.isLoggedIn()
  if (!loggedIn) {
    throw new Error('未登录，请先运行: ncmgit login')
  }

  const accountInfo = await ncm.getAccountInfo()
  if (!accountInfo || !accountInfo.account || !accountInfo.account.id) {
    throw new Error('获取账户信息失败')
  }

  const result = await ncm.getUserPlaylists(accountInfo.account.id)
  if (!result || !result.playlist) {
    console.log('无法获取歌单列表')
    return
  }

  console.log('\n你的歌单:\n')
  for (const pl of result.playlist) {
    console.log(`  ${pl.id}  ${pl.name}  (${pl.trackCount} 首)`)
  }
}

module.exports = { remoteCommand }
