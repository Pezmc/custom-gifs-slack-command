require('dotenv').config()

const { join } = require('path')

const Gifs = require('./gifs')

module.exports = (function () {
  if (!process.env.SLACK_SIGNING_SECRET) {
    throw new Error(
      'SLACK_SIGNING_SECRET must be set in .env (see Basic Information page in Slack app config)'
    )
  }

  const gifsPath = process.env.GIFS_PATH || 'gifs'
  const gifsPathFull = join(process.cwd(), gifsPath)

  const gifs = new Gifs(gifsPathFull)

  return {
    gifs,
    gifsPath: gifsPathFull,
    port: process.env.PORT || 5000,
    slackSigningSecret: process.env.SLACK_SIGNING_SECRET,
  }
})()
