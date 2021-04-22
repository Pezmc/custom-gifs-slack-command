require('dotenv').config()

const crypto = require('crypto')

const log = require('debug-level').log('custom-gifs-slack:config')

const Gifs = require('./gifs')
const DatabaseLogger = require('./utils/databaseLogger')

module.exports = (function () {
  // Required
  if (!process.env.SLACK_SIGNING_SECRET) {
    throw new Error(
      'SLACK_SIGNING_SECRET must be set in .env (see Basic Information page in Slack app config)'
    )
  }

  if (!process.env.GIFS_SERVER) {
    throw new Error('GIFS_SERVER path must be set in .env (see readme)')
  }
  const gifs = new Gifs(process.env.GIFS_SERVER)

  // Optional
  let adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret || adminSecret === 'a-good-secret-goes-here') {
    adminSecret = crypto.randomBytes(18).toString('hex')
    log.warn(`ADMIN_SECRET is not set, chose ${adminSecret} for you`)
  }
  let logger
  if (!process.env.DATABASE_URL) {
    log.warn(`DATABASE_URL is not set, will not log searches to database`)
  } else {
    logger = new DatabaseLogger(process.env.DATABASE_URL)
  }

  return {
    gifs,
    logger,
    adminSecret,
    gifsServer: process.env.GIFS_SERVER,
    port: process.env.PORT || 5000,
    slackSigningSecret: process.env.SLACK_SIGNING_SECRET,
  }
})()
