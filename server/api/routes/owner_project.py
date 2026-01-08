# -*- coding: utf-8 -*-
import os
from flask import Blueprint, request
from ..lib import owner_project
from flask_jwt_extended import jwt_required

owner_project_routes = Blueprint("owner_project_routes", __name__)


# 取得業主名稱(全部)
@owner_project_routes.route('/get_all_owner', methods=['GET'])
@jwt_required()
def get_all_owner():
    res = owner_project.get_all_owner()
    return res


# 取得業主名稱(上傳)
@owner_project_routes.route('/get_all_upload_owner', methods=['GET'])
@jwt_required()
def get_all_upload_owner():
    res = owner_project.get_all_upload_owner()
    return res


# 取得專案編號(全部)
@owner_project_routes.route('/get_all_project', methods=['POST'])
@jwt_required()
def get_all_project():
    res = owner_project.get_all_project(request)
    return res


# 取得專案編號(上傳)
@owner_project_routes.route('/get_all_upload_project', methods=['GET'])
@jwt_required()
def get_all_upload_project():
    res = owner_project.get_all_upload_project()
    return res


# 取得使用者篩選的業主名稱&專案編號
@owner_project_routes.route('/owner_project_selected_data', methods=['POST'])
@jwt_required()
def owner_project_selected_data():
    res = owner_project.owner_project_selected_data(request)
    return res


# 新增業主名稱與專案
@owner_project_routes.route('/create_owner_project', methods=['POST'])
@jwt_required()
def create_owner_project():
    res = owner_project.create_owner_project(request)
    return res


# 刪除業主名稱與專案
@owner_project_routes.route('/delete_owner_project', methods=['POST'])
@jwt_required()
def delete_owner_project():
    res = owner_project.delete_owner_project(request)
    return res


# 更新業主名稱與專案
@owner_project_routes.route('/update_owner_project', methods=['POST'])
@jwt_required()
def update_owner_project():
    res = owner_project.update_owner_project(request)
    return res


# 確認該值是否已存在
@owner_project_routes.route('/check_duplicate', methods=['POST'])
@jwt_required()
def check_duplicate():
    res = owner_project.check_duplicate(request)
    return res

