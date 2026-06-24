const { loadAuth, saveAuth, loadGlobalConfig } = require('../utils/config')

let api = null
let _initDone = false
let _initPromise = null

async function initApi() {
  if (_initDone) return
  if (_initPromise) return _initPromise

  _initPromise = (async () => {
    try {
      const generateConfig = require('@neteasecloudmusicapienhanced/api/generateConfig')
      await generateConfig()
    } catch (_) {}
    _initDone = true
  })()
  await _initPromise
}

function getApi() {
  if (!api) {
    try {
      api = require('@neteasecloudmusicapienhanced/api')
    } catch (e) {
      throw new Error(
        'ncmapi 未安装。请先运行: npm install -g @neteasecloudmusicapienhanced/api'
      )
    }
  }
  return api
}

async function request(endpoint, params = {}) {
  await initApi()
  const ncm = getApi()
  const fn = ncm[endpoint]
  if (typeof fn !== 'function') {
    throw new Error(`未知的 API 端点: ${endpoint}`)
  }

  const auth = loadAuth()
  const config = loadGlobalConfig()

  const proxy = params.proxy !== undefined ? params.proxy : (config && config.proxy) || undefined

  const mergedParams = {
    cookie: params.cookie || (auth && auth.cookie) || '',
    ...params,
    proxy,
  }

  const result = await fn(mergedParams)
  return result
}

async function loginCellphone(phone, password) {
  const result = await request('login_cellphone', { phone, password })
  if (result.body && result.body.cookie) {
    saveAuth({ cookie: result.body.cookie, account: phone })
  }
  return result
}

async function loginQrKey() {
  const result = await request('login_qr_key')
  return result.body && result.body.data && result.body.data.unikey
}

async function loginQrCreate(key) {
  const result = await request('login_qr_create', { key, qrimg: true })
  return result.body && result.body.data
}

async function loginQrCheck(key) {
  const result = await request('login_qr_check', { key })
  return result.body
}

async function captchaSent(phone) {
  const result = await request('captcha_sent', { phone })
  return result.body
}

async function loginCellphoneCaptcha(phone, captcha) {
  const result = await request('login_cellphone', { phone, captcha })
  if (result.body && result.body.cookie) {
    saveAuth({ cookie: result.body.cookie, account: phone })
  }
  return result
}

async function loginEmail(email, password) {
  const result = await request('login_email', { email, password })
  if (result.body && result.body.cookie) {
    saveAuth({ cookie: result.body.cookie, account: email })
  }
  return result
}

async function getPlaylistDetail(playlistId) {
  const result = await request('playlist_detail', { id: playlistId })
  return result.body
}

async function getAllPlaylistTracks(playlistId) {
  const BATCH_SIZE = 1000

  const result = await request('playlist_detail', { id: playlistId })
  const body = result.body

  if (!body || !body.playlist) return body

  const playlist = body.playlist
  const trackIds = playlist.trackIds || []

  if (trackIds.length <= (playlist.tracks || []).length) {
    return body
  }

  const allTracks = []

  for (let i = 0; i < trackIds.length; i += BATCH_SIZE) {
    const batch = trackIds.slice(i, i + BATCH_SIZE)
    const ids = batch.map(t => t.id).join(',')
    try {
      const songResult = await request('song_detail', { ids })
      if (songResult.body && songResult.body.songs) {
        allTracks.push(...songResult.body.songs)
      }
    } catch (err) {
      console.error(`获取歌曲详情失败 (${i + 1}-${Math.min(i + BATCH_SIZE, trackIds.length)}): ${err.message}`)
    }
  }

  playlist.tracks = allTracks
  return body
}

async function getUserPlaylists(uid) {
  const result = await request('user_playlist', { uid })
  return result.body
}

async function getAccountInfo() {
  const result = await request('user_account')
  return result.body
}

async function searchSongs(keyword, limit = 10) {
  const result = await request('cloudsearch', { keywords: keyword, type: 1, limit })
  return result.body
}

async function getSongDetail(songIds) {
  const ids = Array.isArray(songIds) ? songIds.join(',') : songIds
  const result = await request('song_detail', { ids })
  return result.body
}

async function playlistCreate(name, privacy = 0) {
  const result = await request('playlist_create', { name, privacy })
  return result.body
}

async function playlistTracks(op, pid, tracks) {
  const result = await request('playlist_tracks', { op, pid, tracks })
  return result.body
}

async function playlistUpdate(id, name, desc, tags) {
  const result = await request('playlist_update', { id, name, desc, tags })
  return result.body
}

async function songOrderUpdate(pid, trackIds) {
  const result = await request('song_order_update', { pid, ids: trackIds })
  return result.body
}

async function playlistDelete(pid) {
  const result = await request('playlist_delete', { id: pid })
  return result.body
}

function logout() {
  const { AUTH_PATH } = require('../utils/config')
  const fs = require('fs')
  if (fs.existsSync(AUTH_PATH)) {
    fs.unlinkSync(AUTH_PATH)
  }
}

async function isLoggedIn() {
  try {
    const info = await getAccountInfo()
    return !!(info && info.account)
  } catch {
    return false
  }
}

async function playlistSubscribe(op, pid) {
  const result = await request('playlist_subscribe', { t: op, id: pid })
  return result.body
}

module.exports = {
  request,
  loginCellphone,
  loginCellphoneCaptcha,
  captchaSent,
  loginEmail,
  loginQrKey,
  loginQrCreate,
  loginQrCheck,
  getPlaylistDetail,
  getAllPlaylistTracks,
  getUserPlaylists,
  getAccountInfo,
  searchSongs,
  getSongDetail,
  playlistCreate,
  playlistTracks,
  songOrderUpdate,
  playlistUpdate,
  playlistDelete,
  playlistSubscribe,
  logout,
  isLoggedIn,
}
