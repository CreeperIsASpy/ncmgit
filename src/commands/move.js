const repo = require('../core/repo')
const { requireNcmgitRoot, readMusicFile } = require('../utils/file')

function moveCommand(trackId, newPosition) {
  const rootDir = requireNcmgitRoot()

  if (!trackId) {
    throw new Error('用法: ncmgit move <track-id> <position>')
  }

  const nid = Number(trackId)
  if (isNaN(nid)) {
    throw new Error(`无效的 track ID: ${trackId}`)
  }

  let pos = newPosition !== undefined ? Number(newPosition) : NaN
  if (isNaN(pos) || pos < 0) {
    throw new Error(`无效的位置: ${newPosition}`)
  }

  const order = repo.loadOrder(rootDir)
  const curIdx = order.indexOf(nid)

  if (curIdx === -1) {
    throw new Error(`歌曲 ${nid} 不在歌单中`)
  }

  if (curIdx === pos) {
    console.log('已在目标位置')
    return
  }

  order.splice(curIdx, 1)
  if (pos > order.length) pos = order.length
  order.splice(pos, 0, nid)

  repo.saveOrder(rootDir, order)
  console.log(`已移动 ${nid} 到位置 ${pos}`)
}

module.exports = { moveCommand }
