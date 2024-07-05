import { authenticate } from './index.js'
/**
 * Just a main func!
 */
const main = async () => {
  const credentials = await authenticate('Prod', 'sre_dev', 'Admin')
  console.log(credentials)
}

main()