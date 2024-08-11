/* eslint-disable jsdoc/require-jsdoc */
import { authenticate } from './index.js'

/** @typedef {import('./index.js').MatchFunction} MatchFunction */

/** @type {MatchFunction} */
const matchOrg = (org) => org.name === 'PWP Org'
/** @type {MatchFunction} */
const matchAcc = (acc) => acc.name === 'PWP Acc'
/** @type {MatchFunction} */
const matchRole = (role) => role.name === 'PWP Role'

console.log(await authenticate({
  matchOrg,
  matchAcc,
  matchRole,
}))