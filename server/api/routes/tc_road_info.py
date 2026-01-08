# -*- coding: utf-8 -*-
import os
from flask import Blueprint, request
from ..lib import tc_road_info
from flask_jwt_extended import jwt_required

tc_road_routes = Blueprint("tc_road_routes", __name__)


# 取得TC路口資料(全部)
@tc_road_routes.route('/get_all_info', methods=['POST'])
@jwt_required()
def get_all_info():
    res = tc_road_info.get_all_info(request)
    return res


# 取得TC路口資料(上傳)
@tc_road_routes.route('/get_uploaded_info', methods=['POST'])
@jwt_required()
def get_uploaded_info():
    res = tc_road_info.get_uploaded_info(request)
    return res


# 取得縣市(全部) => 本來寫在前端
@tc_road_routes.route('/get_all_city', methods=['POST'])
@jwt_required()
def get_all_city():
    res = tc_road_info.get_all_city(request)
    return res


# 取得行政區(全部)
@tc_road_routes.route('/get_all_district', methods=['POST'])
@jwt_required()
def get_all_district():
    res = tc_road_info.get_all_district(request)
    return res


# 取得使用者篩選的TC路口資料
@tc_road_routes.route('/search', methods=['POST'])
@jwt_required()
def search_road_info():
    res = tc_road_info.search_road_info(request)
    return res


# 取得使用者篩選的路口清單(上傳)
@tc_road_routes.route('/road_list_uploaded_data', methods=['POST'])
@jwt_required()
def road_list_uploaded_data():
    res = tc_road_info.road_list_uploaded_data(request)
    return res


# 新增路口資料
@tc_road_routes.route('/create_road', methods=['POST'])
@jwt_required()
def create_road():
    res = tc_road_info.create_road(request)
    return res


# 更新路口資料
@tc_road_routes.route('/update_road', methods=['POST'])
@jwt_required()
def update_road():
    res = tc_road_info.update_road(request)
    return res


# 刪除路口資料
@tc_road_routes.route('/delete_road', methods=['POST'])
@jwt_required()
def delete_road():
    res = tc_road_info.delete_road(request)
    return res


# 確認是否有重複值
@tc_road_routes.route('/check_duplicate', methods=['POST'])
@jwt_required()
def check_duplicate():
    res = tc_road_info.check_duplicate(request)
    return res


# 取得時間範圍(上傳)
@tc_road_routes.route('/tc_uploaded_date', methods=['GET'])
@jwt_required()
def tc_uploaded_date():
    res = tc_road_info.tc_uploaded_date()
    return res


# 取得時間範圍(檢核頁面查看所選TC是否有共同調查日期)
@tc_road_routes.route('/common_time_test', methods=['POST'])
@jwt_required()
def common_time_test():
    res = tc_road_info.common_time_test(request)
    return res


# 傳送所有filter相關資料(用於連動)
@tc_road_routes.route('/get_uploaded_filter_data', methods=['POST'])
@jwt_required()
def get_uploaded_filter_data():
    res = tc_road_info.get_uploaded_filter_data(request)
    return res

