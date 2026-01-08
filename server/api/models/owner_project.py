from ..utils.database import db


# 業主名稱&專案編號
class Owner_project(db.Model):
    __tablename__ = 'owner_project'
    id = db.Column(db.Integer, primary_key=True, comment='ID')
    owner_name = db.Column(db.String(100), comment='業主名稱')
    project_num = db.Column(db.String(100), comment='專案編號')
    update_time = db.Column(db.DateTime, comment='資料更新時間')
    last_editor = db.Column(db.String(100), comment='最後編輯人員')


