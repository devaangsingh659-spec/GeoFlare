/* =========================================
   MAP VARIABLE
========================================= */

let map;


/* =========================================
   INITIALIZE MAP
========================================= */

function initializeMap() {

    /*
        Starting location:
        Jakarta / Indonesia

        This is useful because we validated
        the Indonesia bounding box with FIRMS.
    */

    map = L.map("map").setView(
        [-6.2, 106.6],
        9
    );


    /* =====================================
       OPENSTREETMAP
    ===================================== */

    /* =========================================================
    BASEMAPS
    ========================================================= */

    const darkTileLayer = L.tileLayer(
        'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
        {
            maxZoom: 20,

            attribution:
                '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, ' +
                '&copy; <a href="https://openmaptiles.org/">OpenMapTiles</a>, ' +
                '&copy; <a href="https://openstreetmap.org/">OpenStreetMap</a>'
        }
    );


    const lightTileLayer = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', 
        {
            attribution: '&copy; OpenStreetMap contributors'
        }
    );


    /* Start with dark */

    const initialTheme =
        document.documentElement.dataset.theme ||
        "dark";

    if (initialTheme === "light") {
        lightTileLayer.addTo(map);
    } else {
        darkTileLayer.addTo(map);
    }

    /* =========================================================
    MAP THEME SWITCHER
    ========================================================= */

    window.setMapTheme = function(theme) {

        if (!map) {
            return;
        }


        if (theme === "light") {

            if (map.hasLayer(darkTileLayer)) {
                map.removeLayer(darkTileLayer);
            }

            if (!map.hasLayer(lightTileLayer)) {
                lightTileLayer.addTo(map);
            }

        } else {

            if (map.hasLayer(lightTileLayer)) {
                map.removeLayer(lightTileLayer);
            }

            if (!map.hasLayer(darkTileLayer)) {
                darkTileLayer.addTo(map);
            }
        }
    };


    /* =====================================
       MAP MOVEMENT
    ===================================== */

    map.on(
        "moveend",
        handleMapMovement
    );


    /* =====================================
       INITIAL BBOX
    ===================================== */

    updateMapBounds();


    console.log(
        "Map initialized."
    );
}


/* =========================================
   GET CURRENT BBOX
========================================= */

function getMapBounds() {

    const bounds =
        map.getBounds();


    return {

        west:
            bounds.getWest(),

        south:
            bounds.getSouth(),

        east:
            bounds.getEast(),

        north:
            bounds.getNorth()

    };
}


/* =========================================
   UPDATE BBOX UI
========================================= */

function updateMapBounds() {

    const bounds =
        getMapBounds();


    updateBoundingBoxUI(
        bounds
    );


    return bounds;
}


/* =========================================
   MAP MOVED
========================================= */

function handleMapMovement() {

    console.log(
        "Map moved."
    );


    const bounds =
        updateMapBounds();


    showMapMessage(
        "Map moved. Click Search Fires to update detections."
    );

}


/* =========================================
   SEARCH CURRENT MAP
========================================= */

async function searchCurrentMap() {

    const bounds =
        updateMapBounds();


    try {

        setLoading(true);


        showMapMessage(
            "Searching satellite fire detections..."
        );


        const data =
            await searchFires(bounds);


        /*
            FastAPI returns:

            {
                count: ...,
                detections: [...]
            }

            searchFires() already normalizes
            the detection data.

            IMPORTANT:
            The backend main search returns
            ONLY today's active detections.

            Historical detections are NOT returned
            by this endpoint.
        */

        const fires =
            data.detections ?? [];


        console.log(
            "Active fires received:",
            fires
        );


        /* =====================================
           PERSISTENCE SUMMARY
        ===================================== */

        const persistentCount =
            fires.filter(
                fire =>
                    fire.persistence_status === "PERSISTENT"
            ).length;


        const intermittentCount =
            fires.filter(
                fire =>
                    fire.persistence_status === "INTERMITTENT"
            ).length;


        const recentCount =
            fires.filter(
                fire =>
                    fire.persistence_status === "RECENT"
            ).length;


        const newCount =
            fires.filter(
                fire =>
                    fire.persistence_status === "NEW"
            ).length;


        console.log(
            "================================="
        );

        console.log(
            "PERSISTENCE ANALYSIS"
        );

        console.log(
            "================================="
        );

        console.log(
            "Total active detections:",
            fires.length
        );

        console.log(
            "Persistent:",
            persistentCount
        );

        console.log(
            "Intermittent:",
            intermittentCount
        );

        console.log(
            "Recent:",
            recentCount
        );

        console.log(
            "New:",
            newCount
        );


        /* =====================================
           DISPLAY FIRES
        ===================================== */

        displayFires(
            fires
        );


        /* =====================================
           UPDATE COUNTERS
        ===================================== */

        updateDetectionCount(
            fires.length
        );


        updateClassificationCounts(
            fires
        );


        /* =====================================
           MAP MESSAGE
        ===================================== */

        showMapMessage(
            `${fires.length} active fire detections found. ` +
            `${persistentCount} persistent, ` +
            `${intermittentCount} intermittent, ` +
            `${recentCount} recent, ` +
            `${newCount} new.`
        );


    }
    catch (error) {

        console.error(
            "Fire search failed:",
            error
        );


        showMapMessage(
            "Unable to fetch fire data."
        );


        alert(
            "Could not connect to the FastAPI backend.\n\n" +
            "Make sure your backend is running."
        );

    }
    finally {

        setLoading(false);

    }

}