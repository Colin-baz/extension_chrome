const CONFIG = {
    API_KEY: "AIzaSyCIqEUzEWO2PPlacLwdlLOjVUdDrFCdEno",
    CHANNEL_ID: "UCkjrRMRFAs5lBimpG-n_DPw",
    MAX_DAILY_CALLS: 95,
    CHECK_INTERVAL: 30 * 60 * 1000 // 30 minutes
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}