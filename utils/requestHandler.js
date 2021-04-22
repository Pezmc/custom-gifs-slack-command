const axios = require('axios')
const log = require('debug-level').log('custom-gifs-slack:request-handler')

const config = require('../config')
const payloads = require('../utils/payloads')
const selectedWeightedRandomGif = require('../utils/weightedSelect')

const handleSendGif = async function (gifPath, response_url, user) {
  const chosenGif = await config.gifs.findByPath(gifPath)
  if (!chosenGif) {
    log.warn(`Couldn't find a gif with a path matching ${gifPath}`)
    config.logger?.logSend({ gifPath, found: false })
    return await axios.post(response_url, payloads.noMatchForPath(gifPath))
  }

  axios.post(response_url, payloads.deleteMessage())

  await axios.post(response_url, payloads.postGif(user.username, chosenGif))

  config.logger?.logSend({ gifPath })
}

const handleGetNewGif = async function (value, response_url) {
  const { searchTerm, lastGifs, category } = JSON.parse(value)

  // Find some gifs
  log.debug(`Searching for other gifs matching "${searchTerm}"`)
  const bestMatches = await config.gifs.bestMatches(searchTerm, category)
  const remainingMatches = bestMatches.filter(
    (gif) => !lastGifs.includes(gif.item.path)
  )
  if (!remainingMatches.length) {
    log.info(
      `No other matches found for "${searchTerm}" in "${category ?? 'all'}"`
    )
    config.logger?.logSearch({
      term: searchTerm,
      category,
      previousGifs: lastGifs,
    })
    return await axios.post(
      response_url,
      payloads.noMatches(searchTerm, category, lastGifs)
    )
  }

  // Choose the one to send
  const chosenGif = selectedWeightedRandomGif(remainingMatches)
  log.info(
    `Chose gif ${chosenGif.path} for "${searchTerm}" in ${category ?? 'all'}`
  )
  log.debug('Gif details', chosenGif)

  config.logger?.logSearch({
    term: searchTerm,
    category,
    previousGifs: lastGifs,
    results: remainingMatches,
    selectedGif: chosenGif,
  })

  axios.post(
    response_url,
    payloads.confirmGif(searchTerm, chosenGif, category, lastGifs)
  )
}

module.exports = async function ({ user, response_url }, action) {
  const { action_id, value } = action

  log.debug('Handling action', user, response_url, action_id, value)

  try {
    switch (action_id) {
      case 'send_gif':
        await handleSendGif(value, response_url, user)

        break

      case 'get_new_gif':
        await handleGetNewGif(value, response_url)

        break

      case 'cancel':
        await axios.post(response_url, payloads.deleteMessage())

        break

      default:
        log.warn(`Ignored unknown action type "${action_id}"`)
    }

    log.info(`Handled a ${action_id} request with value ${value}`)
  } catch (error) {
    log.error(`Failed to handle ${action_id} request ${error}`)
    axios.post(response_url, payloads.genericError())
  }
}
