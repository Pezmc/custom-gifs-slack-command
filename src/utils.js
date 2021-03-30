module.exports = {
  /**
   * Parse application/x-www-form-urlencoded && application/json
   * Use body-parser's `verify` callback to export a parsed raw body
   * that you need to use to verify the signature
   */
  rawBodyBuffer: (req, res, buf, encoding) => {
    if (buf && buf.length) {
      req.rawBody = buf.toString(encoding || 'utf8')
    }
  },

  /**
   * Scale an array of numbers to a new min and max
   */
  scaleBetween: (array, scaledMin, scaledMax) => {
    const max = Math.max(...array)
    const min = Math.min(...array)
    if (min === max) {
      return array
    }
    return array.map(
      (num) => ((scaledMax - scaledMin) * (num - min)) / (max - min) + scaledMin
    )
  },

  /**
   * Loop over an array of objects and group them by the passed key
   */
  groupBy: (xs, key) => {
    return xs.reduce(function (rv, x) {
      ;(rv[x[key]] = rv[x[key]] || []).push(x)
      return rv
    }, {})
  },
}
