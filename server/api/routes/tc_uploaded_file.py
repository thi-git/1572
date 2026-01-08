# -*- coding: utf-8 -*-
import os
from flask import Blueprint, request
from ..lib import tc_uploaded_file
from flask_jwt_extended import jwt_required

tc_routes = Blueprint("tc_routes", __name__)


# 搜尋上傳紀錄(地圖查詢頁面)
@tc_routes.route('/search', methods=['POST'])
@jwt_required()
def search_tc():
    res = tc_uploaded_file.search_record(request)
    return res


# 搜尋上傳紀錄(資料庫查詢頁面)
@tc_routes.route('/search_v2', methods=['POST'])
@jwt_required()
def search_tc_v2():
    res = tc_uploaded_file.search_record_v2(request)
    return res


# 刪除紀錄
@tc_routes.route('/delete', methods=['POST'])
@jwt_required()
def delete_tc():
    res = tc_uploaded_file.delete_record(request)
    return res


# 上傳檔案
@tc_routes.route('/upload', methods=['POST'])
@jwt_required()
def upload():
    res = tc_uploaded_file.upload_file(request)
    return res


# 下載檔案
@tc_routes.route('/download', methods=['POST'])
@jwt_required()
def download():
    res = tc_uploaded_file.download_file(request)
    return res


# 接收前端固定打API的程序(每五分鐘打一次，若有錯就代表token過期，設定系統自行登出)
@tc_routes.route('/token_timeout_test', methods=['GET'])
@jwt_required()
def get_origin_data():
    res = tc_uploaded_file.token_timeout_test()
    return res

