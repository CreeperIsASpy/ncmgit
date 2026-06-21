const { loadGlobalConfig, saveGlobalConfig } = require('../utils/config')

function configCommand(key, value) {
  if (!key) {
    console.log(JSON.stringify(loadGlobalConfig(), null, 2))
    return
  }

  if (value === undefined) {
    const config = loadGlobalConfig()
    if (config[key] !== undefined) {
      console.log(config[key])
    }
    return
  }

  const config = loadGlobalConfig()
  config[key] = value
  saveGlobalConfig(config)
  console.log(`${key} = ${value}`)
}

module.exports = { configCommand }
