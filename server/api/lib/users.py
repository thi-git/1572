# -*- coding: utf-8 -*-
import datetime
import json
import pandas as pd
from ..models.users import Users
from ..utils.database import db
from flask_jwt_extended import (get_jwt_identity)
from api.utils import responses as resp
from api.utils.responses import response_with


# 取得使用者設定的權限
def get_user_info():
    with db.engine.connect() as connection:
        res = pd.read_sql('users', con=connection)
    return response_with(resp.SUCCESS_200, value={"data": res.to_dict('records')})


# 新增資料權限
def create_user_auth(request):
    data = request.get_json()
    user_name = data.get("user_name")
    selected_auth = data.get("selected_auth")

    # 建立新的分類資料
    new_data = Users(user_name=user_name, selected_auth=selected_auth)

    # 寫入資料庫
    db.session.add(new_data)
    db.session.commit()

    return response_with(resp.SUCCESS_200, value={"data": "成功新增"})


# 更新資料權限
def update_user_auth(request):
    data = request.get_json()
    user_name = data.get("user_name")

    # 查找該筆資料
    selected_user = db.session.get(Users, user_name)
    if not selected_user:
        return response_with(resp.SERVER_ERROR_404, value={"data": "該帳號不存在"})

    # 更新資料內容
    selected_user.selected_auth = data.get("selected_auth", selected_user.selected_auth)
    db.session.commit()

    return response_with(resp.SUCCESS_200, value={"data": "成功更新"})


# 刪除資料權限
def delete_user_auth(request):
    data = request.get_json()
    user_name = data.get("user_name")

    # 查找該筆資料
    selected_user = db.session.get(Users, user_name)
    if not selected_user:
        return response_with(resp.SERVER_ERROR_404, value={"data": "該帳號不存在"})

    # 確保user屬於當前session
    selected_user = db.session.merge(selected_user)

    # 刪除該筆資料
    db.session.delete(selected_user)
    db.session.commit()

    return response_with(resp.SUCCESS_200, value={"data": "成功刪除"})
