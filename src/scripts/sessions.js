document.addEventListener('DOMContentLoaded', async () => {  
    document.getElementById("hideEmptySessions").addEventListener('click', async () => {
        await manualRefreshSessions();
    });

    document.getElementById("hideNonContactSessions").addEventListener('click', async () => {
        await manualRefreshSessions();
    });

    document.getElementById("hideNonHeadlessSesssions").addEventListener('click', async () => {
        await manualRefreshSessions();
    });

    // Unused for now as it's buggy to use
    //document.getElementById("filterSessionsWithName").addEventListener('keypress', async(key) => {
    //    if (key.code == "Enter") {
    //        showToast(LogLevels.LOG, `Filtering sessions by name: ${document.getElementById("filterSessionsWithName").value}`);
    //        await manualRefreshSessions();
    //    }
    //});
    //document.getElementById("filterSessionsWithUser").addEventListener('keypress', async(key) => {
    //    if (key.code == "Enter") {
    //        showToast(LogLevels.LOG, `Filtering sessions by username: ${document.getElementById("filterSessionsWithUser").value}`);
    //        await manualRefreshSessions();
    //    }
    //});
});

async function manualRefreshSessions() {
    const sessionsContainer = document.getElementById('sessions');
    
    while (sessionsContainer.firstChild) { 
        sessionsContainer.removeChild(sessionsContainer.firstChild); 
    }

    const sessions = client.data.sessions;
    sessions.forEach(session => {
        handleSessionUpdate(session);
    });
}

async function handleSessionUpdate(session) {
    if (document.getElementById("hideEmptySessions").checked && session.activeUsers == 0) return;
    if (document.getElementById("hideNonHeadlessSesssions").checked && !session.headlessHost == true) return;
    
    if (document.getElementById("hideNonContactSessions").checked) {
        let foundSession = false;
        
        session.sessionUsers.some(user => {
            if (checkContactStatus(user)) {
                foundSession = true;
            }
        });
        
        if (!foundSession) return;
    }
    
    //let nameQuerey = document.getElementById("filterSessionsWithName").value.toLowerCase().trim();
    //if (nameQuerey.trim() != "" && !session.name.toLowerCase().trim().includes(nameQuerey)) { return; }
    //let userQuerey = document.getElementById("filterSessionsWithUser").value.toLowerCase().trim();
    //if (userQuerey != "") {
    //    let foundUser = false;
    //    
    //    session.sessionUsers.some(user => {
    //        if (user.username.toLowerCase().trim().includes(userQuerey)) {
    //            foundUser = true;
    //        }
    //    });
    //    
    //    if (!foundUser) return;
    //}

    const sessionItem = document.getElementById(session.sessionId);

    if (sessionItem == null) {
        addSessionItem(session);
    } else {
        updateSessionItem(session);
    }
}

async function removeSessionItem(sessionId) {
    const sessionItem = document.getElementById(sessionId);
    if (sessionItem != null) 
        sessionItem.remove();
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
    thumbnail.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        hideContextMenu();
        if (session.thumbnailUrl) {
            showContextMenu(e, sanatizeString(session.name), [
                {name: "Open thumbnail in 360 viewer", action: () => { 
                    show360Viewer(thumbnail.src);
                    showToast(LogLevels.LOG, "Opening thumbnail in 3D viewer");
                }},
                {name: "Copy thumbnail url", action:() => { navigator.clipboard.writeText(session.thumbnailUrl); }},
            ]);
        }
    });

    thumbnailContainer.appendChild(thumbnail);
    sessionItem.appendChild(thumbnailContainer);

    const name = document.createElement('p');
    name.id = "SessionName";
    name.innerHTML = `${sanatizeString(session.name)}, ${session.activeUsers}/${session.maxUsers}`;
    name.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        hideContextMenu();
        showContextMenu(e, sanatizeString(session.name), [
            {name: "Copy session name", action: () => { navigator.clipboard.writeText(session.name); }},
            {name: "Copy session id", action:() => { navigator.clipboard.writeText(session.sessionId); }},
            {name: "Copy host id", action:() => { navigator.clipboard.writeText(session.hostUserId); }},
            {name: "Copy host hostUsername", action:() => { navigator.clipboard.writeText(session.hostUserId); }},
            //{name: "Copy compatibility hash", action:() => { navigator.clipboard.writeText(session.compatibilityHash); }},
            //{name: "Copy app version", action:() => { navigator.clipboard.writeText(session.appVersion); }},
        ]);
    });

    sessionItem.appendChild(name);
    
    const users = document.createElement('div');
    users.id = "SessionUsers";
    const sessionUsers = session.sessionUsers;
    for (let index = 0; index < sessionUsers.length; index++) {
        const sessionUser = sessionUsers[index];
        users.appendChild(createUserElement(sessionUser));
    }
    sessionItem.appendChild(users);

    sessionsContainer.appendChild(sessionItem);     
}

async function updateSessionItem(session) {
    const sessionItem = document.getElementById(session.sessionId);
    if (sessionItem == null) return;
    
    const thumbnailElement = sessionItem.querySelector("#SessionThumbnail");
    thumbnailElement.src = session.thumbnailUrl ?? "./resources/nothumbnail.png";
    thumbnailElement.removeEventListener('contextmenu', function(e) {});
    thumbnailElement.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        hideContextMenu();
        if (session.thumbnailUrl) {
            showContextMenu(e, sanatizeString(session.name), [
                {name: "Open thumbnail in 360 viewer", action: () => { 
                    show360Viewer(thumbnailElement.src);
                    showToast(LogLevels.LOG, "Opening thumbnail in 3D viewer");
                }},
                {name: "Copy thumbnail url", action:() => { navigator.clipboard.writeText(session.thumbnailUrl); }},
            ]);
        }
    });
    sessionItem.querySelector("#SessionName").innerHTML = `${sanatizeString(session.name)}, ${session.activeUsers}/${session.maxUsers}`;
    
    const users = sessionItem.querySelector("#SessionUsers");
    const sessionUsers = session.sessionUsers;
    
    for (let index = 0; index < sessionUsers.length; index++) {
        const sessionUser = sessionUsers[index];
        var userElement = sessionItem.querySelector(`#${sessionUser.userID}`); 

        if (userElement == null) {
            users.appendChild(createUserElement(sessionUser));
        } else {
            userElement.innerHTML = `${getStatusColour(sessionUser)}`;
        }   
    }

    Array.from(users.children).forEach(child => {
        const sessionUser = sessionUsers.find(user => user.userID === child.id);
        if (sessionUser == null)
            child.remove();
    });
}

function createUserElement(sessionUser) {
    const userElement = document.createElement('p');

    userElement.id = sessionUser.userID;
    userElement.innerHTML = `${getStatusColour(sessionUser)}`;
    userElement.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showContextMenu(e, sanatizeString(sessionUser.username), [
            {name: "Copy Username", action: () => { navigator.clipboard.writeText(sessionUser.username); }},
            {name: "Copy UserId", action:() => { navigator.clipboard.writeText(sessionUser.userID); }},
        ]);
    });

    return userElement;
}

function getStatusColour(user) {
    var string = "";

    const isContact = checkContactStatus(user);
    const username = sanatizeString(user.username);    

    if (isContact && user.isPresent == true) {
        string += `<span style='color: #59eb5c'>${username}</span>`;
    } else if (isContact && user.isPresent == false) {
        string += `<span style='color: #3f9e44'>${username}</span>`;
    } else if (user.isPresent == false) {
        string += `<span style='color: #86888b'>${username}</span>`;
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