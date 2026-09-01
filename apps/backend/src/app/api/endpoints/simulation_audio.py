from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from app.services.simulation_audio_storage import store_simulated_audio

router = APIRouter()


@router.post("/simulation-audio")
async def upload_simulated_audio(
    request: Request, audio: UploadFile = File(...), simulation_id: str = Form(...), consent: bool = Form(...),
):
    if not consent:
        raise HTTPException(400, "Explicit consent is required before sharing audio with an agent")
    if audio.content_type not in {"audio/wav", "audio/wave", "audio/x-wav", "application/octet-stream"}:
        raise HTTPException(415, "Only WAV simulation audio can be uploaded")
    try:
        stored = store_simulated_audio(await audio.read(), audio.filename or f"{simulation_id}.wav")
    except ValueError as error:
        raise HTTPException(413, str(error)) from error
    if stored["audioUrl"].startswith("/"):
        stored["audioUrl"] = f"{str(request.base_url).rstrip('/')}{stored['audioUrl']}"
    return {**stored, "simulationId": simulation_id}
