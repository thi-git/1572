import os

class Config(object):
    DEBUG = True
    TESTING = False
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = "postgresql://root:thi168168@220.130.185.38:25432/1572"
    AUTH_API = "http://localhost:8081"
    SQLALCHEMY_ECHO = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        'pool_timeout': 900,
        'pool_size': 50,
        'max_overflow': 10,
    }
    
    # 獲取當前配置文件所在目錄的絕對路徑
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    # 使用絕對路徑
    STATIC_FOLDER = os.path.join(BASE_DIR, 'res')
    UPLOAD_FOLDER = os.path.join(STATIC_FOLDER, 'upload_record')
    EXPORT_FOLDER = os.path.join(STATIC_FOLDER, 'export')