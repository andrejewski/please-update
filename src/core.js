import chalk from 'chalk'
import emoji from 'node-emoji'
import semver from 'semver'
import hasYarn from 'has-yarn'
import {getInfoForPackage} from './registry'
import {
  getLastCheckForPackage,
  setLastCheckForPackage
} from './config'

export function isPackageName (name) {
  return !!name && typeof name === 'string' && name === name.toLowerCase()
}

export function isPackageVersion (version) {
  return !!semver.valid(version)
}

export function isTaggedVersion (version) {
  return version.indexOf('-') !== -1
}

export function shouldCheck (options) {
  if (options.preventUpdate) return Promise.resolve(false)
  const {
    persistCheck,
    checkInterval,
    lastCheck
  } = options

  if (persistCheck) {
    return getLastCheckForPackage(options.package).then(checkedAt => (
      !checkedAt || checkedAt + checkInterval < Date.now()
    ))
  }

  return Promise.resolve(lastCheck + checkInterval < Date.now())
}

export function check (options) {
  return _check(options, getInfoForPackage)
}

export function _check (options, source) {
  return source(options.package)
    .then(data => selectCheckInfo(options, data))
    .then(data => ({...data, checked: true}))
    .catch(error => {
      if (!options.silenceErrors) {
        throw error
      }
      return {error, checked: false}
    })
}

export function selectCheckInfo (options, data) {
  const {allVersions, latestVersion} = data
  const newerVersions = allVersions
    .filter(version => semver.valid(version))
    .filter(version => semver.gt(version, options.version))
    .filter(version => (
      options.includeTaggedVersions || !isTaggedVersion(version)
    ))
    .sort((a, b) => semver.gt(a, b) ? 1 : -1)
  return {
    update: latestVersion !== options.version,
    newestVersion: latestVersion,
    newerVersions
  }
}

export function persistCheck (options) {
  const checkedAt = Date.now()
  if (!options.persistCheck) return Promise.resolve(checkedAt)
  return setLastCheckForPackage(options.package, checkedAt).then(() => checkedAt)
}

export function updateCommand (useYarn, isGlobal) {
  if (isGlobal) {
    return useYarn ? 'yarn global upgrade' : 'npm update --global'
  }
  return useYarn ? 'yarn upgrade' : 'npm update'
}

export function render (info, emoji, useYarn) {
  const {
    package: packageName,
    version,
    newerVersions,
    newestVersion,
    preferGlobal
  } = info

  const {tada, skull, pkg, rocket} = emoji
  const useEmoji = [tada, skull, pkg, rocket].reduce((yes, emoji) => (
    yes && emoji && emoji.charAt(0) !== ':' // No :x: fallbacks
  ), true)

  const line = (emoji, text) => useEmoji ? `${emoji}  ${text}` : text
  return [
    line(tada, chalk.bold(`${packageName}: new version available`)),
    line(skull, chalk.green(`Local version ${version} is ${newerVersions.length} versions behind.`)),
    line(pkg, chalk.green(`Latest version is ${newestVersion}.`)),
    '',
    line(rocket, chalk.green(`To update, please run:`)),
    chalk.bold(`   ${updateCommand(useYarn, preferGlobal)} ${packageName}`),
    ''
  ].join('\n')
}

export function display (info, write) {
  const emojis = {
    tada: emoji.get('tada'),
    skull: emoji.get('skull_and_crossbones'),
    pkg: emoji.get('package'),
    rocket: emoji.get('rocket')
  }
  const message = render(info, emojis, hasYarn())
  write(message)
}

export function print (message) {
  process.stdout.write(message)
}
