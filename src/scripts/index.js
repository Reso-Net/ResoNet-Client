const ResoNetLib = require('resonet-lib');
const fs = require('fs').promises;
const path = require('path');

var config;
var client;

var panels;
var userItemTemplate;

var selectedContact;

document.addEventListener("DOMContentLoaded", async (event) => {
    panels = document.querySelectorAll('.panel');
    userItemTemplate = document.getElementById('userItemTemplate');

    swapPanel('contacts');
    await attemptLogin();
    selectUser('U-LeCloutPanda');
    document.querySelector('.loader').classList.add('hidden');
    document.querySelector('.page').classList.remove('hidden');

});

function swapPanel(panelName) {
    panels.forEach(panel => {
        panel.classList.add('hidden');
        panel.classList.remove('active');
        if (panel.getAttribute('name') === panelName) {
            panel.classList.remove('hidden');
            panel.classList.add('active');
        }
    });
}

async function tryLoadConfig() {
    const configFilePath = path.join(__dirname, 'config.json');
    console.log("Looking for config in directory", configFilePath);

    const data = await fs.readFile(configFilePath, 'utf8');
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
            updateContactStatus(status);
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

    const contactsList = document.getElementById('contactsList');
    const users = Array.from(contactsList.querySelectorAll('.userItem'));

    users.sort((a, b) => {
        const statusA = a.getAttribute('status') || '';
        const statusB = b.getAttribute('status') || '';

        const indexA = status.indexOf(statusA);
        const indexB = status.indexOf(statusB);

        const safeIndexA = indexA === -1 ? status.length : indexA;
        const safeIndexB = indexB === -1 ? status.length : indexB;

        if (safeIndexA !== safeIndexB) {
            return safeIndexA - safeIndexB;
        }

        const nameA = (a.getAttribute('username') || a.textContent || '').toLowerCase();
        const nameB = (b.getAttribute('username') || b.textContent || '').toLowerCase();

        return nameA.localeCompare(nameB);
    });

    contactsList.innerHTML = '';
    users.forEach(user => contactsList.appendChild(user));
}

async function filterContacts(query) {
    const normalizedQuery = query.trim().toLowerCase();
    const contactsList = document.getElementById('contactsList');
    const users = Array.from(contactsList.querySelectorAll('.userItem'));

    users.forEach(user => {
        const username = (user.getAttribute('username') || user.textContent || '').toLowerCase();

        if (username.includes(normalizedQuery)) {
            user.classList.remove('hidden');
        } else {
            user.classList.add('hidden');
        }
    });
}

async function createContact(contact) {
    var userItemFragment = userItemTemplate.content.cloneNode(true);
    var userItem = userItemFragment.querySelector('.userItem');
    userItem.id = `${contact.contactUserId}`;
    userItem.setAttribute('status', 'Offline');
    userItem.setAttribute('username', contact.contactUsername);
    userItem.setAttribute('isContact', true);
    
    const userProfilePicture = userItem.querySelector('.profilePicture');
    var pfp = client.formatAssetUrl(contact.currentUser?.profile?.iconUrl) ?? "./resources/contact.svg";
    userProfilePicture.src = pfp;
    
    const userStatus = userItem.querySelector('.status');
    userStatus.textContent = `${contact.contactUsername}` 

    document.getElementById('contactsList').appendChild(userItemFragment);
    await client.signalRConnection.send("RequestStatus", contact.contactUserId, true);
}

function updateContactStatus(status) {
    try {
        var onlineStatus = status.sessionType == "Headless" ? "Headless" : status.onlineStatus;
        const userItem = document.getElementById(status.userId);
        userItem.setAttribute('status', onlineStatus);

        const userStatus = userItem.querySelector('.status');

        var currentAccessLevel = status.sessions[status.currentSessionIndex].accessLevel;
        userStatus.textContent = `${userItem.getAttribute('username')}\nIn a ${currentAccessLevel} world` 
    } catch(error) {
        console.error(error);
    }
}

async function selectUser(userId) {
    selectedContact = await client.fetchContact(userId);

    const userProfile = document.querySelector('#userProfile');
    const profilePicture = userProfile.querySelector('.profilePicture');
    var pfp = client.formatAssetUrl(selectedContact.currentUser?.profile?.iconUrl) ?? "./resources/contact.svg";
    profilePicture.src = pfp;

    if (userId == client.data.userId) userProfile.querySelector('#actions').classList.add("hidden");
    else userProfile.querySelector('#actions').classList.remove("hidden");
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