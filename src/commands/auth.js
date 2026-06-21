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

  const method = await question(rl, '登录方式 (1: 手机号, 2: 邮箱) [1]: ')
  const choice = method === '2' ? 'email' : 'phone'

  if (choice === 'phone') {
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
      console.error('登录出错:', err.message)
    }
  } else {
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
      console.error('登录出错:', err.message)
    }
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
      console.log('  status  查看登录状态')
      console.log('  logout  登出')
  }
}

module.exports = { authCommand }
