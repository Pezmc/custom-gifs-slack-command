const log = require('debug-level').log('custom-gifs-slack:slack')
const slack = require('express').Router()

const config = require('../config')
const payloads = require('../utils/payloads')
const requestHandler = require('../utils/requestHandler')
const signature = require('../utils/verifySignature')
const selectedWeightedRandomGif = require('../utils/weightedSelect')

/*
 * Receive /gif slash command from Slack.
 * Checks verification token and returns a interactive block
 */
slack.post('/command', async (req, res) => {
  // Verify the signing secret
  if (!signature.isVerified(req)) {
    log.warn('Verification token mismatch')
    return res.status(404).send()
  }

  // Extract the slash command text
  const { text } = req.body

  // Find some gifs
  const bestMatches = await config.gifs.bestMatches(text)
  if (!bestMatches.length) {
    log.info(`No matches found for "${text}"`)
    return res.send(payloads.noMatches(text))
  }

  // Choose the one to send
  const chosenGif = selectedWeightedRandomGif(bestMatches)
  log.info(`Chose gif ${chosenGif.path} for "${text}"`)
  log.debug('Gif details', chosenGif)

  return res.send(payloads.confirmGif(text, chosenGif))
})

/*
 * Receive /request slash command from Slack.
 * Checks verification token
 */
slack.post('/request', async (req, res) => {
  // Verify the signing secret
  if (!signature.isVerified(req)) {
    log.warn('Verification token mismatch')
    return res.status(404).send()
  }

  // Parse the payload
  const { actions, ...payload } = JSON.parse(req.body.payload)

  actions.forEach(requestHandler.bind(this, { ...payload }))

  // Ack the request
  res.send('')
})

module.exports = slack
