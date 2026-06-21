const repo = require('../core/repo')
const ncm = require('../core/ncm-client')
const { requireNcmgitRoot, listMusicFiles, readMusicFile } = require('../utils/file')

async function pushCommand() {
  const rootDir = requireNcmgitRoot()
  const config = repo.loadConfig(rootDir)

  if (!config || !config.remote || !config.remote.playlistId) {
    throw new Error('未配置远程歌单。请运行: ncmgit remote set <playlist-id>')
  }

  const playlistId = config.remote.playlistId
  const loggedIn = await ncm.isLoggedIn()
  if (!loggedIn) {
    throw new Error('未登录，请先运行: ncmgit login')
  }

  console.log(`正在获取远程歌单 ${playlistId} ...`)
  let remoteDetail
  try {
    remoteDetail = await ncm.getPlaylistDetail(playlistId)
  } catch (err) {
    throw new Error(`获取远程歌单失败: ${err.message}`)
  }

  const remoteTracks = (remoteDetail && remoteDetail.playlist && remoteDetail.playlist.tracks) || []
  const remoteIds = new Set(remoteTracks.map(t => t.id))

  const localFiles = listMusicFiles(rootDir)
  const localIds = new Set()
  const localData = []

  for (const f of localFiles) {
    const data = readMusicFile(rootDir, f)
    if (data && data.nid) {
      localIds.add(data.nid)
      localData.push(data)
    }
  }

  const toAdd = []
  const toRemove = []

  for (const data of localData) {
    if (!remoteIds.has(data.nid)) {
      toAdd.push(data)
    }
  }

  for (const remoteTrack of remoteTracks) {
    if (!localIds.has(remoteTrack.id)) {
      toRemove.push(remoteTrack)
    }
  }

  if (toAdd.length === 0 && toRemove.length === 0) {
    console.log('Everything up-to-date')
    return
  }

  console.log(`变更: 添加 ${toAdd.length} 首, 删除 ${toRemove.length} 首`)

  for (const track of toRemove) {
    console.log(`  删除: ${track.name} - ${(track.ar || []).map(a => a.name).join(', ')}`)
    try {
      await ncm.playlistTracks('del', playlistId, track.id)
    } catch (err) {
      console.error(`  删除失败: ${err.message}`)
    }
  }

  for (const data of toAdd) {
    console.log(`  添加: ${data.name} - ${data.artists.join(', ')}`)
    try {
      await ncm.playlistTracks('add', playlistId, data.nid)
    } catch (err) {
      console.error(`  添加失败: ${err.message}`)
    }
  }

  repo.saveHead(rootDir, playlistId)
  console.log('\n推送完成!')
}

module.exports = { pushCommand }
