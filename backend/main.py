import base64
import sys
from threading import Lock, Thread

import cv2
import zerorpc

from enhancer import Enhancer


class FantasticFilterPRC(object):
    def __init__(self):
        self.enhancer = None
        self.model_has_set = False
        self.origin = ""
        self.enhanced = ""
        self.enhanced_base64 = ""
        self._processing = False
        self.lock = Lock()
        self.size = (0, 0)

    def save_image(self, filename):
        img = cv2.cvtColor(self.enhanced, cv2.COLOR_RGB2BGR)
        try:
            cv2.imwrite(filename, img)
            return True
        except Exception as e:
            return False

    def set_image(self, image_path):
        image_path = image_path[0]
        img = cv2.imread(image_path)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        h, w, _ = img.shape
        self.size = (h, w)
        self.origin = img
        return True

    def resize(self, size):
        self.size = tuple(map(lambda x: int(float(x)), str(size).split(",")))
        return True

    def load_model(self, model_path):
        if self.enhancer is not None:
            self.enhancer.close()
        self.enhancer = Enhancer()
        try:
            self.enhancer.load_model(model_path)
            self.model_has_set = True
            return True
        except Exception as e:
            print("ERROR", e)
            return False

    def enhance(self, _):
        if not self.model_has_set:
            return False

        if self.origin is None:
            return False
        if self._processing:
            return "processing"

        self._processing = True

        def job():
            img = cv2.resize(self.origin, dsize=self.size)
            self.enhanced = self.enhancer.sample(img)
            img = cv2.cvtColor(self.enhanced, cv2.COLOR_RGB2BGR)
            _, buffer = cv2.imencode('.jpg', img)
            pic_str = base64.b64encode(buffer).decode()
            self.enhanced_base64 = pic_str
            with self.lock:
                self._processing = False
            print("Image has been enhanced!")

        Thread(target=job).start()
        return True

    def get_enhanced_image(self, _):
        if self._processing:
            return False
        else:
            return self.enhanced_base64


port = 9999
if len(sys.argv) > 1:
    port = int(sys.argv[1])

s = zerorpc.Server(FantasticFilterPRC())
s.bind(f"tcp://127.0.0.1:{port}")
s.run()
