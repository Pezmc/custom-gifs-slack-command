const { inspect } = require('util')

const Fuse = require('fuse.js')
const glob = require('glob-promise')
const findSymonyms = require('synonyms')

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
      weight: 2.5,
    },
    {
      name: 'tags',
      weight: 2,
    },
    {
      name: 'name',
      weight: 3,
    },
    {
      name: 'synonyms.verb',
      weight: 1.5,
    },
    {
      name: 'synonyms.noun',
      weight: 1,
    },
  ],
}

const categoryTags = {
  'high-five': ['high five'],
  'mic-drop': ['mic drop', 'peace out'],
  'thumbs-up': ['plus one', 'yes', 'agree'],
  agree: ['yes', 'on board', 'ok'],
  clap: ['impressed', 'great', 'clapping', 'applause'],
  disappointment: ['disappointed', 'defeated'],
  disaster: ['failure'],
  excitement: ['excited', 'enthused'],
  facepalm: ['face palm'],
  finished: ['done', 'complete'],
  laughing: ['lol', 'joke'],
  lonely: ['alone', 'isolated'],
  maybe: ['perhaps', 'potentially', ''],
  nope: ['no', 'thumbs down'],
  sad: ['sadness', 'upset'],
  sarcasm: ['sarcastic'],
  surprised: ['shock'],
  thinking: ['thought'],
  working: ['busy', 'programming'],
}

const loadsGifs = async (path) => {
  console.info('Looking for gifs in ', path)
  const gifs = await glob('/**/*.gif', { root: path })

  const gifsInfo = gifs.map((fullPath) => {
    const gifPath = fullPath.replace(path + '/', '')
    const [folder, ...name] = gifPath.split('/')

    const category = folder
    const categoryText = category.replaceAll('-', ' ')

    const synonymResults = findSymonyms(categoryText)
    const nouns = synonymResults?.n
    const verbs = synonymResults?.v

    return {
      category: categoryText,
      name: name
        .join(' ')
        .replace('.gif', '')
        .replaceAll(/[^A-z]/g, ' '),
      path: gifPath,
      tags: categoryTags[category],
      synonyms: {
        nouns,
        verbs,
      },
    }
  })

  console.debug(
    'Found the following gifs',
    inspect(gifsInfo, { depth: null, colors: true })
  )

  return gifsInfo
}

module.exports = class Gifs {
  constructor(path) {
    this.path = path

    this.getGifsAndSearcher()
  }

  async getGifsAndSearcher() {
    if (this.gifs && this.fuse) {
      return {
        gifs: this.gifs,
        fuse: this.fuse,
      }
    }

    this.gifs = await loadsGifs(this.path)
    this.fuse = new Fuse(this.gifs, fuseOptions)

    return {
      gifs: this.gifs,
      fuse: this.fuse,
    }
  }

  async search(pattern) {
    const { fuse } = await this.getGifsAndSearcher()

    return fuse.search(pattern)
  }
}
