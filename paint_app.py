from kivy.app import App
from kivy.uix.image import Image
from kivy.uix.floatlayout import FloatLayout
from kivy.uix.label import Label
from kivy.graphics.texture import Texture
from kivy.core.window import Window
from kivy.clock import Clock
import cv2
import numpy as np
import os
import random

# --- CẤU HÌNH ---
# Người vẽ nét nhỏ (crayon effect tự động rải hạt nên không cần to)
BRUSH_SIZE_DISPLAY = 1     # Nét hiển thị mỏng (radius 1px)
BRUSH_SIZE_AI = 5          # Nét AI vừa phải (khớp với training data)
GAME_DURATION = 25

# --- ĐƯỜNG DẪN MODEL (Dùng ONNX) ---
current_dir = os.path.dirname(os.path.abspath(__file__))
MODEL_FILENAME = 'game_model_160.onnx' 
MODEL_PATH = os.path.join(current_dir, MODEL_FILENAME)

# --- DANH SÁCH 20 CLASS (Phải khớp thứ tự lúc train PyTorch) ---
CLASS_NAMES = [
    "airplane", "alarm clock", "ambulance", "angel", "ant",
    "backpack", "basket", "bee", "bicycle", "binoculars",
    "brain", "bulldozer", "bus", "butterfly", "cactus",
    "calculator", "camera", "campfire", "castle", "chandelier"
]

# Bản dịch tiếng Việt
CLASS_NAMES_VI = {
    "airplane": "Máy bay",
    "alarm clock": "Đồng hồ báo thức", 
    "ambulance": "Xe cứu thương",
    "angel": "Thiên thần",
    "ant": "Con kiến",
    "backpack": "Ba lô",
    "basket": "Giỏ",
    "bee": "Con ong",
    "bicycle": "Xe đạp",
    "binoculars": "Ống nhòm",
    "brain": "Bộ não",
    "bulldozer": "Xe ủi",
    "bus": "Xe buýt",
    "butterfly": "Bướm",
    "cactus": "Xương rồng",
    "calculator": "Máy tính",
    "camera": "Máy ảnh",
    "campfire": "Lửa trại",
    "castle": "Lâu đài",
    "chandelier": "Đèn chùm"
}

# Giả lập màn hình điện thoại trên PC
Window.size = (540, 960)
Window.clearcolor = (1, 1, 1, 1) # Nền trắng

class PaintWidget(Image):
    def __init__(self, label_ref, ai_preview_ref, start_button_ref=None, **kwargs):
        super(PaintWidget, self).__init__(allow_stretch=True, keep_ratio=False, **kwargs)
        self.label_ref = label_ref 
        self.ai_preview_ref = ai_preview_ref
        self.start_button_ref = start_button_ref  # Tham chieu den nut Start
        
        # Canvas xử lý ngầm (400x400 là đủ)
        self.img_h = 400 
        self.img_w = 400
        
        # Game State
        self.target_word = ""
        self.time_left = 0
        self.is_game_active = False
        self.game_event = None
        
        # --- LOAD MODEL BẰNG OPENCV (Không cần TensorFlow) ---
        self.net = None
        if os.path.exists(MODEL_PATH):
            try:
                # Đây là hàm thần thánh đọc ONNX
                self.net = cv2.dnn.readNetFromONNX(MODEL_PATH)
                print(f"✅ ĐÃ LOAD ONNX: {MODEL_FILENAME}")
                
                # Chuyển sang backend tối ưu (Nếu máy có hỗ trợ)
                self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
                self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
            except Exception as e:
                print(f"❌ Lỗi Load ONNX: {e}")
                self.label_ref.text = f"Lỗi Model: {e}"
        else:
            print(f"❌ Không tìm thấy file: {MODEL_PATH}")

        # 1. Canvas Hiển thị (Nền Trắng - Nét Đen)
        self.canvas_display = np.ones((self.img_h, self.img_w, 3), dtype='uint8') * 255
        
        # 2. Canvas AI (Nền Đen - Nét Trắng -> Chuẩn MNIST/QuickDraw)
        self.canvas_ai = np.zeros((self.img_h, self.img_w), dtype='uint8') 

        self.last_x, self.last_y = None, None
        
        self.texture = Texture.create(size=(self.img_w, self.img_h), colorfmt='bgr')
        self.texture.flip_vertical()
        
        # KHONG tu dong bat dau game nua, doi nguoi choi nhan nut
        self.is_game_active = False
        self.update_ui_label("Nhấn nút BẮT ĐẦU để chơi!")

    def start_new_game(self, dt=None):
        self.canvas_display[:] = 255 # Xóa trắng
        self.canvas_ai[:] = 0        # Xóa đen
        self.update_texture()
        
        self.target_word = random.choice(CLASS_NAMES)
        self.time_left = GAME_DURATION
        self.is_game_active = True
        
        if self.game_event: self.game_event.cancel()
        self.game_event = Clock.schedule_interval(self.update_timer, 1.0)
        
        self.update_ui_label("Sẵn sàng...")

    def update_timer(self, dt):
        if not self.is_game_active: return
        self.time_left -= 1
        self.update_ui_label("AI đang nhìn...")
        if self.time_left <= 0:
            self.game_over(win=False)

    def game_over(self, win):
        self.is_game_active = False
        if self.game_event: self.game_event.cancel()
        # Hiển thị cả tiếng Anh và tiếng Việt
        vietnamese_name = CLASS_NAMES_VI.get(self.target_word, self.target_word)
        if win:
            self.update_ui_label(f"🎉 WIN! Correctly drew: [b]{self.target_word}[/b] ({vietnamese_name})")
        else:
            self.update_ui_label(f"Time's up! You needed to draw: [b]{self.target_word}[/b] ({vietnamese_name})")
        
        # Hien lai nut Start thay vi tu dong choi tiep
        if self.start_button_ref:
            Clock.schedule_once(lambda dt: self.show_start_button(), 2)
    
    def show_start_button(self):
        """Hien thi lai nut Start"""
        if self.start_button_ref:
            self.start_button_ref.opacity = 1
            self.start_button_ref.disabled = False
            self.update_ui_label("Nhấn BẮT ĐẦU để chơi tiếp!")

    def update_ui_label(self, status):
        color = "000000" if self.time_left > 10 else "FF0000"
        vietnamese_name = CLASS_NAMES_VI.get(self.target_word, self.target_word)
        self.label_ref.text = (
            f"Draw: [b]{self.target_word.upper()}[/b] ({vietnamese_name})  |  [color={color}]⏳ {self.time_left}s[/color]\n"
            f"{status}"
        )

    def update_texture(self):
        self.texture.blit_buffer(self.canvas_display.tobytes(), colorfmt='bgr', bufferfmt='ubyte')
        self.canvas.ask_update()

    # --- LOGIC DỰ ĐOÁN (OPENCV DNN) ---
    def predict_image(self):
        if self.net is None or not self.is_game_active: return

        # 1. TIM BOUNDING BOX (Vung ve)
        coords = cv2.findNonZero(self.canvas_ai)
        if coords is None:
            # Hien thi man hinh den neu chua ve
            self.update_ai_preview(np.zeros((28,28), dtype=np.uint8))
            return

        x, y, w, h = cv2.boundingRect(coords)
        
        # 2. Cat vung ve ra (ROI)
        roi = self.canvas_ai[y:y+h, x:x+w]
        
        # 3. Resize ve 160x160 nhung GIU TU LE (Smart Padding)
        # Tao khung den vuong 160x160
        target_size = 160
        img_final = np.zeros((target_size, target_size), dtype=np.uint8)
        
        # Tinh toan resize sao cho canh lon nhat bang 130px (de lai vien ~15px moi ben)
        # Nhu vay hinh se luon nam trong khung, khong bi mat net
        safe_size = 130
        h_roi, w_roi = roi.shape
        scale = safe_size / max(h_roi, w_roi)
        
        new_w = int(w_roi * scale)
        new_h = int(h_roi * scale)
        
        if new_w > 0 and new_h > 0:
            resized_roi = cv2.resize(roi, (new_w, new_h), interpolation=cv2.INTER_AREA)
            
            # Dat vao giua khung 128x128
            x_off = (target_size - new_w) // 2
            y_off = (target_size - new_h) // 2
            
            # Fix loi kich thuoc lech 1px do lam tron
            final_h, final_w = resized_roi.shape
            img_final[y_off:y_off+final_h, x_off:x_off+final_w] = resized_roi

        img_resized = img_final

        # [NEW] CAP NHAT GIAO DIEN MAT THAN TRONG GAME
        self.update_ai_preview(img_resized)

        # Chuyen grayscale thanh RGB (3 channel) de model MobileNet doc duoc
        img_rgb = cv2.cvtColor(img_resized, cv2.COLOR_GRAY2RGB)

        # 5. Tạo Blob & Inference (Size 160x160)
        blob = cv2.dnn.blobFromImage(img_rgb, scalefactor=1/255.0, size=(160, 160), mean=(0,0,0), swapRB=False, crop=False)
        self.net.setInput(blob)
        preds = self.net.forward() 

        # 6. Tính Softmax
        flatten_preds = preds[0]
        max_val = np.max(flatten_preds)
        exp_preds = np.exp(flatten_preds - max_val)
        softmax_probs = exp_preds / np.sum(exp_preds)

        # 7. Ket qua
        idx = np.argmax(softmax_probs)
        conf = softmax_probs[idx]
        
        if idx < len(CLASS_NAMES):
            label = CLASS_NAMES[idx]
            
            # Dieu kien thang: Phai tu tin > 40% moi duoc
            if label == self.target_word and conf > 0.12:
                self.game_over(win=True)
            else:
                vietnamese_name = CLASS_NAMES_VI.get(label, label)
                self.update_ui_label(f"AI đoán: [b]{label}[/b] ({vietnamese_name}) - {conf*100:.0f}%")

    def update_ai_preview(self, img_np):
        # Phong to anh len de de nhin (Pixel Art)
        img_display = cv2.resize(img_np, (140, 140), interpolation=cv2.INTER_NEAREST)
        
        # Chuyen sang mau xanh Matrix cho ngau (hoac giu trang den)
        # O day ta chuyen sang RGB de Kivy hien thi
        img_color = cv2.cvtColor(img_display, cv2.COLOR_GRAY2RGB)
        
        # Tao vien xanh bao quanh
        cv2.rectangle(img_color, (0,0), (139,139), (0, 255, 0), 2)
        
        # Flip de khop voi Kivy texture
        img_color = cv2.flip(img_color, 0)
        
        # Update texture cho widget
        buf = img_color.tobytes()
        texture = Texture.create(size=(140, 140), colorfmt='rgb')
        texture.blit_buffer(buf, colorfmt='rgb', bufferfmt='ubyte')
        self.ai_preview_ref.texture = texture


    def on_touch_down(self, touch):
        # Chi ve khi game dang chay
        if not self.is_game_active:
            return super().on_touch_down(touch)
        
        # Tinh toa do tren canvas
        x = int(touch.x / self.width * self.img_w)
        y = int((self.height - touch.y) / self.height * self.img_h)
        
        # Dam bao toa do trong bounds
        x = max(0, min(x, self.img_w - 1))
        y = max(0, min(y, self.img_h - 1))
        
        # Luu vi tri bat dau
        self.last_x, self.last_y = x, y
        
        # Ve diem dau tien
        import colorsys
        hue = random.random()
        r, g, b = colorsys.hsv_to_rgb(hue, 1, 1)
        color = (int(b*255), int(g*255), int(r*255))
        
        cv2.circle(self.canvas_display, (x, y), BRUSH_SIZE_DISPLAY, color, -1)
        cv2.circle(self.canvas_ai, (x, y), BRUSH_SIZE_AI, (255), -1)
        
        self.update_texture()
        return True

    def on_touch_move(self, touch):
        # Chi ve khi game dang chay
        if not self.is_game_active:
            return super().on_touch_move(touch)
        
        # Tinh toa do hien tai
        x = int(touch.x / self.width * self.img_w)
        y = int((self.height - touch.y) / self.height * self.img_h)
        
        # Dam bao toa do trong bounds
        x = max(0, min(x, self.img_w - 1))
        y = max(0, min(y, self.img_h - 1))
        
        # Chi ve neu co last position
        if self.last_x is None or self.last_y is None:
            self.last_x, self.last_y = x, y
            return True
        
        # Hieu ung crayon cho canvas hien thi
        import colorsys
        hue = (x % 400) / 400.0
        r, g, b = colorsys.hsv_to_rgb(hue, 1, 1)
        color = (int(b*255), int(g*255), int(r*255))
        
        # Tinh khoang cach
        dist = int(np.hypot(x - self.last_x, y - self.last_y))
        
        if dist > 0:
            # Ve crayon effect (rai hat)
            for i in range(max(1, dist)):
                alpha = i / max(dist, 1)
                curr_x = int(self.last_x * (1 - alpha) + x * alpha)
                curr_y = int(self.last_y * (1 - alpha) + y * alpha)
                
                # Rai hat mau
                for _ in range(8):
                    spread = BRUSH_SIZE_DISPLAY + 2
                    off_x = random.randint(-spread, spread)
                    off_y = random.randint(-spread, spread)
                    px = curr_x + off_x
                    py = curr_y + off_y
                    if 0 <= px < self.img_w and 0 <= py < self.img_h:
                        cv2.circle(self.canvas_display, (px, py), 0, color, -1)
            
            # Ve net thang cho AI canvas
            cv2.line(self.canvas_ai, (self.last_x, self.last_y), (x, y), (255), BRUSH_SIZE_AI)
        
        # Cap nhat vi tri
        self.last_x, self.last_y = x, y
        
        # Cap nhat hien thi va predict
        self.update_texture()
        self.predict_image()
        
        return True

    def on_touch_up(self, touch):
        # Chi xu ly khi game dang chay
        if not self.is_game_active:
            return super().on_touch_up(touch)
        
        # Reset vi tri
        self.last_x, self.last_y = None, None
        
        # Predict lan cuoi
        self.predict_image()
        
        return True

class KivyAIApp(App):
    def build(self):
        layout = FloatLayout()
        
        self.result_label = Label(
            text="Loading...", 
            font_size='20sp', 
            color=(0, 0, 0, 1), 
            markup=True,
            halign='left',
            valign='top',
            pos_hint={'x': 0.02, 'top': 0.92}, 
            size_hint=(0.7, None),
            text_size=(None, None)
        )
        # Bind texture_size de Label tu dong dieu chinh kich thuoc
        self.result_label.bind(texture_size=self.result_label.setter('size'))
        
        # WIDGET Hien thi Mat than AI (Goc tren ben phai)
        self.ai_preview = Image(
            pos_hint={'right': 0.98, 'top': 0.98},
            size_hint=(None, None),
            size=(140, 140),
            allow_stretch=True,
            keep_ratio=True
        )

        # NUT BAT DAU GAME
        from kivy.uix.button import Button
        self.start_button = Button(
            text='BẮT ĐẦU',
            font_size='32sp',
            size_hint=(0.5, 0.1),
            pos_hint={'center_x': 0.5, 'y': 0.05},
            background_color=(0.2, 0.8, 0.3, 1),
            color=(1, 1, 1, 1),
            bold=True
        )
        self.start_button.bind(on_press=self.on_start_button_click)
        
        self.painter = PaintWidget(
            label_ref=self.result_label, 
            ai_preview_ref=self.ai_preview,
            start_button_ref=self.start_button  # Truyen tham chieu nut vao
        )
        
        layout.add_widget(self.painter)
        layout.add_widget(self.result_label)
        layout.add_widget(self.ai_preview)
        layout.add_widget(self.start_button)  # Them nut bat dau
        return layout
    
    def on_start_button_click(self, instance):
        """Xu ly khi nhan nut Start"""
        self.start_button.opacity = 0  # An nut di
        self.start_button.disabled = True
        self.painter.start_new_game(0)  # Bat dau game moi

if __name__ == '__main__':
    KivyAIApp().run()