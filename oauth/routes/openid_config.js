const express = require('express')
const openidConfig = require('../config/openid.json')
const router = express.Router()

router.get('/.well-known/openid-configuration', (req, res) => {
    res.json(openidConfig)
})

module.exports = router
