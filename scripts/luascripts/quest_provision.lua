-- quest_provision.lua
-- Provisions an NTAG 424 DNA tag for cmu.quest. Reads the tag's UID, derives
-- the four production keys via the quest-keys helper binary, rotates K1 from
-- the UID-diversified eval value to the non-diversified production value if
-- needed, and writes the cmu.quest URL plus matching SDM file settings.
--
-- Run from inside a quest devenv shell (which provides quest-keys and pm3):
--     pm3 -l scripts/luascripts/quest_provision.lua
--
-- Defaults: --master ./master.key, --keys-bin quest-keys (resolved from PATH).
-- Override either with `pm3 -l <path> -- --master /other/path --keys-bin /other/quest-keys`.

local read14a = require('read14a')
local getopt = require('getopt')

local CMU_QUEST_NDEF =
    "0048D101445504636D752E71756573742F7461703F653D" ..
    "30303030303030303030303030303030" ..
    "30303030303030303030303030303030" ..
    "26633D" ..
    "30303030303030303030303030303030" ..
    "FE"
local SDM_OPTIONS = "40"
local SDM_ACCESS = "00E0"
local SDM_SDMOPTIONS = "C1"
local SDM_SDMACCESS = "F012"
local SDM_DATA1 = "000017"
local SDM_DATA2 = "00003A"
local SDM_DATA3 = "00003A"

local function trim(s)
    return (s:gsub("^%s+", ""):gsub("%s+$", ""))
end

local function derive_keys(keys_bin, master_path, uid_hex)
    local cmd = string.format(
        '"%s" --master "%s" --uid "%s"',
        keys_bin, master_path, uid_hex
    )
    local handle = io.popen(cmd)
    if not handle then return nil, "io.popen failed" end
    local output = handle:read("*a")
    local ok, _, code = handle:close()
    if not ok then
        return nil, string.format("quest-keys exited %s\n%s", tostring(code), output)
    end

    local keys = {}
    for line in output:gmatch("[^\n]+") do
        local k, v = line:match("^([%w_]+)=(%w+)$")
        if k then keys[k] = v end
    end
    if not (keys.k0_old and keys.k1_old and keys.k1_new and keys.k2) then
        return nil, "quest-keys output missing required keys:\n" .. output
    end
    return keys
end

local function step(label)
    print(string.format("\n[*] %s", label))
end

local master_path = "./master.key"
local keys_bin = "quest-keys"

for o, a in getopt.getopt(args or "", 'm:b:h') do
    if o == 'm' then master_path = a end
    if o == 'b' then keys_bin = a end
    if o == 'h' then
        print("Usage: -- --master <master.key> [--keys-bin <quest-keys>]")
        return
    end
end

step("Reading tag UID")
local tag, err = read14a.read(false)
if not tag then
    print("[!] No tag in field: " .. tostring(err))
    return
end
local uid = trim(tag.uid)
print(string.format("[+] UID: %s", uid))

step("Deriving keys")
local keys, derr = derive_keys(keys_bin, master_path, uid)
if not keys then
    print("[!] " .. derr)
    return
end

step("Authenticating K0 to verify derivation")
core.console(string.format(
    "hf ntag424 auth --keyno 0 --key %s",
    keys.k0_old
))

step("Probing K1 (will (ok) if already rotated to production value)")
core.console(string.format(
    "hf ntag424 auth --keyno 1 --key %s",
    keys.k1_new
))

step("Rotating K1 (will (fail) harmlessly if already rotated)")
core.console(string.format(
    "hf ntag424 changekey --keyno 1 --oldkey %s --newkey %s --key0 %s --kv 1",
    keys.k1_old, keys.k1_new, keys.k0_old
))

step("Writing SDM file settings for cmu.quest")
core.console(string.format(
    "hf ntag424 changefs --fileno 2 --keyno 0 -k %s -o %s -a %s -s %s -c %s --data1 %s --data2 %s --data3 %s",
    keys.k0_old,
    SDM_OPTIONS, SDM_ACCESS, SDM_SDMOPTIONS, SDM_SDMACCESS,
    SDM_DATA1, SDM_DATA2, SDM_DATA3
))

step("Writing cmu.quest NDEF URL to file 2")
core.console(string.format(
    "hf ntag424 write --fileno 2 --keyno 0 -k %s -o 0 -d %s",
    keys.k0_old, CMU_QUEST_NDEF
))

local timestamp = os.date("!%Y-%m-%dT%H:%M:%SZ")
print("\n[+] Provisioning complete.")
print(string.format(
    '[REGISTER] {"uid":"%s","provisioned_at":"%s","registered":false}',
    uid, timestamp
))
print("[*] Tap the tag with a phone or with `hf ntag424 ndef` and verify the URL begins with https://cmu.quest/tap")
