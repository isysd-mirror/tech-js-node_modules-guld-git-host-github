/* global describe:false it:false */
const path = require('path')
const assert = require('chai').assert
const getGuldDir = require('./index.js')

describe('getGuldDir', function () {
  it('cwd', async function () {
    assert.isTrue((await getGuldDir()).endsWith('guld-git-path/.git'))
  })
  it('absolute path', async function () {
    assert.isTrue((await getGuldDir(path.resolve('./node_modules'))).endsWith('guld-git-path/.git'))
  })
  it('relative path', async function () {
    assert.isTrue((await getGuldDir('./node_modules')).endsWith('guld-git-path/.git'))
  })
})
