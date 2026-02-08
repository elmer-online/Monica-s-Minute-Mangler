import sys
import platform
from PySide6.QtWidgets import QApplication
from PySide6.QtCore import QTimer
from PySide6.QtGui import QIcon

from main_window import MainWindow
from overlay_window import OverlayWindow
from timer_logic import TimerLogic

class MinuteManglerApp:
    def __init__(self):
        self.app = QApplication(sys.argv)
        self.app.setApplicationName("Monica's Minute Mangler")
        
        icon_path = "/Users/elmer/.gemini/antigravity/brain/3d3e6261-5e80-4133-93d2-c13d32fdab1b/app_icon_heart_clock_1770549402847.png"
        self.app.setWindowIcon(QIcon(icon_path))

        self.main_window = MainWindow()
        self.overlay_window = OverlayWindow(self.main_window)
        self.timer_logic = TimerLogic()
        
        self.setup_connections()

        self.countdown_timer = QTimer()
        self.countdown_timer.timeout.connect(self.update_timer_display)
        self.countdown_timer.start(100)

        self.main_window.show()

    def setup_connections(self):
        self.main_window.timer_entry.returnPressed.connect(self.on_manual_entry)
        self.main_window.pause_btn.clicked.connect(self.toggle_pause)
        self.main_window.start_stop_btn.clicked.connect(self.on_start_stop)
        self.main_window.heart.clicked.connect(self.add_five_minutes)

    def parse_time_entry(self):
        """Parse the timer entry and return seconds."""
        text = self.main_window.timer_entry.text()
        try:
            if ":" in text:
                parts = text.split(":")
                m = int(parts[0]) if parts[0] else 0
                s = int(parts[1]) if parts[1] else 0
                return m * 60 + s
            else:
                val = int(text) if text else 0
                return val * 60
        except ValueError:
            return 0

    def on_manual_entry(self):
        seconds = self.parse_time_entry()
        if seconds > 0:
            self.start_timer(seconds)
        elif seconds == 0:
            # Start with 5 minutes if empty
            self.start_timer(5 * 60)

    def on_start_stop(self):
        """Handle Start/Stop button click."""
        if self.timer_logic.is_running:
            # Stop
            self.stop_timer()
        else:
            # Start
            seconds = self.parse_time_entry()
            if seconds == 0:
                seconds = 5 * 60  # Default 5 minutes
            self.start_timer(seconds)

    def add_five_minutes(self):
        """Add 5 minutes to the timer."""
        if self.timer_logic.is_running:
            # Add to existing timer
            current = self.timer_logic.get_remaining_seconds()
            self.timer_logic.add_seconds(5 * 60)
        else:
            # Parse current display and add 5 minutes
            current = self.parse_time_entry()
            new_time = current + 5 * 60
            mins, secs = divmod(new_time, 60)
            self.main_window.timer_entry.setText(f"{mins:02d}:{secs:02d}")

    def start_timer(self, seconds):
        self.timer_logic.start_timer(seconds)
        self.main_window.set_timer_active(True)

    def toggle_pause(self):
        if self.timer_logic.is_paused:
            self.timer_logic.resume_timer()
            self.main_window.pause_btn.setText("Pause")
        else:
            self.timer_logic.pause_timer()
            self.main_window.pause_btn.setText("Resume")

    def stop_timer(self):
        self.timer_logic.stop_timer()
        self.main_window.set_timer_active(False)
        self.main_window.timer_entry.setText("00:00")

    def update_timer_display(self):
        if not self.timer_logic.is_running:
            return
            
        remaining = self.timer_logic.get_remaining_seconds()
        
        if remaining > 0:
            mins, secs = divmod(remaining, 60)
            self.main_window.timer_entry.setText(f"{mins:02d}:{secs:02d}")
        else:
            # Timer finished
            self.stop_timer()
            self.trigger_alert()

    def trigger_alert(self):
        self.overlay_window.trigger_alert()
        self.play_sound()

    def play_sound(self):
        if platform.system() == "Darwin":
            import subprocess
            subprocess.run(["afplay", "/System/Library/Sounds/Glass.aiff"])
        elif platform.system() == "Windows":
            try:
                import winsound
                winsound.PlaySound("SystemAsterisk", winsound.SND_ALIAS)
            except ImportError:
                pass

    def run(self):
        sys.exit(self.app.exec())

if __name__ == "__main__":
    MinuteManglerApp().run()
