const ResoNetLib = require("resonet-lib");
const Config = require("./scripts/config");
const { contain } = require("three/src/extras/TextureUtils.js");

let config = new Config();
let client;

let loginButon;
let userList;
let panels;
let userSearchInput;

// Templates
let userItemTemplate;
let userWorldItemTemplate;
let settingItemTemplate;
let textMessageItemTemplate, audioMessageItemTemplate, objectMessageItemTemplate, sessionInviteMessageItemTemplate, inviteRequestMessageItemTemplate;

document.addEventListener("DOMContentLoaded", async (event) => {    
    assignVariables();
    await loadAndUseConfig();
});

function createToast(logLevel, content, icon = "", callback = null) {
    let fragment = document.getElementById("toastItemTemplate").content.cloneNode(true);
    let toastItem = fragment.querySelector(".toastItem");
    toastItem.setAttribute("type", logLevel);
    toastItem.querySelector("p").textContent = content;
    document.getElementById("toastContainer").appendChild(toastItem);
    
    if (icon == "") {
        switch(logLevel) {
            case "log":
                icon = "./resources/info.svg";
                break;
            case "warn":
                icon = "./resources/warning.svg";
                break;
            case "error":
                icon = "./resources/dangerous.svg";
                break;
            case "success":
                icon = "./resources/check_circle.svg";
                break;
            case "unkown":
                icon = "./resources/help.svg";
                break;
        }
    }

    if (typeof callback === 'function') {
        toastItem.addEventListener("click", async () => { 
            callback(); 
            toastItem.setAttribute("active", false);
            setTimeout(() => { toastItem.remove(); }, 250);
        });

    }

    toastItem.querySelector("img").src = icon;

    setTimeout(() => {
        toastItem.setAttribute("active", true);
    }, 3);

    setTimeout(() => {
        toastItem.setAttribute("active", false);
        setTimeout(() => { toastItem.remove(); }, 250);
    }, 2500);
}

function assignVariables() {
    panels = document.querySelectorAll(".panel");
    userItemTemplate = document.getElementById("userItemTemplate");
    userWorldItemTemplate = document.getElementById("userWorldItemTemplate");
    loginButon = document.getElementById("loginButton");
    userList = document.getElementById("userList");    
    userSearchInput = document.getElementById("userSearchInput");
    settingItemTemplate = document.getElementById("settingItemTemplate");
    textMessageItemTemplate = document.getElementById("textMessageItemTemplate");
    audioMessageItemTemplate = document.getElementById("audioMessageItemTemplate");
    objectMessageItemTemplate = document.getElementById("objectMessageItemTemplate");
    sessionInviteMessageItemTemplate = document.getElementById("sessionInviteMessageItemTemplate");
    inviteRequestMessageItemTemplate = document.getElementById("inviteRequestMessageItemTemplate");
    
    // User search stuff
    userSearchInput.addEventListener("keydown", () => {
        clearTimeout(typingTimer);
    })

    document.getElementById("totp").addEventListener("input", () => {  
        modify2FAStuff();        
    })
}

function modify2FAStuff() {
    let totpInput = document.getElementById("totp");
    let use2Fa = totpInput.value.trim() != "" || config?.loadedConfig?.user.use2fa;
    let autoLogin = document.getElementById("autoLogin");
    autoLogin.disabled = use2Fa;
    autoLogin.checked = false;
    if (use2Fa) {
        autoLogin.parentElement.classList.add("hidden");
    }
    else {
        autoLogin.parentElement.classList.remove("hidden");
    }
}

async function attemptLogin() {
    createToast("log", "Attempting to login");

    loginButon.disabled = true;
    loginButon.style.fontStyle = "italic";
    loginButon.style.backgroundColor = "var(--primaryColor)";
    loginButon.textContent = "Logging in...";
    config.loadedConfig.user.username = document.getElementById("username").value;
    config.loadedConfig.user.password = document.getElementById("password").value;
    config.loadedConfig.user.rememberMe = document.getElementById("rememberMe").checked;
    //let use2Fa = document.getElementById("totp").value.trim() != "";
    //config.loadedConfig.user.autoLogin = !use2Fa && document.getElementById("autoLogin").checked;
    //config.loadedConfig.user.use2fa = use2Fa;

    document.getElementById("rememberMe").disabled = true;
    document.getElementById("autoLogin").disabled = true;

    if (config.loadedConfig == null) return;

    let clientConfig = {
        "username": config.loadedConfig.user.username,
        "password": config.loadedConfig.user.password,
        "totp": config.loadedConfig.user.totp
    }

    client = new ResoNetLib(clientConfig);
    await client.start().then(async () => {
        createToast("success", "Successfully logged in!");
        config.saveConfig();

        document.getElementById("loginPanel").classList.add("hidden");
        loginButon.style.fontStyle = "normal";
        document.querySelector(".page").classList.remove("hidden");

        client.on("sessionUpdateEvent", async (session) => {
            updateSessionItems(session);
        });

        client.on("messageRecieveEvent", async (message) => {
            if (message.senderId == selectedUser.userId) {
                createMessageItem(message);
                client.markMessagesAsRead({ "senderId": message.senderId, "readTime": (new Date(Date.now())).toISOString(), "ids": [ message.id ] });
            } else {
                let sender = await client.fetchUser(message.senderId);
                let icon = client.formatAssetUrl(sender.currentUser.profile?.iconUrl) ?? "./resources/chat_bubble.svg";

                switch (message.messageType) {
                    case "Text":
                        createToast("log", `${sender.username}: ${message.content}`, icon, () => selectUser(sender.userId)); 
                        break;
                    case "Object":
                        createToast("log", `${sender.username} sent an object: ${JSON.parse(message.content).name}`, icon, () => selectUser(sender.userId)); 
                        break;
                }
                document.getElementById(message.senderId).style.filter = "brightness(5)";
            }
        });

        client.on("receiveStatusUpdate", async (status) => {
            await updateUserStatus(status);
            sortUsers();
        });
        
        await client.data.users.forEach(user => {
            createUser(user);
        });

        selectUser(client.data.userId);
    }).catch(error => {
        loginButon.style.backgroundColor = "var(--busy)";
        loginButon.disabled = false;
        loginButon.textContent = `${error}`;
        loginButon.style.fontStyle = "normal";
    });

    generateSettingsMenu();
}

async function loadAndUseConfig() {
    config.loadConfig();

    if (config.loadedConfig.user.rememberMe == true) {
        document.getElementById("username").value = config.loadedConfig.user.username;
        document.getElementById("password").value = config.loadedConfig.user.password;
        document.getElementById("rememberMe").checked = config.loadedConfig.user.rememberMe;
        document.getElementById("autoLogin").checked = config.loadedConfig.user.autoLogin;
    }

    applyStylePreferences();

    //if (config.loadedConfig.user.autoLogin == true && config.loadedConfig.user.use2fa == false) {
    //    await attemptLogin();
    //}
}

function saveConfig() {
    updateConfigFromSettings();
    config.saveConfig();
}

function resetConfig() {
    config.resetConfig();
    updateSettingsVisuals();
    applyStylePreferences();
    config.saveConfig();
}

function swapPanel(panelName) {
    panels.forEach(panel => {
        panel.classList.add("hidden");
        if (panel.getAttribute("name") === panelName) {
            panel.classList.remove("hidden");
        }
    });
}

function getNoAssetReplacement() {
    let random = Math.floor(Math.random() * 3);
    let asset = `./resources/no_assets/noasset_${random}.png`;
    return asset;
}
