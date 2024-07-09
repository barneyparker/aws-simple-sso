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
 * @property {MatchFunction|string|RegExp} [matchOrg]   Organization match function
 * @property {MatchFunction|string|RegExp} [matchAcc]   Account match function
 * @property {MatchFunction|string|RegExp} [matchRole]  Role match function
 */

/**
 * @typedef {object} SSOOrgUrl
 * @property {string} name      Organization name
 * @property {string} startUrl  SSO Start URL
 * @property {string} region    SSO Region
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

let sso

/**
 * Delay function
 * @param   {number}  ms  Delay in milliseconds
 * @returns {Promise}     Promise that resolves after the delay
 */
const delay = (ms) => {return new Promise((resolve) => setTimeout(resolve, ms))}

/**
 * Create a matcher function
 * @param   {MatchFunction|string|RegExp} match  Match function, string, or regex
 * @returns {MatchFunction}                      Matcher function
 */
const createMatcher = (match) => {
  // if none provided, match all
  if(!match) {
    return (a) => a ? true : true
  }

  // if it's already a function, just return it
  if(match instanceof Function) {
    return match
  }

  // if its a RegExp, return a function that tests the name
  if(match instanceof RegExp) {
    return (a) => match.test(a.name)
  }

  // if it's a string, return a function that matches the name
  return (a) => a.name === match
}

/**
 * Simplified Authentication function
 * @param   {AuthenticateParams}      [params]  Optional function parameters
 * @returns {Promise<SSOCredentials>}           SSO Role Credentials
 */
export const authenticate = async (params = {}) => {
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
 * @param   {MatchFunction|string|RegExp} matchOrg  Partial string to match with the Org name
 * @returns {Promise<SSOOrgUrl>}                    Organization Start URL
 */
export const getOrgUrl = async (matchOrg) => {
  matchOrg = createMatcher(matchOrg)

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

  // if there is no startUrl === null entry, add one to the list
  if (!startUrls.find((s) => s.startUrl === null)) {
    startUrls.unshift({ name: 'Add a new startUrl', startUrl: null })
  }

  // can we find an entry that matches out match string?
  let matchedStartUrls = startUrls.filter(matchOrg)

  // If we only have one item, return it
  if(matchedStartUrls.length === 1 && matchedStartUrls[0].startUrl !== null) {
    return matchedStartUrls[0]
  }

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

    const newRegion = await prompts({
      type: 'text',
      name: 'value',
      message: 'Enter the SSO region for the new AWS Organization',
    })

    const newOrg = {
      name: newName.value,
      startUrl: newUrl.value,
      region: newRegion.value,
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
  // create the SSO client early
  sso = new SSO({ apiVersion: '2019-06-10', region: orgUrl.region })

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
  const oidc = new SSOOIDC({ apiVersion: '2019-06-10', region: orgUrl.region })

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
 * @param   {SSOToken}                    token     SSO OIDC Token
 * @param   {MatchFunction|string|RegExp} matchAcc  Partial string to match with the Account name
 * @returns {Promise<SSOAccount>}                   SSO Role
 */
export const getAccount = async (token, matchAcc) => {
  matchAcc = createMatcher(matchAcc)
  const accounts = []
  const params = {
    accessToken: token.accessToken,
  }

  do{
    const result = await sso.listAccounts(params)
    accounts.push(...result.accountList.map((acc) => ({
      accountId: acc.accountId,
      name: acc.accountName,
    })))
    params.nextToken = result.nextToken
  } while(params.nextToken)

  let matchedAccounts = accounts.filter(matchAcc)

  if(matchedAccounts.length === 0) {
    matchedAccounts = accounts
  } else if(matchedAccounts.length === 1) {
    return {
      accountId: matchedAccounts[0].accountId,
      name: matchedAccounts[0].name,
    }
  }

  const account = await prompts({
    type: 'select',
    name: 'value',
    message: 'Select an account',
    choices: matchedAccounts.map((a) => ({ title: a.name, value: a })).sort((a, b) => a.title.localeCompare(b.title)),
  })

  return {
    accountId: account.value.accountId,
    name: account.value.name,
  }
}

/**
 * Get an SSO Role
 * @param   {SSOToken}                    token      SSO OIDC Token
 * @param   {string}                      accountId  AWS Account Id
 * @param   {MatchFunction|string|RegExp} matchRole  Partial string to match with the Role name
 * @returns {Promise<SSORole>}                       SSO Role
 */
export const getRole = async (token, accountId, matchRole) => {
  matchRole = createMatcher(matchRole)
  const roles = []
  const params = {
    accessToken: token.accessToken,
    accountId: accountId,
  }

  do {
    const result = await sso.listAccountRoles(params)
    roles.push(...result.roleList.map((role) => ({
      accountId: accountId,
      name: role.roleName,
    }))
    )
    params.nextToken = result.nextToken
  } while(params.nextToken)

  let matchedRoles = roles.filter(matchRole)

  if(matchedRoles.length === 0) {
    matchedRoles = roles
  } else if(matchedRoles.length === 1) {
    return {
      accountId: matchedRoles[0].accountId,
      name: matchedRoles[0].name,
    }
  }

  const role = await prompts({
    type: 'select',
    name: 'value',
    message: 'Select a role',
    choices: matchedRoles.map((r) => ({ title: r.name, value: r })).sort((a, b) => a.title.localeCompare(b.title)),
  })

  return {
    accountId: role.value.accountId,
    name: role.value.name,
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
