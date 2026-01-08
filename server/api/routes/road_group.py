# -*- coding: utf-8 -*-
from flask import Blueprint, request
from ..lib import road_group
from flask_jwt_extended import jwt_required

road_group_routes = Blueprint("road_group", __name__)


# 新增道路群組
@road_group_routes.route('/update', methods=['POST'])
@jwt_required()
def insert_data():
    res = road_group.create_group(request)
    return res


# 取得所有道路群組(用於路口維護頁面的群組列表)
@road_group_routes.route('/all', methods=['POST'])
@jwt_required()
def get_all_data():
    res = road_group.get_all_group_name(request)
    return res


# 取得所有道路群組(用於tc-select filter的道路群組資訊)
@road_group_routes.route('/group_data', methods=['GET'])
@jwt_required()
def get_road_group_data():
    res = road_group.get_road_group_data()
    return res
