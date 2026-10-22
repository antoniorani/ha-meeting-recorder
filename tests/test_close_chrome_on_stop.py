"""Regression tests for opt-in browser closure, using the dependency-free recorder API."""

import json
import runpy
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest.mock import Mock, patch


API_PATH = (
    Path(__file__).resolve().parents[1]
    / "meeting-recorder/rootfs/usr/local/bin/meeting-recorder-api"
)
Recorder = runpy.run_path(str(API_PATH), run_name="meeting_recorder_close_test")["Recorder"]


class ChromeClosureTests(unittest.TestCase):
    def setUp(self):
        self.recorder = Recorder.__new__(Recorder)
        recorder = self.recorder
        recorder.lock = threading.RLock()
        recorder.ffmpeg = Mock()
        recorder.ffmpeg.poll.return_value = None
        recorder.watcher_stop = Mock()
        recorder._stop_ffmpeg = Mock(side_effect=lambda: setattr(recorder, "ffmpeg", None))
        recorder._teardown_graph = Mock()
        recorder._finalize = Mock(return_value={"state": "completed", "audio_path": "/tmp/audio.mp3"})
        recorder._write_json = Mock()
        recorder._metadata = Mock(return_value={"state": "error"})
        recorder._persist_current_state = Mock()
        recorder.status = Mock(return_value={"recording": False})
        recorder.close_chrome_on_stop = False
        recorder.scheduled_start_at = None
        recorder.scheduled_start_epoch = None
        recorder.scheduled_end_at = None
        recorder.scheduled_end_epoch = None
        recorder.last_completed = None
        recorder.last_error = None
        recorder.started_monotonic = 0

    def test_opt_in_closes_chrome_only_after_finalization_and_resets(self):
        self.recorder.close_chrome_on_stop = True

        def close_chrome():
            self.recorder._finalize.assert_called_once()
            return {"found": 1, "terminated": 1, "killed": 0}

        chrome = Mock(side_effect=close_chrome)
        with patch.dict(Recorder.stop.__globals__, {"terminate_chrome": chrome}):
            self.recorder.stop()
            self.recorder.stop()  # Subsequent idle stop must not close Chrome again.

        chrome.assert_called_once_with()
        self.assertFalse(self.recorder.close_chrome_on_stop)
        self.assertFalse(self.recorder.last_completed["close_chrome_on_stop"])
        self.recorder._write_json.assert_called_once()

    def test_default_keeps_chrome_open(self):
        chrome = Mock()
        with patch.dict(Recorder.stop.__globals__, {"terminate_chrome": chrome}):
            self.recorder.stop()

        chrome.assert_not_called()

    def test_failed_finalization_never_closes_chrome(self):
        self.recorder.close_chrome_on_stop = True
        self.recorder._finalize.side_effect = RuntimeError("MP3 validation failed")
        chrome = Mock()
        with patch.dict(Recorder.stop.__globals__, {"terminate_chrome": chrome}):
            with self.assertRaisesRegex(RuntimeError, "MP3 validation failed"):
                self.recorder.stop()

        chrome.assert_not_called()
        self.assertFalse(self.recorder.close_chrome_on_stop)
        self.recorder._write_json.assert_called_once()

    def test_chrome_error_does_not_invalidate_completed_recording(self):
        self.recorder.close_chrome_on_stop = True
        chrome = Mock(side_effect=OSError("permission denied"))
        with patch.dict(Recorder.stop.__globals__, {"terminate_chrome": chrome}):
            self.recorder.stop()

        self.assertEqual(self.recorder.last_completed["state"], "completed")
        self.assertIn("permission denied", self.recorder.last_error)
        self.assertFalse(self.recorder.close_chrome_on_stop)

    def test_schedule_option_is_optional_validated_and_persisted(self):
        self.recorder.ffmpeg = None
        self.recorder.set_schedule(None, None, True)
        self.assertTrue(self.recorder.close_chrome_on_stop)
        self.recorder.set_schedule(None, None)  # Legacy clients preserve the option.
        self.assertTrue(self.recorder.close_chrome_on_stop)
        with self.assertRaisesRegex(ValueError, "must be a boolean"):
            self.recorder.set_schedule(None, None, "true")
        self.recorder.set_schedule(None, None, False)
        self.assertFalse(self.recorder.close_chrome_on_stop)
        self.assertEqual(self.recorder._persist_current_state.call_count, 3)

    def test_restore_only_pending_option_not_interrupted_or_completed(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "state.json"
            with patch.dict(Recorder._restore_state.__globals__, {"STATE_FILE": path}):
                for state, expected in (("ready", True), ("recording", False), ("completed", False)):
                    with self.subTest(state=state):
                        path.write_text(
                            json.dumps({"state": state, "close_chrome_on_stop": True}),
                            encoding="utf-8",
                        )
                        recorder = Recorder.__new__(Recorder)
                        recorder.close_chrome_on_stop = False
                        recorder._write_json = Mock()
                        recorder._restore_state()
                        self.assertIs(recorder.close_chrome_on_stop, expected)

    def test_expired_schedule_does_not_arm_future_closure(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "state.json"
            path.write_text(
                json.dumps({
                    "state": "ready",
                    "scheduled_end_at": "2000-01-01T00:00:00+00:00",
                    "close_chrome_on_stop": True,
                }),
                encoding="utf-8",
            )
            with patch.dict(Recorder._restore_state.__globals__, {"STATE_FILE": path}):
                recorder = Recorder.__new__(Recorder)
                recorder.close_chrome_on_stop = False
                recorder._write_json = Mock()
                recorder._restore_state()
                self.assertFalse(recorder.close_chrome_on_stop)
                self.assertFalse(recorder._write_json.call_args.args[1]["close_chrome_on_stop"])

    def test_scheduled_end_uses_same_closure_path(self):
        self.recorder.close_chrome_on_stop = True
        self.recorder.scheduled_end_epoch = time.time() - 1

        class SingleTick:
            def __init__(self):
                self.calls = 0

            def wait(self, _timeout):
                self.calls += 1
                return self.calls > 1

        self.recorder.scheduler_stop = SingleTick()
        chrome = Mock(return_value={"found": 1, "terminated": 1, "killed": 0})
        with patch.dict(Recorder.stop.__globals__, {"terminate_chrome": chrome}):
            self.recorder._scheduler_loop()

        chrome.assert_called_once_with()
        self.assertFalse(self.recorder.close_chrome_on_stop)


if __name__ == "__main__":
    unittest.main()
