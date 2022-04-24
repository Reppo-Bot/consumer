export enum DiscordCommandType {
    CHAT_INPUT = 1,
    USER,
    MESSAGE
}

export enum DiscordCommandOptionType {
    SUB_COMMAND = 1,
    SUB_COMMAND_GROUP,
    STRING,
    INTEGER,
    BOOLEAN,
    USER,
    CHANNEL,
    ROLE,
    MENTIONABLE,
    NUMBER,
    ATTACHMENT
}

export interface DiscordCommand {
    id: string
    name: string
    name_localizations?: Map<string, string>
    description: string
    description_localizations?: Map<string, string>
    options?: DiscordCommandOption[]
    default_permission?: boolean
    type: DiscordCommandType
}

export interface DiscordCommandOption {
    type: DiscordCommandOptionType
    name: string
    name_localizations?: Map<string, string>
    description: string
    description_localizations?: Map<string, string>
    required?: boolean // defaults to false if not provided
    min_value?: number
    max_value?: number
    autocomplete?: boolean
}

export interface Command {
    name: string
    description: string
    type: string
    permType: string // role, rank, all
  }