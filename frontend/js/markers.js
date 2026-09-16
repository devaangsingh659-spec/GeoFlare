/* =========================================
   MARKER STORAGE
========================================= */

let fireMarkers = [];


/* =========================================
   CLEAR EXISTING MARKERS
========================================= */

function clearFireMarkers() {

    fireMarkers.forEach(
        marker => map.removeLayer(marker)
    );

    fireMarkers = [];
}


/* =========================================
   CREATE FIRE MARKER
========================================= */

function createFireMarker(fire) {

    /*
        Persistence status comes directly
        from the backend.

        NEW
        RECENT
        INTERMITTENT
        PERSISTENT
    */

    const persistenceStatus =
        fire.persistence_status
            ? fire.persistence_status.toLowerCase()
            : "recent";

    const classificationText =
        fire.detection_type || "industrial";

    const classificationKey =
        classificationText
            .toLowerCase()
            .replace(/[_\s]+/g, " ")
            .includes("forest")
            ? "forest"
            : classificationText
                .toLowerCase()
                .replace(/[_\s]+/g, " ")
                .includes("agri")
                ? "agricultural"
                : "industrial";


    const icon =
        L.divIcon({

            className: "",

            html: `
                <div class="
                    fire-icon
                    classification-${classificationKey}
                    persistence-${persistenceStatus}
                ">
                    🔥
                </div>
            `,

            iconSize: [24, 24],

            iconAnchor: [12, 12],

            popupAnchor: [0, -12]

        });


    const marker =
        L.marker(
            [
                fire.latitude,
                fire.longitude
            ],
            {
                icon: icon
            }
        );


    marker.bindPopup(
        createFirePopup(fire)
    );


    return marker;
}


/* =========================================
   FIRE POPUP
========================================= */

function createFirePopup(fire) {

    /* =====================================
       BASIC INFORMATION
    ===================================== */

    const acquisitionTime =
        formatDateTime(
            fire.acquisition_time
        );


    /* =====================================
       CONFIDENCE
    ===================================== */

    let confidence = "Not available";


    if (
        fire.confidence !== null &&
        fire.confidence !== undefined
    ) {

        const confidenceValue =
            Number(fire.confidence);


        if (!isNaN(confidenceValue)) {

            /*
                ML convention:

                0.94 = 94%
                94   = 94%

                Confidence is displayed only as
                the model confidence value.
            */

            const percentage =
                confidenceValue <= 1
                    ? confidenceValue * 100
                    : confidenceValue;


            confidence =
                `${percentage.toFixed(1)}%`;

        }
    }


    /* =====================================
       ML CLASSIFICATION & PROBABILITIES
    ===================================== */

    const classification =
        fire.detection_type ??
        "Not classified";

    const classificationKey =
        (classification || "industrial")
            .toLowerCase()
            .replace(/[_\s]+/g, " ")
            .includes("forest")
            ? "forest"
            : (classification || "industrial")
                .toLowerCase()
                .replace(/[_\s]+/g, " ")
                .includes("agri")
                ? "agricultural"
                : "industrial";


    const predictionStatus =
        fire.prediction_status ??
        "Pending";


    const probInd = fire.prob_industrial !== undefined && fire.prob_industrial !== null
        ? Number(fire.prob_industrial)
        : (classification.toUpperCase() === "INDUSTRIAL" ? 0.85 : 0.08);

    const probAgr = fire.prob_agricultural !== undefined && fire.prob_agricultural !== null
        ? Number(fire.prob_agricultural)
        : (classification.toUpperCase().startsWith("AGRI") ? 0.85 : 0.07);

    const probFor = fire.prob_forest !== undefined && fire.prob_forest !== null
        ? Number(fire.prob_forest)
        : (classification.toUpperCase().startsWith("FOR") ? 0.85 : 0.05);

    const indPct = (probInd * 100).toFixed(1);
    const agrPct = (probAgr * 100).toFixed(1);
    const forPct = (probFor * 100).toFixed(1);

    const donutSvg = generateDonutSVG(probInd, probAgr, probFor);


    /* =====================================
       PERSISTENCE
    ===================================== */

    const persistenceStatus =
        fire.persistence_status ??
        "RECENT";


    const persistenceScore =
        fire.persistence_score !== null &&
            fire.persistence_score !== undefined
            ? Number(
                fire.persistence_score
            ).toFixed(3)
            : "N/A";


    const observationCount =
        fire.observation_count ?? 0;


    const activeDays =
        fire.active_days ?? 0;


    const firstSeen =
        formatDateTime(
            fire.first_seen
        );


    const lastSeen =
        formatDateTime(
            fire.last_seen
        );


    const persistenceReason =
        fire.persistence_reason ??
        "No persistence history available.";


    /* =====================================
       PERSISTENCE BADGE CLASS
    ===================================== */

    const persistenceBadgeClass =
        persistenceStatus.toLowerCase();


    /* =====================================
       RETURN POPUP
    ===================================== */

    return `
        <div class="fire-popup">

            <!-- ============================
                 TITLE
            ============================= -->

            <div class="fire-popup-title">
                🔥 Fire Detection #${fire.id}
            </div>


            <!-- ============================
                 LOCATION
            ============================= -->

            <div class="fire-popup-row">
                <span class="fire-popup-label">
                    Latitude
                </span>

                <span class="fire-popup-value">
                    ${Number(fire.latitude).toFixed(5)}
                </span>
            </div>


            <div class="fire-popup-row">
                <span class="fire-popup-label">
                    Longitude
                </span>

                <span class="fire-popup-value">
                    ${Number(fire.longitude).toFixed(5)}
                </span>
            </div>


            <!-- ============================
                 FIRMS DATA
            ============================= -->

            <div class="fire-popup-row">
                <span class="fire-popup-label">
                    FRP
                </span>

                <span class="fire-popup-value">
                    ${fire.frp ?? "N/A"} MW
                </span>
            </div>


            <div class="fire-popup-row">
                <span class="fire-popup-label">
                    Brightness
                </span>

                <span class="fire-popup-value">
                    ${fire.brightness ?? "N/A"} K
                </span>
            </div>


            <div class="fire-popup-row">
                <span class="fire-popup-label">
                    Satellite
                </span>

                <span class="fire-popup-value">
                    ${fire.satellite ?? "N/A"}
                </span>
            </div>


            <div class="fire-popup-row">
                <span class="fire-popup-label">
                    Source
                </span>

                <span class="fire-popup-value">
                    ${fire.source ?? "N/A"}
                </span>
            </div>


            <div class="fire-popup-row">
                <span class="fire-popup-label">
                    Acquisition
                </span>

                <span class="fire-popup-value">
                    ${acquisitionTime}
                </span>
            </div>


            <!-- ============================
                 PERSISTENCE ANALYSIS
            ============================= -->

            <div class="fire-popup-section-title">
                🔥 Persistence Analysis
            </div>


            <div class="fire-popup-row">
                <span class="fire-popup-label">
                    Status
                </span>

                <span class="
                    fire-popup-badge
                    classification-${classificationKey}
                    persistence-${persistenceBadgeClass}
                ">
                    ${persistenceStatus}
                </span>
            </div>


            <div class="fire-popup-row">
                <span class="fire-popup-label">
                    Persistence Score
                </span>

                <span class="fire-popup-value">
                    ${persistenceScore}
                </span>
            </div>


            <div class="fire-popup-row">
                <span class="fire-popup-label">
                    Observations
                </span>

                <span class="fire-popup-value">
                    ${observationCount}
                </span>
            </div>


            <div class="fire-popup-row">
                <span class="fire-popup-label">
                    Active Days
                </span>

                <span class="fire-popup-value">
                    ${activeDays} / 5
                </span>
            </div>


            <div class="fire-popup-row">
                <span class="fire-popup-label">
                    First Seen
                </span>

                <span class="fire-popup-value">
                    ${firstSeen}
                </span>
            </div>


            <div class="fire-popup-row">
                <span class="fire-popup-label">
                    Last Seen
                </span>

                <span class="fire-popup-value">
                    ${lastSeen}
                </span>
            </div>


            <div class="fire-popup-reason">
                ${persistenceReason}
            </div>


            <!-- ============================
                 ML ANALYSIS & PROBABILITIES
            ============================= -->

            <div class="fire-popup-section-title">
                🤖 ML Classification & Probabilities
            </div>


            <div class="fire-popup-row">
                <span class="fire-popup-label">
                    Classification
                </span>

                <span class="fire-popup-badge badge-${classification.toLowerCase()}">
                    ${classification}
                </span>
            </div>


            <div class="fire-popup-row">
                <span class="fire-popup-label">
                    Confidence
                </span>

                <span class="fire-popup-value">
                    ${confidence}
                </span>
            </div>


            <div class="fire-popup-row">
                <span class="fire-popup-label">
                    ML Status
                </span>

                <span class="fire-popup-value">
                    ${predictionStatus}
                </span>
            </div>


            <!-- MINI PIE CHART & PROBABILITY BARS -->
            <div class="popup-prob-container">

                <div class="popup-prob-chart-col">
                    ${donutSvg}
                </div>

                <div class="popup-prob-bars-col">

                    <div class="popup-bar-item">
                        <div class="popup-bar-label">
                            <span class="dot-sm ind-dot"></span>
                            <span>Industrial</span>
                            <span class="pct-num">${indPct}%</span>
                        </div>
                        <div class="popup-bar-track">
                            <div class="popup-bar-fill ind-fill" style="width: ${indPct}%;"></div>
                        </div>
                    </div>

                    <div class="popup-bar-item">
                        <div class="popup-bar-label">
                            <span class="dot-sm agr-dot"></span>
                            <span>Agricultural</span>
                            <span class="pct-num">${agrPct}%</span>
                        </div>
                        <div class="popup-bar-track">
                            <div class="popup-bar-fill agr-fill" style="width: ${agrPct}%;"></div>
                        </div>
                    </div>

                    <div class="popup-bar-item">
                        <div class="popup-bar-label">
                            <span class="dot-sm for-dot"></span>
                            <span>Forest</span>
                            <span class="pct-num">${forPct}%</span>
                        </div>
                        <div class="popup-bar-track">
                            <div class="popup-bar-fill for-fill" style="width: ${forPct}%;"></div>
                        </div>
                    </div>

                </div>

            </div>

        </div>
    `;
}


/* =========================================
   GENERATE SVG MINI DONUT CHART
========================================= */

function generateDonutSVG(pInd, pAgr, pFor) {
    const total = pInd + pAgr + pFor;
    const normInd = total > 0 ? pInd / total : 0.333;
    const normAgr = total > 0 ? pAgr / total : 0.333;
    const normFor = total > 0 ? pFor / total : 0.334;

    const rootStyles = getComputedStyle(document.documentElement);
    const industrialColor = rootStyles.getPropertyValue('--fire-industrial').trim() || '#7D838A';
    const agriculturalColor = rootStyles.getPropertyValue('--fire-agricultural').trim() || '#8C6C50';
    const forestColor = rootStyles.getPropertyValue('--fire-forest').trim() || '#2F5D4E';

    const r = 20;
    const cx = 28;
    const cy = 28;
    const circ = 2 * Math.PI * r;

    const strokeInd = Math.max(0.01, normInd * circ);
    const strokeAgr = Math.max(0.01, normAgr * circ);
    const strokeFor = Math.max(0.01, normFor * circ);

    const offsetInd = 0;
    const offsetAgr = -strokeInd;
    const offsetFor = -(strokeInd + strokeAgr);

    const topPct = (Math.max(normInd, normAgr, normFor) * 100).toFixed(0);

    return `
    <svg width="56" height="56" viewBox="0 0 56 56" class="popup-mini-donut">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="7" />
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${industrialColor}" stroke-width="7"
            stroke-dasharray="${strokeInd} ${circ}" stroke-dashoffset="${offsetInd}"
            transform="rotate(-90 ${cx} ${cy})" />
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${agriculturalColor}" stroke-width="7"
            stroke-dasharray="${strokeAgr} ${circ}" stroke-dashoffset="${offsetAgr}"
            transform="rotate(-90 ${cx} ${cy})" />
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${forestColor}" stroke-width="7"
            stroke-dasharray="${strokeFor} ${circ}" stroke-dashoffset="${offsetFor}"
            transform="rotate(-90 ${cx} ${cy})" />
        <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="9" font-weight="700" fill="#111827">
            ${topPct}%
        </text>
    </svg>
    `;
}


/* =========================================
   FORMAT DATE
========================================= */

function formatDateTime(value) {

    if (!value) {

        return "N/A";

    }


    const date =
        new Date(value);


    if (isNaN(date.getTime())) {

        return value;

    }


    return date.toLocaleString();

}


/* =========================================
   DISPLAY FIRES
========================================= */

function displayFires(fires) {

    clearFireMarkers();


    if (!fires || fires.length === 0) {

        console.log(
            "No active fire detections found."
        );

        return;
    }


    fires.forEach(
        fire => {

            const marker =
                createFireMarker(fire);


            marker.on(
                "click",
                function () {
                    renderClassPieChart([fire]);

                    const chartModeBadge =
                        document.getElementById("chartModeBadge");

                    if (chartModeBadge) {
                        chartModeBadge.textContent = "Selected Point";
                    }
                }
            );


            marker.addTo(map);


            fireMarkers.push(marker);

        }
    );


    console.log(
        `${fireMarkers.length} active fire markers displayed.`
    );
}