const fs = require('fs')
const path = require('path')
const repo = require('../core/repo')
const ncm = require('../core/ncm-client')

async function initCommand(dirname, options = {}) {
  const targetDir = path.resolve(dirname || '.')
  const name = path.basename(targetDir)

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  repo.initRepo(targetDir)
  console.log(`已初始化空的 ncmgit 仓库: ${targetDir}`)

  if (options.createRemote) {
    try {
      const loggedIn = await ncm.isLoggedIn()
      if (loggedIn) {
        console.log(`正在创建网易云歌单 "${name}"...`)
        const result = await ncm.playlistCreate(name, 0)
        if (result && result.id) {
          const config = repo.loadConfig(targetDir)
          config.remote = { playlistId: String(result.id), playlistName: name, desc: '', tags: '' }
          repo.saveConfig(targetDir, config)
          repo.saveHead(targetDir, String(result.id))
          console.log(`已创建远程歌单: ${result.id}`)
        } else if (result && result.code !== 200) {
          console.log(`创建远程歌单失败: ${result.message || '未知错误'}`)
        }
      } else {
        console.log('未登录，跳过创建远程歌单。请先运行 ncmgit auth login')
      }
    } catch (err) {
      console.log(`创建远程歌单时出错: ${err.message}`)
    }
  }
}

module.exports = { initCommand }
