importScripts('config.js');

const API_KEY = CONFIG.API_KEY;
const CHANNEL_ID = CONFIG.CHANNEL_ID;
const MAX_DAILY_CALLS = CONFIG.MAX_DAILY_CALLS;
const CHECK_INTERVAL = CONFIG.CHECK_INTERVAL;

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
    } else {
        const storage = await chrome.storage.local.get(['dailyCallCount']);
        if (storage.dailyCallCount !== undefined) {
            dailyCallCount = storage.dailyCallCount;
        }
    }

    if (dailyCallCount >= MAX_DAILY_CALLS) {
        return false;
    }

    return true;
}

async function incrementApiCall() {
    dailyCallCount++;
    await chrome.storage.local.set({ dailyCallCount });
}

chrome.runtime.onInstalled.addListener(async () => {
    await initializeLastVideo();
    startVideoCheck();
});

chrome.runtime.onStartup.addListener(() => {
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

        if (data.error) {
            return;
        }

        if (data.items && data.items.length > 0) {
            const latestVideo = data.items[0];
            await chrome.storage.local.set({
                lastVideoId: latestVideo.id.videoId,
                lastVideoTitle: latestVideo.snippet.title,
                lastVideoDate: latestVideo.snippet.publishedAt
            });
        }
    } catch (error) {
    }
}

function startVideoCheck() {
    if (typeof window.videoCheckInterval !== 'undefined') {
        clearInterval(window.videoCheckInterval);
    }

    checkForNewVideos();

    window.videoCheckInterval = setInterval(checkForNewVideos, CHECK_INTERVAL);
}

async function checkForNewVideos() {
    if (!(await checkApiLimits())) {
        return;
    }

    try {

        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&order=date&part=snippet&type=video&maxResults=1`
        );

        await incrementApiCall();

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            return;
        }

        if (!data.items || data.items.length === 0) {
            return;
        }

        const latestVideo = data.items[0];
        const currentVideoId = latestVideo.id.videoId;

        const storage = await chrome.storage.local.get(['lastVideoId']);
        const lastKnownVideoId = storage.lastVideoId;

        if (lastKnownVideoId && currentVideoId !== lastKnownVideoId) {
            await sendNotification(latestVideo);

            await chrome.storage.local.set({
                lastVideoId: currentVideoId,
                lastVideoTitle: latestVideo.snippet.title,
                lastVideoDate: latestVideo.snippet.publishedAt
            });
        }

    } catch (error) {
    }
}

async function sendNotification(video) {
    try {
        const notificationOptions = {
            type: 'basic',
            iconUrl: 'icon.png',
            title: 'Nouvelle vidéo de FishyAnimation !',
            message: `"${video.snippet.title}"`,
            contextMessage: 'Cliquez pour regarder',
            requireInteraction: false
        };

        const notificationId = await new Promise((resolve, reject) => {
            chrome.notifications.create(notificationOptions, (notificationId) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(notificationId);
                }
            });
        });

        console.log("Notification envoyée:", notificationId);

        await chrome.storage.local.set({
            [`notification_${notificationId}`]: video.id.videoId
        });

        setTimeout(async () => {
            await chrome.storage.local.remove([`notification_${notificationId}`]);
        }, 60 * 60 * 1000);

    } catch (error) {
        console.error("Erreur lors de l'envoi de la notification:", error);
    }
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
        // Erreur silencieuse
    }
});

chrome.notifications.onClosed.addListener(async (notificationId) => {
    await chrome.storage.local.remove([`notification_${notificationId}`]);
});