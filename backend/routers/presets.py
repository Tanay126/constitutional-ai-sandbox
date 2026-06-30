from fastapi import APIRouter, HTTPException
from schemas.generate import ConstitutionPreset
from services.presets import PRESETS, PRESETS_BY_ID

router = APIRouter()


@router.get("/presets", response_model=list[ConstitutionPreset])
def list_presets():
    return PRESETS


@router.get("/presets/{preset_id}", response_model=ConstitutionPreset)
def get_preset(preset_id: str):
    preset = PRESETS_BY_ID.get(preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail=f"Preset '{preset_id}' not found")
    return preset
