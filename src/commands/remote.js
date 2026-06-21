const repo = require('../core/repo')
const ncm = require('../core/ncm-client')
const { requireNcmgitRoot } = require('../utils/file')

function remoteCommand(action, playlistId) {
  const rootDir = requireNcmgitRoot()
  const config = repo.loadConfig(rootDir)

  if (!action || action === 'show') {
    if (config && config.remote && config.remote.playlistId) {
      console.log(`remote playlist: ${config.remote.playlistId}`)
      if (config.remote.playlistName) {
        console.log(`name: ${config.remote.playlistName}`)
      }
    } else {
      console.log('未配置远程歌单')
    }
    return
  }

  if (action === 'set') {
    if (!playlistId) {
      throw new Error('请提供歌单 ID: ncmgit remote set <playlist-id>')
    }

    const remoteCfg = {
      playlistId: String(playlistId),
      playlistName: (config && config.remote && config.remote.playlistName) || null,
    }

    if (!config) {
      throw new Error('仓库配置损坏')
    }
    config.remote = remoteCfg
    repo.saveConfig(rootDir, config)
    repo.saveHead(rootDir, String(playlistId))
    console.log(`远程歌单已设置为: ${playlistId}`)
    return
  }

  if (action === 'list') {
    listUserPlaylists()
    return
  }

  throw new Error(`未知操作: ${action}。可用: show, set, list`)
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
