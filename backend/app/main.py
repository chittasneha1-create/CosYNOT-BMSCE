"""FlowShield API entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router

app = FastAPI(
    title="cosYNOT BMSCE",
    description="India urban flood digital twin — mathematical simulation API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")
app.include_router(router, prefix="/api")


@app.get("/")
def root():
    return {
        "name": "cosYNOT BMSCE",
        "tagline": "Predict the flood. Protect the future.",
        "docs": "/docs",
        "health": "/api/v1/health",
        "label": "Simulation Data — Synthetic Digital Twin",
    }
