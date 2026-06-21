const tracker = require('../core/tracker')
const repo = require('../core/repo')
const { requireNcmgitRoot } = require('../utils/file')

function statusCommand() {
  const rootDir = requireNcmgitRoot()
  const diff = tracker.diffRepository(rootDir)
  const config = repo.loadConfig(rootDir)
  const head = repo.loadHead(rootDir)

  if (config && config.remote && config.remote.playlistName) {
    console.log(`歌单: ${config.remote.playlistName} (${head || '未设置'})`)
  } else if (head) {
    console.log(`HEAD: ${head}`)
  } else {
    console.log('尚未关联远程歌单')
  }
  console.log()

  if (diff.staged.length === 0 && diff.untracked.length === 0 && diff.unstaged.length === 0) {
    console.log('没有变更，工作区干净')
    return
  }

  if (diff.staged.length > 0) {
    console.log('暂存的变更:')
    for (const item of diff.staged) {
      console.log(`  ${item.status === 'deleted' ? '删除: ' : '新文件: '}  ${item.file}`)
    }
    console.log()
  }

  if (diff.unstaged.length > 0) {
    console.log('尚未暂存的变更:')
    for (const item of diff.unstaged) {
      console.log(`  修改:  ${item.file}`)
    }
    console.log()
  }

  if (diff.untracked.length > 0) {
    console.log('未跟踪的文件:')
    for (const item of diff.untracked) {
      console.log(`  ${item.file}`)
    }
    console.log()
  }
}

module.exports = { statusCommand }
