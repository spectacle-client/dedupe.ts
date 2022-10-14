local baseObj = cjson.decode(redis.call('get', KEYS[1]))

for k, v in pairs(baseObj.dedupe) do
    if type(v) == "string" then
        local entity = redis.call('get', v)
        baseObj[k] = cjson.decode(entity)
    else
        baseObj[k] = {}
        for i, j in pairs(v) do
            local entity = redis.call('get', j)
            baseObj[k][i] = cjson.decode(entity)
        end
    end
end

baseObj.dedupe = nil
return cjson.encode(baseObj)
