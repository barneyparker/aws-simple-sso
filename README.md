# aws-simple-sso

Simple AWS SSO Sign-in

## Install

```bash
npm install aws-simple-sso
```

## Usage

```javascript
import { authenticate } from 'aws-simple-sso'

const main = async () => {
  const credentials = await authenticate('Prod', 'sre_dev', 'Admin')
  console.log(credentials)
}

main()
```

## API

### authenticate(matchOrg, matchAcc, matchRole)

Quick method of fully authenticating against AWS SSO.
Parameters provide partial matches for Organization, Account, and Role.

| Parameter | Type | Description |
| --- | --- | --- |
| matchOrg | Type: `string` | Partial Match for Organization Name |
| matchAcc | Type: `string` | Partial Match for Account Name |
| matchRole | Type: `string` | Partial Match for Role Name |

Returns:

```json
{
  accessKeyId: string,
  secretAccessKey: string,
  sessionToken: string,
  expiration: Date
}
```

### getOrgUrl(matchOrg)

Get an Organization StartURL for AWS SSO login

- If none are known, the user will be prompted to add a new Organization URL and name

- If the Organization name cannot be found via the `matchOrg` parameter, the user will be prompted to select from a list of known Organizations

| Parameter | Type | Description |
| --- | --- | --- |
| matchOrg | Type: `string` | Partial Match for Organization Name |

Returns:

Type: `SSOOrgUrl`

```json
{
  orgName: string,
  orgUrl: string
}
```

### getToken(orgUrl)

Get an AWS SSO OIDC token

| Parameter | Type | Description |
| --- | --- | --- |
| orgUrl | Type: `SSOOrgUrl` | AWS Organization URL |

Returns:

Type: `SSOToken`

```json
{
  accessToken: string (optional)
  tokenType: string (optional)
  expiresIn: number (optional)
  expireTime: Date (optional)
  refreshToken: string (optional)
  idToken: string (optional)
}
```

### getAccount(token, matchAcc)

Get an AWS Account via the SSO service

- If the Account name cannot be found via the `matchAcc` parameter, the user will be prompted to select from a list of known Accounts

| Parameter | Type | Description |
| --- | --- | --- |
| token | Type: `SSOToken` | AWS SSO Token |
| matchAcc | Type: `string` | Partial Match for Account Name |

Returns:

Type: `SSOAccount`

```json
{
  accountId: string,
  accountName: string
}
```

### getRole(token, accountId, matchRole)

Get an AWS Role via the SSO service

- If the Role name cannot be found via the `matchRole` parameter, the user will be prompted to select from a list of known Roles

| Parameter | Type | Description |
| --- | --- | --- |
| token | Type: `SSOToken` | AWS SSO Token |
| accountId | Type: `string` | AWS Account ID |
| matchRole | Type: `string` | Partial Match for Role Name |

Returns:

Type: `SSORole`

```json
{
  accountId: string
  roleName: string,
}
```

### getRoleCredentials(token, ssoRole)

Get AWS Role Credentials via the SSO service

| Parameter | Type | Description |
| --- | --- | --- |
| token | Type: `SSOToken` | AWS SSO Token |
| ssoRole | Type: `SSORole` | AWS SSO Role |

Returns:

```json
{
  accessKeyId: string,
  secretAccessKey: string,
  sessionToken: string,
  expiration: Date
}
```

## License

[MIT ©](https://github.com/barneyparker/aws-simple-sso/LICENSE)
