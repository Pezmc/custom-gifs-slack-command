const log = require('debug-level').log('custom-gifs-slack:weighted-select')

const weightedRandom = require('weighted-random')

/**
 * Given an array of gifs with a .score from search
 * Choose one at random weighted towards better matches
 */
module.exports = (gifs) => {
  const scores = gifs.map((gif) => gif.score)

  // Lowest scores, are worth the most "weight"
  const reversedScores = scores.reverse()

  // What position does each score first appear
  const weights = gifs.map((gif) => reversedScores.lastIndexOf(gif.score) + 1)

  for (const key in weights) {
    gifs[key].weight = weights[key]
  }
  log.debug('Gifs with weights', gifs)

  const chosenIndex = weightedRandom(weights)
  log.debug('Chose gif index', chosenIndex)

  return gifs[chosenIndex].item
}
