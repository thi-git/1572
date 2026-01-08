# -*- coding: utf-8 -*-
import os
from flask import Blueprint, request
from ..lib import quality
from flask_jwt_extended import jwt_required

quality_routes = Blueprint("quality_routes", __name__)


# 取得所選路口之基本資料與各方向資料
@quality_routes.route('/get_basic_data', methods=['POST'])
@jwt_required()
def basic_data():
    res = quality.get_basic_data(request)
    return res


# 取得各路口所有轉向流量
@quality_routes.route('/get_all_result', methods=['POST'])
@jwt_required()
def all_result():
    res = quality.get_all_result(request)
    return res
