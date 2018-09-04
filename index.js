const GitHub = require('github-api')
const { getName, getAlias } = require('guld-user')
const { getPass } = require('guld-pass')
const { getFS } = require('guld-fs')
const got = require('got')
const path = require('path')
const home = require('user-home')
const HOST = 'github'
var client
var fs

async function getClient (user) {
  user = user || await getName()
  var passuser = process.env.PASSUSER || process.env.USER || user
  var pass = await getPass(`${passuser}/git/${HOST}`)
  return new GitHub({
    username: pass.login,
    password: pass.password
  })
}

function parseRepo (repo) {
  var privacy
  var mainbranch
  if (repo.private) privacy = 'private'
  else privacy = 'public'
  if (repo.default_branch) mainbranch = repo.default_branch
  else mainbranch = repo.owner.login
  return {
    name: repo.name,
    privacy: privacy,
    owner: repo.owner.login,
    mainbranch: mainbranch
  }
}

async function createRepo (rname, user, privacy = 'public', options = {}) {
  user = user || await getName()
  var hostuser = await getAlias(user, HOST)
  if (hostuser === 'undefined' || hostuser === undefined) hostuser = user
  else if (hostuser && Object.keys(hostuser).length === 0) hostuser = user
  // validate required field(s)
  if (typeof rname !== 'string' || rname.length === 0) throw new Error('Name is required to create repo.')
  options.name = rname
  // override destructive merge strategies
  if (!options.hasOwnProperty('allow_squash_merge')) options.allow_squash_merge = false // eslint-disable-line camelcase
  // if (!options.hasOwnProperty('allow_merge_commit')) options.allow_merge_commit = false
  if (!options.hasOwnProperty('allow_rebase_merge')) options.allow_rebase_merge = false // eslint-disable-line camelcase
  client = client || await getClient(user)
  var account = client.getUser(hostuser)
  var resp
  try {
    resp = await account.createRepo(options)
  } catch (e) {
    account = client.getOrganization(hostuser)
    resp = await account.createRepo(options)
    if (resp.status < 300) return parseRepo(resp.data)
    else throw new Error(`Github API Error: ${resp.statusText}`)
  }
  if (resp.status < 300) return parseRepo(resp.data)
}

async function listRepos (user) {
  user = user || await getName()
  var hostuser = await getAlias(user, HOST)
  if (hostuser === 'undefined' || hostuser === undefined) hostuser = user
  else if (hostuser && Object.keys(hostuser).length === 0) hostuser = user
  var url = `https://api.github.com/users/${hostuser}/repos`
  var pass = await getPass(`${user}/git/${HOST}`)
  var resp = await got(url, {
    auth: `${pass.login}:${pass.password}`,
    json: true
  })
  return resp.body.map(parseRepo)
}

async function deleteRepo (rname, user) {
  user = user || await getName()
  var hostuser = await getAlias(user, HOST)
  if (hostuser === 'undefined' || hostuser === undefined) hostuser = user
  else if (hostuser && Object.keys(hostuser).length === 0) hostuser = user
  client = client || await getClient(user)
  var repo = client.getRepo(hostuser, rname)
  var resp = await repo.deleteRepo()
  if (resp.status >= 300) throw new Error(`Github API Error: ${resp.statusText}`)
}

async function addSSHKey (key) {
  var user = await getName()
  fs = fs || await getFS()
  key = key || await fs.readFile(path.join(home, '.ssh', 'id_rsa.pub'), 'utf-8')
  var url = `https://api.github.com/user/keys`
  var pass = await getPass(`${user}/git/${HOST}`)
  var options = {
    auth: `${pass.login}:${pass.password}`,
    json: true,
    body: {
      'title': `${user}-guld-key`,
      'key': key
    },
    method: 'POST'
  }
  try {
    await got(url, options)
  } catch (e) {
    if (e.statusCode !== 422 || e.statusMessage !== 'Unprocessable Entity') throw e
  }
}

async function getIssuesByTitle (user, rname, title) {
  user = user || await getName()
  var passuser = process.env.PASSUSER || process.env.USER || user
  var hostuser = await getAlias(user, HOST)
  if (hostuser === 'undefined' || hostuser === undefined) hostuser = user
  else if (hostuser && Object.keys(hostuser).length === 0) hostuser = user
  var pass = await getPass(`${passuser}/git/${HOST}`)
  utitle = encodeURIComponent(`"${title}"`)
  var url = `https://api.github.com/search/issues?q=${utitle}+user:${hostuser}+repo:${encodeURIComponent(rname)}+in:title+type:issue`
  var options = {
    json: true
  }
  var issues = {body: {items: []}}
  try {
    var issues = await got(url, options)
  } catch (e) {
    issues = {body: {items: []}}
  }
  return issues.body.items.filter(i => i.title === title)
}

async function getUser (user) {
  user = user || await getName()
  var hostuser = await getAlias(user, HOST)
  if (hostuser === 'undefined' || hostuser === undefined) hostuser = user
  else if (hostuser && Object.keys(hostuser).length === 0) hostuser = user
  client = client || await getClient(user)
  var resp = await client.getUser(hostuser).getProfile()
  if (resp && resp.status && resp.status < 300) return resp.data
}

async function addEditIssue (user, rname, title, body, state='open') {
  user = user || await getName()
  var hostuser = await getAlias(user, HOST)
  if (hostuser === 'undefined' || hostuser === undefined) hostuser = user
  else if (hostuser && Object.keys(hostuser).length === 0) hostuser = user
  client = client || await getClient(user)
  var issues = await getIssuesByTitle(user, rname, title)
  if (issues.length === 0) {
    var resp = await client.getIssues(hostuser, rname).createIssue({
      title: title,
      body: body,
      label: [
        'airdrop'
      ]
    })
  } else {
    await Promise.all(issues.map(async i => {
      await client.getIssues(hostuser, rname).editIssue(i.number, {
        title: title,
        body: body,
        state: state,
        label: [
          'airdrop'
        ]
      })
    }))
  }
}


async function closeIssue (user, rname, title) {
  user = user || await getName()
  var hostuser = await getAlias(user, HOST)
  if (hostuser === 'undefined' || hostuser === undefined) hostuser = user
  else if (hostuser && Object.keys(hostuser).length === 0) hostuser = user
  client = client || await getClient(user)
  var issues = await getIssuesByTitle(user, rname, title)
  if (issues.length > 0) {
    await Promise.all(issues.map(async i => {
      await client.getIssues(hostuser, rname).editIssue(i.number, {
        title: i.title,
        body: i.body,
        state: state
      })
    }))
  }
}

async function closeWithComment (user, rname, comment, number, title) {
  await client.getIssues(hostuser, rname).createIssueComment(i.number, 'User Registration found. Sorry for any extra notifications.')
  await client.getIssues(hostuser, rname).closeIssue(user, rname, title)
}

// TODO functions to port from guld-chrome
/*
async function getclientKeys () {
  var keys = JSON.parse(await this.observer.curl(`https://api.github.com/users/${this.observer.hosts.github.name}/gpg_keys`))
  if (keys.length !== 0) {
    this.observer.hosts.github.keyid = keys[0].key_id
    if (keys[0].emails.length !== 0) {
      this.observer.hosts.github.mail = keys[0].emails[0].email
    }
  }
}

async function setupclientKey () { // eslint-disable-line no-unused-vars
  if (!self.clientkeyid || self.clientkeyid.length === 0) {
    return self.observer.curl(`https://api.github.com/user/gpg_keys`,
      {
        'method': 'POST',
        'body': JSON.stringify({'armored_public_key': self.keyring.publicKeys.getForId(self.guldfpr).armor()})
      }
    ).then(getclientKeys)
  } else return getclientKeys()
}

async function createPR (org, repo) {
  return this.observer.hosts.github.client.getRepo(org, repo).createPullRequest({
    title: 'guld app created tx PR',
    head: `${self.guldname}:master`,
    base: 'master'
  })
}
*/

module.exports = {
  getClient: getClient,
  createRepo: createRepo,
  listRepos: listRepos,
  deleteRepo: deleteRepo,
  addSSHKey: addSSHKey,
  addEditIssue: addEditIssue,
  getUser: getUser,
  meta: {
    'url': 'github.com',
    'oauth-required': false
  }
}
