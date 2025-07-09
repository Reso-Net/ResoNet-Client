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
    
    // User search stuff
    userSearchInput.addEventListener("keydown", () => {
        clearTimeout(typingTimer);
    })
}

async function attemptLogin() {
    console.log("Attemping to login");
    loginButon.disabled = true;
    loginButon.style.fontStyle = "italic";
    loginButon.style.backgroundColor = "var(--primaryColor)";
    loginButon.textContent = "Logging in...";
    config.loadedConfig.user.username = document.getElementById("username").value;
    config.loadedConfig.user.password = document.getElementById("password").value;
    config.loadedConfig.user.rememberMe = config.loadedConfig.user.autoLogin = document.getElementById("rememberMe").checked;

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
    }

    applyStylePreferences();

    if (config.loadedConfig.user.autoLogin == true) {
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