const ResoNetLib = require('resonet-lib');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

var config;
var client;

var panels;
var pageButtons;
var userItemTemplate;
var userLists;

document.addEventListener("DOMContentLoaded", async (event) => {
    panels = document.querySelectorAll('.panel');
    pageButtons = document.querySelectorAll('.pButton');
    userItemTemplate = document.getElementById('userItemTemplate');
    userLists = document.querySelectorAll('.userList');

    pageButtons.forEach(button => {
        button.addEventListener('click', () => {
            swapPanel(button.getAttribute('name'));
        });

    });

    const userSearchInput = document.getElementById("userSearchInput");
    userSearchInput.addEventListener('input', () => {
        filterContacts(userSearchInput.value);
    });

    swapPanel('contacts');
    await attemptLogin();
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

        for (const contact of client.data.contacts) {
            createContact(contact);
        }
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
    if (contact.isAccepted == true && contact.contactStatus == "Accepted") {
        var userItemFragment = userItemTemplate.content.cloneNode(true);
        var userItem = userItemFragment.querySelector('.userItem');
        userItem.id = `${contact.id}`;
        userItem.setAttribute('status', 'Offline');
        userItem.setAttribute('username', contact.contactUsername);
        userItem.setAttribute('isContact', true);

        userItem.addEventListener('click', () => {
            selectUser(userItem.id);
        });

        const userInfo = userItem.querySelector('#userInfo');
        userInfo.textContent = `${contact.contactUsername}` 

        const userProfilePicture = userItem.querySelector('#userProfilePicture');
        var pfp = client.formatAssetUrl(contact.profile?.iconUrl) ?? "./resources/contact.svg";
        userProfilePicture.src = pfp;
        
        document.getElementById('contactsList').appendChild(userItemFragment);
        await client.requestUserStatus(contact.id);
    }
}

async function updateContactStatus(status) {
    try {
        console.log(status);
        var onlineStatus = status.sessionType == "Headless" ? "Headless" : status.onlineStatus;

        const userItem = document.getElementById(status.userId);
        userItem.setAttribute('status', onlineStatus);

        const userInfo = userItem.querySelector('#userInfo');

        var currentSession = status.sessions[status.currentSessionIndex];
        var isHidden = currentSession.sessionHidden;
        var isHost = currentSession.isHost
        var hashSalt = status.hashSalt;

        console.log(hashIDToToken(currentSession.sessionHash, hashSalt));
        var sessionName;
        switch (currentSession.accessLevel) {
            case "Private":
            case "LAN":
                sessionName = `a ${currentSession.accessLevel} World`;
                break;

            case "Contacts":
                sessionName = `a Contacts Only World`;
                break;

            case "ContactsPlus":
                sessionName = `a Contacts Plus World`;
                break;

            case "RegisteredUsers":
            case "Anyone":
                // Actually set session name if can get
                sessionName = `a Publically accesible world World`;
                break;

            default: 
                sessionName = `an Unkown World`;
        }

        userInfo.textContent = `${userItem.getAttribute('username')}\n${onlineStatus} in ${sessionName}` 
    } catch(error) {
        console.error(error);
    }
}

function hashIDToToken(id, salt = '') {
  const hash = crypto.createHash('sha256')
                     .update(id + salt, 'utf8')
                     .digest('hex')
                     .toUpperCase();
  return hash;
}

async function selectUser(userId) {
    // Todo
    console.log(userId);
}