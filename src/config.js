import fs from 'fs'
import path from 'path'

export function checkConfigPath () {
  return path.join(path.dirname(__dirname), 'checks.json')
}

export function getConfig (filepath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filepath, (error, text) => {
      if (error) {
        if (error.code === 'ENOENT') {
          return resolve({})
        }
        return reject(error)
      }

      try {
        const data = JSON.parse(text)
        return resolve(data)
      } catch (error) {
        const message = `
          "${filepath}" is malformed.
          Please report this at https://github.com/andrejewski/please-update/issues
        `.trim()
        return reject(new Error(message))
      }
    })
  })
}

export function setConfig (filepath, config) {
  const text = JSON.stringify(config, null, 2)
  return new Promise((resolve, reject) => {
    fs.writeFile(filepath, text, error => {
      error ? reject(error) : resolve()
    })
  })
}

export function getLastCheckForPackage (name) {
  return getConfig(checkConfigPath()).then(config => config[name])
}

export function setLastCheckForPackage (name, check) {
  const filepath = checkConfigPath()
  return getConfig(filepath).then(config => (
    setConfig(filepath, {...config, [name]: check})
  ))
}
