require('dotenv').config()

const Gifs = require('./gifs')

module.exports = (function () {
  if (!process.env.SLACK_SIGNING_SECRET) {
    throw new Error(
      'SLACK_SIGNING_SECRET must be set in .env (see Basic Information page in Slack app config)'
    )
  }

  if (!process.env.GIFS_SERVER) {
    throw new Error('GIFS_SERVER path must be set in .env (see readme)')
  }
  const gifs = new Gifs(process.env.GIFS_SERVER)

  return {
    gifs,
    port: process.env.PORT || 5000,
    slackSigningSecret: process.env.SLACK_SIGNING_SECRET,
  }
})()
