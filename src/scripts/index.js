const ResoNetLib = require("resonet-lib");
const Config = require("./scripts/classes/config");

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
let textMessageItemTemplate, audioMessageItemTemplate, objectMessageItemTemplate;

document.addEventListener("DOMContentLoaded", async (event) => {    
    assignVariables();
    await loadAndUseConfig();
});

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
    
    // User search stuff
    userSearchInput.addEventListener("keydown", () => {
        clearTimeout(typingTimer);
    })
}

async function attemptLogin() {
    loginButon.disabled = true;
    loginButon.style.fontStyle = "italic";
    loginButon.style.backgroundColor = "var(--primaryColor)";
    loginButon.textContent = "Logging in...";
    config.loadedConfig.user.username = document.getElementById("username").value;
    config.loadedConfig.user.password = document.getElementById("password").value;
    config.loadedConfig.user.rememberMe = document.getElementById("rememberMe").checked;
    config.loadedConfig.user.autoLogin = document.getElementById("autoLogin").checked;

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
        config.saveConfig();

        document.getElementById("loginPanel").classList.add("hidden");
        loginButon.style.fontStyle = "normal";
        document.querySelector(".page").classList.remove("hidden");

        client.on("messageRecieveEvent", async (message) => {
            if (message.senderId == selectedUser.userId) {
                createMessageItem(message);
                client.markMessagesAsRead({ "senderId": message.senderId, "readTime": (new Date(Date.now())).toISOString(), "ids": [ message.id ] });
            } else {
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

    if (config.loadedConfig.user.autoLogin == true && config.loadedConfig.user.use2fa == false) {
        await attemptLogin();
    }
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