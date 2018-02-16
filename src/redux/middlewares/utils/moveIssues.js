import _ from 'underscore'
import { KANBAN_LABEL, UNCATEGORIZED_NAME } from '../../../helpers'

export default function moveIssues(githubClient, cards, { label, milestone }) {
  return githubClient.getOcto().then(({ repos }) => {
    return Promise.all(
      cards.map(card => {
        if (label) {
          // Find all the labels, remove the kanbanLabel, and add the new label
          // Exclude Kanban labels
          const labels = _.filter(card.issue.labels, _label => {
            return (
              UNCATEGORIZED_NAME !== _label.name &&
              !KANBAN_LABEL.test(_label.name)
            )
          })
          const labelNames = _.map(labels)
          // When moving back to uncategorized do not add a new label
          if (UNCATEGORIZED_NAME !== label.name) {
            labelNames.push(label.name)
          }
          return repos(card.repoOwner, card.repoName)
            .issues(card.issue.number)
            .update({ labels: labelNames })
        } else if (milestone) {
          return repos(card.repoOwner, card.repoName)
            .milestones.fetchAll()
            .then(milestones => {
              // Find the milestone with a matching Title
              const matchingMilestone = _.filter(milestones, _milestone => {
                return _milestone.title === milestone.title
              })[0]

              if (matchingMilestone) {
                return repos(card.repoOwner, card.repoName)
                  .issues(card.issue.number)
                  .update({ milestone: matchingMilestone.number })
              } else {
                alert(
                  `It seems the target repository (${card.repoOwner}/${
                    card.repoName
                  }) does not have a matching milestone ${
                    milestone.title
                  } to move the Issue(s) to. Please create the milestone manually for now`
                )
              }
            })
        }
      })
    )
  })
}
