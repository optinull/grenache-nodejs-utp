'use strict'

const { PeerRPCServer } = require('./../../')
const Link = require('grenache-nodejs-link')
const LRU = require('lru-cache')
const crypto = require('crypto')

const link = new Link({
  grape: 'http://127.0.0.1:30001'
})
link.start()

const peer = new PeerRPCServer(link, {
  timeout: 300000
})
peer.init()

const service = peer.transport('server')
service.listen()

setInterval(function () {
  link.announce('fibo_broker', service.port, {})
}, 1000)

const options = { max: 500, maxAge: 1000 * 15 }
const cache = LRU(options)

service.on('request', (rid, key, payload, handler, cert, additional) => {
  // in the additional variable we get the external IP and port of the sender,
  // which we will use for our "holepunch registry"
  console.log(`got reply from to ${additional.address}:${additional.port}`)

  payload.address = additional.address
  payload.port = additional.port

  const hashed = crypto.createHash('md5').update(JSON.stringify(payload)).digest('hex')
  cache.set(hashed, payload)

  const res = { fibonacci_worker: {} }

  cache.forEach((v, k) => {
    res.fibonacci_worker[k] = v
  })

  console.log('#services', JSON.stringify(res, null, ' '))

  handler.reply(null, res)
})
