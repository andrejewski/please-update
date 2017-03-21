import fs from 'fs'
import test from 'ava'
import {
  isPackageName,
  isPackageVersion,
  isTaggedVersion,
  shouldCheck,
  _check,
  selectCheckInfo,
  persistCheck,
  updateCommand,
  render,
  display,
  print
} from '../src/core'
import {
  checkConfigPath,
  setLastCheckForPackage
} from '../src/config'

function ensureNoConfig () {
  const filepath = checkConfigPath()
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath)
  }
}

test('isPackageName() should return whether a package name is valid', t => {
  t.false(isPackageName())
  t.false(isPackageName({foo: 'bar'}))
  t.false(isPackageName('camelCase'))
  t.false(isPackageName('UPPERCASE'))

  t.true(isPackageName('please-update'))
  t.true(isPackageName('npm'))
})

test('isPackageVersion() should return whether a package version is valid', t => {
  // we use semver under the hood so this is not exhuastive
  t.false(isPackageVersion('x.x.x'))
  t.true(isPackageVersion('1.2.3'))
})

test('isTaggedVersion() should return whether a package version is tagged', t => {
  t.false(isTaggedVersion('0.0.1'))
  t.true(isTaggedVersion('0.0.1-beta'))
  t.true(isTaggedVersion('0.0.1-beta.3'))
})

test('shouldCheck() should resolve with false if preventUpdate', t => {
  t.plan(1)
  return shouldCheck({preventUpdate: true})
    .then(shouldCheck => t.false(shouldCheck))
})

test.serial('shouldCheck() should resolve true if there is no config', t => {
  ensureNoConfig()
  const options = {
    persistCheck: true,
    package: 'please-update',
    checkInterval: 24 * 60 * 60 * 1000
  }
  return shouldCheck(options).then(shouldCheck => {
    t.true(shouldCheck)
  })
})

test.serial('shouldCheck() should resolve false if config check is new', t => {
  const options = {
    persistCheck: true,
    package: 'please-update',
    checkInterval: 24 * 60 * 60 * 1000
  }
  return setLastCheckForPackage(options.package, Date.now())
    .then(() => shouldCheck(options))
    .then(shouldCheck => {
      t.false(shouldCheck)
      ensureNoConfig()
    })
})

test.serial('shouldCheck() should resovle true if config check is old', t => {
  const options = {
    persistCheck: true,
    package: 'please-update',
    checkInterval: 24 * 60 * 60 * 1000
  }
  return setLastCheckForPackage(options.package, 0)
    .then(() => shouldCheck(options))
    .then(shouldCheck => {
      t.true(shouldCheck)
      ensureNoConfig()
    })
})

test('shouldCheck() should use lastCheck unless persistCheck', t => {
  t.plan(2)
  const options = {
    persistCheck: false,
    checkInterval: 24 * 60 * 60 * 1000
  }
  return Promise.all([
    shouldCheck({...options, lastCheck: 0}),
    shouldCheck({...options, lastCheck: Date.now()})
  ]).then(([yes, no]) => {
    t.true(yes)
    t.false(no)
  })
})

test('_check() should resolve the version info', t => {
  const source = () => Promise.resolve({allVersions: [], latestVersion: '1.2.3'})
  const options = {version: '1.2.2'}
  return _check(options, source).then(result => {
    t.deepEqual(result, {
      update: true,
      checked: true,
      newerVersions: [],
      newestVersion: '1.2.3'
    })
  })
})

test('_check(), on error, should resolve unchecked', t => {
  const source = () => Promise.reject('bad')
  const options = {silenceErrors: true}
  return _check(options, source).then(result => {
    t.deepEqual(result, {
      checked: false,
      error: 'bad'
    })
  })
})

test('_check(), on error, should reject with error unless silenceErrors', t => {
  const source = () => Promise.reject('bad')
  const options = {silenceErrors: false}
  return t.throws(_check(options, source))
})

test('selectCheckInfo() should return sorted, newer & valid versions', t => {
  const options = {version: '1.2.3'}
  const result = selectCheckInfo(options, {
    allVersions: ['0.0.1', '0.1.0', '1.0.0', 'x.x.x', '1.2.3', '1.2.4-x', '2.0.0'],
    latestVersion: '2.0.0'
  })
  t.deepEqual(result, {
    update: true,
    newestVersion: '2.0.0',
    newerVersions: ['2.0.0']
  })
})

test('selectCheckInfo() should includes tagged version is includeTaggedVersions', t => {
  const options = {version: '1.2.3', includeTaggedVersions: true}
  const result = selectCheckInfo(options, {
    allVersions: ['1.0.0', '1.2.5', '1.2.6-beta', '1.2.7'],
    latestVersion: '1.2.7'
  })
  t.deepEqual(result, {
    update: true,
    newerVersions: ['1.2.5', '1.2.6-beta', '1.2.7'],
    newestVersion: '1.2.7'
  })
})

test('selectCheckInfo() should return whether to update', t => {
  const options = {version: '1.2.3'}
  const updateCheck = {allVersions: [], latestVersion: '1.2.4'}
  const noUpdateCheck = {allVersions: [], latestVersion: '1.2.3'}

  t.true(selectCheckInfo(options, updateCheck).update)
  t.false(selectCheckInfo(options, noUpdateCheck).update)
})

test('persistCheck() should resolve with the check time [no-write]', t => {
  const now = Date.now()
  return persistCheck({persistCheck: false})
    .then(checkedAt => {
      t.true(checkedAt >= now)
    })
})

test.serial('persistCheck() should resolve with the check time [written]', t => {
  ensureNoConfig()
  const now = Date.now()
  return persistCheck({persistCheck: true})
    .then(checkedAt => {
      t.true(checkedAt >= now)
      ensureNoConfig()
    })
})

test('updateCommand() should return the correct command', t => {
  t.is(updateCommand(true, true), 'yarn global upgrade')
  t.is(updateCommand(true, false), 'yarn upgrade')
  t.is(updateCommand(false, true), 'npm update --global')
  t.is(updateCommand(false, false), 'npm update')
})

test('render() should build the default message [emoji]', t => {
  const useYarn = false
  const preferGlobal = false
  const emoji = {
    tada: '/tada/',
    skull: '/skull/',
    pkg: '/pkg/',
    rocket: '/rocket/'
  }

  const info = {
    package: 'please-update',
    newestVersion: '1.2.3',
    newerVersions: {length: 8},
    preferGlobal
  }

  const message = render(info, emoji, useYarn)
  t.true(message.includes('/tada/'))
  t.true(message.includes('/skull/'))
  t.true(message.includes('/pkg/'))
  t.true(message.includes('/rocket/'))
  t.true(message.includes('please-update'))
  t.true(message.includes('1.2.3'))
  t.true(message.includes('8'))
})

test('render() should build the default message [no-emoji]', t => {
  const useYarn = true
  const preferGlobal = true
  const emoji = {
    tada: ':tada:',
    skull: ':skull:',
    pkg: ':pkg:',
    rocket: ':rocket:'
  }

  const info = {
    package: 'please-update',
    newestVersion: '1.2.3',
    newerVersions: {length: 8},
    preferGlobal
  }

  const message = render(info, emoji, useYarn)
  t.false(message.includes(':tada:'))
  t.false(message.includes(':skull:'))
  t.false(message.includes(':pkg:'))
  t.false(message.includes(':rocket:'))
  t.true(message.includes('please-update'))
  t.true(message.includes('1.2.3'))
  t.true(message.includes('8'))
})

test('display() should call write with the message', t => {
  t.plan(1)
  const info = {
    package: 'please-update',
    newestVersion: '1.2.3',
    newerVersions: {length: 8},
    preferGlobal: false
  }
  display(info, message => {
    t.is(typeof message, 'string')
  })
})

test('print() should write to stdout', t => {
  // this is mainly for code coverage, this is tough to prove
  print('')
})
