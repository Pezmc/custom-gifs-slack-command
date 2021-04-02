const { promises: fs } = require('fs')
const { join } = require('path')
const { inspect } = require('util')

const log = require('debug-level').log('custom-gifs-slack:gifs')
const Fuse = require('fuse.js')
const glob = require('glob-promise')

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

const loadCategoryTags = async (root) => {
  return await fs.readFile(join(root, 'categories.json'), { encoding: 'utf8' })
}

const checkForBigGifs = (root, gifsInfo) => {
  const tasks = gifsInfo.map((gifInfo) =>
    fs.stat(join(root, gifInfo.path)).then((stats) => {
      return {
        gifInfo,
        stats,
      }
    })
  )

  Promise.all(tasks).then((values) => {
    const bigGifs = values.filter((file) => file.stats.size > 2 * 1024 * 1024)

    bigGifs.forEach((file) => {
      const sizeMB = file.stats.size / (1024 * 1024)
      const roundedSizeMB = Math.round(sizeMB * 100) / 100

      if (sizeMB > 10) {
        return log.error(
          `${file.gifInfo.path} is over 10MB at ${roundedSizeMB}MB.`,
          `It's unlikely to display at all, it's suggested that you compress it.`
        )
      }

      log.warn(
        `${file.gifInfo.path} is over 2MB at ${roundedSizeMB}MB.`,
        `It won't auto-expand on slack, it's suggested that you compress it.`
      )
    })
  })
}

const loadsGifs = async (path, categoryTags) => {
  log.info('Looking for gifs in ', path)
  const gifs = await glob('/**/*.gif', { root: path })

  const gifsInfo = gifs.map((fullPath) => {
    const gifPath = fullPath.replace(path + '/', '')
    const [folder, subfolder, ...name] = gifPath.split('/')

    const category = folder
    let subcategory = subfolder

    // Subfolders are optional
    if (!name.length) {
      name.push(subfolder)
      subcategory = undefined
    }

    const categoryText = category.replaceAll('-', ' ')
    const subCategoryText = (subcategory || '').replaceAll('-', ' ')

    if (!categoryTags[category] || !categoryTags[category].length) {
      log.warn(`Category ${category} doesn't have any tags in categories.json`)
    }

    return {
      name: name
        .join(' ')
        .replace('.gif', '')
        .replaceAll(/[^A-z]/g, ' '),
      path: gifPath,
      category: categoryText,
      categoryTags: categoryTags[category],
      subcategory: subCategoryText,
      subcategoryTags: categoryTags[subcategory] || [],
    }
  })

  checkForBigGifs(path, gifsInfo)

  log.info(`Loaded ${gifsInfo.length} gifs`)
  log.debug(
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

    this.gifs = await loadsGifs(this.path, await this.getCategoryTags())
    this.fuse = new Fuse(this.gifs, fuseOptions)

    return {
      gifs: this.gifs,
      fuse: this.fuse,
    }
  }

  async getCategoryTags() {
    if (this.categoryTags) {
      return this.categoryTags
    }

    const tagsAsString = await loadCategoryTags(this.path)
    this.categoryTags = JSON.parse(tagsAsString)

    console.log(this.categoryTags)

    return this.categoryTags
  }

  async search(pattern) {
    const { fuse } = await this.getGifsAndSearcher()

    return fuse.search(pattern)
  }

  async findByPath(path) {
    const { gifs } = await this.getGifsAndSearcher()

    return gifs.find((gif) => gif.path === path)
  }
}
