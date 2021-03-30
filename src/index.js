require('dotenv').config()

const { join } = require('path')

const axios = require('axios')
const bodyParser = require('body-parser')
const log = require('debug-level').log('custom-gifs-slack:index')
const express = require('express')
const exphbs = require('express-handlebars')
const weightedRandom = require('weighted-random')

const Gifs = require('./gifs')
const { rawBodyBuffer, groupBy, scaleBetween } = require('./utils')
const signature = require('./verifySignature')

const app = express()

/* Config */
if (!process.env.SLACK_SIGNING_SECRET) {
  throw new Error(
    'SLACK_SIGNING_SECRET must be set in .env (see Basic Information page in Slack app config)'
  )
}

const GIFS_PATH = process.env.GIFS_PATH || '../gifs'
const GIFS_PATH_FULL = join(__dirname, GIFS_PATH)

const gifs = new Gifs(GIFS_PATH_FULL)

/* Helpers */
const getBestMatchingGifs = async function (searchTerm, threshold = 0.25) {
  log.debug('Searching for', searchTerm)
  const matches = await gifs.search(searchTerm)

  const goodMatches = matches.filter((match) => match.score <= threshold)

  if (!goodMatches.length) {
    return goodMatches
  }

  log.info(`Good matches for ${searchTerm}: ${goodMatches.length}`)

  // Grab the top results
  const bestMatches = matches.splice(0, 3)

  // Keep adding extra matches if the score is the same
  let index = bestMatches.length
  while (
    index < goodMatches.length &&
    bestMatches[bestMatches.length - 1].score == goodMatches[index].score
  ) {
    bestMatches.push(goodMatches[index])
    index++
  }

  log.info(`Best matches for ${searchTerm}: ${bestMatches.length}`)
  log.debug('Matches', bestMatches)

  return bestMatches
}

const selectedWeightedRandomGif = (gifs) => {
  const weights = gifs.map((match) => match.score * 100)
  const normalisedWeights = scaleBetween(weights, 100, 0)
  log.debug('Weights', 'raw', weights, 'normalized', normalisedWeights)

  const chosenIndex = weightedRandom(normalisedWeights)

  log.debug('Chose gif index', chosenIndex)

  return gifs[chosenIndex].item
}

/* Setup Express */
app.engine('handlebars', exphbs())
app.set('view engine', 'handlebars')

app.use(bodyParser.urlencoded({ verify: rawBodyBuffer, extended: true }))
app.use(bodyParser.json({ verify: rawBodyBuffer }))

app.get('/', async (req, res) => {
  const { gifs: availableGifs } = await gifs.getGifsAndSearcher()

  res.render('home', { categories: groupBy(availableGifs, 'category') })
})

/*
 * Endpoint to receive /gif slash command from Slack.
 * Checks verification token and returns a interactive block
 */
app.post('/command', async (req, res) => {
  // Verify the signing secret
  if (!signature.isVerified(req)) {
    log.warn('Verification token mismatch')
    return res.status(404).send()
  }

  // Extract the slash command text
  const { text } = req.body

  // Find some gifs
  const bestMatches = await getBestMatchingGifs(text)
  if (!bestMatches.length) {
    log.info(`No matches found for "${text}"`)
    return res.send({
      response_type: 'ephemeral',
      text: 'Sorry, no good matches were found, try another search',
    })
  }

  // Choose the one to send
  const chosenGif = selectedWeightedRandomGif(bestMatches)
  log.info(`Chose gif ${chosenGif.path} for "${text}"`)
  log.debug('Gif details', chosenGif)

  const hostname = req.protocol + '://' + req.get('host')

  return res.send({
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'plain_text',
          text: `Searched for "${text}"`,
          emoji: true,
        },
      },
      {
        type: 'image',
        image_url: hostname + join('/gifs', encodeURI(chosenGif.path)),
        alt_text: chosenGif.name,
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Send',
            },
            value: chosenGif.path,
            action_id: 'send_gif',
            style: 'primary',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Try Again',
            },
            value: JSON.stringify({ text, lastGifs: [chosenGif.path] }),
            action_id: 'get_new_gif',
          },
        ],
      },
    ],
  })
})

const handleSendGif = async function (
  searchText,
  response_url,
  username,
  hostname
) {
  const chosenGif = await gifs.findByPath(searchText)
  if (!chosenGif) {
    log.warn(`Couldn't find a gif with a path matching ${searchText}`)
    return await axios.post(response_url, {
      text: `Something went wrong, couldn't find a gif matching "${searchText}", please try again`,
    })
  }

  await axios.post(response_url, {
    response_type: 'ephemeral',
    text: '',
    replace_original: true,
    delete_original: true,
  })

  await axios.post(response_url, {
    response_type: 'in_channel',
    replace_original: false,
    username,
    //icon_url: to specify a URL to an image to use as the profile photo alongside the message.
    //icon_emoji:
    blocks: [
      {
        type: 'image',
        image_url: hostname + join('/gifs', encodeURI(chosenGif.path)),
        alt_text: chosenGif.name,
      },
    ],
  })
}

const handleGetNewGif = async function (
  value,
  response_url,
  username,
  hostname
) {
  const { text, lastGifs } = JSON.parse(value)

  // Todo - refactor to shared function

  // Find some gifs
  const bestMatches = await getBestMatchingGifs(text)
  const remainingMatches = bestMatches.filter(
    (gif) => !lastGifs.includes(gif.item.path)
  )
  if (!remainingMatches.length) {
    log.info(`No matches found for "${text}"`)
    return await axios.post(response_url, {
      replace_original: true,
      response_type: 'ephemeral',
      text: 'Sorry, no other matches were found, try another search!',
    })
  }

  // Choose the one to send
  const chosenGif = selectedWeightedRandomGif(remainingMatches)
  log.info(`Chose gif ${chosenGif.path} for "${text}"`)
  log.debug('Gif details', chosenGif)

  await axios.post(response_url, {
    replace_original: true,
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'plain_text',
          text: `Researched for "${text}"`,
          emoji: true,
        },
      },
      {
        type: 'image',
        image_url: hostname + join('/gifs', encodeURI(chosenGif.path)),
        alt_text: chosenGif.name,
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Send',
            },
            value: chosenGif.path,
            action_id: 'send_gif',
            style: 'primary',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Another One',
            },
            value: JSON.stringify({
              text,
              lastGifs: [...lastGifs, chosenGif.path],
            }),
            action_id: 'get_new_gif',
          },
        ],
      },
    ],
  })
}

const handleResponseAction = async function (
  hostname,
  { user, response_url },
  action
) {
  const { action_id, value } = action
  const { username } = user

  log.debug('Handling action', user, response_url, action_id, value)

  try {
    switch (action_id) {
      case 'send_gif':
        await handleSendGif(value, response_url, username, hostname)

        break

      case 'get_new_gif':
        await handleGetNewGif(value, response_url, username, hostname)

        break

      case 'cancel':
        axios.post(response_url, {
          delete_original: true,
          replace_original: true,
          response_type: 'ephemeral',
          text: '',
        })

        break

      default:
        log.warn(`Ignored unknown action type "${action_id}"`)
    }
  } catch (error) {
    log.error(`Failed to handle ${action_id} request ${error}`)
    axios.post(response_url, {
      delete_original: true,
      text: 'Something went wrong, sorry!',
    })
  }
}

/*
 * Endpoint to receive /request slash command from Slack.
 * Checks verification token
 */
app.post('/request', async (req, res) => {
  // Verify the signing secret
  if (!signature.isVerified(req)) {
    log.warn('Verification token mismatch')
    return res.status(404).send()
  }

  console.log(req.body.payload)

  // Parse the payload
  const { actions, ...payload } = JSON.parse(req.body.payload)
  const hostname = req.protocol + '://' + req.get('host')

  actions.forEach(handleResponseAction.bind(this, hostname, { ...payload }))

  // Ack the request
  res.send('')
})

app.use('/gifs', express.static(GIFS_PATH_FULL))

const server = app.listen(process.env.PORT || 5000, () => {
  log.log(
    'Express server listening on port %d in %s mode',
    server.address().port,
    app.settings.env
  )
})
