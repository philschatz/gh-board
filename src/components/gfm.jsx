import React from 'react'
import { connect } from 'react-redux'
import _ from 'underscore'
import ultramarked from 'ultramarked'
import linkify from 'gfm-linkify'
import classnames from 'classnames'

import { selectors } from '../redux/ducks/issue'
import { forEachRelatedIssue } from '../gfm-dom'
// import { isLight } from '../helpers'

ultramarked.renderer.link = (href, title, text) =>
  `<a target="_blank" href="${href}" title="${title}">${text}</a>`

const insertAfter = (newNode, node) => {
  if (node.nextSibling) {
    node.parentElement.insertBefore(newNode, node.nextSibling)
  } else {
    node.parentElement.appendChild(newNode)
  }
}

const EMOJI_RE = /(:\+?-?[+a-z0-9_-]+:)/g
const CHECKED_RE = /^\[x\] /
const UNCHECKED_RE = /^\[ \] /

// HACK: Octokat converts underscores to camelCase so for now we do too
const camelize = string => {
  if (string) {
    return string.replace(/[_-]+(\w)/g, function(m) {
      return m[1].toUpperCase()
    })
  } else {
    return ''
  }
}

// Construct the little [Open], [Closed], [Merged] badge next to a PR/Issue number
// Done in the DOM instead of React because it is injected into arbitrary HTML.
const buildStatusBadge = (card /* , columnRegExp */) => {
  const wrapNode = document.createElement('span')
  wrapNode.classList.add('issue-status-badges')
  const newNode = document.createElement('span')
  newNode.classList.add('badge')
  newNode.classList.add('issue-status-badge')
  if (card.issue) {
    const isPullRequest = card.isPullRequest()
    const state = card.issue.state // open, closed, reopened

    // Add  the issue title
    const titleNode = document.createElement('span')
    titleNode.classList.add('issue-title')
    titleNode.appendChild(document.createTextNode(card.issue.title))
    wrapNode.appendChild(titleNode)

    // const kanbanLabel = card.issue.labels.filter(label => {
    //   return columnRegExp.test(label.name)
    // })[0]
    // if (kanbanLabel) {
    //   // TODO: Figure out something for these since we cannot easily inject SVG
    //   const octicon = document.createElement('i')
    //   octicon.classList.add('octicon')
    //   octicon.classList.add('octicon-list-unordered')
    //   const columnIcon = document.createElement('span')
    //   columnIcon.classList.add('colored-icon')
    //   if (isLight(kanbanLabel.color)) {
    //     columnIcon.classList.add('is-light')
    //   }
    //   columnIcon.appendChild(octicon)
    //   // TODO: add is-light class
    //   columnIcon.style.backgroundColor = `#${kanbanLabel.color}`
    //   columnIcon.setAttribute(
    //     'title',
    //     kanbanLabel.name.replace(columnRegExp, '')
    //   )
    //   columnIcon.appendChild(octicon)
    //   wrapNode.appendChild(columnIcon)
    // }

    const iconNode = document.createElement('i')
    iconNode.classList.add('octicon')
    let iconClassName
    let msg
    if (isPullRequest) {
      iconClassName = 'octicon-git-pull-request'
      if (state === 'open') {
        msg = 'Open'
      } else {
        msg = 'Closed'
      }
    } else {
      if (state === 'open') {
        iconClassName = 'octicon-issue-opened'
        msg = 'Open'
      } else if (state === 'closed') {
        iconClassName = 'octicon-issue-closed'
        msg = 'Closed'
      } else if (state === 'reopened') {
        iconClassName = 'octicon-issue-reopened'
        msg = 'Open'
      } else {
        throw new Error('BUG! Invalid Issue state')
      }
    }
    const textNode = document.createTextNode(` ${msg}`)
    iconNode.classList.add(iconClassName)

    newNode.setAttribute('data-state', state)
    newNode.appendChild(iconNode)
    newNode.appendChild(textNode)
  }
  wrapNode.appendChild(newNode)
  return wrapNode
}

function buildCheckbox(checked) {
  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.disabled = true
  checkbox.checked = checked
  checkbox.classList.add('task-list-item-checkbox')
  return checkbox
}

class InnerMarkdown extends React.Component {
  updateLinks = () => {
    if (!this.props.disableLinks) {
      const root = this._ref

      // Find links to Issues/PR's and add the title, open/closed state, and kanban column
      // First, remove all badges from the DOM
      _.each(root.querySelectorAll('.issue-status-badges'), node =>
        node.remove()
      )

      forEachRelatedIssue(root, ({ repoOwner, repoName, number }, link) => {
        const card = this.props.getCard({ repoOwner, repoName, number })
        const newNode = buildStatusBadge(card, this.props.columnRegExp)
        insertAfter(newNode, link)
      })
    }
  }

  updateCheckboxes = () => {
    Array.from(this._ref.querySelectorAll('li')).forEach(listItem => {
      let checked = CHECKED_RE.test(listItem.textContent)
      let unchecked = !checked && UNCHECKED_RE.test(listItem.textContent)

      if (checked || unchecked) {
        const textChild = listItem.firstChild
        const checkbox = buildCheckbox(checked)

        listItem.classList.add('task-list-item')
        listItem.parentNode.classList.add('task-list')
        if (textChild.nodeType === Node.TEXT_NODE) {
          // remove the `[x] ` and replace it with a disabled input box
          textChild.textContent = textChild.textContent.substring(3)
          listItem.insertBefore(checkbox, textChild)
        }
      }
    })
  }

  updateDOM = () => {
    if (!this._ref) {
      return
    }
    this.updateLinks()
    this.updateCheckboxes()
  }

  componentDidMount() {
    this.updateDOM()
  }

  componentDidUpdate() {
    this.updateDOM()
  }

  replaceEmojis = text => {
    const emojisMap = this.props.emojis || {}
    return text.replace(EMOJI_RE, (m, p1) => {
      const emojiName = p1.substring(1, p1.length - 1) // Strip off the leading and trailing `:`
      const emojiUrl = emojisMap[camelize(emojiName)]
      if (emojiUrl) {
        return `<img class="emoji" src="${emojiUrl}" title="${p1}"/>`
      } else {
        return p1
      }
    })
  }

  render() {
    const { text, repoOwner, repoName, inline, className } = this.props
    if (!text) {
      return null
    }
    const hasHtmlTags = /</.test(text)
    const context = repoOwner + '/' + repoName
    const textStripped = text.replace(/<!--[\s\S]*?-->/g, '')
    const textEmojis = this.replaceEmojis(textStripped)
    const html = ultramarked(linkify(textEmojis, context))
    if (hasHtmlTags && inline) {
      // Issue titles and labels sometimes unintentionally have HTML tags in them.
      // but non-inline stuff (like Issue body) should not try to be smart.
      return <span className="markdown-body is-text">{text}</span>
    } else {
      if (html) {
        if (inline) {
          // Remove the wrapping `<p>` since this is supposed to be inline markdown
          // (ie for a title)
          const inlineHtml = html.replace(/^<p>/, '').replace(/<\/p>\n$/, '')
          const props = {
            className: classnames(['markdown-body', className]),
            dangerouslySetInnerHTML: { __html: inlineHtml },
          }
          return <span ref={c => (this._ref = c)} {...props} />
        } else {
          const props = {
            className: classnames(['markdown-body', className]),
            dangerouslySetInnerHTML: { __html: html },
          }
          return <div ref={c => (this._ref = c)} {...props} />
        }
      } else {
        return <div className="markdown-body is-empty" />
      }
    }
  }
}

export default connect(state => {
  return {
    emojis: state.emojis,
    columnRegExp: state.filter.columnRegExp,
    getCard: selectors.getCard.bind(this, state.issues),
  }
})(InnerMarkdown)
