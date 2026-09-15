
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.fires import router as fires_router
from backend.api.predictions import router as predictions_router
from backend.api.boundaries import router as boundaries_router
from backend.api.statistics import router as statistics_router


app = FastAPI(
    title="Satellite Fire Detection API",
    description=(
        "Backend for NASA FIRMS based "
        "satellite fire detections and classification."
    ),
    version="1.0.0"
)



# ==========================================
# CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)




# ==========================================
# ROUTES
# ==========================================

app.include_router(fires_router)
app.include_router(predictions_router)
app.include_router(boundaries_router)
app.include_router(statistics_router)


# ==========================================
# ROOT
# ==========================================

@app.get("/")
def root():

    return {
        "message": "Satellite Fire Detection API",
        "status": "running"
    }


# ==========================================
# HEALTH CHECK
# ==========================================

@app.get("/api/health")
def health():

    return {
        "status": "healthy"
    }

