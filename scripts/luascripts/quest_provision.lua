-- quest_provision.lua
-- Provisions an NTAG 424 DNA tag for cmu.quest. Mirrors apps/provisioner
-- (Provisioner.java) so both paths leave a tag in the same state.
--
-- Two starting states:
--   --factory  K0/K1/K2 still the all-zero factory keys. Authenticates with
--              zeros, writes the NDEF, sets K2 then K1, configures SDM, and
--              changes K0 LAST so the authenticated session stays usable.
--   default    An existing eval tag whose K0/K1 are already UID-diversified.
--              Rotates K1 to the production value and configures SDM.
--
-- K2 matters: SDMAccess F012 makes SDMFileRead = K2, so the tag computes every
-- tap MAC with it, and crypto.rs verifies against derive_key(master, "K2", uid).
-- A tag left with a factory K2 reads fine and fails signature checks.
--
-- Run from inside a quest devenv shell (which provides quest-keys and pm3):
--     pm3 -l scripts/luascripts/quest_provision.lua -- --factory
--
-- Defaults: --master ./master.key, --keys-bin quest-keys (resolved from PATH).
--
-- core.console() cannot fail the script on a PM3 error, so the verification
-- block at the end re-reads the tag. Read that output before trusting a tag.

local read14a = require('read14a')
local getopt = require('getopt')

local ZERO = "00000000000000000000000000000000"

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

local KEY_VERSION = "1"

local function trim(s)
    return (s:gsub("^%s+", ""):gsub("%s+$", ""))
end

local function step(label)
    print(string.format("\n[*] %s", label))
end

local function run(cmd)
    print(string.format("[cmd] %s", cmd))
    core.console(cmd)
end

local function auth(keyno, key)
    run(string.format("hf ntag424 auth --keyno %s --key %s", keyno, key))
end

local function changekey(keyno, oldkey, newkey, key0)
    run(string.format(
        "hf ntag424 changekey --keyno %s --oldkey %s --newkey %s --key0 %s --kv %s",
        keyno, oldkey, newkey, key0, KEY_VERSION
    ))
end

local function changefs(key0)
    run(string.format(
        "hf ntag424 changefs --fileno 2 --keyno 0 -k %s -o %s -a %s -s %s -c %s" ..
        " --data1 %s --data2 %s --data3 %s",
        key0, SDM_OPTIONS, SDM_ACCESS, SDM_SDMOPTIONS, SDM_SDMACCESS,
        SDM_DATA1, SDM_DATA2, SDM_DATA3
    ))
end

local function write_ndef(key0)
    run(string.format(
        "hf ntag424 write --fileno 2 --keyno 0 -k %s -o 0 -d %s",
        key0, CMU_QUEST_NDEF
    ))
end

local function derive_keys(keys_bin, master_path, uid_hex)
    local cmd = string.format(
        '"%s" --master "%s" --uid "%s"',
        keys_bin, master_path, uid_hex
    )

    local handle = io.popen(cmd)
    if not handle then
        return nil, "io.popen failed"
    end

    local output = handle:read("*a")
    local ok, _, code = handle:close()

    if not ok then
        return nil, string.format("quest-keys exited %s\n%s", tostring(code), output)
    end

    local keys = {}
    for line in output:gmatch("[^\n]+") do
        local k, v = line:match("^([%w_]+)=(%w+)$")
        if k then
            keys[k] = v
        end
    end

    if not (keys.k0_old and keys.k1_old and keys.k1_new and keys.k2) then
        return nil, "quest-keys output missing required keys:\n" .. output
    end

    return keys
end

local master_path = "./master.key"
local keys_bin = "quest-keys"
local factory = false

for o, a in getopt.getopt(args or "", 'm:b:fh') do
    if o == 'm' then
        master_path = a
    elseif o == 'b' then
        keys_bin = a
    elseif o == 'f' then
        factory = true
    elseif o == 'h' then
        print("Usage: pm3 -l quest_provision.lua -- [--master <path>]" ..
            " [--keys-bin <path>] [--factory]")
        print("  --factory  a tag whose K0/K1/K2 are still the all-zero factory keys")
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

print(string.format("[+] Mode: %s", factory and "FACTORY-FRESH" or "EXISTING EVAL TAG"))

if factory then
    step("Authenticating factory K0")
    auth(0, ZERO)

    step("Writing cmu.quest NDEF while factory K0 is active")
    write_ndef(ZERO)

    step("Setting K2 to the UID-diversified value (the tap MAC key)")
    changekey(2, ZERO, keys.k2, ZERO)

    step("Setting K1 to the production value")
    changekey(1, ZERO, keys.k1_new, ZERO)

    step("Writing SDM file settings for cmu.quest")
    changefs(ZERO)

    step("Setting K0 to the UID-diversified value (last, so the session survives)")
    changekey(0, ZERO, keys.k0_old, ZERO)
else
    step("Authenticating UID-diversified K0")
    auth(0, keys.k0_old)

    step("Probing production K1 ((ok) means already rotated)")
    auth(1, keys.k1_new)

    step("Rotating K1 diversified -> production ((fail) may mean already rotated)")
    changekey(1, keys.k1_old, keys.k1_new, keys.k0_old)

    step("Setting K2 to the UID-diversified value (the tap MAC key)")
    changekey(2, ZERO, keys.k2, keys.k0_old)

    step("Writing SDM file settings for cmu.quest")
    changefs(keys.k0_old)

    step("Writing cmu.quest NDEF URL to file 2")
    write_ndef(keys.k0_old)
end

step("Verifying diversified K0")
auth(0, keys.k0_old)

step("Verifying production K1")
auth(1, keys.k1_new)

step("Verifying diversified K2")
auth(2, keys.k2)

step("Reading file 2 settings")
run("hf ntag424 getfs --fileno 2")

step("Reading first 80 bytes of the NDEF file")
run("hf ntag424 read --fileno 2 -o 0 -l 80")

local timestamp = os.date("!%Y-%m-%dT%H:%M:%SZ")

print("\n[+] Provisioning commands finished.")
print("[!] Check the auth/getfs/read output above before treating the tag as provisioned.")
print(string.format(
    '[REGISTER] {"uid":"%s","provisioned_at":"%s","registered":false}',
    uid, timestamp
))
print("[*] Tap the tag with a phone and verify it resolves to https://cmu.quest/tap")
