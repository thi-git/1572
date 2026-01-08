from ..utils.database import db
from sqlalchemy import Text


# 路口編輯資料
class Road_turning_static(db.Model):
    __tablename__ = 'road_turning_static'
    tc_id = db.Column(db.String(50), primary_key=True, comment='路口編碼')
    svg_detail = db.Column(Text, comment='轉向量圖資料')
    road_param = db.Column(Text, comment='路口參數')
    road_section = db.Column(Text, comment='路段')


# 道路建議容量
class Road_volume_static(db.Model):
    __tablename__ = 'road_volume_static'
    road_type = db.Column(db.String(10), primary_key=True, comment='路口編碼')
    is_separate = db.Column(db.Boolean, primary_key=True, comment='分隔')
    lane_num = db.Column(db.Integer, primary_key=True, comment='車道數')
    ref_volume = db.Column(db.Integer, primary_key=True, comment='推薦容量')
