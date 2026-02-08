import time

class TimerLogic:
    def __init__(self, mapping_factor=20):
        self.mapping_factor = mapping_factor # pixels per minute
        self.current_seconds = 0
        self.initial_seconds = 0
        self.is_running = False
        self.is_paused = False
        self.start_time = 0

    def calculate_time_from_distance(self, pixels):
        """Formula: T=pixels/20 (e.g., pulling 300 pixels = 15 minutes)"""
        minutes = pixels / self.mapping_factor
        return int(minutes * 60) # returns seconds

    def start_timer(self, seconds):
        if seconds <= 0: return
        self.initial_seconds = seconds
        self.current_seconds = seconds
        self.is_running = True
        self.is_paused = False
        self.start_time = time.time()

    def pause_timer(self):
        if self.is_running and not self.is_paused:
            self.current_seconds = self.get_remaining_seconds()
            self.is_paused = True
            return True
        return False

    def resume_timer(self):
        if self.is_running and self.is_paused:
            self.start_time = time.time()
            self.is_paused = False
            return True
        return False

    def get_remaining_seconds(self):
        if not self.is_running:
            return 0
        if self.is_paused:
            return self.current_seconds
        
        elapsed = time.time() - self.start_time
        remaining = self.current_seconds - elapsed
        if remaining <= 0:
            self.is_running = False
            return 0
        return int(remaining)

    def get_progress(self):
        """Returns 1.0 at start, 0.0 at end"""
        if not self.is_running or self.initial_seconds == 0:
            return 0.0
        rem = self.get_remaining_seconds()
        return rem / self.initial_seconds

    def stop_timer(self):
        self.is_running = False
        self.is_paused = False
        self.current_seconds = 0
        self.initial_seconds = 0

    def add_seconds(self, seconds):
        """Add seconds to the running timer."""
        if self.is_running:
            if self.is_paused:
                self.current_seconds += seconds
            else:
                self.current_seconds += seconds
            self.initial_seconds += seconds
