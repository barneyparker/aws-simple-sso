import { SSO } from '@aws-sdk/client-sso'
import { SSOOIDC } from '@aws-sdk/client-sso-oidc'
import prompts from 'prompts'

if(typeof window === 'undefined') {
  const { LocalStorage } = await import('node-localstorage')
  // eslint-disable-next-line no-var
  var localStorage = new LocalStorage('~/.aws/aws-simple-sso')
}
/**
 * @typedef {object} SSOOrgUrl
 * @property {string} name      Organization name
 * @property {string} startUrl  SSO Start URL
 */

/**
 * @typedef {object} SSOAccount
 * @property {string} accountId    AWS Account Id
 * @property {string} accountName  Account name
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
 * @property {string} roleName   SSO Role name
 */

/**
 * @typedef {object} SSOCredentials
 * @property {string} accessKeyId      AWS Access Key Id
 * @property {string} secretAccessKey  AWS Secret Access Key
 * @property {string} sessionToken     AWS Session Token
 * @property {Date}   expireTime       Token expiration time
 */

const sso = new SSO({ apiVersion: '2019-06-10' })

/**
 * Delay function
 *
 * @param   {number}  ms  Delay in milliseconds
 * @returns {Promise}     Promise that resolves after the delay
 */
const delay = (ms) => {return new Promise((resolve) => setTimeout(resolve, ms))}


/**
 * Get an Organization Start URL
 *
 * @param   {string}             matchOrg  Partial string to match with the Org name
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

  // add an option to add a new startUrl if we dont have anything in the list
  if(startUrls.length === 0 || startUrls[0].startUrl !== null) {
    startUrls.push({ name: 'Add a new AWS Organization', startUrl: null })
  }

  // can we find an entry that matches out match string?
  let matchedStartUrls = startUrls.filter((s) => s.name.includes(matchOrg))

  if(matchedStartUrls.length === 0) {
    matchedStartUrls = startUrls
  } else if(matchedStartUrls.length === 1 && matchedStartUrls[0].startUrl !== null) {
    return matchedStartUrls[0]
  }

  // let the user choose one of the startUrls, or add a new one
  const response = await prompts({
    type: 'select',
    name: 'value',
    message: 'Select a startUrl',
    choices: matchedStartUrls.map((s) => ({ title: s.name, value: s })),
  })

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

    // return the new startUrl
    return newOrg
  }

  // return the selected startUrl
  return response.value
}

/**
 * Get an SSO OIDC Token
 *
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

  if(typeof window !== 'undefined') {
    // eslint-disable-next-line no-undef
    window.open(ssoUrl.verificationUriComplete)
  } else {
    console.log('Please visit the following URL to authenticate:')
    console.log(ssoUrl.verificationUriComplete)
  }

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
 *
 * @param   {SSOToken}            token     SSO OIDC Token
 * @param   {string}              matchAcc  Partial string to match with the Account name
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

  let matchedAccounts = accounts.filter((a) => a.accountName.includes(matchAcc))

  if(matchedAccounts.length === 0) {
    matchedAccounts = accounts
  } else if(matchedAccounts.length === 1) {
    return {
      accountId: matchedAccounts[0].accountId,
      accountName: matchedAccounts[0].accountName,
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
    accountName: account.value.accountName,
  }
}

/**
 * Get an SSO Role
 *
 * @param   {SSOToken}         token      SSO OIDC Token
 * @param   {string}           accountId  AWS Account Id
 * @param   {string}           matchRole  Partial string to match with the Role name
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

  let matchedRoles = roles.filter((r) => r.roleName.includes(matchRole))

  if(matchedRoles.length === 0) {
    matchedRoles = roles
  } else if(matchedRoles.length === 1) {
    return {
      accountId: matchedRoles[0].accountId,
      roleName: matchedRoles[0].roleName,
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
    roleName: role.value.roleName,
  }
}

/**
 * Get SSO Role Credentials
 *
 * @param   {SSOToken}                token    SSO OIDC Token
 * @param   {SSORole}                 ssoRole  SSO Role structure
 * @returns {Promise<SSOCredentials>}          SSO Role Credentials
 */
export const getRoleCredentials = async (token, ssoRole) => {
  const creds = await sso.getRoleCredentials({
    accessToken: token.accessToken,
    accountId: ssoRole.accountId,
    roleName: ssoRole.roleName,
  })

  return {
    accessKeyId: creds.roleCredentials.accessKeyId,
    secretAccessKey: creds.roleCredentials.secretAccessKey,
    sessionToken: creds.roleCredentials.sessionToken,
    expireTime: new Date(creds.roleCredentials.expiration),
  }
}

/**
 * Simplified Authentication function
 *
 * @param   {string}                  matchOrg   Partial string to match with the Org name
 * @param   {string}                  matchAcc   Partial string to match with the Account name
 * @param   {string}                  matchRole  Partial string to match with the Role name
 * @returns {Promise<SSOCredentials>}            SSO Role Credentials
 */
export const authenticate = async (matchOrg, matchAcc, matchRole) => {
  const startUrl = await getOrgUrl(matchOrg)
  const token = await getToken(startUrl)
  const account = await getAccount(token, matchAcc)
  const role = await getRole(token, account.accountId, matchRole)
  const credentials = await getRoleCredentials(token, role)

  return credentials
}