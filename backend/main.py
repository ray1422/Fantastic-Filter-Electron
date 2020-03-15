from warnings import simplefilter

import numpy as np

simplefilter(action='ignore', category=FutureWarning)

import base64
import sys
from threading import Lock, Thread

import cv2
import zerorpc

from enhancer import Enhancer
from utils import cv_imread, cv_imwrite


class FantasticFilterPRC(object):
    def __init__(self):
        self.enhancer = None
        self.model_has_set = False
        self.origin = ""
        self.enhanced = ""
        self.enhanced_base64 = ""
        self.enhance_failed = False
        self._processing = False
        self.lock = Lock()
        self.size = (0, 0)

    def stop_server(self, _):
        if self.enhancer is not None:
            self.enhancer.close()
        sys.exit(0)

    @staticmethod
    def loaded(_):
        return True

    def save_image(self, filename):
        img = cv2.cvtColor(self.enhanced, cv2.COLOR_RGB2BGR)
        try:
            cv_imwrite(filename, img)
            return True
        except Exception as e:
            return False

    def set_image(self, image_path):
        if isinstance(image_path, list):
            image_path = str(image_path[0])
        img = cv_imread(image_path)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        h, w, _ = img.shape
        self.size = (w, h)
        self.origin = img
        return True

    def set_image_base64(self, encoded):
        buffer = base64.b64decode(encoded)
        np_arr = np.fromstring(buffer, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        h, w, _ = img.shape
        self.size = (w, h)
        self.origin = img

    def resize(self, size):
        self.size = tuple(map(lambda x: int(float(x)), str(size).split(",")))
        return True

    def load_model(self, model_path):
        if isinstance(model_path, list):
            model_path = str(model_path[0])

        def job():
            with self.lock:
                self._processing = True

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
            finally:
                with self.lock:
                    self._processing = False

        Thread(target=job).start()
        return True

    def is_model_loaded(self, _):
        if self._processing:
            return "processing"

        return self.model_has_set

    def enhance(self, _):
        if not self.model_has_set:
            return False

        if self.origin is None:
            return False
        if self._processing:
            return "processing"

        def job():
            try:
                with self.lock:
                    self._processing = True
                    self.enhance_failed = False

                img = cv2.resize(self.origin, dsize=self.size)
                self.enhanced = self.enhancer.sample(img)
                img = cv2.cvtColor(self.enhanced, cv2.COLOR_RGB2BGR)
                _, buffer = cv2.imencode('.jpg', img)
                pic_str = base64.b64encode(buffer).decode()
                self.enhanced_base64 = pic_str
                print("Image has been enhanced!")
            except Exception as e:
                self.enhance_failed = True
                return e
            finally:
                with self.lock:
                    self._processing = False

        Thread(target=job).start()
        return True

    def get_enhanced_image(self, _):
        if self._processing:
            return False
        elif self.enhance_failed:
            return 'failed'
        else:
            return self.enhanced_base64


port = 9999
if len(sys.argv) > 1:
    port = int(sys.argv[1])

s = zerorpc.Server(FantasticFilterPRC())
s.bind(f"tcp://127.0.0.1:{port}")
s.run()
