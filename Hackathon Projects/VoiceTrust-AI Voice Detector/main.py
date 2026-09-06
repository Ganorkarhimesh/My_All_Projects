# main.py
# ---------------------------------------------------------
# VoxShield - AI-Powered Real-Time Detection and Prevention
# of Voice Cloning Impersonation Attacks
#
# Smart India Hackathon 2026 | Problem Statement: SIH26104
# ---------------------------------------------------------
#
# High level idea:
# 1. Browser mic -> raw PCM16 audio chunks -> pushed over a
#    websocket to this server ( /stream-audio )
# 2. We buffer the incoming bytes, convert to a float32 numpy
#    array, and run it through librosa to pull out MFCCs and
#    spectral centroid (these are the standard features used
#    in a lot of the ASVspoof / WaveFake anti-spoofing papers
#    we referenced for the research slides).
# 3. Feed the extracted features into a lightweight scoring
#    function that estimates a "spoof confidence" score.
# 4. If confidence crosses our threshold (88%) we log it as
#    SPOOF_DETECTED, otherwise SAFE, and push the result back
#    to the browser + save it in the sqlite db.
#
# NOTE: we are NOT shipping a full trained deep model here
# (that's out of scope for the prototype stage / local demo).
# Instead we use handcrafted DSP-based heuristics on top of the
# same feature set real spoof-detection papers use, so the
# pipeline is realistic and can be swapped with a trained
# classifier later (e.g. an LCNN or RawNet2 checkpoint) without
# touching the streaming/backend architecture at all.

import json
import uuid
import numpy as np
import librosa

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import init_db, get_db, ThreatLog, SessionLocal

app = FastAPI(title="VoxShield Backend - SIH26104")

# allow the html page (served from anywhere / file:// or localhost)
# to talk to this backend without CORS headaches during dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# make sure the sqlite table exists before we start taking traffic
init_db()

# ----------------------------------------------------------------
# config / constants
# ----------------------------------------------------------------

SAMPLE_RATE = 16000          # we downsample everything to 16kHz on the client
SPOOF_THRESHOLD = 88.0       # confidence % above which we flag SPOOF_DETECTED
MIN_SAMPLES_FOR_ANALYSIS = SAMPLE_RATE  # wait for ~1 sec of audio before running librosa

# these ranges came from just eyeballing a bunch of sample clips
# from the ASVspoof 2019 LA subset + a few WaveFake generated clips
# during our research phase. real human speech tends to have more
# "natural" variance in MFCCs frame-to-frame, whereas TTS/vocoder
# generated audio is comparatively smoother / more uniform, and
# spectral centroid tends to sit in a narrower, more "clean" band.
MFCC_VAR_HUMAN_FLOOR = 45.0     # human speech usually varies more than this
CENTROID_SYNTHETIC_BAND = (1500, 2600)  # hz band a lot of vocoder output falls into


def extract_features(audio_float: np.ndarray, sr: int = SAMPLE_RATE):
    """
    Takes a 1D float32 numpy array of audio samples (range -1..1)
    and returns the acoustic features we care about.

    Returns a dict with:
        - centroid_mean : mean spectral centroid (Hz)
        - mfcc_var      : variance of the 13 MFCC coefficients (averaged)
        - mfcc_matrix   : raw mfcc array, in case we want to inspect it later
    """

    # librosa wants float32, and can be picky if the array is silence /
    # all zeros, so we pad it with a tiny bit of noise floor to avoid
    # divide-by-zero warnings in the mel filterbank step
    if np.all(audio_float == 0):
        audio_float = audio_float + 1e-6

    # 13 coefficient MFCC - standard config used across most of the
    # anti-spoofing literature we read (ASVspoof baseline uses this too)
    mfcc = librosa.feature.mfcc(y=audio_float, sr=sr, n_mfcc=13)

    # spectral centroid tells us "where the mass of the spectrum is" -
    # basically a rough proxy for how bright/dull the audio sounds
    centroid = librosa.feature.spectral_centroid(y=audio_float, sr=sr)

    # variance across time axis for each mfcc coeff, then average
    # across coefficients to get one single number for the ledger
    mfcc_variance_per_coeff = np.var(mfcc, axis=1)
    mfcc_var = float(np.mean(mfcc_variance_per_coeff))

    centroid_mean = float(np.mean(centroid))

    return {
        "centroid_mean": centroid_mean,
        "mfcc_var": mfcc_var,
        "mfcc_matrix": mfcc,
    }


def score_spoof_confidence(centroid_mean: float, mfcc_var: float) -> float:
    """
    Very simple heuristic scoring function - NOT a trained ML model.

    We combine two weak "signals":
      1. low mfcc variance -> smoother / more synthetic sounding voice
      2. spectral centroid sitting inside the band we noticed a lot
         of vocoder-generated clips landing in during our dataset study

    Each signal contributes a partial score, and we clip the final
    result to 0-100 so it reads like a confidence percentage on the
    dashboard. This is intentionally simple for the prototype stage -
    the writeup / future scope section of our report covers swapping
    this out for an actual trained classifier (LCNN / RawNet2 etc.)
    trained on ASVspoof + WaveFake.
    """

    score = 0.0

    # signal 1: mfcc variance below the human floor -> smoother speech
    if mfcc_var < MFCC_VAR_HUMAN_FLOOR:
        # the further below the floor, the more suspicious
        deficit = MFCC_VAR_HUMAN_FLOOR - mfcc_var
        score += min(55.0, deficit * 1.4)
    else:
        # still give a small baseline in case centroid signal is strong
        score += 5.0

    # signal 2: centroid falling in the synthetic-ish band
    low, high = CENTROID_SYNTHETIC_BAND
    if low <= centroid_mean <= high:
        score += 40.0
    else:
        score += 8.0

    return float(max(0.0, min(100.0, score)))


def pcm16_bytes_to_float32(raw_bytes: bytes) -> np.ndarray:
    """
    Browser sends 16-bit signed PCM audio. Convert that into the
    -1.0 to 1.0 float32 range librosa expects.
    """
    int16_arr = np.frombuffer(raw_bytes, dtype=np.int16)
    float_arr = int16_arr.astype(np.float32) / 32768.0
    return float_arr


def save_log(db: Session, session_id: str, centroid_mean: float,
             mfcc_var: float, confidence: float, verdict: str) -> ThreatLog:
    entry = ThreatLog(
        session_id=session_id,
        spectral_centroid_mean=centroid_mean,
        mfcc_variance=mfcc_var,
        spoof_confidence=confidence,
        verdict=verdict,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


# ----------------------------------------------------------------
# routes
# ----------------------------------------------------------------

@app.get("/")
def serve_index():
    # just so hitting localhost:8000 directly opens the dashboard
    # instead of showing a blank 404 during the demo
    return FileResponse("index.html")


@app.get("/fetch-telemetry")
def fetch_telemetry(limit: int = 50, db: Session = Depends(get_db)):
    """
    Returns the most recent threat log entries for the history
    ledger on the dashboard. Newest first.
    """
    rows = (
        db.query(ThreatLog)
        .order_by(ThreatLog.id.desc())
        .limit(limit)
        .all()
    )

    # convert to plain dicts so FastAPI can jsonify without issues
    result = []
    for r in rows:
        result.append({
            "id": r.id,
            "session_id": r.session_id,
            "spectral_centroid_mean": round(r.spectral_centroid_mean, 2),
            "mfcc_variance": round(r.mfcc_variance, 2),
            "spoof_confidence": round(r.spoof_confidence, 2),
            "verdict": r.verdict,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    return {"count": len(result), "logs": result}


@app.websocket("/stream-audio")
async def stream_audio(ws: WebSocket):
    """
    Main real-time pipeline. Browser opens this socket once and
    keeps pushing raw PCM16 binary frames down it. We accumulate
    frames into a small rolling buffer, and every time we hit
    ~1 second worth of audio we run the DSP + scoring step and
    send the verdict back down the same socket.
    """
    await ws.accept()

    session_id = str(uuid.uuid4())[:8]  # short id, just for grouping in the ledger
    buffer = np.array([], dtype=np.float32)

    # each websocket connection gets its own db session so we're
    # not sharing one across concurrent connections
    db = SessionLocal()

    print(f"[VoxShield] client connected -> session {session_id}")

    try:
        while True:
            raw_chunk = await ws.receive_bytes()

            # convert this chunk and append to our rolling buffer
            chunk_float = pcm16_bytes_to_float32(raw_chunk)
            buffer = np.concatenate((buffer, chunk_float))

            # wait till we have enough audio to get a meaningful
            # mfcc/centroid reading, otherwise the numbers are too noisy
            if len(buffer) >= MIN_SAMPLES_FOR_ANALYSIS:

                features = extract_features(buffer, sr=SAMPLE_RATE)
                confidence = score_spoof_confidence(
                    features["centroid_mean"], features["mfcc_var"]
                )

                verdict = "SPOOF_DETECTED" if confidence >= SPOOF_THRESHOLD else "SAFE"

                log_entry = save_log(
                    db,
                    session_id,
                    features["centroid_mean"],
                    features["mfcc_var"],
                    confidence,
                    verdict,
                )

                # send result back to the browser as json
                await ws.send_text(json.dumps({
                    "session_id": session_id,
                    "centroid_mean": round(features["centroid_mean"], 2),
                    "mfcc_var": round(features["mfcc_var"], 2),
                    "confidence": round(confidence, 2),
                    "verdict": verdict,
                    "log_id": log_entry.id,
                }))

                # reset buffer for the next window
                # (simple non-overlapping windows for now - could add
                # overlap later for smoother detection if needed)
                buffer = np.array([], dtype=np.float32)

    except WebSocketDisconnect:
        print(f"[VoxShield] session {session_id} disconnected")
    except Exception as e:
        # don't let one bad frame crash the whole socket silently,
        # at least print it so we can debug during the demo
        print(f"[VoxShield] error in session {session_id}: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    # reload=True is handy while we're still building this out
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
