# -*- coding: utf-8 -*-
from flask import Blueprint, request
from ..lib import road_turning_static
from flask_jwt_extended import jwt_required

road_turning_routes = Blueprint("road_turning_routes", __name__)


# 更新路口定義(轉向)&參數設定&路段繪製資料
@road_turning_routes.route('/update', methods=['POST'])
@jwt_required()
def insert_data():
    res = road_turning_static.create_turning_static(request)
    return res


# 取得路口定義(轉向)&參數設定&路段繪製資料
@road_turning_routes.route('/search/<string:type>/<string:tc_id>', methods=['GET'])
@jwt_required()
def get_info(type, tc_id):
    res = road_turning_static.get_turning_data(type, tc_id)
    return res


# 取得資料分析檢視頁面資料
@road_turning_routes.route('/statistics', methods=['POST'])
@jwt_required()
def get_statistics_data():
    res = road_turning_static.get_statistics_data(request)
    return res


# 取得所有TC狀態資料
@road_turning_routes.route('/status', methods=['GET'])
@jwt_required()
def get_all_tc_turning_status():
    res = road_turning_static.get_all_tc_turning_status()
    return res


# 取得建議容量(參數設定頁面)
@road_turning_routes.route('/get_ref_volume', methods=['POST'])
@jwt_required()
def get_ref_volume():
    res = road_turning_static.get_ref_volume(request)
    return res


# 取得編輯狀態(路口定義/參數設定/路段繪製)
@road_turning_routes.route('/get_turning_status', methods=['POST'])
@jwt_required()
def get_turning_status():
    res = road_turning_static.get_turning_status(request)
    return res

