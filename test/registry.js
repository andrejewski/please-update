import test from 'ava'
import {
  packageUrl,
  selectInfo,
  makeJsonRequest,
  getInfoForPackage
} from '../src/registry'

const sampleResponse = {
  versions: {
    '0.0.1': {},
    '0.1.2': {},
    '1.2.3': {}
  },
  'dist-tags': {
    latest: '1.2.3'
  }
}

function mockHttps (statusCode, responseText, error) {
  return {get (url, next) {
    const body = new Buffer(responseText)
    let endCallback
    let dataCallback
    const res = {
      statusCode,
      on (event, next) {
        if (error) return
        if (event === 'end') endCallback = next
        if (event === 'data') dataCallback = next
        if (dataCallback && endCallback) {
          dataCallback(body)
          endCallback()
        }
      }
    }

    next(res)
    return {on: (event, next) => {
      if (event === 'error' && error) {
        next(error)
      }
    }}
  }}
}

test('packageUrl() should return an NPM registry URL', t => {
  t.true(packageUrl('please-update').includes('https://registry.npmjs.com'))
})

test('makeJsonRequest() should throw on https error', t => {
  const https = mockHttps(200, '{"foo": 1}', 'BIG PROBLEMS')
  return t.throws(makeJsonRequest(https, 'https://example.com'))
})

test('makeJsonRequest() should reject on >=400 status code', t => {
  const https = mockHttps(500, '{"foo": 1}')
  return t.throws(makeJsonRequest(https, 'https://example.com'))
})

test('makeJsonRequest() should reject on empty response', t => {
  const https = mockHttps(200, '')
  return t.throws(makeJsonRequest(https, 'https://example.com'))
})

test('makeJsonRequest() should reject on malformed json', t => {
  const https = mockHttps(200, 'The end.')
  return t.throws(makeJsonRequest(https, 'https://example.com'))
})

test('makeJsonRequest() should resolve with json response', t => {
  const https = mockHttps(200, JSON.stringify(sampleResponse))

  t.plan(1)
  return makeJsonRequest(https, 'https://example.com/')
    .then(body => {
      t.deepEqual(body, sampleResponse)
    })
})

test('selectInfo() should return {allVersions, lastestVersion}', t => {
  t.deepEqual(selectInfo(sampleResponse), {
    allVersions: ['0.0.1', '0.1.2', '1.2.3'],
    latestVersion: '1.2.3'
  })
})

test('selectInfo() should handle an empty repsonse object', t => {
  t.deepEqual(selectInfo({}), {
    allVersions: [],
    latestVersion: undefined
  })
})

test('getInfoForPackage() should work [integration]', t => {
  t.plan(2)
  return getInfoForPackage('seth').then(data => {
    const {allVersions, latestVersion} = data
    t.is(typeof latestVersion, 'string')
    t.true(Array.isArray(allVersions))
  })
})
