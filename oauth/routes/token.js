const express = require('express')
const bodyParser = require('body-parser')
const cacheProvider = require('../cache/cache-provider')
const jwk = require('../config/private_key.json')
const { verifyChallenge } = require('pkce-challenge')
const jose = require('jose')

const router = express.Router()

const urlencodedParser = bodyParser.urlencoded({ extended: false })

async function generateToken() {
    const alg = 'ES256'
    const payload = {
        iss: 'http://localhost:8000',
        sub: 'Juchen',
    }
    const kid = jwk.kid
    const protectedHeader = {
        kid,
        alg,
    }

    const privateKey = await jose.importJWK(jwk, alg)

    const jwt = await new jose.SignJWT(payload)
        .setProtectedHeader(protectedHeader)
        .setIssuer('http://localhost:8000')
        .sign(privateKey)
    return jwt
}

router.post('/token', urlencodedParser, async (req, res) => {
    const authorizationCode = req.body.code
    const codeVerifier = req.body.code_verifier
    const codeChallenge = cacheProvider.instance().get(authorizationCode)

    const isVerified = verifyChallenge(codeVerifier, codeChallenge)

    if (codeChallenge === undefined || !isVerified) {
        res.status(400).send('code challendge is failed')
        return
    }
    const token = await generateToken()
    cacheProvider.instance().del(authorizationCode)
    res.json({ id_token: token })
})

module.exports = router
