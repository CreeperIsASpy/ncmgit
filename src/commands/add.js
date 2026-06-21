const path = require('path')
const ncm = require('../core/ncm-client')
const tracker = require('../core/tracker')
const { requireNcmgitRoot, writeMusicFile, sanitizeFilename } = require('../utils/file')

async function addCommand(target, options = {}) {
  if (options.search) {
    await addBySearch(options.search)
    return
  }

  const rootDir = requireNcmgitRoot()

  if (!target || target === '.') {
    tracker.stageAll(rootDir)
    console.log('已暂存所有歌曲文件')
  } else {
    tracker.stageFile(rootDir, target)
    console.log(`已暂存: ${path.basename(target)}`)
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
    added++
  }

  console.log(`已添加 ${added} 首歌曲到暂存区`)
}

module.exports = { addCommand }
