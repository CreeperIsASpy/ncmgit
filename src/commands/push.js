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
    throw new Error('未登录，请先运行: ncmgit auth login')
  }

  console.log(`正在获取远程歌单 ${playlistId} ...`)
  let remoteDetail
  try {
    remoteDetail = await ncm.getAllPlaylistTracks(playlistId)
  } catch (err) {
    throw new Error(`获取远程歌单失败: ${err.message}`)
  }

  const remoteTracks = (remoteDetail && remoteDetail.playlist && remoteDetail.playlist.tracks) || []
  const remoteIds = new Set(remoteTracks.map(t => t.id))
  const remoteIdOrder = remoteTracks.map(t => t.id)

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

  const localIdOrder = repo.loadOrder(rootDir)
  const orderValid = localIdOrder.length > 0 &&
    localIdOrder.every(id => localIds.has(id)) &&
    localIds.size === localIdOrder.length

  let changed = false

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

  if (toAdd.length > 0 || toRemove.length > 0) {
    console.log(`变更: 添加 ${toAdd.length} 首, 删除 ${toRemove.length} 首`)

    for (const track of toRemove) {
      console.log(`  删除: ${track.name} - ${(track.ar || []).map(a => a.name).join(', ')}`)
      try {
        await ncm.playlistTracks('del', playlistId, String(track.id))
      } catch (err) {
        console.error(`  删除失败: ${err.message}`)
      }
    }

    for (const data of toAdd) {
      console.log(`  添加: ${data.name} - ${data.artists.join(', ')}`)
      try {
        await ncm.playlistTracks('add', playlistId, String(data.nid))
      } catch (err) {
        console.error(`  添加失败: ${err.message}`)
      }
    }

    changed = true
  }

  const remoteMeta = remoteDetail && remoteDetail.playlist
  const localName = (config.remote && config.remote.playlistName) || ''
  const localDesc = (config.remote && config.remote.desc) || ''
  const localTags = (config.remote && config.remote.tags) || ''
  const remoteName = (remoteMeta && remoteMeta.name) || ''
  const remoteDesc = (remoteMeta && remoteMeta.description) || ''
  const remoteTags = (remoteMeta && remoteMeta.tags || []).join(',')

  if (localName !== remoteName || localDesc !== remoteDesc || localTags !== remoteTags) {
    console.log('正在更新歌单信息...')
    try {
      await ncm.playlistUpdate(playlistId, localName, localDesc, localTags)
      console.log('歌单信息已更新')
      changed = true
    } catch (err) {
      console.error(`更新歌单信息失败: ${err.message}`)
    }
  }

  if (orderValid && !arraysEqual(localIdOrder, remoteIdOrder)) {
    console.log('正在更新歌曲顺序...')
    try {
      await ncm.songOrderUpdate(playlistId, localIdOrder)
      console.log('顺序已更新')
      changed = true
    } catch (err) {
      console.error(`更新顺序失败: ${err.message}`)
    }
  }

  if (!changed) {
    console.log('Everything up-to-date')
  } else {
    const cleanOrder = (localIdOrder.length > 0 ? localIdOrder : localData.map(d => d.nid))
      .filter(id => localIds.has(id))
    repo.saveOrder(rootDir, cleanOrder)
    repo.saveHead(rootDir, playlistId)
    console.log('\n推送完成!')
  }
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

module.exports = { pushCommand }
