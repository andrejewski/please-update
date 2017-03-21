import test from 'ava'
import update, {__update} from '../src'

import fs from 'fs'
import {checkConfigPath} from '../src/config'

function ensureNoConfig () {
  const filepath = checkConfigPath()
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath)
  }
}

test('update should throw if package or version are invalid', t => {
  const noop = {
    shouldCheck: () => Promise.resolve(false)
  }

  t.throws(() => __update({}, noop))
  t.throws(() => __update({package: 'name', version: 'x.x.x'}, noop))
  t.throws(() => __update({package: 'bAdName', version: '1.2.3'}, noop))
  t.notThrows(() => __update({package: 'name', version: '1.2.3'}, noop))
})

const goodOptions = {
  package: 'please-update',
  version: '1.2.3'
}

test('update should not check NPM if conditions are not met', t => {
  const notCheck = {
    shouldCheck: () => Promise.resolve(false),
    check: () => {
      t.fail()
      return Promise.resolve({})
    }
  }

  return __update(goodOptions, notCheck).then(result => {
    t.false(result.update)
  })
})

test('update should not record an unsuccessful NPM check', t => {
  const badCheck = {
    shouldCheck: () => Promise.resolve(true),
    check: () => Promise.resolve({checked: false}),
    persistCheck: () => {
      t.fail()
      return Promise.resolve({})
    }
  }

  return __update(goodOptions, badCheck).then(result => {
    t.false(result.checked)
  })
})

test('update should call options.displayFn when an update is needed', t => {
  const displayCheck = {
    shouldCheck: () => Promise.resolve(true),
    check: () => Promise.resolve({update: true, checked: true}),
    persistCheck: () => Promise.resolve(Date.now())
  }
  t.plan(2)
  const options = {
    ...goodOptions,
    isOptionPassed: true,
    displayFn: x => t.true(x.isOptionPassed)
  }
  return __update(options, displayCheck).then(info => {
    t.true(info.displayed)
  })
})

test('update() should not call options.displayFn if unset', t => {
  const displayCheck = {
    shouldCheck: () => Promise.resolve(true),
    check: () => Promise.resolve({update: true, checked: true}),
    persistCheck: () => Promise.resolve(Date.now())
  }
  t.plan(1)
  const options = {
    ...goodOptions,
    isOptionPassed: true,
    displayFn: null
  }
  return __update(options, displayCheck).then(info => {
    t.falsy(info.displayed)
  })
})

// We need one happy path test calling update directly
test.serial('update() should work [integration]', t => {
  t.plan(1)
  return update({
    package: 'himalaya',
    version: '0.0.1',
    consoleWriter: message => t.is(typeof message, 'string'),
    preventUpdate: false // cuz this runs in CI
  }).then(() => {
    ensureNoConfig()
  })
})
