const ResoNetLib = require("resonet-lib");
const fs = require("fs");
const os = require('os');
const path = require("path");

let config;
let client;

let loginButon;
let userList;
let panels;
let userItemTemplate;
let userWorldItemTemplate;

let selectedUser;

const defaultConfig = {
    "user": {
        "username": "",
        "password": "",
        "totp": "",
        "rememberMe": false,
        "autoLogin": false
    },
    "colorOverrides": {
        "override": true,
        "color": "#efece7",
        "primaryColor": "#ffffff",
        "secondaryColor": "#2b2f35",
        "tertiaryColor": "#171a1d",
        "darkGrey": "#171a1d",
        "socialable": "#61d1fa",
        "online": "#59eb5c",
        "busy": "#ff7676",
        "away": "#f8f770",
        "headless": "#BA64F2",
        "offline": "#171a1d"
    }
}

document.addEventListener("DOMContentLoaded", async (event) => {    
    await assignVariables();
    await loadAndUseConfig();
});

function swapPanel(panelName) {
    panels.forEach(panel => {
        panel.classList.add("hidden");
        if (panel.getAttribute("name") === panelName) {
            panel.classList.remove("hidden");
        }
    });
}

function assignVariables() {
    panels = document.querySelectorAll(".panel");
    userItemTemplate = document.getElementById("userItemTemplate");
    userWorldItemTemplate = document.getElementById("userWorldItemTemplate");
    loginButon = document.getElementById("loginButton");
    userList = document.getElementById("userList");
}

async function loadAndUseConfig() {
    config = loadConfig(defaultConfig);

    if (config.user.rememberMe == true) {
        document.getElementById("username").value = config.user.username;
        document.getElementById("password").value = config.user.password;
    }

    if (config.user.autoLogin == true) {
        await attemptLogin();
    }

    if (config.colorOverrides.override == true) {
        applyColorOverrides()
    }
}

function applyColorOverrides() {
    const root = document.documentElement;
    root.style.setProperty('--color', config.colorOverrides.color); 
    root.style.setProperty('--primaryColor', config.colorOverrides.primaryColor);
    root.style.setProperty('--secondaryColor', config.colorOverrides.secondaryColor);
    root.style.setProperty('--tertiaryColor', config.colorOverrides.tertiaryColor);
    root.style.setProperty('--darkGrey', config.colorOverrides.darkGrey);
    root.style.setProperty('--socialable', config.colorOverrides.socialable);
    root.style.setProperty('--online', config.colorOverrides.online);
    root.style.setProperty('--busy', config.colorOverrides.busy);
    root.style.setProperty('--away', config.colorOverrides.away);
    root.style.setProperty('--headless', config.colorOverrides.headless);
    root.style.setProperty('--offline', config.colorOverrides.offline);
}

async function attemptLogin() {
    console.log("Attemping to login");
    loginButon.disabled = true;
    loginButon.style.fontStyle = "italic";
    loginButon.style.backgroundColor = "var(--primaryColor)";
    loginButon.textContent = "Logging in...";
    config.user.username = document.getElementById("username").value;
    config.user.password = document.getElementById("password").value;

    if (config == null) return;

    let clientConfig = {
        "username": config.user.username,
        "password": config.user.password,
        "totp": config.user.totp
    }

    client = new ResoNetLib(clientConfig);
    await client.start().then(async () => {
        config.save();

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
}

function sortUsers() {
    console.log("Sorting contacts...");

    const status = ["Sociable", "Online", "Busy", "Away", "Headless", "Offline"]; 
    const users = Array.from(userList.querySelectorAll(".userItem"));

    users.sort((a, b) => {
        const statusA = a.getAttribute("status") || "";
        const statusB = b.getAttribute("status") || "";

        const indexA = status.indexOf(statusA);
        const indexB = status.indexOf(statusB);

        const safeIndexA = indexA === -1 ? status.length : indexA;
        const safeIndexB = indexB === -1 ? status.length : indexB;

        if (safeIndexA !== safeIndexB) {
            return safeIndexA - safeIndexB;
        }

        const nameA = (a.getAttribute("username") || a.textContent || "").toLowerCase();
        const nameB = (b.getAttribute("username") || b.textContent || "").toLowerCase();

        return nameA.localeCompare(nameB);
    });

    userList.innerHTML = "";
    users.forEach(user => userList.appendChild(user));
}

function nuke(query) {
    const userList = document.getElementById("userList");
    const children = Array.from(userList.children);
    for (const child of children) {
        if (child.hasAttribute("isContact") == true) continue;
        if (child.getAttribute("username").toLowerCase().includes(query)) continue;
        userList.removeChild(child);
    }
}

async function searchUsers(query) {    
    query = query.trim().toLowerCase();
    if (query != "" || query != null) {
        await client.searchUsers(query);
        client.data.users.forEach(user => {
            createUser(user);
        });
    }

    filterUsers(query);
}


async function filterUsers(query) {
    nuke(query);

    const normalizedQuery = query.trim().toLowerCase();
    const users = Array.from(userList.querySelectorAll(".userItem"));

    users.forEach(user => {
        const username = (user.getAttribute("username") || user.textContent || "").toLowerCase();

        if (username.includes(normalizedQuery)) {
            user.classList.remove("hidden");
        } else {
            user.classList.add("hidden");
        }
    });
}

async function createUser(user) {
    const existingUserItem = document.getElementById(user.userId)
    if (existingUserItem != null) return;

    let userItemFragment = userItemTemplate.content.cloneNode(true);
    let userItem = userItemFragment.querySelector(".userItem");
    
    userItem.id = `${user.userId}`;
    userItem.setAttribute("username", user.username);
    userItem.setAttribute("status", "Offline");
    if (user.currentContact) userItem.setAttribute("isContact", true);
    
    const userProfilePicture = userItem.querySelector(".profilePicture");
    let pfp = client.formatAssetUrl(user.currentUser?.profile?.iconUrl) ?? "./resources/contact.svg";
    userProfilePicture.src = pfp;
    
    const userStatus = userItem.querySelector(".status");
    userStatus.textContent = `${user.username}` 

    document.getElementById("userList").appendChild(userItemFragment);
    await client.requestUserUpdate(user.userId);
}

async function updateUserStatus(status) {
    let onlineStatus = status.sessionType == "Headless" ? "Headless" : status.onlineStatus;
    const userItem = document.getElementById(status.userId);
    userItem.setAttribute("status", onlineStatus);
    
    const userStatus = userItem.querySelector(".status");
    let session = await client.fetchUserSession(status.userId);
    let sessionName = JSON.stringify(session);
    if (session?.name != null) {
        sessionName = client.stripTags(session.name);
    } else {
        switch(session?.accessLevel) {
            case "Private":
                sessionName = "a Private World";
                break;
            case "LAN":
                sessionName = "a Lan World";
                break;
            case "Contacts":
                sessionName = "a Contacts Only World";
                break;
            case "ContactsPlus":
                sessionName = "a Contacts Plus World";
                break;
            case "RegisteredUsers":
                sessionName = "a RegisteredUsers World";
                break;
            case "Anyone":
                sessionName = "a Anyone World";
                break;
            default:
            case "Unkown":
                sessionName = "a Unknown World";
                break;
        }
    }

    userStatus.textContent = `${userItem.getAttribute("username")}\nIn ${sessionName}`; 
}

async function selectUser(userId) {
    selectedUser = await client.fetchUser(userId);

    const userProfile = document.querySelector("#userProfile");
    const profilePicture = userProfile.querySelector(".profilePicture");
    let pfp = client.formatAssetUrl(selectedUser.currentUser?.profile?.iconUrl) ?? "./resources/contact.svg";
    profilePicture.src = pfp;

    const profileInfo = userProfile.querySelector("p");
    let string = `${selectedUser.username}(${selectedUser.userId})\n${selectedUser.currentUser.registrationDate}`;
    profileInfo.textContent = string;

    if (userId == client.data.userId) userProfile.querySelector("#actions").classList.add("hidden");
    else userProfile.querySelector("#actions").classList.remove("hidden");

    processBadges(selectedUser);
    processSessions(selectedUser);
}

function processBadges(user) {
    const profileBadges = document.getElementById("badges");
    while (profileBadges.hasChildNodes()) {
        profileBadges.removeChild(profileBadges.lastChild);
    }

    switch (user.currentStatus?.sessionType) {
        case "Bot":
            createBadge("./resources/robot.svg", false);
            break;

        case "ChatClient":
            createBadge("./resources/3p.svg", false);
            break;
            
        case "GraphicalClient":
            createBadge("./resources/computer.svg", false);
            break;

        case "Headless":
            createBadge("./resources/terminal.svg", false);
            break;

        default:
        case "Unknown":
            createBadge("./resources/no_accounts.svg", false)
            break;
    }
    
    if (!profileBadges.hasChildNodes()) {
        document.getElementById("badges").classList.add("hidden");
        return;
    }
    else document.getElementById("badges").classList.remove("hidden");
    
    if (client.data.badges == null) return;
    
    // Fix after
    const badges = user.currentUser?.tags
    if (badges == null) return;
    badges.forEach(badge => {
        if (badge.startsWith("custom 3D badge")) return;
        if (badge.startsWith("custom badge")) {
            badge = badge.split(":")[1];
            createBadge(badge);
        } else {
            badge = client.data.badges[badge];
            if (badge == null) return; 
            createBadge(badge);
        } 
    });
}

function processSessions(contact) {
    const sessionsIds = contact.currentSessions;
    const userWorlds = document.getElementById("userWorlds");
    while (userWorlds.hasChildNodes()) {
        userWorlds.removeChild(userWorlds.lastChild);
    }

    if (sessionsIds == null || sessionsIds.length == 0) { 
        document.getElementById("userWorlds").classList.add("hidden");
        return;
    }
    else document.getElementById("userWorlds").classList.remove("hidden");
    for (let index = 0; index < sessionsIds.length; index++) {
        const session = client.fetchSession(sessionsIds[index]);
        let userWorldItemFragment = userWorldItemTemplate.content.cloneNode(true);
        let userWorldItem = userWorldItemFragment.querySelector(".userWorldItem");
        let isPresent = session.sessionUsers.find(user => user.userID === contact.contactUserId)?.isPresent;

        userWorldItem.style.backgroundColor = isPresent ? "var(--online)" : "var(--away)";
        userWorldItem.setAttribute('name', client.stripTags(session.name));
        userWorldItem.setAttribute('sessionId', session.sessionId);
        userWorldItem.querySelector('img').src = session.thumbnailUrl ?? "./resources/public.svg";
        userWorldItem.querySelectorAll('p')[0].textContent = client.stripTags(session.name);
        userWorldItem.querySelectorAll('p')[1].textContent = session.hostUsername + ` (${session.joinedUsers}/${session.maxUsers})`
        userWorldItem.querySelectorAll('p')[1].style.opacity = "50%";
        
        userWorlds.appendChild(userWorldItem);
    }
}

function createBadge(badgeUrl, format = true) {
    const profileBadges = document.getElementById("badges");
    const newBadge = document.createElement("img");
    newBadge.classList.add("profileBadge");
    const formattedBadgeUrl = format ? client.formatAssetUrl(badgeUrl) : badgeUrl;
    newBadge.src = formattedBadgeUrl;
    profileBadges.appendChild(newBadge);
}

async function addRemoveContact() {
    console.log("Not implemented yet");
}

async function blockContact() {
    console.log("Not implemented yet");
}

async function blockAvatar() {
    console.log("Not implemented yet");
}

async function blockMutual() {
    console.log("Not implemented yet");
}

function getUserDataPath(appName = 'resonet-client') {
  const platform = os.platform();

  if (platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), appName);
  }

  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', appName);
  }

  return path.join(os.homedir(), '.config', appName);
}

function loadConfig(defaults = {}) {
    const configDir = getUserDataPath();
    const configPath = path.join(configDir, 'config.json');

    console.log(configPath);
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    let config = { ...defaults };

    if (fs.existsSync(configPath)) {
        try {
            const raw = fs.readFileSync(configPath, 'utf-8');
            const parsed = JSON.parse(raw);
            config = { ...defaults, ...parsed };
        } catch (err) {
            console.warn('Warning: Failed to parse config file. Using defaults.', err);
        }
    } else {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }

    // Provide a save function
    config.save = () => {
        const toSave = { ...config };
        delete toSave.save;
        fs.writeFileSync(configPath, JSON.stringify(toSave, null, 2));
    };

    return config;
}