// --- 1. CONFIG MQTT ---
const broker = 'wss://broker.emqx.io:8084/mqtt';
const topic = 'myproject/env/sensors'; // Pastikan sesuai dengan ESP32 kamu
const client = mqtt.connect(broker);

let sessionData = [];

// --- 2. CHART GENERATOR ---
const makeChart = (id, color) => {
    const ctx = document.getElementById(id).getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 160);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'transparent');

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(20).fill(""),
            datasets: [{
                data: [],
                borderColor: '#ffffff',
                borderWidth: 2,
                fill: true,
                backgroundColor: grad,
                tension: 0.5,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: false },
            scales: { x: { display: false }, y: { display: false, suggestedMin: 0 } },
            animation: { duration: 400 }
        }
    });
};

const tempChart = makeChart('tempChart', 'rgba(0, 242, 255, 0.3)');
const gasChart = makeChart('gasChart', 'rgba(255, 75, 43, 0.2)');

// --- 3. MQTT EVENTS ---
client.on('connect', () => {
    document.getElementById('status-dot').classList.add("online-dot");
    document.getElementById('conn-text').innerText = "SYSTEM ACTIVE";
    document.getElementById('conn-text').style.color = "#00ffcc";
    client.subscribe(topic);
    addLog("Neural link established. dashboard operational.", "STATUS");
});

client.on('close', () => {
    document.getElementById('status-dot').classList.remove("online-dot");
    document.getElementById('conn-text').innerText = "LINK LOST";
    document.getElementById('conn-text').style.color = "#ff4b2b";
    addLog("Connection corridor lost.", "ERROR");
});

client.on('message', (t, msg) => {
    try {
        const data = JSON.parse(msg.toString());
        const now = new Date().toLocaleTimeString();
        
        // Update UI
        updateUI('air_t', data.air_t, 1);
        updateUI('hum', data.hum, 0);
        updateUI('wat_t', data.wat_t, 1);
        updateUI('ph', data.ph, 2);
        updateUI('pol', data.pol, 0);

        // Update Charts
        updateChartData(tempChart, data.wat_t);
        updateChartData(gasChart, data.pol);

        // Activity Log
        const details = `Recv > Water: ${data.wat_t.toFixed(1)}°C, pH: ${data.ph.toFixed(2)}, Gas: ${data.pol} PPM`;
        addLog(details, "DATA IN");

        sessionData.push({time: now, ...data});
    } catch(e) { 
        addLog("Corrupted data packet received.", "ERROR");
    }
});

function updateUI(id, val, fixed) {
    const el = document.getElementById(id);
    if(el && val !== undefined) el.innerText = val.toFixed(fixed);
}

function updateChartData(chart, val) {
    if(val === undefined || chart === null) return;
    chart.data.datasets[0].data.push(val);
    if(chart.data.datasets[0].data.length > 20) chart.data.datasets[0].data.shift();
    chart.update('none');
}

function addLog(msg, type) {
    const entry = document.createElement('div');
    let labelColor = "#a5f3fc"; 
    if (type === "ERROR") labelColor = "#ff4b2b";
    if (type === "STATUS") labelColor = "#00ffcc";
    if (type === "DATA IN") labelColor = "#ffffff";

    entry.innerHTML = `
        <span style="opacity:0.4; font-size:0.65rem;">[${new Date().toLocaleTimeString()}]</span> 
        <b style="color:${labelColor}; font-size:0.7rem;">[${type}]</b> 
        <span style="margin-left:5px;">${msg}</span>
    `;
    
    const consoleLog = document.getElementById('log-console');
    consoleLog.prepend(entry);
    if(consoleLog.childNodes.length > 30) consoleLog.removeChild(consoleLog.lastChild);
}

// --- 4. INTERACTIVE HOVER (SPOTLIGHT ONLY) ---
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    });
});

// --- 5. EXPORT CSV ---
document.getElementById('download-csv').onclick = () => {
    if(!sessionData.length) return alert("Belum ada data.");
    let csv = "Time,Water_Temp,pH,Gas_PPM,Air_Temp,Humidity\n" + 
              sessionData.map(d => `${d.time},${d.wat_t},${d.ph},${d.pol},${d.air_t},${d.hum}`).join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `AquaOS_Data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
};
