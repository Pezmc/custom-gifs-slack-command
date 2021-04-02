require('dotenv').config()

const { join } = require('path')

const bodyParser = require('body-parser')
const log = require('debug-level').log('custom-gifs-slack')
const express = require('express')
const exphbs = require('express-handlebars')
const handlebarsHelpers = require('handlebars-helpers')
const logger = require('morgan')

const config = require('./config')
const { rawBodyBuffer, groupBy } = require('./utils')

const app = express()

const hbs = exphbs.create({
  helpers: handlebarsHelpers(['string']),
})

app.engine('handlebars', hbs.engine)
app.set('view engine', 'handlebars')

app.use(logger('dev'))
app.use(bodyParser.urlencoded({ verify: rawBodyBuffer, extended: true }))
app.use(bodyParser.json({ verify: rawBodyBuffer }))

app.get('/', async (req, res) => {
  const { gifs: availableGifs } = await config.gifs.getGifsAndSearcher()

  const byCategory = groupBy(availableGifs, 'category')

  Object.keys(byCategory).forEach((key) => {
    byCategory[key] = groupBy(byCategory[key], 'subcategory')
  })

  res.render('home', { categories: byCategory })
})

// Main routes
app.use(require('./routes/slack'))
app.use(
  '/gifs',
  express.static(config.gifsPath, {
    maxage: '365d',
  })
)
app.use(express.static(join(__dirname, 'public')))

// Error handler
app.use(function (err, req, res, _next) {
  // set locals, only providing error in development
  res.locals = res.locals || {}
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

// Boot app
const server = app.listen(config.port, () => {
  log.log(
    'Express server listening on port %d in %s mode',
    server.address().port,
    app.settings.env
  )
})
