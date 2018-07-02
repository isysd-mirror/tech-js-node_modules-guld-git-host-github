/* eslint-env node, mocha */
const assert = require('chai').assert
const { getName } = require('guld-user')
const { getGithub, listRepos, createRepo, deleteRepo } = require('./index.js')

describe('github', function () {
  before(async function () {
    this.user = await getName()
  })
  it('getGithub', async function () {
    var gh = await getGithub(this.user)
    assert.exists(gh)
  })
  it('listRepos', async function () {
    this.repos = await listRepos(this.user)
    assert.exists(this.repos)
    assert.isTrue(this.repos.length > 0)
  }).timeout(5000)
  it('createRepo', async function () {
    this.repo = await createRepo({
      name: 'guld-repo-for-test'
    })
    assert.exists(this.repo)
    assert.exists(this.repo.name)
    assert.exists(this.repo.full_name)
    assert.equal(this.repo.name, 'guld-repo-for-test')
  }).timeout(5000)
  it('deleteRepo', async function () {
    this.repo = await deleteRepo('guld-repo-for-test')
  }).timeout(5000)
})
