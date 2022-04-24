import axios, { AxiosResponse } from 'axios';
import ampq from 'amqplib'
import { Command, DiscordCommand, DiscordCommandOption, DiscordCommandOptionType, DiscordCommandType } from './types';

const myAxios = axios.create({ baseURL: 'http://localhost:8080' })

export const BASE_URL = 'https://discord.com/api/v9/applications';
export const ENV_URL = 'localhost:8080'

export const addCommands = async (handler: Handler | typeof axios, commands: Command[], appId: string, serverId: string, token: string) => {
    for (const command of commands) {
        const discordCommand = { name: command.name, description: command.description, type: DiscordCommandType.CHAT_INPUT } as DiscordCommand
        discordCommand.options = []
        discordCommand.options.push({ name: 'user', description: 'User to call command on', type: DiscordCommandOptionType.USER, required: command.type !== 'info' } as DiscordCommandOption)
        if (command.type === 'ban' || command.type === 'set') {
            discordCommand.options.push({ name: 'amount', description: 'Amount', type: DiscordCommandOptionType.INTEGER, required: false } as DiscordCommandOption)
            discordCommand.options.push({ name: 'reason', description: 'Reason for ban', type: DiscordCommandOptionType.STRING, required: false } as DiscordCommandOption)
        }
        const result = await discordCommandsCall(handler, 'post', `${BASE_URL}/${appId}/guilds/${serverId}/commands`, discordCommand, token)
        if (result.status === 200 || result.status === 201) {
            console.log(`${result.status === 200 ? 'Added' : 'Updated'} command ${command.name}`)
        } else {
            console.log(`Failed to add command ${command.name}`)
            return false
        }
    }
    return true
}

export const cleanCommands = async (handler: Handler | typeof axios, commands: Command[], appId: string, serverId: string, token: string) => {
    const discordCommands = await (await discordCommandsCall(handler, 'get', `${BASE_URL}/${appId}/guilds/${serverId}/commands`, null, token)).data
    if (!discordCommands) { return false } // fix later
    const names = commands.map(command => command.name)
    const removeCommads = discordCommands.filter((discordCommand: DiscordCommand) => names.includes(discordCommand.name))
    for (const command of removeCommads) {
        const result = await discordCommandsCall(handler, 'delete', `${BASE_URL}/${appId}/guilds/${serverId}/commands/${command.id}`, null, token)
        if (result.status === 204) {
            console.log(`Removed command ${command.name}`)
        } else {
            console.log(`Failed to remove command ${command.name}`)
            return false
        }
    }
    return true
}

export const rollbackCommands = async (handler: Handler | typeof axios, commands: Command[], appId: string, serverId: string, token: string) => {
    console.log('Rolling back commands')
    const discordCommands = await discordCommandsCall(handler, 'get', `${BASE_URL}/${appId}/guilds/${serverId}/commands`, null, token)
    discordCommands.data.forEach(async (discordCommand: DiscordCommand) => {
        await discordCommandsCall(handler, 'delete', `${BASE_URL}/${appId}/guilds/${serverId}/commands/${discordCommand.id}`, null, token)
    })
    for (const command of commands) {
        const discordCommand = { name: command.name, description: command.description, type: DiscordCommandType.CHAT_INPUT } as DiscordCommand
        discordCommand.options = []
        discordCommand.options.push({ name: 'user', description: 'User to call command on', type: DiscordCommandOptionType.USER, required: command.type !== 'info' } as DiscordCommandOption)
        if (command.type === 'ban' || command.type === 'set') {
            discordCommand.options.push({ name: 'amount', description: 'Reason for ban', type: DiscordCommandOptionType.INTEGER, required: false } as DiscordCommandOption)
            discordCommand.options.push({ name: 'reason', description: 'Reason for ban', type: DiscordCommandOptionType.STRING, required: false } as DiscordCommandOption)
        }
        const result = await discordCommandsCall(handler, 'post', `${BASE_URL}/${appId}/guilds/${serverId}/commands`, discordCommand, token)
        if (result.status === 200) {
            console.log(`Restored command ${command.name}`)
        } else {
            console.log(`Failed to restore command ${command.name}. This will leave your bot in an inconsistent state with your config.`)
            return false
        }
    }
    return true
}

export interface Handler {
    post(url: string, data: unknown, headers: unknown): AxiosResponse
    get(url: string, headers: unknown): AxiosResponse
    delete(url: string, headers: unknown): AxiosResponse
}

export const discordCommandsCall = async (handler: Handler | typeof axios, type: string, url: string, data?: any, token?: string) => {
    const headers = {
        'Authorization': `Bot ${token ?? process.env.TOKEN}`
    }
    let res: AxiosResponse = {} as AxiosResponse

    switch (type) {
        case 'post':
            res = await handler.post(url, data, { headers })
            break
        case 'get':
            res = await handler.get(url, { headers })
            break
        case 'delete':
            res = await handler.delete(url, { headers })
            break
    }
    if (!res) throw new Error('No response from discord')

    await limit(res)

    return res
}

export const limit = async (res: AxiosResponse) => {
    console.log(res.headers['x-ratelimit-remaining'])
    if (res.headers['x-ratelimit-remaining'] && res.headers['x-ratelimit-remaining'] == '0') {
        console.log('Rate limit reached, waiting')
        console.log(`waiting ${res.headers['x-ratelimit-reset-after']} seconds`)
        await new Promise(resolve => setTimeout(resolve, ((parseInt(res.headers['x-ratelimit-reset-after']) ?? 20) + 2) * 1000))
    }
    return true
}

export const _objToMap = (obj: any) => {
    const map = new Map()
    Object.keys(obj).forEach(key => {
        map.set(key, obj[key])
    })
    return map
}

export const main = async (handler: Handler | typeof axios) => {
    const connection = await ampq.connect("amqp://localhost")
    const channel = await connection.createChannel()
    channel.assertQueue("commands", { durable: true })
    channel.consume("commands", async (msg) => {
        if (!msg) return
        channel.ack(msg)
        try {
            const parsed = JSON.parse(msg.content.toString())
            const { code } = parsed
            if (code == 1) {
                console.log('We have it')
                const {
                    commandsToAdd,
                    commandsToDelete,
                    commandsToUpdate,
                    oldCommands,
                    appId,
                    serverId,
                    token,
                    config
                } = parsed

                if (!await addCommands(handler, [...commandsToAdd, ...commandsToUpdate], appId, serverId, token)) {
                    await rollbackCommands(handler, oldCommands, appId, serverId, token)
                    await handler.post(`http://localhost:8080/web/private/failUpdate`, { serverid: serverId }, {})
                    channel.ack(msg)
                    return
                }
                if (!await cleanCommands(handler, commandsToDelete, appId, serverId, token)) {
                    await rollbackCommands(handler, oldCommands, appId, serverId, token)
                    await handler.post(`http://localhost:8080/web/private/failUpdate`, { serverid: serverId }, {})
                    channel.ack(msg)
                    return
                }
                await handler.post(`http://localhost:8080/web/private/successUpdate`, { serverid: serverId, config }, {})
            }
        } catch (e) {
            console.log(e)
        }
    })
}

(async () => {
    main(axios)
})()
