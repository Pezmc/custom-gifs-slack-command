const log = require('debug-level').log('custom-gifs-slack:weighted-select')

const weightedRandom = require('weighted-random')

/**
 * Given an array of gifs with a .score from search
 * Choose one at random weighted towards better matches
 */
module.exports = (gifs) => {
  const scores = gifs.map((gif) => gif.score)

  // What position does each score first appear
  const ranks = gifs.map((gif) => scores.indexOf(gif.score) + 1)

  // Inverse the ranks
  const maxRank = Math.max(...ranks) + 1
  const weights = ranks.map((rank) => maxRank - rank)
  log.debug('Ranks', ranks)
  log.debug('Normalized ranks', weights)

  const chosenIndex = weightedRandom(weights)

  log.debug('Chose gif index', chosenIndex)

  return gifs[chosenIndex].item
}
