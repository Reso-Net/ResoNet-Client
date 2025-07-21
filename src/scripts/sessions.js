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

function updateAllSessionItems(session) {
    // Update selected user sessions
    for (let index = 0; index < session.sessionUsers.length; index++) {
        const user = session.sessionUsers[index];
        const userData = client.fetchUser(user.userID);
        if (userData != null) updateUserItem(userData.currentStatus);
        if (user.userID == selectedUser.userId) {
            processSelectedUserSessionItems(session);
        }
    }
}