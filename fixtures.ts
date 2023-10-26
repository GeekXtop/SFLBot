import { test as base, chromium, type BrowserContext } from '@playwright/test'
import { initialSetup } from '@synthetixio/synpress/commands/metamask'
import { prepareMetamask } from '@synthetixio/synpress/helpers'
import fs from 'fs'
import path from 'path'

const userDataDir = path.join(process.cwd(), 'user-data')
// 创建 user-data 目录
if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir, { recursive: true })
}

export const test = base.extend<{
  context: BrowserContext
}>({
  context: async ({}, use) => {
    // required for synpress
    global.expect = expect
    // download metamask
    const metamaskPath = await prepareMetamask(
      process.env.METAMASK_VERSION || '10.25.0'
    )
    // prepare browser args
    const browserArgs = [
      `--disable-extensions-except=${metamaskPath}`,
      `--load-extension=${metamaskPath}`,
      '--remote-debugging-port=9222',
    ]
    if (process.env.CI) {
      browserArgs.push('--disable-gpu')
    }
    if (process.env.HEADLESS_MODE) {
      browserArgs.push('--headless=new')
    }
    // launch browser
    const context = await chromium.launchPersistentContext(userDataDir, {
      userAgent: process.env.USER_AGENT,
      headless: false,
      args: browserArgs,
    })
    // wait for metamask
    await context.pages()[0].waitForTimeout(3000)
    // setup metamask
    await initialSetup(chromium, {
      secretWordsOrPrivateKey:
        'test test test test test test test test test test test junk',
      network: 'sepolia',
      password: 'Tester@1234',
      enableAdvancedSettings: true,
      enableExperimentalSettings: true,
    })
    await use(context)
    await context.close()
  },
})
export const expect = test.expect
