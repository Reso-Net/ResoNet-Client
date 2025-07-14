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