# aws-simple-sso

Simple AWS SSO Sign-in

## Install

```bash
npm install aws-simple-sso
```

# API Reference
Simplified AWS SSO authentication

**Example**  
```js
import { authenticate } from 'aws-simple-sso'
const credentials = await authenticate()
```
<a name="module_aws-simple-sso.authenticate"></a>

### aws-simple-sso.authenticate ⇒ <code>Promise.&lt;SSOCredentials&gt;</code>
Simplified Authentication function

**Kind**: static constant of [<code>aws-simple-sso</code>](#module_aws-simple-sso)  
**Returns**: <code>Promise.&lt;SSOCredentials&gt;</code> - SSO Role Credentials  

| Param | Type | Description |
| --- | --- | --- |
| [params] | <code>AuthenticateParams</code> | Optional function parameters |

<a name="module_aws-simple-sso.getOrgUrl"></a>

### aws-simple-sso.getOrgUrl ⇒ <code>Promise.&lt;SSOOrgUrl&gt;</code>
Get an Organization Start URL

**Kind**: static constant of [<code>aws-simple-sso</code>](#module_aws-simple-sso)  
**Returns**: <code>Promise.&lt;SSOOrgUrl&gt;</code> - Organization Start URL  

| Param | Type | Description |
| --- | --- | --- |
| matchOrg | <code>MatchFunction</code> | Partial string to match with the Org name |

<a name="module_aws-simple-sso.getToken"></a>

### aws-simple-sso.getToken ⇒ <code>Promise.&lt;SSOToken&gt;</code>
Get an SSO OIDC Token

**Kind**: static constant of [<code>aws-simple-sso</code>](#module_aws-simple-sso)  
**Returns**: <code>Promise.&lt;SSOToken&gt;</code> - SSO OIDC Token  

| Param | Type | Description |
| --- | --- | --- |
| orgUrl | <code>SSOOrgUrl</code> | SSO Start URL |

<a name="module_aws-simple-sso.getAccount"></a>

### aws-simple-sso.getAccount ⇒ <code>Promise.&lt;SSOAccount&gt;</code>
Get a list of SSO AWS Accounts

**Kind**: static constant of [<code>aws-simple-sso</code>](#module_aws-simple-sso)  
**Returns**: <code>Promise.&lt;SSOAccount&gt;</code> - SSO Role  

| Param | Type | Description |
| --- | --- | --- |
| token | <code>SSOToken</code> | SSO OIDC Token |
| matchAcc | <code>MatchFunction</code> | Partial string to match with the Account name |

<a name="module_aws-simple-sso.getRole"></a>

### aws-simple-sso.getRole ⇒ <code>Promise.&lt;SSORole&gt;</code>
Get an SSO Role

**Kind**: static constant of [<code>aws-simple-sso</code>](#module_aws-simple-sso)  
**Returns**: <code>Promise.&lt;SSORole&gt;</code> - SSO Role  

| Param | Type | Description |
| --- | --- | --- |
| token | <code>SSOToken</code> | SSO OIDC Token |
| accountId | <code>string</code> | AWS Account Id |
| matchRole | <code>MatchFunction</code> | Partial string to match with the Role name |

<a name="module_aws-simple-sso.getRoleCredentials"></a>

### aws-simple-sso.getRoleCredentials ⇒ <code>Promise.&lt;SSOCredentials&gt;</code>
Get SSO Role Credentials

**Kind**: static constant of [<code>aws-simple-sso</code>](#module_aws-simple-sso)  
**Returns**: <code>Promise.&lt;SSOCredentials&gt;</code> - SSO Role Credentials  

| Param | Type | Description |
| --- | --- | --- |
| token | <code>SSOToken</code> | SSO OIDC Token |
| ssoRole | <code>SSORole</code> | SSO Role structure |

<a name="module_aws-simple-sso..delay"></a>

### aws-simple-sso~delay(ms) ⇒ <code>Promise</code>
Delay function

**Kind**: inner method of [<code>aws-simple-sso</code>](#module_aws-simple-sso)  
**Returns**: <code>Promise</code> - Promise that resolves after the delay  

| Param | Type | Description |
| --- | --- | --- |
| ms | <code>number</code> | Delay in milliseconds |

<a name="module_aws-simple-sso..AuthenticateParams"></a>

### aws-simple-sso~AuthenticateParams : <code>object</code>
**Kind**: inner typedef of [<code>aws-simple-sso</code>](#module_aws-simple-sso)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [matchOrg] | <code>MatchFunction</code> | Organization match function |
| [matchAcc] | <code>MatchFunction</code> | Account match function |
| [matchRole] | <code>MatchFunction</code> | Role match function |

<a name="module_aws-simple-sso..SSOOrgUrl"></a>

### aws-simple-sso~SSOOrgUrl : <code>object</code>
**Kind**: inner typedef of [<code>aws-simple-sso</code>](#module_aws-simple-sso)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | Organization name |
| startUrl | <code>string</code> | SSO Start URL |

<a name="module_aws-simple-sso..SSOAccount"></a>

### aws-simple-sso~SSOAccount : <code>object</code>
**Kind**: inner typedef of [<code>aws-simple-sso</code>](#module_aws-simple-sso)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| accountId | <code>string</code> | AWS Account Id |
| name | <code>string</code> | Account name |

<a name="module_aws-simple-sso..SSOToken"></a>

### aws-simple-sso~SSOToken : <code>object</code>
**Kind**: inner typedef of [<code>aws-simple-sso</code>](#module_aws-simple-sso)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [accessToken] | <code>string</code> | AWS Access Token |
| [tokenType] | <code>string</code> | Token type |
| [expiresIn] | <code>number</code> | Token expiration in seconds |
| [expireTime] | <code>Date</code> | Token expiration time |
| [refreshToken] | <code>string</code> | Refresh token |
| [idToken] | <code>string</code> | ID token |

<a name="module_aws-simple-sso..SSORole"></a>

### aws-simple-sso~SSORole : <code>object</code>
**Kind**: inner typedef of [<code>aws-simple-sso</code>](#module_aws-simple-sso)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| accountId | <code>string</code> | AWS Account Id |
| name | <code>string</code> | SSO Role name |

<a name="module_aws-simple-sso..SSOCredentials"></a>

### aws-simple-sso~SSOCredentials : <code>object</code>
**Kind**: inner typedef of [<code>aws-simple-sso</code>](#module_aws-simple-sso)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| accessKeyId | <code>string</code> | AWS Access Key Id |
| secretAccessKey | <code>string</code> | AWS Secret Access Key |
| sessionToken | <code>string</code> | AWS Session Token |
| expireTime | <code>Date</code> | Token expiration time |

<a name="module_aws-simple-sso..MatchFunction"></a>

### aws-simple-sso~MatchFunction ⇒ <code>boolean</code>
**Kind**: inner typedef of [<code>aws-simple-sso</code>](#module_aws-simple-sso)  
**Returns**: <code>boolean</code> - True if the value matches  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>object</code> | Value to match |


## License

[MIT ©](https://github.com/barneyparker/aws-simple-sso/LICENSE)
