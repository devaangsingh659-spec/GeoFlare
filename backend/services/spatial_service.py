from datetime import datetime, timezone

from backend.database.connection import (
    get_connection,
    release_connection
)


def get_fires_in_bbox(west, south, east, north):
    """
    Return current/latest thermal detections inside the
    requested bounding box.

    NASA FIRMS may not have published today's data yet.
    Therefore, the function uses the latest acquisition date
    actually available inside the selected bounding box.

    Persistence:
        - Spatial radius: 500 meters
        - Historical window: 5 days

    Categories:
        NEW
            Latest observation within the last 3 hours,
            only one observation on the latest available day,
            and no previous-day observation.

        RECENT
            Exactly one observation on the latest available day,
            with no previous-day observation.

        INTERMITTENT
            Multiple observations on the latest available day,
            with no previous-day observation.

        PERSISTENT
            Observation on the latest available day and at least
            one previous active day within the 5-day window.

    Historical detections are used only for persistence analysis.
    They are not returned as separate markers.
    """

    conn = get_connection()
    cursor = conn.cursor()

    try:

        # ==========================================================
        # BOUNDING BOX
        # ==========================================================

        bbox = """
            ST_MakeEnvelope(
                %s,
                %s,
                %s,
                %s,
                4326
            )
        """

        # ==========================================================
        # MAIN QUERY
        # ==========================================================
        #
        # IMPORTANT:
        # We DO NOT use CURRENT_DATE here.
        #
        # NASA FIRMS may currently contain Sep 15 data while the
        # system date is Sep 16.
        #
        # So we first find the latest date actually available
        # inside the requested bounding box.
        # ==========================================================

        query = f"""
            WITH latest_day AS (

                SELECT
                    MAX(
                        (
                            acquisition_time
                            AT TIME ZONE 'UTC'
                        )::date
                    ) AS max_date

                FROM thermal_detections

                WHERE
                    geom && {bbox}

                    AND ST_Within(
                        geom,
                        {bbox}
                    )
            )

            SELECT

                d.id,

                ST_Y(d.geom) AS latitude,

                ST_X(d.geom) AS longitude,

                d.frp,

                d.brightness,

                d.acquisition_time,

                d.satellite,

                d.source,

                d.confidence,

                d.detection_type,

                d.prediction_status,

                MIN(h.acquisition_time) AS first_seen,

                MAX(h.acquisition_time) AS last_seen,

                COUNT(
                    DISTINCT h.acquisition_time
                ) AS observation_count,

                COUNT(
                    DISTINCT (
                        h.acquisition_time
                        AT TIME ZONE 'UTC'
                    )::date
                ) AS active_days,

                COUNT(
                    DISTINCT CASE
                        WHEN (
                            h.acquisition_time
                            AT TIME ZONE 'UTC'
                        )::date = (
                            d.acquisition_time
                            AT TIME ZONE 'UTC'
                        )::date
                        THEN h.acquisition_time
                    END
                ) AS today_observation_count,

                COUNT(
                    DISTINCT CASE
                        WHEN (
                            h.acquisition_time
                            AT TIME ZONE 'UTC'
                        )::date < (
                            d.acquisition_time
                            AT TIME ZONE 'UTC'
                        )::date
                        THEN (
                            h.acquisition_time
                            AT TIME ZONE 'UTC'
                        )::date
                    END
                ) AS previous_active_days

            FROM thermal_detections d

            CROSS JOIN latest_day ld

            LEFT JOIN thermal_detections h

                ON ST_DWithin(
                    d.geom::geography,
                    h.geom::geography,
                    500
                )

                AND h.acquisition_time >=
                    d.acquisition_time -
                    INTERVAL '5 days'

                AND h.acquisition_time <=
                    d.acquisition_time

            WHERE

                d.geom && {bbox}

                AND ST_Within(
                    d.geom,
                    {bbox}
                )

                -- Only return detections from the latest
                -- FIRMS date actually available in this bbox.

                AND (
                    d.acquisition_time
                    AT TIME ZONE 'UTC'
                )::date = ld.max_date

            GROUP BY

                d.id,

                d.geom,

                d.frp,

                d.brightness,

                d.acquisition_time,

                d.satellite,

                d.source,

                d.confidence,

                d.detection_type,

                d.prediction_status

            ORDER BY
                d.acquisition_time DESC;
        """

        # ==========================================================
        # EXECUTE QUERY
        # ==========================================================

        cursor.execute(
            query,
            (
                # --------------------------------------------------
                # latest_day:
                # geom && bbox
                # --------------------------------------------------
                west,
                south,
                east,
                north,

                # --------------------------------------------------
                # latest_day:
                # ST_Within(geom, bbox)
                # --------------------------------------------------
                west,
                south,
                east,
                north,

                # --------------------------------------------------
                # main query:
                # d.geom && bbox
                # --------------------------------------------------
                west,
                south,
                east,
                north,

                # --------------------------------------------------
                # main query:
                # ST_Within(d.geom, bbox)
                # --------------------------------------------------
                west,
                south,
                east,
                north
            )
        )

        rows = cursor.fetchall()

        # ==========================================================
        # CURRENT UTC TIME
        # ==========================================================

        now = datetime.now(timezone.utc)

        # ==========================================================
        # BUILD RESPONSE
        # ==========================================================

        detections = []

        for row in rows:

            # ------------------------------------------------------
            # DATABASE VALUES
            # ------------------------------------------------------

            detection_id = row[0]
            latitude = row[1]
            longitude = row[2]
            frp = row[3]
            brightness = row[4]
            acquisition_time = row[5]
            satellite = row[6]
            source = row[7]
            confidence = row[8]
            detection_type = row[9]
            prediction_status = row[10]

            first_seen_db = row[11]
            last_seen_db = row[12]
            observation_count_db = row[13]
            active_days_db = row[14]
            today_observation_count_db = row[15]
            previous_active_days_db = row[16]

            # ------------------------------------------------------
            # NORMALIZE ACQUISITION TIME
            # ------------------------------------------------------

            if acquisition_time is not None:

                if acquisition_time.tzinfo is None:
                    acquisition_time = acquisition_time.replace(
                        tzinfo=timezone.utc
                    )

                age = now - acquisition_time

                age_hours = (
                    age.total_seconds() / 3600.0
                )

            else:

                age_hours = 999999

            # ------------------------------------------------------
            # SAFE COUNTS
            # ------------------------------------------------------

            observation_count = (
                int(observation_count_db)
                if observation_count_db is not None
                else 0
            )

            active_days = (
                int(active_days_db)
                if active_days_db is not None
                else 0
            )

            latest_day_observation_count = (
                int(today_observation_count_db)
                if today_observation_count_db is not None
                else 0
            )

            previous_active_days = (
                int(previous_active_days_db)
                if previous_active_days_db is not None
                else 0
            )

            # ======================================================
            # DEFAULT VALUES
            # ======================================================

            persistence_status = None
            persistence_score = None
            first_seen = None
            last_seen = None
            persistence_reason = None

            # ======================================================
            # PERSISTENT
            # ======================================================

            if previous_active_days >= 1:

                persistence_status = "PERSISTENT"

                first_seen = first_seen_db
                last_seen = last_seen_db

                persistence_reason = (
                    f"Detected on the latest available FIRMS "
                    f"day and across {previous_active_days} "
                    f"previous active day(s) within the 5-day "
                    f"analysis window."
                )

            # ======================================================
            # INTERMITTENT
            # ======================================================

            elif latest_day_observation_count >= 2:

                persistence_status = "INTERMITTENT"

                first_seen = first_seen_db
                last_seen = last_seen_db

                persistence_reason = (
                    f"Detected {latest_day_observation_count} "
                    f"distinct times on the latest available "
                    f"FIRMS day with no observation on a "
                    f"previous day."
                )

            # ======================================================
            # NEW
            # ======================================================

            elif (
                age_hours <= 3
                and latest_day_observation_count == 1
                and previous_active_days == 0
            ):

                persistence_status = "NEW"

                first_seen = first_seen_db
                last_seen = last_seen_db

                persistence_reason = (
                    "Very recently detected by the satellite "
                    "within the last 3 hours with no repeated "
                    "observation yet."
                )

            # ======================================================
            # RECENT
            # ======================================================

            elif (
                latest_day_observation_count == 1
                and previous_active_days == 0
            ):

                persistence_status = "RECENT"

                first_seen = first_seen_db
                last_seen = last_seen_db

                persistence_reason = (
                    "Detected once on the latest available "
                    "FIRMS day with no repeated observation "
                    "and no previous-day history."
                )

            # ======================================================
            # SAFETY FALLBACK
            # ======================================================

            else:

                persistence_status = "RECENT"

                first_seen = first_seen_db
                last_seen = last_seen_db

                persistence_reason = (
                    "Detected on the latest available "
                    "FIRMS day."
                )

            # ======================================================
            # PERSISTENCE SCORE
            # ======================================================

            persistence_score = min(
                active_days / 5.0,
                1.0
            )

            # ======================================================
            # BUILD DETECTION OBJECT
            # ======================================================

            detections.append({

                "id": detection_id,

                "latitude": (
                    float(latitude)
                    if latitude is not None
                    else None
                ),

                "longitude": (
                    float(longitude)
                    if longitude is not None
                    else None
                ),

                "frp": (
                    float(frp)
                    if frp is not None
                    else None
                ),

                "brightness": (
                    float(brightness)
                    if brightness is not None
                    else None
                ),

                "acquisition_time":
                    acquisition_time,

                "satellite":
                    satellite,

                "source":
                    source,

                # ==================================================
                # ML FIELDS
                # ==================================================

                "confidence": (
                    float(confidence)
                    if confidence is not None
                    else None
                ),

                "detection_type":
                    detection_type,

                "prediction_status":
                    prediction_status,

                # ==================================================
                # PERSISTENCE FIELDS
                # ==================================================

                "persistence_status":
                    persistence_status,

                "persistence_score": (
                    round(
                        persistence_score,
                        3
                    )
                    if persistence_score is not None
                    else None
                ),

                "first_seen":
                    first_seen,

                "last_seen":
                    last_seen,

                "observation_count":
                    observation_count,

                "active_days":
                    active_days,

                "persistence_reason":
                    persistence_reason,

                "is_historical":
                    False
            })

        # ==========================================================
        # LOGGING
        # ==========================================================

        print("\n========================================")
        print("CURRENT FIRE SEARCH COMPLETE")
        print("========================================")

        print(
            "BBOX:",
            west,
            south,
            east,
            north
        )

        print(
            "Main detection window:",
            "LATEST AVAILABLE FIRMS DAY"
        )

        print(
            "Persistence window:",
            "LAST 5 DAYS"
        )

        print(
            "Persistence radius:",
            "500 meters"
        )

        print(
            "Detections returned:",
            len(detections)
        )

        # ==========================================================
        # COUNTS
        # ==========================================================

        persistent_count = sum(
            1
            for d in detections
            if d["persistence_status"] == "PERSISTENT"
        )

        intermittent_count = sum(
            1
            for d in detections
            if d["persistence_status"] == "INTERMITTENT"
        )

        recent_count = sum(
            1
            for d in detections
            if d["persistence_status"] == "RECENT"
        )

        new_count = sum(
            1
            for d in detections
            if d["persistence_status"] == "NEW"
        )

        # ======================================================
        # PRINT COUNTS
        # ======================================================

        print(
            "Persistent:",
            persistent_count
        )

        print(
            "Intermittent:",
            intermittent_count
        )

        print(
            "Recent:",
            recent_count
        )

        print(
            "New:",
            new_count
        )

        print(
            "Historical:",
            "NOT INCLUDED"
        )

        print("========================================\n")

        return detections

    except Exception as e:

        print("\n========================================")
        print("CURRENT FIRE SEARCH ERROR")
        print("========================================")

        print(
            "BBOX:",
            west,
            south,
            east,
            north
        )

        print(
            "ERROR:",
            e
        )

        print("========================================\n")

        raise

    finally:

        cursor.close()

        release_connection(conn)