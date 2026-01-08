class DevelopmentConfig:
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = "postgresql://root:thi168168@220.130.185.37:5432/1572"  # 請改為自己的SQL
    AUTH_API = "http://localhost:8081"  # keycloak 網址
    SQLALCHEMY_ECHO = True
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        'pool_timeout': 900,
        'pool_size': 50,
        'max_overflow': 10,
    }
    STATIC_FOLDER = 'res'  # 使用相對路徑
    DOWNLOAD_FOLDER = f'{STATIC_FOLDER}/download_temp'  # 存放所有下載模板
    EXPORT_FOLDER = f'{STATIC_FOLDER}/export'  # 存放產生的下載檔
    OLD_FOLDER = f'{STATIC_FOLDER}/old_file'  # 存放待清洗的檔案

