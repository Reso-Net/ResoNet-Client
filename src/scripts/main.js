const ResoNetLib = require("resonet-lib");
const Config = require("./scripts/config");
const { ipcRenderer } = require('electron')

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

let windowFocused = true;

document.addEventListener("DOMContentLoaded", async (event) => {    
    ipcRenderer.on('updateFocus', (_event, value) => {
        windowFocused = value;
    })
    assignVariables();
    await loadAndUseConfig();
});

function createToast(logLevel, content, icon = "", callback = null, title = "") {
    if (!windowFocused) {
        let notification = new window.Notification(title, { body: content, silent: true, icon: icon });
        notification.onclick = () => {
            window.electronApi.focusWindow();
            if (typeof callback === 'function') callback();
        }
    } else {
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
    createToast("log", "Attempting to login", "./resources/info.svg", null, "General Notification");

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
        createToast("success", "Successfully logged in!", "./resources/info.svg", null, "General Notification");
        config.saveConfig();

        document.getElementById("loginPanel").classList.add("hidden");
        loginButon.style.fontStyle = "normal";
        document.querySelector(".page").classList.remove("hidden");

        client.on("sessionUpdateEvent", async (session) => {
            updateAllSessionItems(session);
        });

        client.on("receiveStatusUpdate", async (status) => {
            await updateUserItem(status);
            sortUsers();
        });

        client.on("sessionRemoveEvent", async (sessionId) => {
            removeSessionItemFromSelectedUser(sessionId);
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

        client.on("errorEvent", error => {
            createToast("error", error);
        });

        applyProfileValues();
        
        for (let index = 0; index < client.data.users.length; index++) {
            const user = client.data.users[index];
            await createUserItem(user);
        }

        selectUser(client.data.userId);        
    }).catch(error => {
        loginButon.style.backgroundColor = "var(--busy)";
        loginButon.disabled = false;
        loginButon.textContent = `${error}`;
        loginButon.style.fontStyle = "normal";
    });

    generateSettingsMenu();
}

async function applyProfileValues() {
    const user = await client.fetchUser("U-LeCloutPanda");
    const accountProfilePicture = document.getElementById("accountProfilePicture");
    accountProfilePicture.src = client.formatAssetUrl(user.currentUser?.profile?.iconUrl) ?? "./resources/contact.svg";

    const accountInfo = document.getElementById("accountInfo");

    const accountName = document.createElement("p");
    accountName.textContent = user.username + " (" + user.userId + ")";
    accountInfo.appendChild(accountName);

    const accountRegistrationDate = document.createElement("p");
    try { accountRegistrationDate.textContent = "Registration Date: " + user.currentUser?.registrationDate; accountInfo.appendChild(accountRegistrationDate); }
    catch { accountRegistrationDate.remove(); }

    const accountOldRegistrationDate = document.createElement("p");
    try { accountOldRegistrationDate.textContent = "Old Registration Date: " + user.currentUser?.migratedData?.registrationDate; accountInfo.appendChild(accountOldRegistrationDate); }
    catch { accountOldRegistrationDate.remove(); }

    const accountTagline = document.createElement("p");
    try { accountTagline.textContent = "Tagline: " + user.currentUser?.profile?.tagline; accountInfo.appendChild(accountTagline); }
    catch { accountTagline.remove(); }

    const accountDescription = document.createElement("p");
    try { accountDescription.textContent = "Description: " + user.currentUser?.profile?.description; accountInfo.appendChild(accountDescription); }
    catch { accountDescription.remove(); }

    const profileBadges = document.getElementById("accountBadges");
    if (client.data.badges == null) return;
    
    const badges = user.currentUser?.tags
    if (badges == null) return;
    badges.forEach(badge => {
        if (badge.startsWith("custom 3D badge")) return;
        
        if (badge.startsWith("custom badge")) {
            badge = badge.split(":")[1];
        } else {
            badge = client.data.badges[badge];
        } 

        if (badge == null) return; 

        const newBadge = document.createElement("img");
        newBadge.classList.add("profileBadge");
        const formattedBadgeUrl = true ? client.formatAssetUrl(badge) : badge;
        newBadge.src = formattedBadgeUrl;
        profileBadges.appendChild(newBadge);
    });

    const storage = await client.fetchUserStorage("U-LeCloutPanda");
    const accountStorage = document.getElementById("accountStorage");
    accountStorage.innerText = `${(storage.usedBytes / Math.pow(1024, 3)).toFixed(2)} GB of ${(storage.quotaBytes / Math.pow(1024, 3)).toFixed(2)} GB`;
    accountStorage.parentElement.style.setProperty("--fill", (storage.usedBytes / storage.quotaBytes).toFixed(2) * 100 + "%");
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}