# -*- coding: utf-8 -*-
from flask import Blueprint
from flask import request
from ..lib import ui
from ..utils import responses as resp
from ..utils.responses import response_with
from ..utils.database import db
from flask_jwt_extended import (jwt_required)

ui_record_routes = Blueprint("ui_record_routes", __name__)


@ui_record_routes.route('/get_ui_record', methods=['GET'])
@jwt_required()
def get_ui_record():
    return response_with(resp.SUCCESS_200, value=ui.get_ui_record())


@ui_record_routes.route('/set_ui_record', methods=['POST'])
@jwt_required()
def set_ui_record():
    try:
        ui.set_ui_record(request)
        return response_with(resp.SUCCESS_200)
    except Exception as e:
        db.session.rollback()
        return response_with(resp.MISSING_PARAMETERS_422)
