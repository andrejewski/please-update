const update = require('./lib/index').default

console.log('')
update({
  package: 'himalaya',
  version: '0.0.1',
  persistCheck: false
}).then(() => {
  console.log('')
})
