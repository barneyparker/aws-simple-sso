/* eslint-disable jsdoc/require-jsdoc */
import { authenticate } from './index.js'

const matchOrg = (org) => org.name === 'PWP Org'
const matchAcc = (acc) => acc.name === 'PWP Acc'
const matchRole = (role) => role.name === 'PWP Role'

console.log(await authenticate({
  matchOrg,
  matchAcc,
  matchRole,
}))