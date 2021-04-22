const log = require('debug-level').log('custom-gifs-slack:database-logger')

const { Client } = require('pg')

module.exports = class DatabaseLogger {
  constructor(databaseUrl) {
    this.db = new Client({
      connectionString: databaseUrl,
    })

    try {
      this.connectAndInit()
      this.db.connect()
    } catch (error) {
      log.error(`Something went wrong while setting up database: ${error}`)
    }
  }

  async connectAndInit() {
    const searchesTableQuery = `
      CREATE TABLE IF NOT EXISTS searches (
        term varchar,
        category varchar,
        selected varchar,
        previous_results text[],
        result_count integer,
        results text[],
        created_at timestamp
      );`

    log.trace(await this.db.query(searchesTableQuery))

    const sendGifTableQuery = `
      CREATE TABLE IF NOT EXISTS sends (
        gif varchar,
        match_found boolean,
        created_at timestamp
      );`

    log.trace(await this.db.query(sendGifTableQuery))
  }

  async logSearch({
    term,
    category = null,
    previousGifs = [],
    results = [],
    selectedGif = null,
  }) {
    const query = `
      INSERT INTO searches (term, category, selected, previous_results, result_count, results, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `

    console.log(results)

    const values = [
      term,
      category,
      selectedGif?.path,
      previousGifs,
      results.length,
      results.map((gif) => gif.item.path),
      new Date(),
    ]

    log.debug(`Running ${query} with ${values}`)

    try {
      log.trace(await this.db.query(query, values))
    } catch (error) {
      log.error(
        `Couldn't log search: ${error}, query: ${query}, values: ${values}`
      )
    }
  }

  async logSend({ gifPath, found = true }) {
    const query = `
      INSERT INTO sends (gif, match_found, created_at)
      VALUES ($1, $2, $3)
      `

    const values = [gifPath, found, new Date()]

    log.debug(`Running ${query} with ${values}`)

    try {
      log.trace(await this.db.query(query, values))
    } catch (error) {
      log.error(
        `Couldn't log send: ${error}, query: ${query}, values: ${values}`
      )
    }
  }

  async getPopularSearches() {
    const query = `
      SELECT term, category, COUNT(term) AS count
      FROM searches
      GROUP BY term, category
      ORDER BY count DESC
      LIMIT 25
    `

    log.debug(`Running ${query}`)

    try {
      const results = await this.db.query(query)
      log.trace(results)
      return results.rows
    } catch (error) {
      log.error(`Couldn't run search: ${error}, query: ${query}`)
    }
  }

  async getSearchesWithoutResults() {
    const query = `
      SELECT term, category, COUNT(term) AS count
      FROM searches
      WHERE result_count = 0
        AND cardinality(previous_results) = 0
      GROUP BY term, category
      ORDER BY count DESC
      LIMIT 100
    `

    log.debug(`Running ${query}`)

    try {
      const results = await this.db.query(query)
      log.trace(results)
      return results.rows
    } catch (error) {
      log.error(`Couldn't run search: ${error}, query: ${query}`)
    }
  }

  async getSearchesWithRejectedMatches() {
    const query = `
     SELECT term, category, MAX(cardinality(previous_results)) AS rejected_results, COUNT(term) AS count
      FROM searches
      WHERE result_count = 0
        AND cardinality(previous_results) > 0
      GROUP BY term, category
      ORDER BY count DESC
      LIMIT 100
    `

    log.debug(`Running ${query}`)

    try {
      const results = await this.db.query(query)
      log.trace(results)
      return results.rows
    } catch (error) {
      log.error(`Couldn't run search: ${error}, query: ${query}`)
    }
  }

  async getPopularSends() {
    const query = `
      SELECT gif, bool_and(match_found) AS matched, COUNT(gif) AS count
      FROM sends
      GROUP BY gif
      ORDER BY count DESC
      LIMIT 25
    `

    log.debug(`Running ${query}`)

    try {
      const results = await this.db.query(query)
      log.trace(results)
      return results.rows
    } catch (error) {
      log.error(`Couldn't run search: ${error}, query: ${query}`)
    }
  }
}
