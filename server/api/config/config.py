import os


class Config(object):
    DEBUG = True
    TESTING = False
    SQLALCHEMY_TRACK_MODIFICATIONS = False


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = "postgresql://root:thi168168@220.130.185.37:5432/1572"  # 請改為自己的SQL
    AUTH_API = "http://localhost:8081"  # keycloak 網址
    SQLALCHEMY_ECHO = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        'pool_timeout': 900,
        'pool_size': 50,
        'max_overflow': 10,
    }
    STATIC_FOLDER = 'res'  # 使用相對路徑
    UPLOAD_FOLDER = f'{STATIC_FOLDER}/upload_record'
    EXPORT_FOLDER = f'{STATIC_FOLDER}/export'

