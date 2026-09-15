// ============================================================
// UI.JS
// Industrial Fire Detection Dashboard
// ============================================================

let classPieChartInstance = null;


// ============================================================
// UPDATE BOUNDING BOX UI
// ============================================================

function updateBoundingBoxUI(bounds) {

    const westElement = document.getElementById("west");
    const southElement = document.getElementById("south");
    const eastElement = document.getElementById("east");
    const northElement = document.getElementById("north");

    if (westElement) {
        westElement.textContent = bounds.west.toFixed(4);
    }

    if (southElement) {
        southElement.textContent = bounds.south.toFixed(4);
    }

    if (eastElement) {
        eastElement.textContent = bounds.east.toFixed(4);
    }

    if (northElement) {
        northElement.textContent = bounds.north.toFixed(4);
    }
}


// ============================================================
// UPDATE DETECTION COUNT
// ============================================================

function updateDetectionCount(count) {

    const element =
        document.getElementById("detectionCount");

    if (element) {
        element.textContent = count;
    }
}


// ============================================================
// RENDER CLASS PROBABILITY PIE CHART
// ============================================================

function renderClassPieChart(fires) {

    const chartCanvas = document.getElementById("classProbabilityChart");
    const emptyState = document.getElementById("chartEmptyState");
    const indProbVal = document.getElementById("indProbVal");
    const agrProbVal = document.getElementById("agrProbVal");
    const forProbVal = document.getElementById("forProbVal");
    const indCountBadge = document.getElementById("indCountBadge");
    const agrCountBadge = document.getElementById("agrCountBadge");
    const forCountBadge = document.getElementById("forCountBadge");
    const chartModeBadge = document.getElementById("chartModeBadge");

    if (!fires || fires.length === 0) {

        if (emptyState) {
            emptyState.style.display = "flex";
        }

        if (chartCanvas) {
            chartCanvas.style.display = "none";
        }

        if (classPieChartInstance) {
            classPieChartInstance.destroy();
            classPieChartInstance = null;
        }

        if (indProbVal) indProbVal.textContent = "0.0%";
        if (agrProbVal) agrProbVal.textContent = "0.0%";
        if (forProbVal) forProbVal.textContent = "0.0%";
        if (indCountBadge) indCountBadge.textContent = "(0)";
        if (agrCountBadge) agrCountBadge.textContent = "(0)";
        if (forCountBadge) forCountBadge.textContent = "(0)";
        if (chartModeBadge) chartModeBadge.textContent = "Live Area";

        return;
    }

    if (emptyState) {
        emptyState.style.display = "none";
    }

    if (chartCanvas) {
        chartCanvas.style.display = "block";
    }

    // --------------------------------------------------------
    // AGGREGATE PROBABILITIES AND COUNTS
    // --------------------------------------------------------

    let totalIndustrial = 0;
    let totalAgricultural = 0;
    let totalForest = 0;

    let sumProbInd = 0;
    let sumProbAgr = 0;
    let sumProbFor = 0;

    let probCount = 0;

    fires.forEach(fire => {

        const detectionType = (fire.detection_type || "").toUpperCase();

        if (detectionType === "INDUSTRIAL") {
            totalIndustrial++;
        } else if (detectionType === "AGRICULTURAL" || detectionType === "AGRICULTURE") {
            totalAgricultural++;
        } else if (detectionType === "FOREST" || detectionType === "FOREST_FIRE") {
            totalForest++;
        }

        if (
            fire.prob_industrial !== undefined && fire.prob_industrial !== null &&
            fire.prob_agricultural !== undefined && fire.prob_agricultural !== null &&
            fire.prob_forest !== undefined && fire.prob_forest !== null
        ) {
            sumProbInd += Number(fire.prob_industrial);
            sumProbAgr += Number(fire.prob_agricultural);
            sumProbFor += Number(fire.prob_forest);
            probCount++;
        }
    });

    const totalFires = fires.length;

    let avgInd = probCount > 0 ? (sumProbInd / probCount) : (totalIndustrial / totalFires);
    let avgAgr = probCount > 0 ? (sumProbAgr / probCount) : (totalAgricultural / totalFires);
    let avgFor = probCount > 0 ? (sumProbFor / probCount) : (totalForest / totalFires);

    const sumTotal = avgInd + avgAgr + avgFor;
    if (sumTotal > 0) {
        avgInd = avgInd / sumTotal;
        avgAgr = avgAgr / sumTotal;
        avgFor = avgFor / sumTotal;
    } else {
        avgInd = 1 / 3;
        avgAgr = 1 / 3;
        avgFor = 1 / 3;
    }

    const indPct = (avgInd * 100).toFixed(1);
    const agrPct = (avgAgr * 100).toFixed(1);
    const forPct = (avgFor * 100).toFixed(1);

    // Update pill values
    if (indProbVal) indProbVal.textContent = `${indPct}%`;
    if (agrProbVal) agrProbVal.textContent = `${agrPct}%`;
    if (forProbVal) forProbVal.textContent = `${forPct}%`;

    if (indCountBadge) indCountBadge.textContent = `(${totalIndustrial})`;
    if (agrCountBadge) agrCountBadge.textContent = `(${totalAgricultural})`;
    if (forCountBadge) forCountBadge.textContent = `(${totalForest})`;

    // --------------------------------------------------------
    // CHART.JS RENDERING (OR CANVAS FALLBACK)
    // --------------------------------------------------------

    if (chartCanvas) {

        if (typeof Chart !== "undefined") {

            if (classPieChartInstance) {
                classPieChartInstance.destroy();
            }

            const ctx = chartCanvas.getContext("2d");

            classPieChartInstance = new Chart(ctx, {
                type: "doughnut",
                data: {
                    labels: ["Industrial", "Agricultural", "Forest"],
                    datasets: [{
                        data: [
                            parseFloat(indPct),
                            parseFloat(agrPct),
                            parseFloat(forPct)
                        ],
                        backgroundColor: [
                            "#8b5cf6", // Violet for Industrial
                            "#10b981", // Emerald for Agricultural
                            "#f59e0b"  // Amber for Forest
                        ],
                        hoverBackgroundColor: [
                            "#7c3aed",
                            "#059669",
                            "#d97706"
                        ],
                        borderColor: "#ffffff",
                        borderWidth: 2,
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "60%",
                    layout: {
                        padding: 8
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: "#111827",
                            titleFont: { size: 12, weight: "bold" },
                            bodyFont: { size: 12 },
                            padding: 10,
                            cornerRadius: 8,
                            callbacks: {
                                label: function (context) {
                                    const label = context.label || "";
                                    const value = context.parsed || 0;
                                    return ` ${label}: ${value.toFixed(1)}% prob`;
                                }
                            }
                        }
                    },
                    animation: {
                        duration: 650,
                        easing: "easeOutQuart"
                    }
                }
            });

        } else {

            // Native HTML5 Canvas Fallback
            drawCanvasPieFallback(chartCanvas, [
                { label: "Industrial", value: parseFloat(indPct), color: "#8b5cf6" },
                { label: "Agricultural", value: parseFloat(agrPct), color: "#10b981" },
                { label: "Forest", value: parseFloat(forPct), color: "#f59e0b" }
            ]);

        }

    }

}


// ============================================================
// CANVAS FALLBACK PIE RENDERER (OFFLINE SUPPORT)
// ============================================================

function drawCanvasPieFallback(canvas, slices) {
    const ctx = canvas.getContext("2d");
    const width = canvas.width || 240;
    const height = canvas.height || 180;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    ctx.clearRect(0, 0, width, height);

    const total = slices.reduce((sum, s) => sum + s.value, 0);
    if (total === 0) return;

    let startAngle = -Math.PI / 2;

    slices.forEach(slice => {
        const sliceAngle = (slice.value / total) * (Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = slice.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();

        startAngle += sliceAngle;
    });

    // Draw center cutout for donut look
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
}


// ============================================================
// UPDATE CLASSIFICATION + PERSISTENCE COUNTS
// ============================================================

function updateClassificationCounts(fires) {

    // --------------------------------------------------------
    // ML CLASSIFICATION COUNTS
    // --------------------------------------------------------

    let industrial = 0;
    let agriculture = 0;
    let forest = 0;

    // --------------------------------------------------------
    // PERSISTENCE COUNTS
    // --------------------------------------------------------

    let persistent = 0;
    let intermittent = 0;
    let recent = 0;
    let newDetections = 0;

    fires.forEach(fire => {

        // ====================================================
        // ML CLASSIFICATION
        // ====================================================

        const detectionType =
            (fire.detection_type || "").toUpperCase();

        if (detectionType === "INDUSTRIAL") {
            industrial++;
        }
        else if (
            detectionType === "AGRICULTURAL" ||
            detectionType === "AGRICULTURE"
        ) {
            agriculture++;
        }
        else if (
            detectionType === "FOREST" ||
            detectionType === "FOREST_FIRE"
        ) {
            forest++;
        }

        // ====================================================
        // ACTIVE PERSISTENCE CLASSIFICATION
        // ====================================================

        const persistence =
            (fire.persistence_status || "").toUpperCase();

        if (persistence === "PERSISTENT") {
            persistent++;
        }
        else if (persistence === "INTERMITTENT") {
            intermittent++;
        }
        else if (persistence === "RECENT") {
            recent++;
        }
        else if (persistence === "NEW") {
            newDetections++;
        }

    });

    // ========================================================
    // UPDATE ML CLASSIFICATION COUNTERS
    // ========================================================

    const industrialElement =
        document.getElementById("industrialCount");

    const agricultureElement =
        document.getElementById("agricultureCount");

    const forestElement =
        document.getElementById("forestCount");

    if (industrialElement) {
        industrialElement.textContent = industrial;
    }

    if (agricultureElement) {
        agricultureElement.textContent = agriculture;
    }

    if (forestElement) {
        forestElement.textContent = forest;
    }

    // ========================================================
    // UPDATE PERSISTENCE UI
    // ========================================================

    const persistentElement =
        document.getElementById("persistentCount");

    const intermittentElement =
        document.getElementById("intermittentCount");

    const recentElement =
        document.getElementById("recentCount");

    const newElement =
        document.getElementById("newCount");

    if (persistentElement) {
        persistentElement.textContent = persistent;
    }

    if (intermittentElement) {
        intermittentElement.textContent = intermittent;
    }

    if (recentElement) {
        recentElement.textContent = recent;
    }

    if (newElement) {
        newElement.textContent = newDetections;
    }

    // ========================================================
    // UPDATE CLASS PROBABILITY PIE CHART
    // ========================================================

    const chartModeBadge =
        document.getElementById("chartModeBadge");

    if (chartModeBadge) {
        chartModeBadge.textContent = "Live Area";
    }

    renderClassPieChart(fires);

    // ========================================================
    // DEBUG LOG
    // ========================================================

    console.log(
        "Classification Summary:",
        {
            industrial: industrial,
            agriculture: agriculture,
            forest: forest
        }
    );

    console.log(
        "Persistence Summary:",
        {
            persistent: persistent,
            intermittent: intermittent,
            recent: recent,
            new: newDetections
        }
    );

}


// ============================================================
// LOADING STATE
// ============================================================

function setLoading(isLoading) {

    const searchButton =
        document.getElementById("searchButton");

    const loadingMessage =
        document.getElementById("loadingMessage");

    if (isLoading) {

        if (searchButton) {
            searchButton.disabled = true;
            searchButton.textContent = "Searching...";
        }

        if (loadingMessage) {
            loadingMessage.style.display = "block";
        }

    }

    else {

        if (searchButton) {
            searchButton.disabled = false;
            searchButton.textContent = "Search Fires";
        }

        if (loadingMessage) {
            loadingMessage.style.display = "none";
        }

    }
}


// ============================================================
// MAP MESSAGE
// ============================================================

function showMapMessage(message) {

    const messageElement =
        document.getElementById("mapMessage");

    if (!messageElement) {
        console.warn("Map message:", message);
        return;
    }

    messageElement.textContent = message;
    messageElement.style.display = "block";

    setTimeout(() => {
        if (messageElement) {
            messageElement.style.display = "none";
        }
    }, 4000);
}

//----------------SIDEBAR TOGGLE----------------------------
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.querySelector('.sidebar');

if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        
        const isCollapsed = sidebar.classList.contains('collapsed');
        sidebarToggle.textContent = isCollapsed ? '▶' : '◀';
        sidebarToggle.setAttribute('title', isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar');
    });
}

