# -*- coding: utf-8 -*-
from flask import Blueprint
from flask import request
from ..lib import users
from ..utils import responses as resp
from ..utils.responses import response_with
from ..utils.database import db
from flask_jwt_extended import (jwt_required)

users_routes = Blueprint("users_routes", __name__)


# 取得使用者設定的權限
@users_routes.route('/get_user_info', methods=['GET'])
@jwt_required()
def get_user_info():
    res = users.get_user_info()
    return res


# 新增使用者時設定資料權限
@users_routes.route('/create_user_auth', methods=['POST'])
@jwt_required()
def create_user_auth():
    res = users.create_user_auth(request)
    return res


# 更新資料權限
@users_routes.route('/update_user_auth', methods=['POST'])
@jwt_required()
def update_user_auth():
    res = users.update_user_auth(request)
    return res


# 刪除資料權限
@users_routes.route('/delete_user_auth', methods=['POST'])
@jwt_required()
def delete_user_auth():
    res = users.delete_user_auth(request)
    return res

