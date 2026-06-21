const readline = require('readline')
const ncm = require('../core/ncm-client')
const { loadAuth } = require('../utils/config')

function question(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim())
    })
  })
}

async function authLogin() {
  const existing = loadAuth()
  if (existing) {
    console.log(`已登录账户: ${existing.account || '(未知)'}`)
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    const answer = await question(rl, '是否重新登录? (y/N): ')
    rl.close()
    if (answer.toLowerCase() !== 'y') return
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const method = await question(rl, '登录方式 (1: 扫码登录 [推荐], 2: 验证码, 3: 手机号, 4: 邮箱) [1]: ')
  const choice = method === '2' ? 'captcha' : method === '3' ? 'phone' : method === '4' ? 'email' : 'qr'
  rl.close()

  if (choice === 'qr') {
    await authLoginQr()
  } else if (choice === 'captcha') {
    await authLoginCaptcha()
  } else if (choice === 'phone') {
    await authLoginPhone()
  } else {
    await authLoginEmail()
  }
}

async function authLoginQr() {
  console.log('正在生成二维码...')

  let unikey
  try {
    unikey = await ncm.loginQrKey()
  } catch (err) {
    printLoginError(err)
    return
  }

  if (!unikey) {
    console.error('获取二维码 key 失败')
    return
  }

  let qrData
  try {
    qrData = await ncm.loginQrCreate(unikey)
  } catch (err) {
    printLoginError(err)
    return
  }

  if (!qrData || !qrData.qrurl) {
    console.error('生成二维码失败')
    return
  }

  const qrcode = require('qrcode-terminal')
  console.log('\n请使用网易云音乐 APP 扫描以下二维码:\n')
  qrcode.generate(qrData.qrurl, { small: true })
  console.log(`\n或打开链接: ${qrData.qrurl}\n`)

  console.log('等待扫码...')

  for (let i = 0; i < 120; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000))

    let checkResult
    try {
      checkResult = await ncm.loginQrCheck(unikey)
    } catch {
      continue
    }

    const code = checkResult && checkResult.code

    if (code === 803) {
      const cookie = checkResult.cookie || ''
      const { saveAuth } = require('../utils/config')
      saveAuth({ cookie, account: '扫码登录' })
      let account = '扫码登录'
      try {
        const info = await ncm.getAccountInfo()
        if (info && info.profile && info.profile.nickname) {
          account = info.profile.nickname
          saveAuth({ cookie, account })
        }
      } catch {}
      console.log(`登录成功! (${account})`)
      return
    }

    if (code === 800) {
      console.log('二维码已过期，请重新运行 ncmgit auth login')
      return
    }

    if (code === 802) {
      console.log('已扫码，请在手机上确认登录...')
    }
  }

  console.log('等待超时，请重新运行 ncmgit auth login')
}

async function authLoginCaptcha() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const phone = await question(rl, '手机号: ')
  rl.close()

  console.log('正在发送验证码...')
  try {
    const sent = await ncm.captchaSent(phone)
    if (sent && sent.code === 200) {
      console.log('验证码已发送')
    } else {
      console.log('发送验证码失败:', (sent && sent.message) || '')
      return
    }
  } catch (err) {
    printLoginError(err)
    return
  }

  const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout })
  const captcha = await question(rl2, '验证码: ')
  rl2.close()

  console.log('正在登录...')
  try {
    const result = await ncm.loginCellphoneCaptcha(phone, captcha)
    if (result.body && result.body.code === 200) {
      console.log('登录成功!')
    } else {
      console.log('登录失败:', (result.body && result.body.message) || result)
    }
  } catch (err) {
    printLoginError(err)
  }
}

async function authLoginPhone() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const phone = await question(rl, '手机号: ')
  const password = await question(rl, '密码: ')
  rl.close()

  console.log('正在登录...')
  try {
    const result = await ncm.loginCellphone(phone, password)
    if (result.body && result.body.code === 200) {
      console.log('登录成功!')
    } else {
      console.log('登录失败:', (result.body && result.body.message) || result)
    }
  } catch (err) {
    printLoginError(err)
  }
}

async function authLoginEmail() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const email = await question(rl, '邮箱: ')
  const password = await question(rl, '密码: ')
  rl.close()

  console.log('正在登录...')
  try {
    const result = await ncm.loginEmail(email, password)
    if (result.body && result.body.code === 200) {
      console.log('登录成功!')
    } else {
      console.log('登录失败:', (result.body && result.body.message) || result)
    }
  } catch (err) {
    printLoginError(err)
  }
}

async function authStatus() {
  const auth = loadAuth()
  if (!auth || !auth.cookie) {
    console.log('未登录')
    return
  }

  console.log(`本地凭证: ${auth.account || '(未知)'}`)

  try {
    const info = await ncm.getAccountInfo()
    if (info && info.account) {
      console.log(`在线状态: 已登录 (${info.account.id})`)
      if (info.profile) {
        console.log(`昵称: ${info.profile.nickname || ''}`)
      }
    } else {
      console.log('在线状态: 凭证已过期')
    }
  } catch {
    console.log('在线状态: 无法验证 (API 不可用)')
  }
}

function authLogout() {
  const auth = loadAuth()
  if (!auth) {
    console.log('未登录')
    return
  }

  ncm.logout()
  console.log('已登出')
}

function printLoginError(err) {
  const body = (err && err.body) || {}
  const code = body.code
  const msg = body.message || body.msg || err.message || ''

  if (code === 8810) {
    console.error('登录失败: 当前网络环境存在安全风险 (易盾拦截)')
    console.error('建议:')
    console.error('  1. 使用代理: ncmgit config proxy http://your-proxy:port')
    console.error('  2. 通过远程 ncmapi 服务访问 (配置在服务器上运行)')
  } else if (code) {
    console.error(`登录失败: [${code}] ${msg}`)
  } else if (err.message) {
    console.error('登录出错:', err.message)
  } else {
    console.error('登录出错')
  }
}

async function authCommand(subcommand) {
  switch (subcommand) {
    case 'login':
      await authLogin()
      break
    case 'status':
      await authStatus()
      break
    case 'logout':
      authLogout()
      break
    default:
      console.log('用法: ncmgit auth <login|status|logout>')
      console.log('  login   登录网易云音乐账户')
      console.log('          支持: 扫码 / 验证码 / 手机号 / 邮箱')
      console.log('  status  查看登录状态')
      console.log('  logout  登出')
  }
}

module.exports = { authCommand }
