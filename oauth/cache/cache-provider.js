const nodeCache = require('node-cache')
let cache = null

exports.start = function (done) {
    if (cache) return done()

    cache = new nodeCache({ stdTTL: 180, checkperiod: 120 })
}

exports.instance = function () {
    return cache
}
