# -*- coding: utf-8 -*-
from datetime import datetime
from ..utils.database import db


class Users(db.Model):
    __tablename__ = 'users'
    user_name = db.Column(db.String(100), primary_key=True, comment='帳號名稱')
    selected_auth = db.Column(db.JSON, comment='權限設定')

