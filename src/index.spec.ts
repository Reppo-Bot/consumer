import { expect } from 'chai'
import { AxiosResponse } from "axios"

import { addCommands, discordCommandsCall, Handler } from './index'

const testHandler: Handler = {
  post: (url, data, headers) => ({
      headers: {
          'x-ratelimit-bucket': 'db18a1c09af2e1661654351fbf0faf15',
          'x-ratelimit-limit': '5',
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': '1650672594.213',
          'x-ratelimit-reset-after': '5.000',
      },
      data: {},
      config: {},
      status: 200,
      statusText: 'OK',
  } as AxiosResponse),
  get: (url, headers) => ({
      headers: {
          'x-ratelimit-bucket': 'db18a1c09af2e1661654351fbf0faf15',
          'x-ratelimit-limit': '5',
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': '1650672594.213',
          'x-ratelimit-reset-after': '5.000',
      },
      data: {},
      config: {},
      status: 200,
      statusText: 'OK',
  } as AxiosResponse),
  delete: (url, headers) => ({
      headers: {
          'x-ratelimit-bucket': 'db18a1c09af2e1661654351fbf0faf15',
          'x-ratelimit-limit': '5',
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': '1650672594.213',
          'x-ratelimit-reset-after': '5.000',
      },
      data: {},
      config: {},
      status: 200,
      statusText: 'OK',
  } as AxiosResponse)
}

describe('discord', function () {
  this.timeout(0)
  it('discordCallCommandBad', function (done) {
    let wee = false
    setTimeout(() => {expect(wee).to.be.false; done()}, 4999)
    discordCommandsCall(testHandler, 'post', 'https://discord.com/api/v6/channels/123456789/messages', { content: 'test' }).then(res => { wee = true; })
  })

  it('discordCallCommandGood', function (done) {
    let wee = false
    setTimeout(() => {expect(wee).to.be.true; done()}, 6000)
    discordCommandsCall(testHandler, 'post', 'https://discord.com/api/v6/channels/123456789/messages', { content: 'test' }).then(res => { wee = true; })
  })
})

