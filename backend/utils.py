import numpy as np
import cv2


def cv_imread(file):
    cv_img = cv2.imdecode(np.fromfile(file, dtype=np.uint8), -1)
    # cv_img = cv2.cvtColor(cv_img, cv2.COLOR_RGB2BGR)
    return cv_img


def cv_imwrite(file, img):
    return cv2.imencode('.jpg', img)[1].tofile(file)
