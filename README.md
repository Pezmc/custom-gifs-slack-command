# Your Own Custom Gif Search for Slack

> Allows you to have your own collection of gifs that you can search and post to slack with a simple command.

## Usage

1. [Setup the Repo](#setup-the-repo)
1. [Deploy somewhere](#deploy-somewhere)
1. [Configure Slack](#configure-slack)
1. [Try it out](#try-it-out)
1. [Add some extra gifs](#add-some-extra-gifs)

### Setup Repo

Either fork or use this repo as a template.

### Deploy Somewhere

Deploy the code from this repo to a server, it comes pre-configured for Heroku

```bash
heroku create
git push heroku main
```

### Configure Slack

1. Create an app at [https://api.slack.com/apps](https://api.slack.com/apps)
1. Add a Slash command
1. Enable Interactive components
1. Navigate to the **OAuth & Permissions** page and select the following bot token scopes:
   - `commands`
   - `chat:write`
   - `chat:write.customize`
1. Click 'Save Changes' and install the app (You should get an OAuth access token after the installation)

#### Add a Slash Command

1. Go back to the app settings and click on Slash Commands.
1. Click the 'Create New Command' button and fill in the following:
   - Command: `/gifs`
   - Request URL: Your server URL + `/command`
   - Short description: `Search for a gif`
   - Usage hint: `[search terms]`

If you're using Heroku, your URL will be something like: `http://[your-instance-name].herokuapp.com/command`.

#### Enable Interactive Components

1. Go back to the app settings and click on Interactive Components.
1. Set the Request URL to your server URL + `/request`.
1. Save the change.

#### Set Your Credentials

1. Set the following environment variables to `.env` (see `.env.sample`):
   - `SLACK_SIGNING_SECRET`: Your app's Signing Secret (available on the **Basic Information** page)
   - For Heroku you'll need to use `heroku config:set SLACK_SIGNING_SECRET=<your-secret>`
1. If you're running the app locally, run the app (`npm start`)

### Try It Out

Head to your Slack workspace and type the Slash command you setup above, for example:

```
/gif testing
```

You should see an interactive block where you can send, search again, or cancel.

![](./docs/how-it-looks.png)

If you head directly to your hosted instance, you can see a list of all the loaded gifs.

For Heroku that would be `http://[your-instance-name].herokuapp.com/`

### Add some extra gifs

> Important: Gifs over 2MB won't auto-expand in Slack, and gifs that are too large (~10MB+ won't load at all).

The gifs are organised into folders and subfolders under `gifs/`, only the deepest two folders are considered when searching.

This repo comes with some examples, and shows how you can nest folders to make searching easier.

When searching for a gif, the name is matched first, followed by the subcategory, then any additional subcategory tags from `gifs/categories.js`, then the category and finally the category tags.

For example:

```
gifs/happy/clap/my-image.gif - will match my image, followed by clap (and tags) then happy (and tags)
gifs/happy/laughing.gif - will match laughing, followed by happy (and tags)
```

You can either add your gifs under the pre-existing folders, or, since only the last two folders are considered, namespace them entirely:

```
gifs/custom/happy/clap/my-image.gif - matches image, clap (and tags), then happy (and tags)
gifs/custom/happy/laughing.gif - matches laughing then happy (and tags), and custom (and tags if any set)
gifs/custom/my-gif.gif - matches my gif, then custom (and tags if set)
```

#### Extra Tagging

The tagging metadata file is found in `gifs/categories.js`, and maps category and subcategory names to extra words or phrases that will match.

This means that the "yes" folder for example, also matches for "affirmative, ok, okay" etc...

Subcategories and categories are looked up based on the deepest and second deepest folder, and use the same list. Meaning you can namespace your gifs if you'd like.
