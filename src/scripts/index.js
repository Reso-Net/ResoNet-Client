const ResoNetLib = require("resonet-lib");
const fs = require("fs").promises;
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

    swapPanel("contacts");
    await attemptLogin();
    selectUser("U-LeCloutPanda");
    document.querySelector(".loader").classList.add("hidden");
    document.querySelector(".page").classList.remove("hidden");

});

function swapPanel(panelName) {
    panels.forEach(panel => {
        panel.classList.add("hidden");
        panel.classList.remove("active");
        if (panel.getAttribute("name") === panelName) {
            panel.classList.remove("hidden");
            panel.classList.add("active");
        }
    });
}

async function tryLoadConfig() {
    const configFilePath = path.join(__dirname, "config.json");
    console.log("Looking for config in directory", configFilePath);

    const data = await fs.readFile(configFilePath, "utf8");
    const json = JSON.parse(data);
    return json;
}

async function attemptLogin() {
    config = await tryLoadConfig();
    if (config == null) return;

    const loginData = {
        "username": `${config.username}`,
        "password": `${config.password}`,
        "totp": ""
    }

    client = new ResoNetLib(loginData);
    await client.start().then(() => {
        client.on("sessionUpdateEvent", async (session) => { });    
        client.on("sessionRemoveEvent", async (sessionId) => { });
        client.on("messageRecieveEvent", async (message) => { });
        client.on("receiveStatusUpdate", async (status) => {
            await updateContactStatus(status);
            sortContacts();
        });

        client.data.contacts.forEach(contact => {
            createContact(contact);
        });

    }).catch((error) => {
        console.error(error);
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
