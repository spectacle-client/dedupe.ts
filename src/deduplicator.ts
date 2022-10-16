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

type PathConfig = {entity: CacheNames, entityPath: string, keyPaths: string[], keyPathPrefixes?: {path: string, fallback?: string}[]}[]

export class Deduplicator {
    public constructor(public readonly entitiesToDeduplicate: CacheNames[]) {
        this.entitiesToDeduplicate = entitiesToDeduplicate;
    }

    public deduplicate<D extends {}>(entity: CacheNames, data: D): D | D & { dedupe: { [key: string]: string | string[] } } {
        if (!this.entitiesToDeduplicate.includes(entity))
            return data;

        let pathConfig: PathConfig;

        switch (entity) {
            case CacheNames.AutoModRule:
            case CacheNames.Sticker:
            case CacheNames.Emoji:
            case CacheNames.Role:
            case CacheNames.Stage:
            case CacheNames.User:
            case CacheNames.Reaction:
                return data;

            case CacheNames.Channel:
            case CacheNames.Member:
            case CacheNames.Integration:
            case CacheNames.Presence:
                pathConfig = [
                    {entity: CacheNames.User, entityPath: "user", keyPaths: ["id"]}
                ];
                break;

            case CacheNames.Event:
                pathConfig = [
                    {entity: CacheNames.User, entityPath: "creator", keyPaths: ["id"]}
                ];
                break;

            case CacheNames.Invite:
                pathConfig = [
                    {entity: CacheNames.User, entityPath: "inviter", keyPaths: ["id"]},
                    {entity: CacheNames.User, entityPath: "target_user", keyPaths: ["id"]}
                ];
                break;

            case CacheNames.VoiceState:
                pathConfig = [
                    {entity: CacheNames.Member, entityPath: "member", keyPaths: ["user.id"], keyPathPrefixes: [{path: "guild_id", fallback: "dm"}]}
                ];
                break;

            case CacheNames.Guild:
                pathConfig = [
                    {entity: CacheNames.VoiceState, entityPath: "voice_states", keyPaths: ["channel_id"], keyPathPrefixes: [{path: "user_id"}]},
                    {entity: CacheNames.Member, entityPath: "members", keyPaths: ["user.id"], keyPathPrefixes: [{path: "id"}]},
                    {entity: CacheNames.Channel, entityPath: "channels", keyPaths: ["id"], keyPathPrefixes: [{path: "id"}]},
                    {entity: CacheNames.Channel, entityPath: "threads", keyPaths: ["id"], keyPathPrefixes: [{path: "id"}]},
                    {entity: CacheNames.Presence, entityPath: "presences", keyPaths: ["user.id"], keyPathPrefixes: [{path: "id"}]},
                    {entity: CacheNames.Stage, entityPath: "stage_instances", keyPaths: ["guild_id"], keyPathPrefixes: [{path: "id"}]},
                    {entity: CacheNames.Event, entityPath: "guild_scheduled_events", keyPaths: ["guild_id", "id"]},
                    {entity: CacheNames.Role, entityPath: "roles", keyPaths: ["id"], keyPathPrefixes: [{path: "id"}]},
                    {entity: CacheNames.Emoji, entityPath: "emojis", keyPaths: ["id"]},
                    {entity: CacheNames.Sticker, entityPath: "stickers", keyPaths: ["id"]},
                ];
                break;
            case CacheNames.Message:
                pathConfig = [
                    {entity: CacheNames.Member, entityPath: "member", keyPaths: [], keyPathPrefixes: [{path: "guild_id", fallback: "dm"}, {path: "author.id"}]},
                    {entity: CacheNames.User, entityPath: "author", keyPaths: ["id"]},
                    {entity: CacheNames.User, entityPath: "mentions", keyPaths: ["id"]},
                    {entity: CacheNames.Role, entityPath: "mention_roles", keyPaths: ["id"], keyPathPrefixes: [{path: "guild_id"}]},
                    {entity: CacheNames.Channel, entityPath: "mention_channels", keyPaths: ["id"], keyPathPrefixes: [{path: "guild_id", fallback: "dm"}]},
                    {entity: CacheNames.Reaction, entityPath: "reactions", keyPaths: ["emoji.id"], keyPathPrefixes: [{path: "guild_id", fallback: "dm"}, {path: "channel_id"}, {path: "message_id"}]},
                    {entity: CacheNames.Message, entityPath: "referenced_message", keyPaths: ["id"], keyPathPrefixes: [{path: "guild_id", fallback: "dm"}, {path: "channel_id"}]},
                    {entity: CacheNames.Channel, entityPath: "thread", keyPaths: ["id"], keyPathPrefixes: [{path: "guild_id", fallback: "dm"}]},
                    {entity: CacheNames.Sticker, entityPath: "sticker_items", keyPaths: ["id"]}
                ];
                break;
            default:
                return data;
        }

        return this.executeDeduplicate(data, pathConfig);
    }

    private executeDeduplicate<D extends {}>(data: D, paths: PathConfig): D & { dedupe: { [key: string]: string | string[] } } {
        const clone = { ...data } as D & { dedupe: { [path: string]: string | string[] } } & { [path: string]: any };
        clone.dedupe = { };

        for (const {entity, entityPath, keyPaths, keyPathPrefixes} of paths) {
            const obj = clone[entityPath];
            if (!obj) continue;

            try {
                if (Array.isArray(obj)) {
                    const ids = [];
                    for (const item of obj) {
                        let id = "";

                        id += Deduplicator.applyPrefixes(clone, keyPathPrefixes || []);
                        id += Deduplicator.applyPaths(item, keyPaths);

                        ids.push(`${entity}${id}`);
                    }
                    clone.dedupe[entityPath] = ids;
                } else {
                    let id = "";

                    id += Deduplicator.applyPrefixes(clone, keyPathPrefixes || []);
                    id += Deduplicator.applyPaths(obj, keyPaths);

                    clone.dedupe[entityPath] = `${entity}${id}`;
                }

                delete clone[entityPath];
            } catch (e) {
                console.warn(`Failed to deduplicate ${entityPath} for ${entity}`, e);
            }
        }

        return clone;
    }

    private static applyPrefixes(data: any, prefixes: {path: string, fallback?: string}[]) {
        let prefix = "";
        for (const {path, fallback} of prefixes) {
            const prefixPathChain = path.split(".");
            let val = data;

            for (const path of prefixPathChain) {
                if (!val) break;
                val = val[path];
            }

            if (!val && !fallback)
                throw new Error(`No value found for path ${path} in ${JSON.stringify(data)}`);

            prefix += `:${val ?? fallback}`;
        }
        return prefix;
    }

    private static applyPaths(data: any, paths: string[]) {
        let value = "";
        for (const key of paths) {
            const split = key.split(".");
            let val = data;

            for (const k of split) {
                if (!val) break;
                val = val[k];
            }

            if (!val)
                throw new Error(`No value found for path ${key} in ${JSON.stringify(data)}`);

            value += `:${val}`;
        }
        return value;
    }
}
