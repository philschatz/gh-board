# Serverless Kanban Board for GitHub Issues [![gh-board](https://img.shields.io/github/issues/philschatz/gh-board.svg?label=Issues%20%28gh-board%29)](http://philschatz.com/gh-board/)

Why waste time and money paying for a Ticket Tracker when you already work in GitHub? Now, you don't have to.

![image](https://cloud.githubusercontent.com/assets/253202/13620649/4ef888cc-e55f-11e5-8576-8970abba8660.png)

- [Features](#features)
  - [Multiple Repositories](#multiple-repositories)
  - [Linked Issues and Pull Requests](#linked-issues-and-pull-requests)
  - [Real-Time Collaboration](#real-time-collaboration)
  - [Filtering](#filtering)
  - [Milestone Planning](#milestone-planning)
  - [Moving Cards](#moving-cards)
  - [Task Lists](#task-lists)
  - [CI Status and Merge Conflict](#ci-status-and-merge-conflict)
- [Examples](#examples)
- [Development](#development)
  - [How Does it Work?](#how-does-it-work)
- [TODO List](#todo-list)

# Features

### Multiple Repositories

Multiple Repositories in an organization can be shown on a board (from different organizations too!). The repository is shown in gray next to the Issue number.

![image](https://cloud.githubusercontent.com/assets/253202/13621991/70bb1312-e569-11e5-86ef-82372752fbff.png)


### Linked Issues and Pull Requests

Just add `#123` or `orgName/RepoName#123` to the Issue or Pull Request body and linked Issues will show up with the column they are in, both below the Card and in the preview popup.

![image](https://cloud.githubusercontent.com/assets/253202/13620658/63f99478-e55f-11e5-8e9f-9babcfb69a29.png)


### Real-Time Collaboration

By clicking the :pencil2: icon next to the card title, multiple people can edit the Issue Body at once (ie in a meeting), and when editing is done, one person clicks <kbd>Save to GitHub</kbd>.

Features:

- send anyone the link to edit
- real-time preview of Markdown
- references to Issues show with their state and board column
- Sequence, State, Gantt, and other diagrams are supported (using [mermaid](https://knsv.github.io/mermaid/))

<!-- ![image](https://cloud.githubusercontent.com/assets/253202/13620696/a0497c72-e55f-11e5-8e6d-abc2077d82bf.png) -->

![gh-board_realtime-editing4](https://cloud.githubusercontent.com/assets/253202/13621429/8c917166-e565-11e5-8e80-10fab6d51253.gif)


### Filtering

- cards can be filtered by label, milestone, board column, or user
- filters can be inclusive as well as exclusive

![gh-board_filters](https://cloud.githubusercontent.com/assets/253202/13621706/958fafec-e567-11e5-9411-405de7f34664.gif)


### Milestone Planning

When doing Milestone (or Sprint) planning there is a view to easily move cards into milestones

![gh-board_milestone-planning](https://cloud.githubusercontent.com/assets/253202/13621710/9e763c98-e567-11e5-95bd-6473ffedd0ef.gif)

### Moving Cards

Cards can be dragged from one column to the next

![gh-board_moving-cards](https://cloud.githubusercontent.com/assets/253202/13621716/a4ea20f8-e567-11e5-9150-795f1acf89e9.gif)

### Task Lists

By using the `- [ ]` notation in the body of an Issue or Pull Request, the progress of an Issue is shown in the top-right corner of a Card.

![gh-board_task-lists](https://cloud.githubusercontent.com/assets/253202/13621813/523b1438-e568-11e5-997f-5f5014456783.gif)

<!--
![gh-board_task-lists](https://cloud.githubusercontent.com/assets/253202/13621722/ae9fff82-e567-11e5-93bd-96a6c0330e07.gif) -->

### CI Status and Merge Conflict

- CI Status shows up as a green :heavy_check_mark: or a red :x: on the top-right corner of a card
- Merge conflicts are shown with a yellow :warning: and have a diagonal striped background

<!-- ![image](https://cloud.githubusercontent.com/assets/253202/13620679/862188ee-e55f-11e5-831f-f5059c18d3ac.png) -->

![image](https://cloud.githubusercontent.com/assets/253202/13621863/bac1f62a-e568-11e5-9761-ce41c84b4eef.png)

![image](https://cloud.githubusercontent.com/assets/253202/13621876/d1bcfeb0-e568-11e5-8a73-c5ef61645a88.png)

![image](https://cloud.githubusercontent.com/assets/253202/13621905/dfee5920-e568-11e5-94df-98a887f63d24.png)


# Examples

Just specify a GitHub repository in the URL and off you go!

- [openstax/tutor-js](http://philschatz.com/gh-board/#/r/openstax:tutor-js)
- [openstax/tutor-js + tutor-server](http://philschatz.com/gh-board/#/r/openstax:tutor-js|tutor-server) (multiple repositories)
- [react-bootstrap/react-bootstrap](http://philschatz.com/gh-board/#/r/react-bootstrap:react-bootstrap)
- [jquery/jquery](http://philschatz.com/gh-board/#/r/jquery:jquery)
- Or wildcards! (must be logged in) using `http://philschatz.com/gh-board/#/r/openstax:tutor-js|*`


# Development

- `npm start` to start up the dev server and go to `http://localhost:8080`
- `npm run build` to generate the JS and CSS files in `./dist`

### How Does it Work?

- JavaScript calls the GitHub API and pulls in the Issues for a given repository.
  - Since there is no server to do OAuth, people need to provide a GitHub token which is stored in `localStorage`
- It uses the first repository to get the Issue Labels and Milestones.
- There are special Labels which represent the board columns (in the format `# - Column Title`)
- To be a "Good API Citizen" `gh-board` uses eTags provided by GitHub and saves them in `localStorage` (or `IndexedDB`)


### Hosting your own Forked Version

1. create a fork
2. switch to the `gh-pages` branch
3. make a commit and push it to `gh-pages` (to trigger GitHub to start hosting the files)
4. go to `https://${USERNAME}.github.io/gh-board/`
5. To make edits and push them up on GitHub
  - make edits in the src directory in `gh-pages`
  - run `npm run build`
  - commit and push


# TODO List

- [x] combine Issue and the Pull Requests that fixes it
- [x] handle dragging in multiple repos:
  1. auto-create the label in the new repo (confirm first)
- [x] add checkbox for selecting multiple repos in dashboard
- [x] select between Issue-centric and PullRequest-centric view
- [x] support milestone (sprint) planning by making each milestone a column
- [ ] add GitHub search
