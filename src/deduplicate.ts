enum CacheNames {
    AutoModRule = "automodrule",
    Channel = "channel",
    Guild = "guild",
    Emoji = "emoji",
    Sticker = "sticker",
    Member = "member",
    Role = "role",
    Event = "event",
    Integration = "integration",
    Invite = "invite",
    Message = "message",
    Reaction = "reaction",
    Stage = "stage",
    VoiceState = "voicestate",
    Presence = "presence",
    User = "user",
}

type PathConfig = (
    | [CacheNames, string, string[][], ([string, string] | [string]), ([string, string] | [string]), ([string, string] | [string])]
    | [CacheNames, string, string[][], ([string, string] | [string]), ([string, string] | [string])]
    | [CacheNames, string, string[][], ([string, string] | [string])]
    | [CacheNames, string, string[][]]
)[]

export function deduplicate<D extends {}>(entity: CacheNames, data: D): D | D & { dedupe: { [key: string]: string | string[] } } {
    let pathConfig: PathConfig;

    switch (entity) {
        case CacheNames.AutoModRule:
        case CacheNames.Sticker:
        case CacheNames.Emoji:
        case CacheNames.Role:
        case CacheNames.Stage:
        case CacheNames.User:
            return data;

        case CacheNames.Channel:
        case CacheNames.Member:
        case CacheNames.Integration:
        case CacheNames.Presence:
            pathConfig = [
                [CacheNames.User, "user", [["id"]]]
            ];
            break;

        case CacheNames.Event:
            pathConfig = [
                [CacheNames.User, "creator", [["id"]]]
            ];
            break;

        case CacheNames.Invite:
            pathConfig = [
                [CacheNames.User, "inviter", [["id"]]],
                [CacheNames.User, "target_user", [["id"]]]
            ];
            break;

        case CacheNames.VoiceState:
            pathConfig = [
                [CacheNames.Member, "member", [["user", "id"]], ["guild_id", "dm"]]
            ];
            break;

        case CacheNames.Reaction:
            pathConfig = [
                [CacheNames.Member, "member", [["user", "id"]], ["guild_id", "dm"]],
                [CacheNames.Emoji, "emoji", [["id"]]]
            ];
            break;

        case CacheNames.Guild:
            pathConfig = [
                [CacheNames.VoiceState, "voice_states", [["channel_id"], ["user_id"]]],
                [CacheNames.Member, "members", [["user", "id"]], ["id"]],
                [CacheNames.Channel, "channels", [["id"]], ["id"]],
                [CacheNames.Channel, "threads", [["id"]], ["id"]],
                [CacheNames.Presence, "presences", [["user", "id"]], ["id"]],
                [CacheNames.Stage, "stage_instances", [["guild_id"], ["id"]]],
                [CacheNames.Event, "guild_scheduled_events", [["guild_id"], ["id"]]],
                [CacheNames.Role, "roles", [["id"]], ["id"]],
                [CacheNames.Emoji, "emojis", [["id"]]],
                [CacheNames.Sticker, "stickers", [["id"]]]
            ];
            break;
        case CacheNames.Message:
            pathConfig = [
                [CacheNames.User, "author", [["id"]]],
                [CacheNames.Member, "member", [], ["guild_id", "dm"], ["author", "id"]],
                [CacheNames.User, "mentions", [["id"]]],
                [CacheNames.Role, "mention_roles", [["id"]], ["guild_id"]],
                [CacheNames.Channel, "mention_channels", [["id"]], ["guild_id", "dm"]],
                [CacheNames.Reaction, "reactions", [["emoji", "id"]], ["guild_id", "dm"], ["channel_id", "dm"], ["message_id", "dm"]],
                [CacheNames.Message, "referenced_message", [["id"]], ["guild_id", "dm"], ["channel_id"]],
                [CacheNames.Channel, "thread", [["id"]], ["guild_id", "dm"]],
                [CacheNames.Sticker, "sticker_items", [["id"]]]
            ];
            break;
        default:
            return data;
    }

    return executeDeduplicate(data, pathConfig);
}

function executeDeduplicate<D extends {}>(data: D, paths: PathConfig): D & { dedupe: { [key: string]: string | string[] } } {
    const clone = { ...data } as D & { dedupe: { [path: string]: string | string[] } } & { [path: string]: any };
    clone.dedupe = { };
    for (const [entity, path, keyPath, keyPrefix, secondKeyPrefix, thirdMessagePrefix] of paths) {
        const obj = clone[path];
        if (!obj) continue;

        if (Array.isArray(obj)) {
            const ids = [];
            for (const item of obj) {
                let id = '';

                if (keyPrefix) {
                    const keyPrefixPath = keyPrefix[0].split(".");
                    let val = clone;
                    for (const key of keyPrefixPath) {
                        val = val[key];
                    }
                    id += `:${val ?? keyPrefix[1]}`;
                }

                if (secondKeyPrefix) {
                    const keyPrefixPath = secondKeyPrefix[0].split(".");
                    let val = clone;
                    for (const key of keyPrefixPath) {
                        val = val[key];
                    }
                    id += `:${val ?? secondKeyPrefix[1]}`;
                }

                if (thirdMessagePrefix) {
                    const keyPrefixPath = thirdMessagePrefix[0].split(".");
                    let val = clone;
                    for (const key of keyPrefixPath) {
                        val = val[key];
                    }
                    id += `:${val ?? thirdMessagePrefix[1]}`;
                }

                for (const key of keyPath) {
                    let val = item;
                    for (const k of key)
                        val = val[k];
                    id += `:${val}`;
                }
                ids.push(`${entity}${id}`);
            }
            clone.dedupe[path] = ids;
        } else {
            let id = '';

            if (keyPrefix) {
                const keyPrefixPath = keyPrefix[0].split(".");
                let val = clone;
                for (const key of keyPrefixPath) {
                    val = val[key];
                }
                id += `:${val ?? keyPrefix[1]}`;
            }

            if (secondKeyPrefix) {
                const keyPrefixPath = secondKeyPrefix[0].split(".");
                let val = clone;
                for (const key of keyPrefixPath) {
                    val = val[key];
                }
                id += `:${val ?? secondKeyPrefix[1]}`;
            }

            if (thirdMessagePrefix) {
                const keyPrefixPath = thirdMessagePrefix[0].split(".");
                let val = clone;
                for (const key of keyPrefixPath) {
                    val = val[key];
                }
                id += `:${val ?? thirdMessagePrefix[1]}`;
            }

            for (const key of keyPath) {
                let val = obj;
                for (const k of key)
                    val = val[k];
                id += `:${val}`;
            }
            clone.dedupe[path] = `${entity}${id}`;
        }

        delete clone[path];
    }
    return clone;
}
