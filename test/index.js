import test from 'ava'
const webdriverio = require('webdriverio') // Does not support ES6 imports yet

const browser = webdriverio.remote({
  // use the default driver (Travis-CI has Firefox)
  desiredCapabilities: {browserName: process.env['CI'] ? 'firefox' : 'chrome'}
})

const waitUntilDoneLoading = async () => {
  await browser.waitUntil(async ()=> {
    const isLoading = await browser.isExisting('.is-loading')
    return !isLoading
  }, 60 * 1000) // May take a long time to fetch the issues
}


GITHUB_TOKEN = process.env['GH_TOKEN']

test.before(async t => {
  await browser.init()
    .url('http://localhost:8080')

  // Set a GitHub token if one is defined
  if(GITHUB_TOKEN) {
    await browser.execute(function(token) {
      window.localStorage['gh-token'] = token
    }, GITHUB_TOKEN)
    // Refresh so the JS loads the token
    await browser.refresh()
  }
})

test.after.always(async t => {
  browser.saveScreenshot('./selenium-screenshot.png')
  await browser.end()
})


test.beforeEach(async t => {
  await browser.url('http://localhost:8080')
  await browser.refresh()
})


test('shows a repo', async t => {
  await browser.click('.list-group > .repo-item > a')
  await waitUntilDoneLoading(browser)
  // Close the "Anonymous Browsing" modal
  if (!GITHUB_TOKEN) {
    await browser.waitForExist('.modal-dialog button.close')
    await browser.click('.modal-dialog button.close')
  }
  // Verify that an Issue exists
  // FIXME: When loading is done then the issues should be listed (now it has to wait for 10 seconds)
  // await browser.waitForExist('a.issue-title', 10 * 1000)
  await browser.getText('a.issue-title')
})


test('shows the label-editing screen', async t => {
  await browser.click('.list-group > .repo-item > a')
  await waitUntilDoneLoading(browser)
  // Close the "Anonymous Browsing" modal
  if (!GITHUB_TOKEN) {
    await browser.waitForExist('.modal-dialog button.close')
    await browser.click('.modal-dialog button.close')
  }
  await browser.click('#display-settings')
  await browser.click('.octicon-tag') // HACK: Should use a class name or something
  // await browser.waitForExist('.batch-label')
})
