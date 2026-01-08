from ..utils.database import db


# 道路群組
class Road_group(db.Model):
    __tablename__ = 'road_group'
    id = db.Column(db.Integer, primary_key=True, comment='ID')
    name = db.Column(db.String(100), nullable=False, comment='群組名稱')
    city = db.Column(db.String(100), nullable=False, comment='所屬縣市')
    active = db.Column(db.Boolean, server_default='true', comment='是否可用')

