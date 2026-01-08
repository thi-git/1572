from ..utils.database import db


# 所有範例檔
class Sample_file(db.Model):
    __tablename__ = 'sample_file'
    id = db.Column(db.Integer, primary_key=True, comment='ID')
    name = db.Column(db.String(100), comment='範例檔名稱')
    data_type = db.Column(db.String(100), comment='資料類型')
    intersection_type = db.Column(db.String(100), comment='路口類型')
    file_path = db.Column(db.String(100), comment='檔案路徑')
    img_path = db.Column(db.String(100), comment='圖檔路徑')
    status = db.Column(db.String(100), default='active', comment='狀態')
    time = db.Column(db.DateTime, default=db.func.now(), comment='建立時間')
    version = db.Column(db.String(30), comment='版本號')

