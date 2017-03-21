import isCI from 'is-ci'
import assert from 'assert'
import {
  isPackageName,
  isPackageVersion,
  check,
  shouldCheck,
  persistCheck,
  display,
  print
} from './core'

const oneDay = 24 * 60 * 60 * 1000
const defaultOptions = {
  preferGlobal: false,
  includeTaggedVersions: false,
  persistCheck: true,
  checkInterval: oneDay,
  lastCheck: 0,
  displayFn: display,
  preventUpdate: isCI,
  silenceErrors: true,
  consoleWriter: print
}

export default function update (providedOptions) {
  return __update(providedOptions, {
    check,
    shouldCheck,
    persistCheck
  })
}

// @testing
export function __update (providedOptions, funcs) {
  const {
    check,
    shouldCheck,
    persistCheck
  } = funcs

  const options = {
    ...defaultOptions,
    ...providedOptions
  }

  assert(isPackageName(options.package), 'Package name must be provided')
  assert(isPackageVersion(options.version), 'Local package version must be provided')

  return shouldCheck(options).then(shouldCheck => {
    if (!shouldCheck) {
      return {update: false}
    }

    return check(options).then(data => {
      if (!data.checked) {
        return {...options, ...data}
      }

      return persistCheck(options)
        .then(checkedAt => ({...options, ...data, checkedAt}))
        .then(info => {
          if (info.update && info.displayFn) {
            info.displayFn(info, info.consoleWriter)
            info.displayed = true
          }

          return info
        })
    })
  })
}
