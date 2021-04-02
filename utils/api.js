const qs = require('querystring')

const axios = require('axios')
const apiUrl = 'https://slack.com/api'

const callAPIMethod = async (method, payload) => {
  const data = Object.assign({ token: process.env.SLACK_ACCESS_TOKEN }, payload)
  const result = await axios.post(`${apiUrl}/${method}`, qs.stringify(data))
  return result.data
}

module.exports = {
  callAPIMethod,
}
