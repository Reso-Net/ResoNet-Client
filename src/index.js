const ResoNetLib = require("resonet-lib");
const fs = require("fs");
const os = require('os');
const path = require("path");

var config;
var client;

var panels;
var userItemTemplate;
var userWorldItemTemplate;

var selectedContact;

document.addEventListener("DOMContentLoaded", async (event) => {
    panels = document.querySelectorAll(".panel");
    userItemTemplate = document.getElementById("userItemTemplate");
    userWorldItemTemplate = document.getElementById("userWorldItemTemplate");

    showLoginScreen();
});

function swapPanel(panelName) {
    panels.forEach(panel => {
        panel.classList.add("hidden");
        if (panel.getAttribute("name") === panelName) {
            panel.classList.remove("hidden");
        }
    });
}

function getUserDataPath(appName = 'ResoNet') {
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

async function showLoginScreen() {
    const defaultConfig = {
        "user": {
            "username": "",
            "password": "",
            "totp": "",
            "rememberMe": false,
            "autoLogin": false
        },
        "app": {
            "overrideColors": false,
        },
        "colorOverrides": {
            "color": "#efece7",
            "primaryColor": "#3498db",
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
    config = loadConfig(defaultConfig);

    if (config.user.rememberMe == true) {
        document.getElementById("username").value = config.user.username;
        document.getElementById("password").value = config.user.password;
    }

    if (config.user.autoLogin == true) {
        await attemptLogin();
    }
}

async function attemptLogin() {
    console.log("Attemping to login");
    document.getElementById("loginButton").disabled = true;
    document.getElementById("loginButton").style.fontStyle = "italic";
    document.getElementById("loginButton").style.backgroundColor = "var(--primaryColor)";
    document.getElementById("loginButton").textContent = "Logging in...";
    config.user.username = document.getElementById("username").value;
    config.user.password = document.getElementById("password").value;

    if (config == null) return;

    var clientConfig = {
        "username": config.user.username,
        "password": config.user.password,
        "totp": config.user.totp
    }
    client = new ResoNetLib(clientConfig);
    await client.start().then(() => {
        config.save();

        document.getElementById("loginPanel").classList.add("hidden");
        document.getElementById("loginButton").style.fontStyle = "normal";
        document.querySelector(".page").classList.remove("hidden");

        client.on("receiveStatusUpdate", async (status) => {
            await updateContactStatus(status);
            sortContacts();
        });
        
        client.data.contacts.forEach(contact => {
            createContact(contact);
        });

        selectUser(client.data.userId);
    }).catch(error => {
        document.getElementById("loginButton").style.backgroundColor = "var(--busy)";
        document.getElementById("loginButton").disabled = false;
        document.getElementById("loginButton").textContent = `${error}`;
        document.getElementById("loginButton").style.fontStyle = "normal";
    });
}

function sortContacts() {
    console.log("Sorting contacts...");

    const status = ["Sociable", "Online", "Busy", "Away", "Headless", "Offline"]; 

    const contactsList = document.getElementById("contactsList");
    const users = Array.from(contactsList.querySelectorAll(".userItem"));

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

    contactsList.innerHTML = "";
    users.forEach(user => contactsList.appendChild(user));
}

async function filterContacts(query) {
    const normalizedQuery = query.trim().toLowerCase();
    const contactsList = document.getElementById("contactsList");
    const users = Array.from(contactsList.querySelectorAll(".userItem"));

    users.forEach(user => {
        const username = (user.getAttribute("username") || user.textContent || "").toLowerCase();

        if (username.includes(normalizedQuery)) {
            user.classList.remove("hidden");
        } else {
            user.classList.add("hidden");
        }
    });
}

async function createContact(contact) {
    var userItemFragment = userItemTemplate.content.cloneNode(true);
    var userItem = userItemFragment.querySelector(".userItem");
    userItem.id = `${contact.contactUserId}`;
    userItem.setAttribute("status", "Offline");
    userItem.setAttribute("username", contact.contactUsername);
    userItem.setAttribute("isContact", true);
    
    const userProfilePicture = userItem.querySelector(".profilePicture");
    var pfp = client.formatAssetUrl(contact.currentUser?.profile?.iconUrl) ?? "./resources/contact.svg";
    userProfilePicture.src = pfp;
    
    const userStatus = userItem.querySelector(".status");
    userStatus.textContent = `${contact.contactUsername}` 

    document.getElementById("contactsList").appendChild(userItemFragment);
    await client.requestUserUpdate(contact.contactUserId);
}

async function updateContactStatus(status) {
    var onlineStatus = status.sessionType == "Headless" ? "Headless" : status.onlineStatus;
    const userItem = document.getElementById(status.userId);
    userItem.setAttribute("status", onlineStatus);
    
    const userStatus = userItem.querySelector(".status");
    var session = await client.fetchContactSession(status.userId);
    var sessionName;
    if (session.name != null) {
        sessionName = client.stripTags(session.name);
    } else {
        switch(session.accessLevel) {
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
    selectedContact = await client.fetchContact(userId);

    const userProfile = document.querySelector("#userProfile");
    const profilePicture = userProfile.querySelector(".profilePicture");
    var pfp = client.formatAssetUrl(selectedContact.currentUser?.profile?.iconUrl) ?? "./resources/contact.svg";
    profilePicture.src = pfp;

    const profileInfo = userProfile.querySelector("p");
    var string = `${selectedContact.currentUser.username}(${selectedContact.currentUser.id})\n${selectedContact.currentUser.registrationDate}`;
    profileInfo.textContent = string;

    if (userId == client.data.userId) userProfile.querySelector("#actions").classList.add("hidden");
    else userProfile.querySelector("#actions").classList.remove("hidden");

    processBadges(selectedContact);
    processSessions(selectedContact);
}

function processBadges(contact) {
    const profileBadges = document.getElementById("badges");
    while (profileBadges.hasChildNodes()) {
        profileBadges.removeChild(profileBadges.lastChild);
    }

    switch (contact.currentStatus?.sessionType) {
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
    //const badges = selectedContact.currentUser.tags
    //badges.forEach(badge => {
    //    if (badge.startsWith("custom 3D badge")) return;
    //    if (badge.startsWith("custom badge")) {
    //        badge = badge.split(":")[1];
    //        createBadge(badge);
    //    } else {
    //        badge = client.data.badges[badge];
    //        if (badge == null) return; 
    //        createBadge(badge);
    //    } 
    //});
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
        var userWorldItemFragment = userWorldItemTemplate.content.cloneNode(true);
        var userWorldItem = userWorldItemFragment.querySelector(".userWorldItem");
        var isPresent = session.sessionUsers.find(user => user.userID === contact.contactUserId)?.isPresent;

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
