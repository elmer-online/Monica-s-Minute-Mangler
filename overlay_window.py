import sys
from PySide6.QtWidgets import QWidget, QApplication
from PySide6.QtCore import Qt, QPoint, Signal, QPropertyAnimation, QEasingCurve, QTimer
from PySide6.QtGui import QPainter, QPen, QColor, QFont, QPainterPath

class OverlayWindow(QWidget):
    released = Signal(int) # pixels pulled

    def __init__(self, main_window):
        super().__init__()
        self.main_window = main_window
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.WindowTransparentForInput)
        self.setAttribute(Qt.WA_TranslucentBackground)
        
        # We start with TransparentForInput so it doesn't block clicks when not active.
        # But during drag, we will REMOVE TransparentForInput to capture mouse move/release.
        
        self.pull_active = False
        self.start_pos = QPoint(0, 0)
        self.current_pos = QPoint(0, 0)
        self.snap_pos = QPoint(0, 0)
        
        self.alert_opacity = 0.0
        self.snap_progress = 0.0

    def start_pull(self, start_pos):
        self.pull_active = True
        self.start_pos = start_pos
        self.current_pos = start_pos
        
        # Show and make it capture input
        self.setWindowFlags(self.windowFlags() & ~Qt.WindowTransparentForInput)
        self.setGeometry(QApplication.primaryScreen().geometry())
        self.show()
        self.update()

    def mouseMoveEvent(self, event):
        if self.pull_active:
            self.current_pos = event.globalPosition().toPoint()
            self.update()

    def mouseReleaseEvent(self, event):
        if self.pull_active:
            self.pull_active = False
            
            # Use converted coordinates for distance calculation
            anchor = self.main_window.handle.mapToGlobal(QPoint(20, 20))
            dx = self.current_pos.x() - anchor.x()
            dy = self.current_pos.y() - anchor.y()
            distance = int((dx**2 + dy**2)**0.5)
            
            self.released.emit(distance)
            
            # Start snap back animation with elastic bounce
            self.snap_pos = self.current_pos
            self.snap_anim = QPropertyAnimation(self, b"snap_progress_prop")
            self.snap_anim.setDuration(600)
            self.snap_anim.setStartValue(1.0)
            self.snap_anim.setEndValue(0.0)
            self.snap_anim.setEasingCurve(QEasingCurve.OutElastic)
            self.snap_anim.finished.connect(self.hide_overlay)
            self.snap_anim.start()

    def hide_overlay(self):
        if not self.pull_active and self.alert_opacity == 0:
            self.setWindowFlags(self.windowFlags() | Qt.WindowTransparentForInput)
            self.hide()
            # Notify main window to show its handle again
            self.main_window.snap_back()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        # 1. Pulse Alert
        if self.alert_opacity > 0:
            color = QColor(255, 255, 200, int(self.alert_opacity * 255))
            painter.fillRect(self.rect(), color)

        # 2. The String
        anchor = self.main_window.handle.mapToGlobal(QPoint(25, 25))
        
        if self.pull_active or self.snap_progress > 0:
            # Warm pink string
            pen = QPen(QColor(255, 150, 180), 3)
            painter.setPen(pen)
            
            draw_pos = self.current_pos if self.pull_active else \
                       anchor + (self.snap_pos - anchor) * self.snap_progress
            
            painter.drawLine(anchor, draw_pos)
            
            # Draw heart at end of string
            self.draw_heart(painter, draw_pos)
            
            if self.pull_active:
                # Draw current time mapping
                distance = int(((self.current_pos.x() - anchor.x())**2 + (self.current_pos.y() - anchor.y())**2)**0.5)
                minutes = distance // 20
                painter.setPen(QColor(255, 255, 255))
                painter.setFont(QFont("Arial", 14, QFont.Bold))
                painter.drawText(self.current_pos + QPoint(25, 0), f"{minutes} min")

    def draw_heart(self, painter, center):
        """Draw a heart shape at the given center point."""
        path = QPainterPath()
        x, y = center.x() - 15, center.y() - 12
        path.moveTo(x + 15, y + 28)
        path.cubicTo(x + 15, y + 28, x, y + 18, x, y + 10)
        path.cubicTo(x, y + 4, x + 5, y, x + 10, y)
        path.cubicTo(x + 13, y, x + 15, y + 3, x + 15, y + 3)
        path.cubicTo(x + 15, y + 3, x + 17, y, x + 20, y)
        path.cubicTo(x + 25, y, x + 30, y + 4, x + 30, y + 10)
        path.cubicTo(x + 30, y + 18, x + 15, y + 28, x + 15, y + 28)
        
        painter.setBrush(QColor(255, 107, 138))  # Warm pink
        painter.setPen(Qt.NoPen)
        painter.drawPath(path)

    def trigger_alert(self):
        self.show()
        self.setGeometry(QApplication.primaryScreen().geometry())
        
        # Pulse animation: 0 -> 0.3 -> 0 over 1.5s
        self.anim = QPropertyAnimation(self, b"alert_opacity_prop")
        self.anim.setDuration(1500)
        self.anim.setStartValue(0.0)
        self.anim.setKeyValueAt(0.5, 0.3)
        self.anim.setEndValue(0.0)
        self.anim.setEasingCurve(QEasingCurve.InOutQuad)
        self.anim.finished.connect(self.hide_overlay)
        self.anim.start()

    # Property for animation
    def get_alert_opacity(self):
        return self.alert_opacity
    def set_alert_opacity(self, val):
        self.alert_opacity = val
        self.update()
    
    alert_opacity_prop = property(get_alert_opacity, set_alert_opacity)

    # Property for snap animation
    def get_snap_progress(self):
        return self.snap_progress
    def set_snap_progress(self, val):
        self.snap_progress = val
        self.update()
    
    snap_progress_prop = property(get_snap_progress, set_snap_progress)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    # Mock main window for testing
    class MockMain:
        class Handle:
            def mapToGlobal(self, p): return p
        handle = Handle()
    
    m = MockMain()
    w = OverlayWindow(m)
    w.show()
    w.trigger_alert()
    sys.exit(app.exec())
