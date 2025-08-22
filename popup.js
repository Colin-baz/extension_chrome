const apiKey = CONFIG.API_KEY;
const channelId = CONFIG.CHANNEL_ID;

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
        videosList.textContent = "Impossible de charger les vidéos.";
    });