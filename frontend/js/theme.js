/* =========================================================
   FIREWATCH THEME MANAGER
========================================================= */

(function () {

    const STORAGE_KEY =
        "fireDetectionTheme";

    const html =
        document.documentElement;


    /* =====================================================
       GET CURRENT THEME
    ===================================================== */

    function getTheme() {

        const theme =
            html.getAttribute("data-theme");

        return theme === "light"
            ? "light"
            : "dark";
    }


    /* =====================================================
       APPLY THEME
    ===================================================== */

    function applyTheme(theme) {

        /*
         * Only allow these two values.
         */

        if (
            theme !== "light" &&
            theme !== "dark"
        ) {
            theme = "dark";
        }


        /*
         * Change CSS theme.
         */

        html.setAttribute(
            "data-theme",
            theme
        );


        /*
         * Remember user's choice.
         */

        localStorage.setItem(
            STORAGE_KEY,
            theme
        );


        /*
         * Update button appearance.
         */

        updateButton(theme);


        /*
         * Tell Leaflet to change its
         * basemap.
         */

        if (
            typeof window.setMapTheme ===
            "function"
        ) {

            window.setMapTheme(theme);
        }
    }


    /* =====================================================
       UPDATE BUTTON
    ===================================================== */

    function updateButton(theme) {

        const button =
            document.getElementById(
                "themeToggle"
            );

        if (!button) {
            return;
        }


        if (theme === "dark") {

            /*
             * Current theme = dark
             * Button offers light.
             */

            button.textContent =
                "☀ Light";

            button.setAttribute(
                "aria-label",
                "Switch to light theme"
            );

        } else {

            /*
             * Current theme = light
             * Button offers dark.
             */

            button.textContent =
                "◐ Dark";

            button.setAttribute(
                "aria-label",
                "Switch to dark theme"
            );
        }
    }


    /* =====================================================
       TOGGLE
    ===================================================== */

    function toggleTheme() {

        const currentTheme =
            getTheme();

        const newTheme =
            currentTheme === "dark"
                ? "light"
                : "dark";


        console.log(
            "Theme:",
            currentTheme,
            "→",
            newTheme
        );


        applyTheme(newTheme);
    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    function initTheme() {

        /*
         * IMPORTANT:
         *
         * The <head> script has already established
         * dark/light before the page rendered.
         */

        const currentTheme =
            getTheme();


        /*
         * Update button.
         */

        updateButton(
            currentTheme
        );


        /*
         * Connect button AFTER DOM exists.
         */

        const button =
            document.getElementById(
                "themeToggle"
            );


        if (!button) {

            console.error(
                "FireWatch: #themeToggle was not found."
            );

            return;
        }


        button.addEventListener(
            "click",
            toggleTheme
        );


        /*
         * Make sure the map starts
         * on the same theme.
         */

        if (
            typeof window.setMapTheme ===
            "function"
        ) {

            window.setMapTheme(
                currentTheme
            );
        }
    }


    /*
     * Wait until the HTML button exists.
     */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initTheme
        );

    } else {

        initTheme();
    }


    /*
     * Optional public API.
     */

    window.FireWatchTheme = {
        getTheme,
        applyTheme,
        toggleTheme
    };

})();