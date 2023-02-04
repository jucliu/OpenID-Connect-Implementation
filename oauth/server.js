const express = require('express')
const cors = require('cors')
const cacheProvider = require('./cache/cache-provider')

const app = express()

// initialize server cache
cacheProvider.start((err) => {
    if (err) console.error(err)
})

// enable cors
app.use(cors())

// expose jwks.json
app.use(express.static('public'))

app.use('/', require('./routes/openid_config'))
app.use('/', require('./routes/authorize'))
app.use('/', require('./routes/token'))

app.listen(8000)
