require('dotenv').config()

const bodyParser = require('body-parser')
const log = require('debug-level').log('custom-gifs-slack')
const express = require('express')
const logger = require('morgan')

const config = require('./config')
const { rawBodyBuffer } = require('./utils')

const app = express()

app.use(logger('dev'))
app.use(bodyParser.urlencoded({ verify: rawBodyBuffer, extended: true }))
app.use(bodyParser.json({ verify: rawBodyBuffer }))

app.get('/', async (req, res) => {
  res.send(
    `You're likely looking for <a href="https://${config.gifServer}">${config.gifServer}</a>`
  )
})

// Main routes
app.use(require('./routes/slack'))

// Error handler
app.use(function (err, req, res, _next) {
  // set locals, only providing error in development
  res.locals = res.locals || {}
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.json(res.locals)
})

// Boot app
const server = app.listen(config.port, () => {
  log.log(
    'Express server listening on port %d in %s mode',
    server.address().port,
    app.settings.env
  )
})
