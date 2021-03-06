const { join } = require('path')
const { inspect } = require('util')

const axios = require('axios')
const log = require('debug-level').log('custom-gifs-slack:gifs')
const Fuse = require('fuse.js')

const NodeCache = require('node-cache')

const REFRESH_GIFS_AFTER_SECONDS = 30 * 60
const BACKGROUND_REFRESH_GIFS_AFTER_SECONDS = 5 * 60

const gifsCache = new NodeCache({
  stdTTL: REFRESH_GIFS_AFTER_SECONDS,
  checkperiod: BACKGROUND_REFRESH_GIFS_AFTER_SECONDS,
  useClones: false,
})

const fuseOptions = {
  // isCaseSensitive: false,
  includeScore: true,
  // shouldSort: true,
  // includeMatches: false,
  // findAllMatches: false,
  // minMatchCharLength: 1,
  // location: 0,
  // threshold: 0.6,
  // distance: 100,
  // useExtendedSearch: false,
  // ignoreLocation: false,
  // ignoreFieldNorm: false,
  keys: [
    {
      name: 'category',
      weight: 2,
    },
    {
      name: 'categoryTags',
      weight: 1.5,
    },
    {
      name: 'subcategory',
      weight: 2.5,
    },
    {
      name: 'subcategoryTags',
      weight: 2,
    },
    {
      name: 'name',
      weight: 3,
    },
  ],
}

const checkForBigGifs = (gifsInfo) => {
  const bigGifs = gifsInfo.filter((gif) => gif.size > 2 * 1024 * 1024)

  bigGifs.forEach((gif) => {
    const sizeMB = gif.size / (1024 * 1024)
    const roundedSizeMB = Math.round(sizeMB * 100) / 100

    if (sizeMB > 10) {
      return log.error(
        `${gif.path} is over 10MB at ${roundedSizeMB}MB.`,
        `It's unlikely to display at all, it's suggested that you compress it.`
      )
    }

    log.warn(
      `${gif.path} is over 2MB at ${roundedSizeMB}MB.`,
      `It won't auto-expand on slack, it's suggested that you compress it.`
    )
  })
}

// TO-DO: Basic caching and cache busting of this
let gifsInfo
const loadGifs = async (gifsServer) => {
  if (gifsInfo) {
    return gifsInfo
  }

  const metaURL = `https://${join(gifsServer, 'meta.json')}`
  log.info(`Loading gifs from ${metaURL}`)

  // To-do: Error handling
  try {
    const { data } = await axios.get(metaURL)
    gifsInfo = data.gifs
  } catch (error) {
    log.fatal(error)
    throw new Error(
      `Request to ${metaURL} failed, please check your server path`
    )
  }

  checkForBigGifs(gifsInfo)

  log.info(`Loaded ${gifsInfo.length} gifs`)
  log.debug(
    'Found the following gifs',
    inspect(gifsInfo, { depth: null, colors: true })
  )

  return gifsInfo
}

const markGifsRecentlyLoaded = () => {
  gifsCache.set('checked-recently', true, BACKGROUND_REFRESH_GIFS_AFTER_SECONDS)
}

module.exports = class Gifs {
  constructor(gifsServer) {
    this.gifsServer = gifsServer

    this.getGifs() // pre-fetch on init
  }

  async getGifs() {
    let gifs = gifsCache.get('gifs')

    if (!gifs) {
      gifs = await loadGifs(this.gifsServer)

      gifsCache.set('gifs', gifs)
      markGifsRecentlyLoaded()
    }

    // Background request to update gifs
    else if (!gifsCache.get('checked-recently')) {
      log.info(`Making background request to update gifs`)

      // Optimistic to avoid running multiple times
      markGifsRecentlyLoaded()

      loadGifs(this.gifsServer).then((gifs) => {
        gifsCache.set('gifs', gifs)
      })
    }

    return gifs
  }

  async search(pattern, category = undefined) {
    let gifs = await this.getGifs()

    if (category) {
      // Considers all folders in path as a "category"
      gifs = gifs.filter((gif) => {
        const categories = gif.path.split('/').slice(0, -1)
        return categories.includes(category)
      })

      log.debug(
        `There are ${gifs.length} gifs in the subset matching ${category}`
      )
    }

    const fuse = new Fuse(gifs, fuseOptions)

    return fuse.search(pattern)
  }

  async findByPath(path) {
    const gifs = await this.getGifs()

    return gifs.find((gif) => gif.path === path)
  }

  async bestMatches(searchTerm, category = undefined, threshold = 0.25) {
    log.debug('Searching for', searchTerm, category)
    const matches = await this.search(searchTerm, category)

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
}
