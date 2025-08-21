const API_KEY = "AIzaSyCIqEUzEWO2PPlacLwdlLOjVUdDrFCdEno";

const MAX_DAILY_CALLS = 95;
const CALL_COUNT_RESET_HOUR = 0;

let dailyCallCount = 0;
let lastResetDate = new Date().toDateString();

async function checkApiLimits() {
    const today = new Date().toDateString();

    if (today !== lastResetDate) {
        dailyCallCount = 0;
        lastResetDate = today;
        await chrome.storage.local.set({
            dailyCallCount: 0,
            lastResetDate: today
        });
        console.log("Compteur d'appels API remis à zéro");
    } else {
        const storage = await chrome.storage.local.get(['dailyCallCount']);
        if (storage.dailyCallCount !== undefined) {
            dailyCallCount = storage.dailyCallCount;
        }
    }

    if (dailyCallCount >= MAX_DAILY_CALLS) {
        console.log(`Limite d'appels API atteinte (${dailyCallCount}/${MAX_DAILY_CALLS}). Arrêt des vérifications jusqu'à demain.`);
        return false;
    }

    return true;
}

async function incrementApiCall() {
    dailyCallCount++;
    await chrome.storage.local.set({ dailyCallCount });
    console.log(`Appel API #${dailyCallCount}/${MAX_DAILY_CALLS}`);
}

const CHANNEL_ID = "UCkjrRMRFAs5lBimpG-n_DPw";
const CHECK_INTERVAL = 30 * 60 * 1000;

chrome.runtime.onInstalled.addListener(async () => {
    console.log("Extension installée - Initialisation du système de notifications");
    await initializeLastVideo();
    startVideoCheck();
});

chrome.runtime.onStartup.addListener(() => {
    console.log("Chrome démarré - Relance de la surveillance");
    startVideoCheck();
});

async function initializeLastVideo() {
    if (!(await checkApiLimits())) return;

    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&order=date&part=snippet&type=video&maxResults=1`
        );

        await incrementApiCall();

        const data = await response.json();

        if (data.items && data.items.length > 0) {
            const latestVideo = data.items[0];
            await chrome.storage.local.set({
                lastVideoId: latestVideo.id.videoId,
                lastVideoTitle: latestVideo.snippet.title,
                lastVideoDate: latestVideo.snippet.publishedAt
            });
            console.log("Dernière vidéo initialisée:", latestVideo.snippet.title);
        }
    } catch (error) {
        console.error("Erreur lors de l'initialisation:", error);
    }
}

function startVideoCheck() {
    checkForNewVideos();
    setInterval(checkForNewVideos, CHECK_INTERVAL);
}

async function checkForNewVideos() {
    try {
        console.log("Vérification des nouvelles vidéos...");

        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&order=date&part=snippet&type=video&maxResults=1`
        );
        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            console.log("Aucune vidéo trouvée");
            return;
        }

        const latestVideo = data.items[0];
        const currentVideoId = latestVideo.id.videoId;

        const storage = await chrome.storage.local.get(['lastVideoId']);
        const lastKnownVideoId = storage.lastVideoId;

        if (lastKnownVideoId && currentVideoId !== lastKnownVideoId) {
            sendNotification(latestVideo);

            await chrome.storage.local.set({
                lastVideoId: currentVideoId,
                lastVideoTitle: latestVideo.snippet.title,
                lastVideoDate: latestVideo.snippet.publishedAt
            });
        }

    } catch (error) {
        console.error("Erreur lors de la vérification des vidéos:", error);
    }
}

function sendNotification(video) {
    const notificationOptions = {
        type: 'basic',
        iconUrl: 'icon.png',
        title: '🎬 Nouvelle vidéo FishyAnimation !',
        message: `"${video.snippet.title}"`,
        contextMessage: 'Cliquez pour regarder',
        requireInteraction: true
    };

    chrome.notifications.create(notificationOptions, (notificationId) => {
        console.log("Notification envoyée:", notificationId);

        chrome.storage.local.set({
            [`notification_${notificationId}`]: video.id.videoId
        });
    });
}

chrome.notifications.onClicked.addListener(async (notificationId) => {
    try {
        const storage = await chrome.storage.local.get([`notification_${notificationId}`]);
        const videoId = storage[`notification_${notificationId}`];

        if (videoId) {
            await chrome.tabs.create({
                url: `https://www.youtube.com/watch?v=${videoId}`
            });

            await chrome.storage.local.remove([`notification_${notificationId}`]);
        }

        chrome.notifications.clear(notificationId);

    } catch (error) {
        console.error("Erreur lors du clic sur la notification:", error);
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "testNotification") {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon.png',
            title: '🧪 Test de notification',
            message: 'Ceci est un test du système de notifications',
            contextMessage: 'Extension FishyAnimation'
        }, () => {
            sendResponse({ success: true });
        });
        return true; // ⬅️ important pour MV3
    } else if (message.action === "checkNow") {
        checkForNewVideos().then(() => sendResponse({ success: true }));
        return true; // ⬅️ idem
    }
});
