import fs from 'fs'
import test from 'ava'
import path from 'path'
import {
  checkConfigPath,
  getConfig,
  setConfig,
  getLastCheckForPackage,
  setLastCheckForPackage
} from '../src/config'

test('checkConfigPath() returns the config filepath', t => {
  const filepath = checkConfigPath()
  t.true(filepath.includes('checks.json'))
})

test('getConfig() returns an empty config if there is no file', t => {
  const filename = 'missing-config.json'
  const filepath = path.join(__dirname, filename)

  if (fs.existsSync(filepath)) fs.unlinkSync(filepath) // make sure it isn't there
  return getConfig(filepath).then(config => {
    t.deepEqual(config, {})
  })
})

test('getConfig() should reject for fs errors other than missing file', t => {
  // for example, if its a folder
  const filename = 'config-is-folder'
  const filepath = path.join(__dirname, filename)

  if (!fs.existsSync(filepath)) fs.mkdirSync(filepath)
  return t.throws(getConfig(filepath))
    .then(() => fs.rmdirSync(filepath))
})

test('getConfig() should reject if the config is not JSON', t => {
  const filename = 'malformed-config'
  const filepath = path.join(__dirname, filename)

  fs.writeFileSync(filepath, 'The end.')
  return t.throws(getConfig(filepath))
    .then(() => fs.unlinkSync(filepath))
})

test('getConfig() should resolve with the file config', t => {
  const filename = 'normal-config'
  const filepath = path.join(__dirname, filename)

  const config = {foo: 1, bar: 'baz'}
  fs.writeFileSync(filepath, JSON.stringify(config, null, 2))
  return getConfig(filepath)
    .then(result => t.deepEqual(result, config))
    .then(() => fs.unlinkSync(filepath))
})

test('setConfig() should write the config to the file', t => {
  const filename = 'good-write-config'
  const filepath = path.join(__dirname, filename)
  const config = {foo: 1, bar: 'baz'}
  return setConfig(filepath, config)
    .then(() => {
      const result = JSON.parse(fs.readFileSync(filepath, {encoding: 'utf8'}))
      t.deepEqual(result, config)
      fs.unlinkSync(filepath)
    })
})

test('setConfig() should reject if the config is not written', t => {
  const filename = 'bad-write-config'
  const filepath = path.join(__dirname, filename)
  if (!fs.existsSync(filepath)) fs.mkdirSync(filepath)
  return t.throws(setConfig(filepath, {}))
    .then(() => fs.rmdirSync(filepath))
})

test.serial('getLastCheckForPackage() should return the last checked for update', t => {
  if (fs.existsSync(checkConfigPath())) {
    fs.unlinkSync(checkConfigPath())
  }
  return getLastCheckForPackage('please-update')
    .then(checked => {
      t.falsy(checked)
    })
})

test.serial('setLastCheckForPackage() should set the package/check in the config', t => {
  const packageName = 'please-update'
  const now = Date.now()
  return setLastCheckForPackage(packageName, now)
    .then(() => getLastCheckForPackage(packageName))
    .then(checked => t.true(checked >= now))
    .then(() => fs.unlinkSync(checkConfigPath()))
})
