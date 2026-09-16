/* =========================================
   APPLICATION START
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        console.log(
            "Industrial Fire Detection starting..."
        );


        /* =====================================
           INITIALIZE MAP
        ===================================== */

        initializeMap();


        /* =====================================
           SEARCH BUTTON
        ===================================== */

        const searchButton =
            document.getElementById("searchButton");


        if (searchButton) {

            searchButton.addEventListener(
                "click",
                searchCurrentMap
            );

        }


        /* =====================================
           CHECK BACKEND
        ===================================== */

        const apiOnline =
            await checkAPI();


        if (!apiOnline) {

            console.warn(
                "FastAPI backend is offline."
            );

            showMapMessage(
                "Backend is offline."
            );

            return;
        }


        console.log(
            "FastAPI backend is online."
        );


        /* =====================================
           INITIAL FIRE SEARCH
        ===================================== */

        await searchCurrentMap();

    }
);