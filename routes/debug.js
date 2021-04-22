const log = require('debug-level').log('custom-gifs-slack:debug-route')
const debug = require('express').Router()

const config = require('../config')

const html = require('../utils/html')

/*
 * Log some interesting metrics
 */
debug.get('/debug', async (req, res) => {
  // Verify the admin secret
  const inputSecret = req.query.adminSecret
  console.log(inputSecret)
  if (!config.adminSecret || inputSecret !== config.adminSecret) {
    log.warn(`Admin password didn't match ${inputSecret} provided`)
    return res.status(401).send(html({ title: 'Not Found', body: 'Not found' }))
  }

  if (!config.logger) {
    log.warn(`Tried to access debug page but database is not set up yet!`)
    const body =
      "The logging database is not configured so there's nothing to show here."
    return res.send(
      html({ title: 'Custom Slack Gifs: Debug Not Enabled', body })
    )
  }

  const [
    popularSearches,
    popularGifs,
    searchesWithoutResults,
    searchesWithBadResults,
  ] = await Promise.all([
    config.logger?.getPopularSearches(),
    config.logger?.getPopularSends(),
    config.logger?.getSearchesWithoutResults(),
    config.logger?.getSearchesWithRejectedMatches(),
  ])

  const body = `
    <style>
      table {
        border-collapse: collapse;
        margin: 25px 0;
        font-size: 0.9em;
        font-family: sans-serif;
        min-width: 400px;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
        width: 100%;
        text-align: left;
      }

      table tr th {
        background-color: #009879;
        color: #ffffff;
      }

      table th,
      table td {
        padding: 12px 15px;
      }

      table tbody tr {
          border-bottom: 1px solid #dddddd;
      }

      table tbody tr:nth-of-type(even) {
          background-color: #f3f3f3;
      }

      table tbody tr:last-of-type {
          border-bottom: 2px solid #009879;
      }

      table tbody tr:hover {
        color: #009879;
      }
    </style>



    <h1>Most Popular</h1>
    <h2>Searches</h2>
    <table>
      <tr>
        <th width="40%">Search Term</th>
        <th width="20%">Category</th>
        <th>Searches</th>
        <th>Results</th>
      </tr>
      ${popularSearches
        .map(
          (row) =>
            `<tr>
            <td>${row.term}</td>
            <td>${row.category}</td>
            <td>${row.count}</td>
            <td>${row.result_count}</td>
          </tr>`
        )
        .join('\n')}
    </table>

    <h2>Gifs</h2>
    <table>
      <tr>
        <th width="40%">Gif</th>
        <th width="20%">Matched?</th>
        <th>Posts</th>
      </tr>
      ${popularGifs
        .map(
          (row) =>
            `<tr>
            <td>${row.gif}</td>
            <td>${row.matched}</td>
            <td>${row.count}</td>
          </tr>`
        )
        .join('\n')}
    </table>

    <h2>With No Results</h2>
    <h3>Searches</h3>
    <table>
      <tr>
        <th width="40%">Gif</th>
        <th width="20%">Category</th>
        <th>Posts</th>
      </tr>
      ${searchesWithoutResults
        .map(
          (row) =>
            `<tr>
            <td>${row.term}</td>
            <td>${row.category}</td>
            <td>${row.count}</td>
          </tr>`
        )
        .join('\n')}
    </table>

    <h3>Searches Where All Matches Rejected</h3>
    <table>
      <tr>
        <th width="40%">Term</th>
        <th width="20%">Category</th>
        <th>Rejected Matches</th>
        <th>Count</th>
      </tr>
      ${searchesWithBadResults
        .map(
          (row) =>
            `<tr>
            <td>${row.term}</td>
            <td>${row.category}</td>
            <td>${row.rejected_results}</td>
            <td>${row.count}</td>
          </tr>`
        )
        .join('\n')}
    </table>
  `

  return res.send(html({ title: 'Custom Slack Gifs: Debug', body }))
})

module.exports = debug
