const repo = require('../core/repo')
const ncm = require('../core/ncm-client')
const { requireNcmgitRoot, writeMusicFile, sanitizeFilename, listMusicFiles } = require('../utils/file')
const fs = require('fs')
const path = require('path')

async function pullCommand() {
  const rootDir = requireNcmgitRoot()
  const config = repo.loadConfig(rootDir)

  if (!config || !config.remote || !config.remote.playlistId) {
    throw new Error('未配置远程歌单。请运行: ncmgit remote set <playlist-id>')
  }

  const playlistId = config.remote.playlistId

  console.log(`正在拉取歌单 ${playlistId} ...`)
  let detail
  try {
    detail = await ncm.getAllPlaylistTracks(playlistId)
  } catch (err) {
    throw new Error(`拉取失败: ${err.message}`)
  }

  if (!detail || !detail.playlist) {
    throw new Error('获取歌单数据失败')
  }

  const playlist = detail.playlist
  const tracks = playlist.tracks || []

  const existingFiles = new Set(listMusicFiles(rootDir))
  const existingObjects = new Set(repo.listObjects(rootDir))

  let added = 0
  let removed = 0

  const remoteIds = new Set(tracks.map(t => t.id))
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

    const existingObj = repo.readObject(rootDir, track.id)
    if (!existingObj || JSON.stringify(existingObj) !== JSON.stringify(songData)) {
      writeMusicFile(rootDir, filename, songData)
      repo.writeObject(rootDir, track.id, songData)
      if (!existingObj) added++
    }
  }

  for (const file of existingFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(rootDir, file), 'utf-8'))
    if (data && data.nid && !remoteIds.has(data.nid)) {
      fs.unlinkSync(path.join(rootDir, file))
      removed++
    }
  }

  repo.saveHead(rootDir, playlistId)
  repo.saveOrder(rootDir, tracks.map(t => t.id))

  const cfg = repo.loadConfig(rootDir)
  cfg.remote.playlistName = playlist.name || cfg.remote.playlistName
  cfg.remote.desc = playlist.description || ''
  cfg.remote.tags = (playlist.tags || []).join(',')
  repo.saveConfig(rootDir, cfg)

  console.log(`拉取完成: 新增 ${added} 首, 删除 ${removed} 首`)
}

module.exports = { pullCommand }
