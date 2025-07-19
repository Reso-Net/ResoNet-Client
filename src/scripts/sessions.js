async function previewSession(sessionId) {
    let session = await client.fetchSession(sessionId);

    if (session == null) {
        createToast("error", "Session is no longer valid");
    } else {
        createToast("success", "Session is valid!");
        let popup = document.querySelector(".popup");
        popup.classList.remove("hidden");

        popup.querySelector("img").src = session.thumbnailUrl ?? getNoAssetReplacement();
        let info = "";
        info += `${client.stripTags(session.name)}<br>`;
        info += `${client.stripTags(session.description)}<br>`;
        info += `Tags: ${session.tags.join(", ")}<br>`;
        info += `Users (${session.joinedUsers}/${session.maxUsers}): ${session.sessionUsers.map(user => user.username).join(", ")}`;

        popup.querySelector("p").innerHTML = info;
    }
}

function closePopupPreview() {
    document.querySelector(".popup").classList.add("hidden");
}

function updateSessionItems(session) {
    // Update user list current world
    session.sessionUsers.forEach(user => {
        //console.log(user.userID);
        console.log(document.getElementById(user.userID));
    })

    // Update session items second so selected contact stuff
    let items = document.querySelectorAll(`[sessionid="${session.sessionId}"]`);
    if (items.length == 0) return; 
    items.forEach(userWorldItem => {
        userWorldItem.setAttribute("name", client.stripTags(session.name));
        userWorldItem.querySelector("img").src = session.thumbnailUrl ?? "./resources/public.svg";
        userWorldItem.querySelectorAll("p")[0].textContent = client.stripTags(session.name);
        userWorldItem.querySelectorAll("p")[1].textContent = session.hostUsername + ` (${session.joinedUsers}/${session.maxUsers})`
        userWorldItem.querySelectorAll("p")[1].style.opacity = "50%";
    });
}