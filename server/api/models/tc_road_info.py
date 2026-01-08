from ..utils.database import db


# TC靜態資料
class TC_road_info(db.Model):
    __tablename__ = 'tc_road_info'
    tc_id = db.Column(db.String(50), primary_key=True, comment='TC編號')
    road = db.Column(db.String(100), comment='路口名稱')
    district = db.Column(db.String(100), comment='行政區')
    lat = db.Column(db.Float, comment='緯度')
    lng = db.Column(db.Float, comment='經度')
    city = db.Column(db.String(20), comment='縣市')
    update_time = db.Column(db.DateTime, comment='資料更新時間')
    last_editor = db.Column(db.String(100), comment='最後編輯人員')

