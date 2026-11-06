"""Tests for the read-only recordings API (Python standard library only)."""
import importlib.machinery
import importlib.util
import json
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import urlopen


API_PATH = Path(__file__).resolve().parents[1] / "rootfs/usr/local/bin/meeting-recorder-api"
loader = importlib.machinery.SourceFileLoader("meeting_recorder_api", str(API_PATH))
spec = importlib.util.spec_from_loader(loader.name, loader)
api = importlib.util.module_from_spec(spec)
# Recorder initializes its scheduler during import; tests need no background loop.
with patch.object(threading.Thread, "start"):
    loader.exec_module(api)


class RecordingApiTests(unittest.TestCase):
    def setUp(self):
        self.storage = tempfile.TemporaryDirectory()
        self.addCleanup(self.storage.cleanup)
        self.root = Path(self.storage.name)
        self.original_root = api.MEDIA_ROOT
        api.MEDIA_ROOT = self.root
        self.addCleanup(setattr, api, "MEDIA_ROOT", self.original_root)

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), api.Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.stop_server)
        self.base_url = "http://127.0.0.1:" + str(self.server.server_port)

    def stop_server(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=3)

    def session(self, name, audio=None):
        folder = self.root / name
        folder.mkdir()
        if audio is not None:
            (folder / "audio.mp3").write_bytes(audio)
        return folder

    def request(self, path):
        with urlopen(self.base_url + path, timeout=5) as response:
            return response.status, response.headers, response.read()

    def expect_404(self, path):
        with self.assertRaises(HTTPError) as error:
            self.request(path)
        self.assertEqual(error.exception.code, 404)

    def test_empty_history(self):
        status, headers, body = self.request("/recordings")
        self.assertEqual(status, 200)
        self.assertEqual(headers.get_content_type(), "application/json")
        self.assertEqual(json.loads(body), {"recordings": []})

    def test_sorted_history_and_incomplete_sessions(self):
        self.session("2026-09-01_100000_abcdef12", b"valid-audio")
        self.session("2026-10-04_180000_1234abcd")
        self.session("2026-10-05_180000_deadbeef", b"")

        _, _, body = self.request("/recordings")
        sessions = json.loads(body)["recordings"]
        self.assertEqual(
            [s["id"] for s in sessions],
            [
                "2026-10-05_180000_deadbeef",
                "2026-10-04_180000_1234abcd",
                "2026-09-01_100000_abcdef12",
            ],
        )
        self.assertEqual([s["audio_available"] for s in sessions], [False, False, True])
        self.assertEqual(sessions[-1]["size_bytes"], len(b"valid-audio"))
        self.assertTrue(sessions[-1]["started_at"].endswith("Z"))

    def test_ignore_unrelated_directories_and_symlinks(self):
        self.session("not-a-recorder-folder", b"audio")
        target = self.session("2026-10-01_120000_abcdef12", b"audio")
        (self.root / "2026-10-02_120000_abcdef12").symlink_to(target, target_is_directory=True)
        _, _, body = self.request("/recordings")
        self.assertEqual(
            [item["id"] for item in json.loads(body)["recordings"]],
            [target.name],
        )

    def test_download_is_streamed_as_an_attachment(self):
        name = "2026-10-01_120000_abcdef12"
        self.session(name, b"test-mp3-bytes")
        status, headers, body = self.request("/recordings/" + name + "/audio.mp3")
        self.assertEqual(status, 200)
        self.assertEqual(body, b"test-mp3-bytes")
        self.assertEqual(headers["Content-Type"], "audio/mpeg")
        self.assertEqual(headers["Content-Length"], str(len(body)))
        self.assertEqual(headers["Content-Disposition"], f'attachment; filename="{name}.mp3"')
        self.assertIn("no-store", headers["Cache-Control"])

    def test_rejects_missing_empty_and_unpublished_audio(self):
        ready = "2026-10-01_120000_abcdef12"
        empty = "2026-10-01_120001_abcdef12"
        self.session(ready)
        self.session(empty, b"")
        self.expect_404("/recordings/" + ready + "/audio.mp3")
        self.expect_404("/recordings/" + empty + "/audio.mp3")
        self.expect_404("/recordings/" + ready + "/audio.mp3.tmp")

    def test_rejects_path_traversal_and_unrelated_files(self):
        name = "2026-10-01_120000_abcdef12"
        folder = self.session(name, b"audio")
        (folder / "ffmpeg.log").write_text("secret", encoding="utf-8")
        self.expect_404("/recordings/../" + name + "/audio.mp3")
        self.expect_404("/recordings/%2e%2e/" + name + "/audio.mp3")
        self.expect_404("/recordings/" + name + "/ffmpeg.log")
        self.expect_404("/recordings/" + name + "/segments/segment_00000.ogg")

    def test_symlinked_audio_cannot_be_downloaded(self):
        name = "2026-10-01_120000_abcdef12"
        folder = self.session(name)
        external = self.root / "outside.mp3"
        external.write_bytes(b"secret")
        (folder / "audio.mp3").symlink_to(external)
        self.expect_404("/recordings/" + name + "/audio.mp3")
        _, _, body = self.request("/recordings")
        self.assertFalse(json.loads(body)["recordings"][0]["audio_available"])


if __name__ == "__main__":
    unittest.main()
