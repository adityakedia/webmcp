from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from app.services.room_reference_storage import store_room_reference_image

router = APIRouter()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_ROOM_REFERENCES = 6


@router.post("/room-references")
async def upload_room_references(
    request: Request, images: list[UploadFile] = File(...), consent: bool = Form(...),
):
    if not consent:
        raise HTTPException(400, "Explicit consent is required before sharing room images with the agent")
    if not images or len(images) > MAX_ROOM_REFERENCES:
        raise HTTPException(400, f"Upload between 1 and {MAX_ROOM_REFERENCES} room images")

    stored_images = []
    for image in images:
        if image.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(415, "Room references must be JPEG, PNG, or WebP images")
        try:
            stored = store_room_reference_image(await image.read(), image.filename or "room-reference.jpg", image.content_type)
        except ValueError as error:
            raise HTTPException(413, str(error)) from error
        if stored["imageUrl"].startswith("/"):
            stored["imageUrl"] = f"{str(request.base_url).rstrip('/')}{stored['imageUrl']}"
        stored_images.append(stored)

    return {"references": stored_images}
