const ResoNetLib = require('resonet-lib');
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
    userSearchInput.addEventListener('input', (event) => {
        console.log(userSearchInput.value);
    })

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
    await client.start().then(async () => {
        client.on("sessionUpdateEvent", async (session) => { });    
        client.on("sessionRemoveEvent", async (sessionId) => { });
        client.on("messageRecieveEvent", async (message) => { });
        client.on("receiveStatusUpdate", async (status) => {
            updateContactStatus(status);
            sortContacts();
        });

        // Initial setup
        for (const contact of client.data.contacts) {
            await createContact(contact);
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


async function createContact(contact) {
    if (contact.isAccepted == true && contact.contactStatus == "Accepted") {
        var userItemFragment = userItemTemplate.content.cloneNode(true);
        var userItem = userItemFragment.querySelector('.userItem');
        userItem.id = `${contact.id}`;
        userItem.setAttribute('status', "Offline");

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
    const userItem = document.getElementById(status.userId);
    var onlineStatus = status.sessionType == "Headless" ? "Headless" : status.onlineStatus;
    if (onlineStatus == null) return;
    userItem.setAttribute('status', onlineStatus);
}

async function selectUser(userId) {
    // Todo
    console.log(userId);
}