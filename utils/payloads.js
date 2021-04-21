const { join } = require('path')

const config = require('../config')

const gifBlock = (chosenGif) => {
  return {
    type: 'image',
    image_url: 'https://' + join(config.gifsServer, encodeURI(chosenGif.path)),
    alt_text: `${chosenGif.category} / ${chosenGif.subcategory} / ${chosenGif.name}`,
    title: {
      type: 'plain_text',
      text: chosenGif.name,
    },
  }
}

const errorReply = (message) => {
  return {
    replace_original: true,
    response_type: 'ephemeral',
    text: message,
  }
}

module.exports = {
  confirmGif(searchTerm, chosenGif, previousGifs = []) {
    return {
      replace_original: true,
      response_type: 'ephemeral',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'plain_text',
            text: `Searched for "${searchTerm}":`,
            emoji: true,
          },
        },
        gifBlock(chosenGif),
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Send',
              },
              value: chosenGif.path,
              action_id: 'send_gif',
              style: 'primary',
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: previousGifs.length >= 1 ? 'Another Try' : 'Try Again',
              },
              value: JSON.stringify({
                searchTerm,
                lastGifs: [...previousGifs, chosenGif.path],
              }),
              action_id: 'get_new_gif',
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Cancel',
              },
              action_id: 'cancel',
            },
          ],
        },
      ],
    }
  },

  postGif(username, chosenGif) {
    return {
      response_type: 'in_channel',
      replace_original: false,
      username,
      //icon_emoji:
      blocks: [gifBlock(chosenGif)],
    }
  },

  noMatches(searchTerm, previousGifs = []) {
    return errorReply(
      `Sorry, no ${
        previousGifs.length ? 'other' : 'good'
      } matches were found for '${searchTerm}', try another search!`
    )
  },

  noMatchForPath(path) {
    return errorReply(
      `Something went wrong, couldn't find a gif matching "${path}", please try again`
    )
  },

  genericError() {
    return {
      delete_original: true,
      text: 'Something went wrong, sorry!',
    }
  },

  deleteMessage() {
    return {
      response_type: 'ephemeral',
      text: '',
      replace_original: true,
      delete_original: true,
    }
  },
}
