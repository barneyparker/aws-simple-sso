/**
 * AWS Simple SSO
 * @module aws-simple-sso
 * @description Simplified AWS SSO authentication
 * @example
 * import { authenticate } from 'aws-simple-sso'
 * const credentials = await authenticate()
 */
import { SSO } from '@aws-sdk/client-sso'
import { SSOOIDC } from '@aws-sdk/client-sso-oidc'
import prompts from 'prompts'
import { LocalStorage } from 'node-localstorage'
import { join } from 'node:path'

const cachePath = join(process.env.HOME, '.aws/aws-simple-sso')
const localStorage = new LocalStorage(cachePath)
const window = {
  /**
   * We cant open in a browser, so just log the URL
   * In a browser, this would open the URL in a new tab
   * @param {string} url  URL to open
   */
  open: (url) => {
    console.log('Please visit the following URL to authenticate:')
    console.log(url)
  },
}

/**
 * @typedef {object} AuthenticateParams
 * @property {MatchFunction} [matchOrg]   Organization match function
 * @property {MatchFunction} [matchAcc]   Account match function
 * @property {MatchFunction} [matchRole]  Role match function
 */

/**
 * @typedef {object} SSOOrgUrl
 * @property {string} name      Organization name
 * @property {string} startUrl  SSO Start URL
 */

/**
 * @typedef {object} SSOAccount
 * @property {string} accountId  AWS Account Id
 * @property {string} name       Account name
 */

/**
 * @typedef {object} SSOToken
 * @property {string} [accessToken]   AWS Access Token
 * @property {string} [tokenType]     Token type
 * @property {number} [expiresIn]     Token expiration in seconds
 * @property {Date}   [expireTime]    Token expiration time
 * @property {string} [refreshToken]  Refresh token
 * @property {string} [idToken]       ID token
 */

/**
 * @typedef {object} SSORole
 * @property {string} accountId  AWS Account Id
 * @property {string} name       SSO Role name
 */

/**
 * @typedef {object} SSOCredentials
 * @property {string} accessKeyId      AWS Access Key Id
 * @property {string} secretAccessKey  AWS Secret Access Key
 * @property {string} sessionToken     AWS Session Token
 * @property {Date}   expireTime       Token expiration time
 */

/**
 * @callback           MatchFunction
 * @param    {object}  value          Value to match
 * @returns  {boolean}                True if the value matches
 */
const sso = new SSO({ apiVersion: '2019-06-10' })

/**
 * Delay function
 * @param   {number}  ms  Delay in milliseconds
 * @returns {Promise}     Promise that resolves after the delay
 */
const delay = (ms) => {return new Promise((resolve) => setTimeout(resolve, ms))}

/**
 * Simplified Authentication function
 * @param   {AuthenticateParams}      [params]  Optional function parameters
 * @returns {Promise<SSOCredentials>}           SSO Role Credentials
 */
export const authenticate = async (params = {}) => {
  /**
   * Just return true to match everything
   * @returns {boolean} Always true
   */
  const matchAll = () => true

  params = {
    matchOrg: matchAll,
    matchAcc: matchAll,
    matchRole: matchAll,
    ...params,
  }

  const startUrl = await getOrgUrl(params.matchOrg)
  const token = await getToken(startUrl)
  const account = await getAccount(token, params.matchAcc)
  const role = await getRole(token, account.accountId, params.matchRole)
  const credentials = await getRoleCredentials(token, role)

  return credentials
}

/**
 * Get an Organization Start URL
 *
 * @param   {MatchFunction}      matchOrg  Partial string to match with the Org name
 * @returns {Promise<SSOOrgUrl>}           Organization Start URL
 */
export const getOrgUrl = async (matchOrg) => {
  // see if we have a list of startUrl values in localStorage
  const cachedStartUrls = localStorage.getItem('startUrls')
  const startUrls = []

  // did we get a list of startUrls?
  if (cachedStartUrls) {
    // parse the list
    try {
      startUrls.push(...JSON.parse(cachedStartUrls))
    } catch (e) {
      console.log('Error parsing cached startUrls:', e)
    }
  }

  // can we find an entry that matches out match string?
  let matchedStartUrls = startUrls.filter(matchOrg)

  // If we only have one item, return it
  if(matchedStartUrls.length === 1) {
    return matchedStartUrls[0]
  }

  // let the user choose one of the startUrls, or add a new one
  matchedStartUrls.push({ name: 'Add a new startUrl', startUrl: null })

  const response = await prompts({
    type: 'select',
    name: 'value',
    message: 'Select a startUrl',
    choices: matchedStartUrls.map((s) => ({ title: s.name, value: s })),
  })

  // if the user selected 'Add a new startUrl', prompt for the new startUrl
  if(response.value.startUrl === null) {
    const newUrl = await prompts({
      type: 'text',
      name: 'value',
      message: 'Enter the startUrl for the new AWS Organization',
    })

    const newName = await prompts({
      type: 'text',
      name: 'value',
      message: 'Enter the name for the new AWS Organization',
    })

    const newOrg = {
      name: newName.value,
      startUrl: newUrl.value,
    }

    startUrls.push(newOrg)
    localStorage.setItem('startUrls', JSON.stringify(startUrls))

    return newOrg
  }

  // return the selected startUrl
  return response.value
}

/**
 * Get an SSO OIDC Token
 * @param   {SSOOrgUrl}         orgUrl  SSO Start URL
 * @returns {Promise<SSOToken>}         SSO OIDC Token
 */
export const getToken = async (orgUrl) => {
  // check to see if we have a cached token for this startUrl
  const cacheKey = `sso-${orgUrl.name}`

  const cachedToken = localStorage.getItem(cacheKey)
  if (cachedToken) {
    const token = JSON.parse(cachedToken)
    if (new Date(token.expireTime) > new Date()) {
      return token.token
    }
  }

  // create the SSO-OIDC client
  const oidc = new SSOOIDC({ apiVersion: '2019-06-10' })

  let regClient
  try {
    regClient = await oidc.registerClient({
      clientName: 'sso-client',
      clientType: 'public',
      scopes: ['aws.credential-provider'],
    })
  } catch (e) {
    console.log(e)
    throw(new Error('Error registering SSO client: ' + e.message))
  }

  let ssoUrl
  try {
    ssoUrl = await oidc.startDeviceAuthorization({
      clientId: regClient.clientId,
      clientSecret: regClient.clientSecret,
      startUrl: orgUrl.startUrl,
    })
  } catch (e) {
    console.log(e)
    throw(new Error('Error starting device authorization: ' + e.message))
  }

  window.open(ssoUrl.verificationUriComplete)

  let maxIterations = 120
  do{
    // wait a bit before checking for the token
    await delay(1000)

    try {
      const token = await oidc.createToken({
        clientId: regClient.clientId,
        clientSecret: regClient.clientSecret,
        grantType: 'urn:ietf:params:oauth:grant-type:device_code',
        deviceCode: ssoUrl.deviceCode,
      })

      // write the token to localStorage
      localStorage.setItem(cacheKey, JSON.stringify({
        token,
        expireTime: new Date(token.expiresIn * 1000 + Date.now()),
      }))

      return token
    } catch (e) {
      if(e.error !== 'authorization_pending' && e.error !== 'slow_down') {
        console.log(e)
      }
      maxIterations--
    }
  } while(maxIterations > 0)

  throw(new Error('Error creating token: Timeout'))
}

/**
 * Get a list of SSO AWS Accounts
 * @param   {SSOToken}            token     SSO OIDC Token
 * @param   {MatchFunction}       matchAcc  Partial string to match with the Account name
 * @returns {Promise<SSOAccount>}           SSO Role
 */
export const getAccount = async (token, matchAcc) => {
  const accounts = []
  const params = {
    accessToken: token.accessToken,
  }

  do{
    const result = await sso.listAccounts(params)
    accounts.push(...result.accountList)
    params.nextToken = result.nextToken
  } while(params.nextToken)

  let matchedAccounts = accounts.filter(matchAcc)

  if(matchedAccounts.length === 0) {
    matchedAccounts = accounts
  } else if(matchedAccounts.length === 1) {
    return {
      accountId: matchedAccounts[0].accountId,
      name: matchedAccounts[0].accountName,
    }
  }

  const account = await prompts({
    type: 'select',
    name: 'value',
    message: 'Select an account',
    choices: matchedAccounts.map((a) => ({ title: a.accountName, value: a })).sort((a, b) => a.title.localeCompare(b.title)),
  })

  return {
    accountId: account.value.accountId,
    name: account.value.accountName,
  }
}

/**
 * Get an SSO Role
 * @param   {SSOToken}         token      SSO OIDC Token
 * @param   {string}           accountId  AWS Account Id
 * @param   {MatchFunction}    matchRole  Partial string to match with the Role name
 * @returns {Promise<SSORole>}            SSO Role
 */
export const getRole = async (token, accountId, matchRole) => {
  const roles = []
  const params = {
    accessToken: token.accessToken,
    accountId: accountId,
  }

  do {
    const result = await sso.listAccountRoles(params)
    roles.push(...result.roleList)
    params.nextToken = result.nextToken
  } while(params.nextToken)

  let matchedRoles = roles.filter(matchRole)

  if(matchedRoles.length === 0) {
    matchedRoles = roles
  } else if(matchedRoles.length === 1) {
    return {
      accountId: matchedRoles[0].accountId,
      name: matchedRoles[0].roleName,
    }
  }

  const role = await prompts({
    type: 'select',
    name: 'value',
    message: 'Select a role',
    choices: matchedRoles.map((r) => ({ title: r.roleName, value: r })).sort((a, b) => a.title.localeCompare(b.title)),
  })

  return {
    accountId: role.value.accountId,
    name: role.value.roleName,
  }
}

/**
 * Get SSO Role Credentials
 * @param   {SSOToken}                token    SSO OIDC Token
 * @param   {SSORole}                 ssoRole  SSO Role structure
 * @returns {Promise<SSOCredentials>}          SSO Role Credentials
 */
export const getRoleCredentials = async (token, ssoRole) => {
  const creds = await sso.getRoleCredentials({
    accessToken: token.accessToken,
    accountId: ssoRole.accountId,
    roleName: ssoRole.name,
  })

  return {
    accessKeyId: creds.roleCredentials.accessKeyId,
    secretAccessKey: creds.roleCredentials.secretAccessKey,
    sessionToken: creds.roleCredentials.sessionToken,
    expireTime: new Date(creds.roleCredentials.expiration),
  }
}
