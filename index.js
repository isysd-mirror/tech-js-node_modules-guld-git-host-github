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
  var pass = await getPass(`${user}/git/${HOST}`)
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
  var hostuser = await getAlias(user, HOST) || user
  // validate required field(s)
  if (typeof rname !== 'string' || rname.length === 0) throw new Error('Name is required to create repo.')
  options.name = rname
  // override destructive merge strategies
  if (!options.hasOwnProperty('allow_squash_merge')) options.allow_squash_merge = false // eslint-disable-line camelcase
  // if (!options.hasOwnProperty('allow_merge_commit')) options.allow_merge_commit = false
  if (!options.hasOwnProperty('allow_rebase_merge')) options.allow_rebase_merge = false // eslint-disable-line camelcase
  client = client || await getClient(user)
  var account = client.getUser(hostuser)
  var resp = await account.createRepo(options)
  if (resp.status < 300) return parseRepo(resp.data)
  else throw new Error(`Github API Error: ${resp.statusText}`)
}

async function listRepos (user) {
  user = user || await getName()
  var hostuser = await getAlias(user, HOST) || user
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
  var hostuser = await getAlias(user, HOST) || user
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
  meta: {
    'url': 'github.com',
    'oauth-required': false
  }
}
