const express = require('express')
const shortUUID = require('short-uuid')
const cacheProvider = require('../cache/cache-provider')
const router = express.Router()

function generateCode() {
    let code = shortUUID.generate()
    while (cacheProvider.instance().get(code) !== undefined) {
        code = shortUUID.generate()
    }
    return code
}

router.get('/authorize', (req, res) => {
    const redirectUriParam = req.query.redirect_uri
    const codeChallenge = req.query.code_challenge

    const authorizationCode = generateCode()
    const redirectUri = redirectUriParam + `?code=${authorizationCode}`

    cacheProvider.instance().set(authorizationCode, codeChallenge)
    res.redirect(redirectUri)
})

module.exports = router
