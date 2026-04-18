const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';
const TOPIC = 'myproject/env/sensors';

const client = mqtt.connect(BROKER_URL, { reconnectPeriod: 5000 });

// Konfigurasi Chart.js
const chartConfig = (label, color) => ({
    type: 'line',
    data: { labels: [], datasets: [{ label: label, data: [], borderColor: color, tension: 0.4, borderWidth: 2 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#94a3b8' } }, x: { display: false } } }
});

const tempChart = new Chart(document.getElementById('tempChart'), chartConfig('Suhu', '#38bdf8'));
const gasChart = new Chart(document.getElementById('gasChart'), chartConfig('Polusi', '#fbbf24'));

function updateChart(chart, newValue) {
    const labels = chart.data.labels;
    const data = chart.data.datasets[0].data;
    if (labels.length > 10) { labels.shift(); data.shift(); }
    labels.push(new Date().toLocaleTimeString());
    data.push(newValue);
    chart.update();
}

client.on('connect', () => {
    document.getElementById('conn-status').innerText = "Connected";
    document.getElementById('conn-status').style.color = "#10b981";
    client.subscribe(TOPIC);
});

client.on('message', (topic, message) => {
    try {
        const data = JSON.parse(message.toString());
        
        // Update Angka
        document.getElementById('air-temp').innerText = data.air_t ?? '--';
        document.getElementById('humidity').innerText = data.hum ?? '--';
        document.getElementById('water-temp').innerText = data.wat_t ?? '--';
        document.getElementById('ph-level').innerText = data.ph ?? '--';
        document.getElementById('pollution').innerText = data.pol ?? '--';

        // Update Grafik
        updateChart(tempChart, data.air_t);
        updateChart(gasChart, data.pol);

        addLog("Data Received");
    } catch (e) {
        addLog("Error Parsing Data");
    }
});

function addLog(msg) {
    const container = document.getElementById('log-container');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    container.prepend(entry);
}