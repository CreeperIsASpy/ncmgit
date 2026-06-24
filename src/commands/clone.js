const fs = require('fs')
const path = require('path')
const repo = require('../core/repo')
const ncm = require('../core/ncm-client')
const { sanitizeFilename, writeMusicFile } = require('../utils/file')

async function cloneCommand(playlistId, dirname) {
  playlistId = String(playlistId).trim()
  if (!playlistId || isNaN(Number(playlistId))) {
    throw new Error('请提供有效的歌单 ID')
  }

  console.log(`正在获取歌单 ${playlistId} ...`)
  let detail
  try {
    detail = await ncm.getAllPlaylistTracks(playlistId)
  } catch (err) {
    throw new Error(`获取歌单失败: ${err.message}`)
  }

  if (!detail || !detail.playlist) {
    throw new Error('未找到该歌单，请确认 ID 正确且歌单为公开状态')
  }

  const playlist = detail.playlist
  const targetDir = path.resolve(dirname || playlistId)
  const playlistName = playlist.name || playlistId

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  repo.initRepo(targetDir)

  const config = repo.loadConfig(targetDir)
  config.remote = {
    playlistId: playlistId,
    playlistName: playlistName,
    desc: playlist.description || '',
    tags: (playlist.tags || []).join(','),
  }
  repo.saveConfig(targetDir, config)
  repo.saveHead(targetDir, playlistId)

  const tracks = playlist.tracks || []
  console.log(`歌单 "${playlistName}" 包含 ${tracks.length} 首歌曲`)

  const order = []
  const usedNames = new Set()

  for (const track of tracks) {
    const songData = {
      type: 'netease',
      nid: track.id,
      name: track.name,
      artists: (track.ar || []).map(a => a.name),
      album: track.al ? track.al.name : '',
      duration: track.dt || 0,
      local_path: null,
    }

    const artistStr = songData.artists.join(', ')
    let baseName = sanitizeFilename(`${songData.name} - ${artistStr}`)
    let filename = baseName + '.json'
    if (usedNames.has(filename)) {
      filename = sanitizeFilename(`${baseName} - ${track.id}`) + '.json'
      console.warn(`警告: 歌曲 "${songData.name} - ${artistStr}" 重复，已重命名为 ${filename}`)
    }
    usedNames.add(filename)
    writeMusicFile(targetDir, filename, songData)

    repo.writeObject(targetDir, track.id, songData)
    order.push(track.id)
  }

  repo.saveOrder(targetDir, order)

  console.log(`已克隆到 ${targetDir}`)
  console.log(`  ${tracks.length} 首歌曲已保存`)
}

module.exports = { cloneCommand }
