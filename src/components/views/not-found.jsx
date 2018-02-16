import React from 'react'
import { Link } from 'react-router'

const NotFoundShell = React.createClass({
  render() {
    return (
      <div>
        <h3>Invalid URL</h3>
        <p>
          Woops! It looks like the URL is invalid. If you were looking for a
          repository, you can go to the <Link to="/">Dashboard</Link> and open a
          repository. Hope that helps!
        </p>
      </div>
    )
  },
})

export default NotFoundShell
