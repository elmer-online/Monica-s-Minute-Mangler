import sys
from PySide6.QtWidgets import QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QCheckBox, QLineEdit, QPushButton, QGraphicsDropShadowEffect
from PySide6.QtCore import Qt, QPoint, QPropertyAnimation, QEasingCurve, QTimer, Property, Signal
from PySide6.QtGui import QPainter, QPen, QColor, QPainterPath, QRadialGradient, QLinearGradient, QBrush, QConicalGradient

class HeartWidget(QWidget):
    """A decorative heart with heartbeat animation. Click to add 5 minutes."""
    clicked = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedSize(80, 70)
        self.setCursor(Qt.PointingHandCursor)
        
        self._scale = 1.0
        self._glow_intensity = 0.0
        
        self.heartbeat_timer = QTimer(self)
        self.heartbeat_timer.timeout.connect(self.do_heartbeat)

    def start_heartbeat(self):
        self.heartbeat_timer.start(5000)
        self.do_heartbeat()

    def stop_heartbeat(self):
        self.heartbeat_timer.stop()
        self._scale = 1.0
        self._glow_intensity = 0.0
        self.update()

    def do_heartbeat(self):
        self.scale_anim = QPropertyAnimation(self, b"scale")
        self.scale_anim.setDuration(400)
        self.scale_anim.setKeyValueAt(0, 1.0)
        self.scale_anim.setKeyValueAt(0.2, 1.20)
        self.scale_anim.setKeyValueAt(0.4, 1.05)
        self.scale_anim.setKeyValueAt(0.6, 1.12)
        self.scale_anim.setKeyValueAt(1.0, 1.0)
        self.scale_anim.setEasingCurve(QEasingCurve.OutQuad)
        self.scale_anim.start()
        
        self.glow_anim = QPropertyAnimation(self, b"glow_intensity")
        self.glow_anim.setDuration(500)
        self.glow_anim.setKeyValueAt(0, 0.0)
        self.glow_anim.setKeyValueAt(0.25, 1.0)
        self.glow_anim.setKeyValueAt(0.5, 0.3)
        self.glow_anim.setKeyValueAt(0.75, 0.6)
        self.glow_anim.setKeyValueAt(1.0, 0.0)
        self.glow_anim.setEasingCurve(QEasingCurve.OutQuad)
        self.glow_anim.start()

    def get_scale(self):
        return self._scale
    def set_scale(self, val):
        self._scale = val
        self.update()
    scale = Property(float, get_scale, set_scale)

    def get_glow_intensity(self):
        return self._glow_intensity
    def set_glow_intensity(self, val):
        self._glow_intensity = val
        self.update()
    glow_intensity = Property(float, get_glow_intensity, set_glow_intensity)

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.clicked.emit()
            # Quick pulse feedback
            self.do_heartbeat()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        center = self.rect().center()
        
        painter.translate(center)
        painter.scale(self._scale, self._scale)
        painter.translate(-center)
        
        # Glow
        if self._glow_intensity > 0:
            glow_radius = 8 + self._glow_intensity * 8
            alpha = int(40 * self._glow_intensity)
            gradient = QRadialGradient(center, glow_radius + 15)
            gradient.setColorAt(0, QColor(255, 140, 170, alpha))
            gradient.setColorAt(1, QColor(255, 140, 170, 0))
            painter.setBrush(gradient)
            painter.setPen(Qt.NoPen)
            painter.drawEllipse(center, int(glow_radius + 15), int(glow_radius + 15))
        
        # Heart
        path = QPainterPath()
        x, y = center.x() - 20, center.y() - 14
        path.moveTo(x + 20, y + 36)
        path.cubicTo(x + 20, y + 36, x, y + 22, x, y + 14)
        path.cubicTo(x, y + 6, x + 7, y, x + 14, y)
        path.cubicTo(x + 18, y, x + 20, y + 4, x + 20, y + 4)
        path.cubicTo(x + 20, y + 4, x + 22, y, x + 26, y)
        path.cubicTo(x + 33, y, x + 40, y + 6, x + 40, y + 14)
        path.cubicTo(x + 40, y + 22, x + 20, y + 36, x + 20, y + 36)
        
        heart_gradient = QLinearGradient(x, y, x + 40, y + 36)
        heart_gradient.setColorAt(0, QColor(255, 145, 175))
        heart_gradient.setColorAt(0.5, QColor(255, 100, 130))
        heart_gradient.setColorAt(1, QColor(220, 80, 110))
        
        painter.setBrush(heart_gradient)
        painter.setPen(Qt.NoPen)
        painter.drawPath(path)
        
        # Highlight
        highlight = QPainterPath()
        highlight.addEllipse(x + 9, y + 7, 10, 7)
        painter.setBrush(QColor(255, 255, 255, 80))
        painter.drawPath(highlight)
        
        painter.end()


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Minute Mangler")
        self.setFixedSize(200, 280)
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint)
        self.setAttribute(Qt.WA_TranslucentBackground)

        self.dragging_window = False
        self.drag_start_pos = QPoint()
        self.timer_running = False
        
        self._edge_phase = 0.0
        self.edge_timer = QTimer(self)
        self.edge_timer.timeout.connect(self.animate_edge)
        self.edge_timer.start(50)

        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
        
        self.layout = QVBoxLayout(self.central_widget)
        self.layout.setContentsMargins(16, 18, 16, 14)
        self.layout.setSpacing(10)

        self.central_widget.setObjectName("mainWidget")
        
        shadow = QGraphicsDropShadowEffect()
        shadow.setBlurRadius(30)
        shadow.setColor(QColor(0, 0, 0, 50))
        shadow.setOffset(0, 10)
        self.central_widget.setGraphicsEffect(shadow)

        # 1. HEART (Top) - click to add 5 min
        self.heart = HeartWidget()
        self.layout.addWidget(self.heart, 0, Qt.AlignCenter)

        # 2. TIMER DISPLAY
        self.timer_entry = QLineEdit("00:00")
        self.timer_entry.setAlignment(Qt.AlignCenter)
        self.timer_entry.setStyleSheet("""
            QLineEdit {
                background: transparent;
                border: none;
                color: rgba(90, 70, 80, 240);
                font-size: 38px;
                font-weight: 600;
                font-family: 'SF Pro Display', 'Helvetica Neue', sans-serif;
            }
        """)
        self.layout.addWidget(self.timer_entry, 0, Qt.AlignCenter)

        # 3. BUTTONS
        self.controls_layout = QHBoxLayout()
        self.controls_layout.setSpacing(12)
        
        self.pause_btn = QPushButton("Pause")
        self.start_stop_btn = QPushButton("Start")  # Renamed from stop_btn
        
        button_style = """
            QPushButton {
                background-color: rgba(255, 130, 160, 50);
                color: rgba(160, 70, 90, 230);
                border-radius: 14px;
                padding: 10px 0px;
                font-size: 13px;
                font-weight: 600;
                border: 1px solid rgba(255, 130, 160, 80);
                min-width: 75px;
            }
            QPushButton:hover {
                background-color: rgba(255, 130, 160, 90);
            }
            QPushButton:pressed {
                background-color: rgba(255, 110, 140, 110);
            }
            QPushButton:disabled {
                background-color: rgba(200, 180, 190, 40);
                color: rgba(150, 130, 140, 150);
                border: 1px solid rgba(200, 180, 190, 60);
            }
        """
        self.pause_btn.setStyleSheet(button_style)
        self.start_stop_btn.setStyleSheet(button_style)
        self.controls_layout.addWidget(self.pause_btn)
        self.controls_layout.addWidget(self.start_stop_btn)
        
        self.controls_widget = QWidget()
        self.controls_widget.setLayout(self.controls_layout)
        self.layout.addWidget(self.controls_widget, 0, Qt.AlignCenter)
        
        self.pause_btn.setEnabled(False)

        self.layout.addStretch(1)

        # 4. ALWAYS ON TOP
        self.ontop_cb = QCheckBox("Always on Top")
        self.ontop_cb.setChecked(True)
        self.ontop_cb.setStyleSheet("""
            QCheckBox {
                color: rgba(130, 110, 120, 180);
                font-size: 10px;
            }
            QCheckBox::indicator {
                width: 14px;
                height: 14px;
                border-radius: 4px;
                border: 1px solid rgba(180, 160, 170, 100);
                background: rgba(255, 255, 255, 120);
            }
            QCheckBox::indicator:checked {
                background: rgba(255, 130, 160, 180);
                border: 1px solid rgba(255, 110, 140, 180);
            }
        """)
        self.ontop_cb.stateChanged.connect(self.toggle_on_top)
        self.layout.addWidget(self.ontop_cb, 0, Qt.AlignCenter)

    def animate_edge(self):
        self._edge_phase += 0.012
        if self._edge_phase > 1.0:
            self._edge_phase = 0.0
        self.update()

    def paintEvent(self, event):
        painter = QPainter(self)
        if not painter.isActive():
            return
        painter.setRenderHint(QPainter.Antialiasing)
        
        rect = self.rect().adjusted(4, 4, -4, -4)
        path = QPainterPath()
        path.addRoundedRect(rect.x(), rect.y(), rect.width(), rect.height(), 28, 28)
        
        center = rect.center()
        edge_gradient = QConicalGradient(center, self._edge_phase * 360)
        edge_gradient.setColorAt(0.0, QColor(255, 255, 255, 55))
        edge_gradient.setColorAt(0.25, QColor(255, 195, 210, 70))
        edge_gradient.setColorAt(0.5, QColor(255, 255, 255, 45))
        edge_gradient.setColorAt(0.75, QColor(255, 190, 205, 65))
        edge_gradient.setColorAt(1.0, QColor(255, 255, 255, 55))
        
        painter.setPen(QPen(QBrush(edge_gradient), 5))
        painter.drawPath(path)
        
        glass = QRadialGradient(center.x(), rect.y() + 40, rect.height())
        glass.setColorAt(0, QColor(255, 252, 250, 245))
        glass.setColorAt(0.4, QColor(255, 250, 248, 238))
        glass.setColorAt(1, QColor(250, 245, 242, 228))
        
        painter.setPen(Qt.NoPen)
        painter.setBrush(glass)
        painter.drawPath(path)
        
        hl = QLinearGradient(rect.x(), rect.y(), rect.x(), rect.y() + 60)
        hl.setColorAt(0, QColor(255, 255, 255, 70))
        hl.setColorAt(1, QColor(255, 255, 255, 0))
        hl_path = QPainterPath()
        hl_path.addRoundedRect(rect.x() + 10, rect.y() + 5, rect.width() - 20, 50, 18, 18)
        painter.setBrush(hl)
        painter.drawPath(hl_path)
        
        painter.end()

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.dragging_window = True
            self.drag_start_pos = event.globalPosition().toPoint() - self.frameGeometry().topLeft()

    def mouseMoveEvent(self, event):
        if self.dragging_window:
            self.move(event.globalPosition().toPoint() - self.drag_start_pos)

    def mouseReleaseEvent(self, event):
        self.dragging_window = False

    def toggle_on_top(self, state):
        if state == Qt.Checked:
            self.setWindowFlags(self.windowFlags() | Qt.WindowStaysOnTopHint)
        else:
            self.setWindowFlags(self.windowFlags() & ~Qt.WindowStaysOnTopHint)
        self.show()

    def set_timer_active(self, active):
        self.timer_running = active
        if active:
            self.pause_btn.setEnabled(True)
            self.start_stop_btn.setText("Stop")
            self.timer_entry.setReadOnly(True)
            self.heart.start_heartbeat()
        else:
            self.pause_btn.setEnabled(False)
            self.pause_btn.setText("Pause")
            self.start_stop_btn.setText("Start")
            self.timer_entry.setReadOnly(False)
            self.heart.stop_heartbeat()


if __name__ == "__main__":
    from PySide6.QtWidgets import QApplication
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())
