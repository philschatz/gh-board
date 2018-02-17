import React from 'react'
import { renderToString } from 'react-dom/server'
import { connect } from 'react-redux'
import ultramarked from 'ultramarked'
import linkify from 'gfm-linkify'
import classnames from 'classnames'
import { htmlEncode } from 'htmlencode'
import IssueOrPullRequestBlurb from './issue-blurb'

import { selectors } from '../redux/ducks/issue'
import { isRelatedIssue } from '../gfm-dom'
// import { isLight } from '../helpers'

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

function buildCheckbox(checked) {
  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.disabled = true
  checkbox.checked = checked
  checkbox.classList.add('task-list-item-checkbox')
  return checkbox
}

class InnerMarkdown extends React.Component {
  getRenderer = () => {
    return {
      link: (href, title, text) => {
        const relatedIssue = !this.props.disableLinks && isRelatedIssue(href)
        if (relatedIssue) {
          const card = selectors.getCard(this.props.cards, relatedIssue)

          return renderToString(
            <IssueOrPullRequestBlurb
              card={card || relatedIssue}
              primaryRepoName={this.props.repoName}
              primaryRepoOwner={this.props.repoOwner}
              href={href}
              context={((card || {}).issue || {}).title}
            />
          )
        }
        return `<a target="_blank" href="${href}" title="${title}">${text}</a>`
      },
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
    const html = ultramarked(linkify(textEmojis, context), {
      renderer: this.getRenderer(),
    })
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
    cards: state.issues.CARD_CACHE,
  }
})(InnerMarkdown)
