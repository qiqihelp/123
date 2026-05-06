#!/usr/bin/env python3
"""
MCP Server for Video Subtitle Generation.

Uses OpenAI Whisper to transcribe video audio and generate SRT/VTT subtitle files.
"""

import json
import os
import subprocess
import tempfile
from datetime import timedelta
from enum import Enum
from pathlib import Path
from typing import Optional, List

from mcp.server.fastmcp import FastMCP, Context
from pydantic import BaseModel, Field, ConfigDict, field_validator

mcp = FastMCP(
    "subtitle_mcp",
    dependencies=["whisper", "ffmpeg-python"],
)

OUTPUT_DIR = os.path.join(tempfile.gettempdir(), "subtitle_mcp_output")
os.makedirs(OUTPUT_DIR, exist_ok=True)


class SubtitleFormat(str, Enum):
    SRT = "srt"
    VTT = "vtt"


class WhisperModel(str, Enum):
    TINY = "tiny"
    BASE = "base"
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"


class ExtractAudioInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, validate_assignment=True, extra="forbid")

    video_path: str = Field(
        ...,
        description="Absolute path to the video file (e.g., '/home/user/video.mp4')",
        min_length=1,
    )
    output_name: Optional[str] = Field(
        default=None,
        description="Output audio filename without extension (defaults to video filename)",
    )

    @field_validator("video_path")
    @classmethod
    def validate_video_path(cls, v: str) -> str:
        v = v.strip()
        if not os.path.isfile(v):
            raise ValueError(f"Video file not found: {v}")
        return v


class GenerateSubtitleInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, validate_assignment=True, extra="forbid")

    audio_path: str = Field(
        ...,
        description="Absolute path to the audio file (WAV/MP3/M4A, or video file with audio track)",
        min_length=1,
    )
    language: Optional[str] = Field(
        default=None,
        description="Language code for transcription (e.g., 'zh', 'en', 'ja'). Auto-detected if not specified.",
        min_length=2,
        max_length=5,
    )
    model_name: WhisperModel = Field(
        default=WhisperModel.BASE,
        description="Whisper model size: tiny (fastest), base, small, medium, large (most accurate)",
    )
    subtitle_format: SubtitleFormat = Field(
        default=SubtitleFormat.SRT,
        description="Output subtitle format: 'srt' or 'vtt'",
    )
    output_name: Optional[str] = Field(
        default=None,
        description="Output subtitle filename without extension (defaults to audio filename)",
    )

    @field_validator("audio_path")
    @classmethod
    def validate_audio_path(cls, v: str) -> str:
        v = v.strip()
        if not os.path.isfile(v):
            raise ValueError(f"Audio file not found: {v}")
        return v


class ReadSubtitleInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, validate_assignment=True, extra="forbid")

    subtitle_path: str = Field(
        ...,
        description="Absolute path to the subtitle file to read",
        min_length=1,
    )

    @field_validator("subtitle_path")
    @classmethod
    def validate_subtitle_path(cls, v: str) -> str:
        v = v.strip()
        if not os.path.isfile(v):
            raise ValueError(f"Subtitle file not found: {v}")
        return v


def _format_timestamp_srt(seconds: float) -> str:
    td = timedelta(seconds=seconds)
    total_seconds = int(td.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def _format_timestamp_vtt(seconds: float) -> str:
    td = timedelta(seconds=seconds)
    total_seconds = int(td.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


def _segments_to_srt(segments: list) -> str:
    lines = []
    for i, seg in enumerate(segments, 1):
        start = _format_timestamp_srt(seg["start"])
        end = _format_timestamp_srt(seg["end"])
        text = seg["text"].strip()
        lines.append(f"{i}")
        lines.append(f"{start} --> {end}")
        lines.append(text)
        lines.append("")
    return "\n".join(lines)


def _segments_to_vtt(segments: list) -> str:
    lines = ["WEBVTT", ""]
    for seg in segments:
        start = _format_timestamp_vtt(seg["start"])
        end = _format_timestamp_vtt(seg["end"])
        text = seg["text"].strip()
        lines.append(f"{start} --> {end}")
        lines.append(text)
        lines.append("")
    return "\n".join(lines)


def _get_output_path(name: Optional[str], source_path: str, ext: str) -> str:
    if name:
        safe_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in name)
    else:
        safe_name = Path(source_path).stem
    return os.path.join(OUTPUT_DIR, f"{safe_name}.{ext}")


@mcp.tool(
    name="subtitle_extract_audio",
    annotations={
        "title": "Extract Audio from Video",
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    },
)
async def subtitle_extract_audio(params: ExtractAudioInput, ctx: Context) -> str:
    """Extract audio track from a video file and save as WAV.

    Uses ffmpeg to extract the audio stream from a video file, converting it
    to 16kHz mono WAV format suitable for Whisper transcription.

    Args:
        params: Validated input containing video_path and optional output_name.

    Returns:
        JSON string with the output audio file path and file size.
    """
    await ctx.report_progress(0, "Starting audio extraction...")

    output_path = _get_output_path(params.output_name, params.video_path, "wav")

    try:
        cmd = [
            "ffmpeg", "-i", params.video_path,
            "-vn", "-acodec", "pcm_s16le",
            "-ar", "16000", "-ac", "1",
            "-y", output_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            return json.dumps({
                "success": False,
                "error": f"ffmpeg failed: {result.stderr[-500:]}",
            })

        file_size = os.path.getsize(output_path)
        await ctx.report_progress(1, "Audio extraction complete")

        return json.dumps({
            "success": True,
            "audio_path": output_path,
            "file_size_mb": round(file_size / 1024 / 1024, 2),
        })
    except FileNotFoundError:
        return json.dumps({
            "success": False,
            "error": "ffmpeg not found. Please install ffmpeg: apt install ffmpeg",
        })
    except subprocess.TimeoutExpired:
        return json.dumps({
            "success": False,
            "error": "Audio extraction timed out (5 min limit). The video may be too long.",
        })
    except Exception as e:
        return json.dumps({"success": False, "error": f"Unexpected error: {type(e).__name__}: {e}"})


@mcp.tool(
    name="subtitle_generate",
    annotations={
        "title": "Generate Subtitles from Audio/Video",
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": False,
    },
)
async def subtitle_generate(params: GenerateSubtitleInput, ctx: Context) -> str:
    """Generate subtitle file from audio or video using OpenAI Whisper.

    Transcribes the audio using the specified Whisper model and outputs
    a subtitle file in SRT or VTT format. Supports auto language detection
    or manual language specification.

    Args:
        params: Validated input containing audio_path, model, format, and language settings.

    Returns:
        JSON string with the output subtitle path, detected language, segment count,
        and duration info.
    """
    await ctx.report_progress(0, "Loading Whisper model...")

    try:
        import whisper
    except ImportError:
        return json.dumps({
            "success": False,
            "error": "whisper not installed. Run: pip install openai-whisper",
        })

    try:
        model = whisper.load_model(params.model_name.value)
        await ctx.report_progress(0.2, f"Model '{params.model_name.value}' loaded, starting transcription...")

        transcribe_opts = {}
        if params.language:
            transcribe_opts["language"] = params.language

        result = model.transcribe(params.audio_path, **transcribe_opts)
        await ctx.report_progress(0.8, "Transcription complete, generating subtitle file...")

        segments = result.get("segments", [])
        detected_lang = result.get("language", "unknown")

        if params.subtitle_format == SubtitleFormat.VTT:
            content = _segments_to_vtt(segments)
        else:
            content = _segments_to_srt(segments)

        output_path = _get_output_path(params.output_name, params.audio_path, params.subtitle_format.value)

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)

        duration = segments[-1]["end"] if segments else 0

        await ctx.report_progress(1, "Subtitle file generated")

        return json.dumps({
            "success": True,
            "subtitle_path": output_path,
            "format": params.subtitle_format.value,
            "detected_language": detected_lang,
            "segment_count": len(segments),
            "duration_seconds": round(duration, 1),
        })
    except Exception as e:
        return json.dumps({"success": False, "error": f"Transcription error: {type(e).__name__}: {e}"})


@mcp.tool(
    name="subtitle_list",
    annotations={
        "title": "List Generated Subtitles",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    },
)
async def subtitle_list() -> str:
    """List all previously generated subtitle and audio files.

    Returns:
        JSON string with lists of subtitle files and audio files in the output directory.
    """
    subtitle_files = []
    audio_files = []

    for f in sorted(Path(OUTPUT_DIR).iterdir()):
        stat = f.stat()
        info = {
            "name": f.name,
            "path": str(f),
            "size_kb": round(stat.st_size / 1024, 1),
            "modified": stat.st_mtime,
        }
        if f.suffix in (".srt", ".vtt"):
            subtitle_files.append(info)
        elif f.suffix == ".wav":
            audio_files.append(info)

    return json.dumps({
        "output_dir": OUTPUT_DIR,
        "subtitle_files": subtitle_files,
        "audio_files": audio_files,
    })


@mcp.tool(
    name="subtitle_read",
    annotations={
        "title": "Read Subtitle File Content",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    },
)
async def subtitle_read(params: ReadSubtitleInput) -> str:
    """Read and return the content of a subtitle file.

    Args:
        params: Validated input containing the subtitle file path.

    Returns:
        The full text content of the subtitle file.
    """
    try:
        with open(params.subtitle_path, "r", encoding="utf-8") as f:
            content = f.read()
        return content
    except Exception as e:
        return f"Error reading file: {type(e).__name__}: {e}"


if __name__ == "__main__":
    mcp.run()
