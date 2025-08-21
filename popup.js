const apiKey = "AIzaSyCIqEUzEWO2PPlacLwdlLOjVUdDrFCdEno";
const channelId = "UCkjrRMRFAs5lBimpG-n_DPw";

const channelPic = document.getElementById("channel-pic");
const channelName = document.getElementById("channel-name");
const subscriberCount = document.getElementById("subscriber-count");
const channelLink = document.getElementById("channel-link");
const videosList = document.getElementById("videos-list");

fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${channelId}&key=${apiKey}`)
    .then(res => res.json())
    .then(data => {
        const channel = data.items[0];
        const snippet = channel.snippet;
        const stats = channel.statistics;

        channelPic.src = snippet.thumbnails.default.url;
        channelName.textContent = snippet.title;
        subscriberCount.textContent = `${parseInt(stats.subscriberCount).toLocaleString()} abonnés`;
        channelLink.href = `https://www.youtube.com/channel/${channelId}`;
    })
    .catch(error => {
        console.error("Erreur lors du chargement des infos de la chaîne :", error);
        channelName.textContent = "Erreur de chargement.";
    });

fetch(`https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&order=date&part=snippet&type=video&maxResults=3`)
    .then(res => res.json())
    .then(data => {
        videosList.innerHTML = "";
        data.items.forEach(video => {
            const { title, publishedAt, thumbnails } = video.snippet;
            const videoId = video.id.videoId;
            const date = new Date(publishedAt).toLocaleDateString("fr-FR");

            const videoEl = document.createElement("div");
            videoEl.className = "video-item";
            videoEl.innerHTML = `
                <p><strong>${title}</strong><br><br><small>${date}</small></p>
                <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank">
                    <img src="${thumbnails.medium.url}" alt="${title}" />
                </a>
            `;
            videosList.appendChild(videoEl);
        });
    })
    .catch(error => {
        console.error("Erreur lors du chargement des vidéos :", error);
        videosList.textContent = "Impossible de charger les vidéos.";
    });

document.addEventListener('DOMContentLoaded', () => {
    const controlSection = document.createElement('div');
    controlSection.id = 'notification-controls';
    controlSection.innerHTML = `
        <h3>CONTRÔLES NOTIFICATIONS</h3>
        <button id="test-notification">Tester notification</button>
        <button id="check-now">Vérifier maintenant</button>
        <div id="status"></div>
    `;

    document.body.appendChild(controlSection);

    document.getElementById('test-notification').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "testNotification" }, (response) => {
            if (response && response.success) {
                document.getElementById('status').textContent = "✅ Notification de test envoyée !";
                setTimeout(() => {
                    document.getElementById('status').textContent = "";
                }, 3000);
            }
        });
    });

    document.getElementById('check-now').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "checkNow" }, (response) => {
            if (response && response.success) {
                document.getElementById('status').textContent = "🔍 Vérification en cours...";
                setTimeout(() => {
                    document.getElementById('status').textContent = "";
                }, 3000);
            }
        });
    });

    displayNotificationStatus();
});

async function displayNotificationStatus() {
    try {
        const storage = await chrome.storage.local.get([
            'lastVideoTitle',
            'lastVideoDate',
            'dailyCallCount'
        ]);
        const statusDiv = document.getElementById('status');

        let statusHTML = '';

        if (storage.lastVideoTitle) {
            const date = storage.lastVideoDate ?
                new Date(storage.lastVideoDate).toLocaleDateString("fr-FR") :
                "Date inconnue";
            statusHTML += `
                <small><strong>Dernière vidéo surveillée:</strong><br>
                "${storage.lastVideoTitle}"<br>
                <em>${date}</em></small>
            `;
        } else {
            statusHTML += `<small><em>Initialisation en cours...</em></small>`;
        }

        const callCount = storage.dailyCallCount || 0;
        const maxCalls = 95;
        statusHTML += `
            <br><br>
            <small><strong>Appels API aujourd'hui:</strong> ${callCount}/${maxCalls}<br>
            <span style="color: ${callCount > 80 ? '#ff6b6b' : '#44a138'}">
                ${callCount > 80 ? 'Attention limite' : 'OK'}
            </span></small>
        `;

        statusDiv.innerHTML = statusHTML;

    } catch (error) {
        console.error("Erreur lors de la récupération du statut:", error);
    }
}