async function manualRefreshSessions() {
    showToast(LogLevels.LOG, "Manually refreshing session entries");

    const sessionsContainer = document.getElementById('sessions');
    
    while (sessionsContainer.firstChild) { 
        sessionsContainer.removeChild(sessionsContainer.firstChild); 
    }

    client.data.sessions.forEach(session => {
        if (document.getElementById("hideEmptySessions").checked && session.activeUsers == 0) return;
        handleSessionUpdate(session);
    });
}

async function handleSessionUpdate(session) {
    const sessionItem = document.getElementById(session.sessionId);
    let hasContactInSession = false;

    session.sessionUsers.some(user => {
        if (checkContactStatus(user)) {
            hasContactInSession = true;
        }
    });

    if (document.getElementById("hideEmptySessions").checked && session.activeUsers == 0) return;
    if (document.getElementById("hideNonContactSessions").checked && !hasContactInSession) return;

    if (sessionItem == null) {
        addSessionItem(session);
    } else {
        updateSessionItem(session);
    }
}

async function addSessionItem(session) {
    const sessionsContainer = document.getElementById('sessions');

    const sessionItem = document.createElement('div');
    sessionItem.className = 'session';
    sessionItem.id = session.sessionId;

    const thumbnailContainer = document.createElement('div');
    thumbnailContainer.id = "SessionThumbnailContainer";

    const thumbnail = document.createElement('img');
    thumbnail.id = "SessionThumbnail";
    thumbnail.src = session.thumbnailUrl ?? "./resources/nothumbnail.png";

    if (session.thumbnailUrl) {
        const copyThumbnail = document.createElement('img');
        copyThumbnail.id = "copy";
        copyThumbnail.className = "interactableButton";
        copyThumbnail.src = "./resources/content_copy.svg";
        copyThumbnail.style.maxWidth = copyThumbnail.style.maxHeight = copyThumbnail.style.minWidth = copyThumbnail.style.minHeight = "24px";
        copyThumbnail.addEventListener('click', () => {
            navigator.clipboard.writeText(thumbnail.src);
            showToast(LogLevels.LOG, "Copied session thumbnail to clipboard");
        });
        thumbnailContainer.appendChild(copyThumbnail);

        const previewThumbnail = document.createElement('img');
        previewThumbnail.id = "preview";
        previewThumbnail.className = "interactableButton";
        previewThumbnail.src = "./resources/3d_rotation.svg";
        previewThumbnail.style.maxWidth = previewThumbnail.style.maxHeight = previewThumbnail.style.minWidth = previewThumbnail.style.minHeight = "24px";
        previewThumbnail.addEventListener('click', () => {
            show360Viewer(thumbnail.src);
            showToast(LogLevels.LOG, "Opening thumbnail in 3D viewer");
        });
        thumbnailContainer.appendChild(previewThumbnail);
    }

    thumbnailContainer.appendChild(thumbnail);
    sessionItem.appendChild(thumbnailContainer);

    const name = document.createElement('p');
    name.id = "SessionName";
    name.innerHTML = `${sanatizeString(session.name)}, ${session.activeUsers}/${session.maxUsers}`;
    sessionItem.appendChild(name);
    
    const users = document.createElement('p');
    users.id = "SessionUsers";
    const sessionUsers = session.sessionUsers;
    var string = "";
    for (let index = 0; index < sessionUsers.length; index++) {
        const user = sessionUsers[index];
        string += getStatusColour(user);

        if (index != sessionUsers.length - 1) string += ", ";
    }

    users.innerHTML = `${string}`;
    sessionItem.appendChild(users);

    sessionsContainer.appendChild(sessionItem);     
}

async function updateSessionItem(session) {
    const sessionItem = document.getElementById(session.sessionId);
    if (sessionItem == null) return;
    
    sessionItem.querySelector("#SessionThumbnail").src = session.thumbnailUrl ?? "./resources/nothumbnail.png";
    sessionItem.querySelector("#SessionName").innerHTML = `${sanatizeString(session.name)}, ${session.activeUsers}/${session.maxUsers}`;
    
    const sessionUsers = session.sessionUsers;
    var string = "";
    for (let index = 0; index < sessionUsers.length; index++) {
        const user = sessionUsers[index];
        string += getStatusColour(user);

        if (index != sessionUsers.length - 1) string += ", ";
    }
    sessionItem.querySelector("#SessionUsers").innerHTML = `${string}`;
}

function getStatusColour(user) {
    var string = "";

    const isContact = checkContactStatus(user);
    const username = sanatizeString(user.username);    

    if (isContact && user.isPresent == true) {
        string += `<span style='color: #2ee860'>${username}</span>`;
    } else if (isContact && user.isPresent == false) {
        string += `<span style='color: #2fa84f'>${username}</span>`;
    } else if (user.isPresent == false) {
        string += `<span style='color: #b8b8b8'>${username}</span>`;
    } else {
        string += `${username}`;
    }

    return string
}

function toggleSettingsDropdown() {
    const dropdown = document.getElementById("sessionSettingsDropdown");
    if (dropdown.className == "dropdownOff") { 
        dropdown.className = "dropdownOn";
        sessionSettings.style.visibility = "visible";
        sessionSettings.style.display = "flex";
    } else if (dropdown.className == "dropdownOn") {
        dropdown.className = "dropdownOff";
        sessionSettings.style.visibility = "hidden";
        sessionSettings.style.display = "none";
    }
}

function checkContactStatus(user) {
    return client.data.contacts.some(contact => user.userID === contact.id && contact.isAccepted && contact.contactStatus == "Accepted")
}