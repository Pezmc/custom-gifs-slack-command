require('dotenv').config()

const { join } = require('path')

const bodyParser = require('body-parser')
const debug = require('debug')('slash-command-template:index')
const express = require('express')
const weightedRandom = require('weighted-random')

const Gifs = require('./gifs')
const signature = require('./verifySignature')

const app = express()

/*
 * Parse application/x-www-form-urlencoded && application/json
 * Use body-parser's `verify` callback to export a parsed raw body
 * that you need to use to verify the signature
 */

const rawBodyBuffer = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8')
  }
}

const scaleBetween = (array, scaledMin, scaledMax) => {
  const max = Math.max(...array)
  const min = Math.min(...array)
  if (min === max) {
    return array
  }
  return array.map(
    (num) => ((scaledMax - scaledMin) * (num - min)) / (max - min) + scaledMin
  )
}

if (!process.env.SLACK_SIGNING_SECRET) {
  throw new Error(
    'SLACK_SIGNING_SECRET must be set in .env (see Basic Information page in Slack app config)'
  )
}

const GIFS_PATH = process.env.GIFS_PATH || '../gifs'
const GIFS_PATH_FULL = join(__dirname, GIFS_PATH)

const gifs = new Gifs(GIFS_PATH_FULL)

app.use(bodyParser.urlencoded({ verify: rawBodyBuffer, extended: true }))
app.use(bodyParser.json({ verify: rawBodyBuffer }))

app.use('/gifs', express.static(GIFS_PATH_FULL))

app.get('/', (req, res) => {
  res.send(
    '<h2>The Slash Command and Dialog app is running</h2> <p>Follow the' +
      ' instructions in the README to configure the Slack App and your environment variables.</p>'
  )
})

/*
 * Endpoint to receive /gif slash command from Slack.
 * Checks verification token and opens a dialog to capture more info.
 */
app.post('/command', async (req, res) => {
  // Verify the signing secret
  if (!signature.isVerified(req)) {
    debug('Verification token mismatch')
    return res.status(404).send()
  }

  // extract the slash command text, and trigger ID from payload
  const { text } = req.body

  console.log('Searching for', text)
  const matches = await gifs.search(text)

  const goodMatches = matches.filter((match) => match.score <= 0.25)

  if (!goodMatches.length) {
    console.log('No matches found')
    return res.send({
      response_type: 'ephemeral',
      text: 'Sorry, no good matches were found, try another search',
    })
  }

  console.info(`Good matches for ${text}: ${goodMatches.length}`)

  const bestMatches = matches.splice(0, 3)

  // Keep adding matches if the score is the same
  let index = bestMatches.length
  while (
    index <= goodMatches.length &&
    bestMatches[bestMatches.length - 1].score == goodMatches[index].score
  ) {
    bestMatches.push(goodMatches[index])
    index++
  }
  console.info(`Best matches for ${text}: ${bestMatches.length}`)
  console.debug('Matches', bestMatches)

  const weights = bestMatches.map((match) => match.score * 100)
  const normalisedWeights = scaleBetween(weights, 100, 0)
  console.debug('Weights', 'raw', weights, 'normalized', normalisedWeights)

  const chosenIndex = weightedRandom(normalisedWeights)
  console.log(chosenIndex)
  const chosenGif = bestMatches[chosenIndex].item
  console.debug('Chose gif', chosenIndex, chosenGif)

  const hostname = req.protocol + '://' + req.get('host')

  return res.send({
    response_type: 'in_channel',
    blocks: [
      {
        type: 'image',
        image_url: hostname + join('/gifs', encodeURI(chosenGif.path)),
        alt_text: chosenGif.name,
      },
    ],
  })
})

const server = app.listen(process.env.PORT || 5000, () => {
  console.log(
    'Express server listening on port %d in %s mode',
    server.address().port,
    app.settings.env
  )
})
