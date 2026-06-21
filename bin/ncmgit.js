#!/usr/bin/env node

const path = require('path')

function showHelp() {
  console.log(`
ncmgit - 用 Git 管理网易云音乐歌单

用法:
  ncmgit <command> [options]

 命令:
  auth <login|status|logout>  管理登录状态
  init [dir]                  初始化一个新的歌单仓库
  clone <playlist-id> 克隆一个网易云歌单到本地
  status              查看工作区状态
  add [file]          暂存歌曲变更 (add . 暂存全部)
    --search <kw>     搜索并添加歌曲
  commit -m <msg>     提交暂存的变更
  push                推送到网易云歌单
  pull                从网易云歌单拉取
  remote [show|set|list] 管理远程歌单
  help                显示帮助信息

 示例:
  ncmgit auth login
  ncmgit auth status
  ncmgit clone 123456789
  ncmgit status
  ncmgit add --search "周杰伦 晴天"
  ncmgit add 晴天.json
  ncmgit commit -m "添加晴天"
  ncmgit push
  ncmgit auth logout
`)
}

function parseArgs(argv) {
  const args = argv.slice(2)
  const command = args[0]
  const options = {}
  const positional = []

  let i = 1
  while (i < args.length) {
    if (args[i] === '-m' || args[i] === '--message') {
      options.message = args[i + 1] || ''
      options.m = options.message
      i += 2
    } else if (args[i] === '--search') {
      options.search = args[i + 1] || ''
      i += 2
    } else if (args[i] === '--create-remote') {
      options.createRemote = args[i + 1] !== 'false'
      i += 2
    } else {
      positional.push(args[i])
      i++
    }
  }

  return { command, options, positional }
}

async function main() {
  const { command, options, positional } = parseArgs(process.argv)

  if (!command || command === 'help' || command === '-h' || command === '--help') {
    showHelp()
    process.exit(0)
  }

  try {
    switch (command) {
      case 'auth': {
        const { authCommand } = require('../src/commands/auth')
        await authCommand(positional[0])
        break
      }
      case 'init': {
        const { initCommand } = require('../src/commands/init')
        await initCommand(positional[0], options)
        break
      }
      case 'clone': {
        const { cloneCommand } = require('../src/commands/clone')
        await cloneCommand(positional[0], positional[1])
        break
      }
      case 'status': {
        const { statusCommand } = require('../src/commands/status')
        statusCommand()
        break
      }
      case 'add': {
        const { addCommand } = require('../src/commands/add')
        await addCommand(positional[0], options)
        break
      }
      case 'commit': {
        const { commitCommand } = require('../src/commands/commit')
        commitCommand(options)
        break
      }
      case 'push': {
        const { pushCommand } = require('../src/commands/push')
        await pushCommand()
        break
      }
      case 'pull': {
        const { pullCommand } = require('../src/commands/pull')
        await pullCommand()
        break
      }
      case 'remote': {
        const { remoteCommand } = require('../src/commands/remote')
        await remoteCommand(positional[0], positional[1])
        break
      }
      default:
        console.error(`未知命令: ${command}`)
        console.error('运行 ncmgit help 查看帮助')
        process.exit(1)
    }
  } catch (err) {
    console.error(`错误: ${err.message}`)
    process.exit(1)
  }
}

main()
