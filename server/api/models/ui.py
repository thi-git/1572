# -*- coding: utf-8 -*-
from datetime import datetime
from ..utils.database import db


class Ui_record(db.Model):
    __tablename__ = 'ui_record'
    user_id = db.Column(db.String(100), primary_key=True, comment='使用者ID')
    user_name = db.Column(db.String(100), comment='使用者name')
    page_configs = db.Column(db.Text, comment='UI元件設定')
    update_time = db.Column(db.DateTime, default=datetime.utcnow, comment='資料更新時間')


