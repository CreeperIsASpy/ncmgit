const tracker = require('../core/tracker')
const { requireNcmgitRoot } = require('../utils/file')

function commitCommand(options = {}) {
  const rootDir = requireNcmgitRoot()
  const message = options.message || options.m

  if (!message) {
    throw new Error('请提供提交信息: ncmgit commit -m "message"')
  }

  tracker.commitStaged(rootDir, message)
  console.log(`已提交: ${message}`)
}

module.exports = { commitCommand }
