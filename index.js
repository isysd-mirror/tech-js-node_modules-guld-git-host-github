const GitHub = require('github-api')
const { getName } = require('guld-user')
const { getConfig } = require('guld-git-config')
const { show, parsePass } = require('guld-pass')
const got = require('got')
var gh

async function getGithubName (user) {
  user = user || await getName()
  var cfg = await getConfig('public', user)
  if (cfg && cfg.host && cfg.host.github) return cfg.host.github
}

async function getGithub (user) {
  user = user || await getName()
  var pass = parsePass(await show(`${user}/git/github`))
  return new GitHub({
    username: pass.login,
    password: pass.password
  })
}

async function createRepo (options, user) {
  user = user || await getName()
  var ghuser = await getGithubName(user) || user
  // validate required field(s)
  if (!options.hasOwnProperty('name')) throw new Error('Name is required to create repo.')
  // override destructive merge strategies
  if (!options.hasOwnProperty('allow_squash_merge')) options.allow_squash_merge = false // eslint-disable-line camelcase
  // if (!options.hasOwnProperty('allow_merge_commit')) options.allow_merge_commit = false
  if (!options.hasOwnProperty('allow_rebase_merge')) options.allow_rebase_merge = false // eslint-disable-line camelcase
  gh = gh || await getGithub(user)
  var account = gh.getUser(ghuser)
  var resp = await account.createRepo(options)
  if (resp.status < 300) return resp.data
  else throw new Error(`Github API Error: ${resp.statusText}`)
}

async function listRepos (user) {
  user = user || await getName()
  var ghuser = await getGithubName(user) || user
  var url = `https://api.github.com/users/${ghuser}/repos`
  var pass = parsePass(await show(`${user}/git/github`))
  var resp = await got(url, {
    auth: `${pass.login}:${pass.password}`,
    json: true
  })
  return resp.body
}

async function deleteRepo (rname, user) {
  user = user || await getName()
  var ghuser = await getGithubName(user) || user
  gh = gh || await getGithub(user)
  var repo = gh.getRepo(ghuser, rname)
  var resp = await repo.deleteRepo()
  if (resp.status >= 300) throw new Error(`Github API Error: ${resp.statusText}`)
}

// TODO functions to port from guld-chrome
/*
async function getGHKeys () {
  var keys = JSON.parse(await this.observer.curl(`https://api.github.com/users/${this.observer.hosts.github.name}/gpg_keys`))
  if (keys.length !== 0) {
    this.observer.hosts.github.keyid = keys[0].key_id
    if (keys[0].emails.length !== 0) {
      this.observer.hosts.github.mail = keys[0].emails[0].email
    }
  }
}

async function setupGHKey () { // eslint-disable-line no-unused-vars
  if (!self.ghkeyid || self.ghkeyid.length === 0) {
    return self.observer.curl(`https://api.github.com/user/gpg_keys`,
      {
        'method': 'POST',
        'body': JSON.stringify({'armored_public_key': self.keyring.publicKeys.getForId(self.guldfpr).armor()})
      }
    ).then(getGHKeys)
  } else return getGHKeys()
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
  getGithub: getGithub,
  createRepo: createRepo,
  listRepos: listRepos,
  deleteRepo: deleteRepo
}
