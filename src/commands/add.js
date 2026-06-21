const path = require('path')
const ncm = require('../core/ncm-client')
const tracker = require('../core/tracker')
const repo = require('../core/repo')
const { requireNcmgitRoot, writeMusicFile, sanitizeFilename, listMusicFiles, readMusicFile } = require('../utils/file')

async function addCommand(target, options = {}) {
  if (options.search) {
    await addBySearch(options.search)
    return
  }

  const rootDir = requireNcmgitRoot()

  if (!target || target === '.') {
    tracker.stageAll(rootDir)
    const files = listMusicFiles(rootDir)
    const order = repo.loadOrder(rootDir)
    let updated = false
    for (const f of files) {
      const data = readMusicFile(rootDir, f)
      if (data && data.nid && !order.includes(data.nid)) {
        order.unshift(data.nid)
        updated = true
      }
    }
    if (updated) repo.saveOrder(rootDir, order)
    console.log('已暂存所有歌曲文件')
  } else {
    const filename = path.basename(target)
    tracker.stageFile(rootDir, target)
    const data = readMusicFile(rootDir, filename)
    if (data && data.nid) {
      const order = repo.loadOrder(rootDir)
      if (!order.includes(data.nid)) {
        order.unshift(data.nid)
        repo.saveOrder(rootDir, order)
      }
    }
    console.log(`已暂存: ${filename}`)
  }
}

async function addBySearch(keyword) {
  const rootDir = requireNcmgitRoot()
  console.log(`搜索: "${keyword}" ...`)

  const result = await ncm.searchSongs(keyword, 10)
  if (!result || !result.result || !result.result.songs || result.result.songs.length === 0) {
    console.log('未找到相关歌曲')
    return
  }

  const songs = result.result.songs
  console.log(`\n找到 ${songs.length} 首歌曲:\n`)

  songs.forEach((song, i) => {
    const artists = (song.ar || []).map(a => a.name).join(', ')
    const album = song.al ? song.al.name : ''
    console.log(`  [${i + 1}] ${song.name} - ${artists} (${album})  ID: ${song.id}`)
  })

  const readline = require('readline')
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  const answer = await new Promise(resolve => {
    rl.question('\n输入要添加的歌曲序号 (多个用逗号分隔, 直接回车取消): ', resolve)
  })
  rl.close()

  const trimmed = answer.trim()
  if (!trimmed) {
    console.log('已取消')
    return
  }

  const indices = trimmed.split(',').map(s => parseInt(s.trim()) - 1)
  let added = 0

  for (const idx of indices) {
    if (idx < 0 || idx >= songs.length) continue
    const song = songs[idx]

    const songData = {
      type: 'netease',
      nid: song.id,
      name: song.name,
      artists: (song.ar || []).map(a => a.name),
      album: song.al ? song.al.name : '',
      duration: song.dt || 0,
      local_path: null,
    }

    const artistStr = songData.artists.join(', ')
    const filename = sanitizeFilename(`${songData.name} - ${artistStr}`) + '.json'
    writeMusicFile(rootDir, filename, songData)

    tracker.stageFile(rootDir, filename)

    const order = repo.loadOrder(rootDir)
    if (!order.includes(song.id)) {
      order.unshift(song.id)
      repo.saveOrder(rootDir, order)
    }

    added++
  }

  console.log(`已添加 ${added} 首歌曲到暂存区`)
}

module.exports = { addCommand }
