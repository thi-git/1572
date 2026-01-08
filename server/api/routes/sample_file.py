# -*- coding: utf-8 -*-
import os
from flask import Blueprint
from ..lib import sample_file
from flask_jwt_extended import jwt_required

sample_routes = Blueprint("sample_routes", __name__)


@sample_routes.route('/all', methods=['GET'])
@jwt_required()
def get_all_sample():
    res = sample_file.get_all_sample()
    return res
