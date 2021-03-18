require('dotenv').config()

const bodyParser = require('body-parser')
const debug = require('debug')('slash-command-template:index')
const express = require('express')

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

app.use(bodyParser.urlencoded({ verify: rawBodyBuffer, extended: true }))
app.use(bodyParser.json({ verify: rawBodyBuffer }))

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
  //const { trigger_id } = req.body

  console.log(req.body)

  return res.send('')
})

const server = app.listen(process.env.PORT || 5000, () => {
  console.log(
    'Express server listening on port %d in %s mode',
    server.address().port,
    app.settings.env
  )
})
